create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  class_name text not null default 'Senior Project 1',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  student_id text not null,
  comment text,
  checked_in_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index check_ins_session_idx on public.check_ins (session_id, checked_in_at desc);

grant select, insert on public.sessions to anon;
grant select, insert on public.check_ins to anon;
grant all on public.sessions to service_role;
grant all on public.check_ins to service_role;

alter table public.sessions enable row level security;
alter table public.check_ins enable row level security;

create policy "Anyone can view sessions"
  on public.sessions for select to anon using (true);

create policy "Anyone can open a session"
  on public.sessions for insert to anon with check (true);

create policy "Anyone can view check-ins"
  on public.check_ins for select to anon using (true);

create policy "Anyone can check in"
  on public.check_ins for insert to anon with check (true);