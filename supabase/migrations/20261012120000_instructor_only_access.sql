-- Lock down attendance data (AUDIT.md SEC-01..SEC-04).
-- Anonymous visitors no longer touch the tables directly: public check-in goes
-- through validated server functions using the service role, and everything
-- else requires a signed-in, allowlisted instructor.

-- 1. Remove anonymous access -------------------------------------------------
drop policy if exists "Anyone can view sessions" on public.sessions;
drop policy if exists "Anyone can open a session" on public.sessions;
drop policy if exists "Anyone can view check-ins" on public.check_ins;
drop policy if exists "Anyone can check in" on public.check_ins;

revoke all on public.sessions from anon;
revoke all on public.check_ins from anon;

-- 2. Instructor allowlist ----------------------------------------------------
create table public.instructor_emails (
  email text primary key check (email = lower(email))
);

alter table public.instructor_emails enable row level security;
revoke all on public.instructor_emails from anon, authenticated;
grant all on public.instructor_emails to service_role;

insert into public.instructor_emails (email) values ('hkeeling1@gmail.com');

-- True when the caller is signed in with a confirmed, allowlisted email.
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.instructor_emails i on i.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
$$;

revoke all on function public.is_instructor() from public;
grant execute on function public.is_instructor() to authenticated;

-- 3. Instructor policies -----------------------------------------------------
grant select, insert on public.sessions to authenticated;
grant update (closed_at) on public.sessions to authenticated;
grant select, delete on public.check_ins to authenticated;

create policy "Instructors read sessions"
  on public.sessions for select to authenticated using (public.is_instructor());

create policy "Instructors open sessions"
  on public.sessions for insert to authenticated with check (public.is_instructor());

create policy "Instructors close sessions"
  on public.sessions for update to authenticated
  using (public.is_instructor()) with check (public.is_instructor());

create policy "Instructors read check-ins"
  on public.check_ins for select to authenticated using (public.is_instructor());

create policy "Instructors remove check-ins"
  on public.check_ins for delete to authenticated using (public.is_instructor());

-- 4. Check-in integrity ------------------------------------------------------
-- Reject check-ins to closed sessions and always stamp the server time. The
-- row lock serialises against a concurrent close of the same session.
create or replace function public.check_ins_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from public.sessions
    where id = new.session_id and closed_at is null
    for share;
  if not found then
    raise exception 'session_closed' using errcode = 'P0001';
  end if;
  new.checked_in_at := now();
  return new;
end
$$;

create trigger check_ins_guard
  before insert on public.check_ins
  for each row execute function public.check_ins_guard();

alter table public.check_ins
  add constraint check_ins_name_length check (char_length(name) between 1 and 80) not valid,
  add constraint check_ins_student_id_length check (char_length(student_id) between 1 and 30) not valid,
  add constraint check_ins_comment_length check (comment is null or char_length(comment) <= 200) not valid;
