import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getSessionByCode } from "@/lib/attendance.functions";
import { CheckInForm, InstructorLink } from "@/components/check-in-form";

const sessionByCodeQuery = (code: string) =>
  queryOptions({
    queryKey: ["session-by-code", code],
    queryFn: () => getSessionByCode({ data: { code } }),
    refetchInterval: 15000,
  });

export const Route = createFileRoute("/s/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Session Check-In — Course Attendance" },
      {
        name: "description",
        content:
          "Enter your name and student ID to mark yourself present for this class session.",
      },
      { property: "og:title", content: "Session Check-In — Course Attendance" },
      {
        property: "og:description",
        content: "Tap once to mark yourself present for this class session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionCheckInPage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SessionCheckInPage() {
  const { code } = Route.useParams();
  const { data } = useSuspenseQuery(sessionByCodeQuery(code));
  const session = data.session;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {session ? `Session ${session.code}` : "Class attendance"}
        </p>

        {session && !session.closedAt ? (
          <>
            <CheckInForm
              sessionId={session.id}
              className="mt-4"
              title={session.className}
              subtitle={`${formatDate(session.openedAt)} · one tap marks you present.`}
            />
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-semibold text-primary">
              {session ? "This session has ended" : "Session not found"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {session
                ? `${session.className} is closed, so check-in is no longer available.`
                : "That check-in link doesn't match an open session. Ask your instructor for the current link."}
            </p>
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
