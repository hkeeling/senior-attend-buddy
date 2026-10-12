import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getOpenSessions } from "@/lib/attendance.functions";
import { CheckInForm, InstructorLink } from "@/components/check-in-form";

const openSessionsQuery = queryOptions({
  queryKey: ["open-sessions"],
  queryFn: () => getOpenSessions(),
  refetchInterval: 8000,
});



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Check In — Senior Project 1 Attendance" },
      {
        name: "description",
        content:
          "Check in to today's Senior Project 1 class. Enter your name and student ID, tap once, and you're marked present.",
      },
      { property: "og:title", content: "Check In — Senior Project 1 Attendance" },
      {
        property: "og:description",
        content: "Tap once to mark yourself present in Senior Project 1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(openSessionsQuery),
  component: CheckInPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Couldn't load check-in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </a>
      </div>
    </div>
  ),
});

function CheckInPage() {
  const { data: sessions } = useSuspenseQuery(openSessionsQuery);
  const session = sessions.length === 1 ? sessions[0] : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {session ? session.className : "Class attendance"}
        </p>

        {sessions.length > 1 ? (
          <div className="mt-4 space-y-3">
            <h1 className="font-display text-2xl font-semibold">Choose your class</h1>
            {sessions.map((session) => (
              <Link key={session.id} to="/s/$code" params={{ code: session.code }}
                className="block rounded-xl border border-border bg-card p-5 font-semibold text-foreground hover:bg-accent">
                {session.className}
              </Link>
            ))}
            <InstructorLink className="mt-8" />
          </div>
        ) : session ? (
          <CheckInForm sessionId={session.id} className="mt-4" />
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Check-in isn't open yet
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              There's no active session right now. Ask your instructor to open
              today's session, then refresh this page.
            </p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Refresh
            </a>
            <InstructorLink className="mt-8" />
          </div>

        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          No account needed — your name and ID are only used for attendance.
        </p>
      </div>
    </div>
  );
}
