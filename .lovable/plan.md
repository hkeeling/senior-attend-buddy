# Attendance App — Senior Project 1

A no-login attendance app: you share a link, students check themselves in (name, student ID, optional comment, one tap), and you see a live attendee list plus saved history in a database.

## Screens

- `/` — Student check-in (public, mobile-friendly): shows the currently open session, a short form (full name, student ID, optional comment), and one big "I'm here" button. After checking in, a confirmation with their time. Duplicate check-ins for the same session are blocked by student ID. If no session is open, it says so.
- `/instructor` — Instructor view: open or close today's session, copy the shareable check-in link, see the live roster updating every few seconds (name, ID, comment, time, running count), download the attendee list as CSV, and browse past sessions with their attendance lists.

No accounts anywhere — the instructor view is also reachable by the same URL scheme (acceptable per your "no credentials" requirement).

## Backend (Lovable Cloud)

Two tables in the database, saved permanently:

- `sessions` — id, short code, class name, opened_at, closed_at
- `check_ins` — id, session_id, name, student_id, comment, checked_in_at

Row security: anyone (no login) may insert a check-in into the open session and read attendance lists, restricted to the needed columns. All writes and reads go through server functions that validate input (name/ID lengths, format) before touching the database.

## Look

Clean light academic style: warm paper background, dark ink text, a single deep-green accent for the present/check-in action, serif display headings with a readable sans body. Large tap targets since students use phones.

## Steps

1. Enable Lovable Cloud (database + backend, no external accounts needed).
2. Create the migration with both tables, grants, and row-security policies.
3. Add server functions: open/close session, create check-in, list live attendees, list past sessions, CSV export.
4. Build the student check-in page at `/` and the instructor view at `/instructor`.
5. Set page titles/meta, then verify: check in as two fake students in a browser, confirm both appear on the live list, close the session, confirm history and CSV download work.

Delivered in one pass so you can use it in class today: open the instructor view, open a session, share the link with students.
