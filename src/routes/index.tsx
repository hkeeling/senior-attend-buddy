import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getActiveSession } from "@/lib/attendance.functions";
import { CheckInForm, AdminUnlock } from "@/components/check-in-form";

const activeSessionQuery = queryOptions({
  queryKey: ["active-session"],
  queryFn: () => getActiveSession(),
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
  loader: ({ context }) => context.queryClient.ensureQueryData(activeSessionQuery),
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
  const { data } = useSuspenseQuery(activeSessionQuery);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {data.session?.className ?? "Class attendance"}
        </p>

        {data.session ? (
          <CheckInForm sessionId={data.session.id} className="mt-4" />
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
            <AdminUnlock className="mt-8" />
          </div>

        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          No account needed — your name and ID are only used for attendance.
        </p>
      </div>
    </div>
  );
}

function CheckInForm({
  sessionId,
  className,
}: {
  sessionId: string;
  className?: string;
}) {
  const checkInFn = useServerFn(checkIn);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Attendee | null>(null);

  if (done) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-8 text-center ${className ?? ""}`}>
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="size-7 text-primary-foreground"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
          You're checked in, {done.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Marked present at{" "}
          {new Date(done.checkedInAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminName(name)) {
      navigate({ to: "/instructor" });
      return;
    }
    if (!name.trim() || !studentId.trim()) {
      setError("Please fill in your name and student ID.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const attendee = await checkInFn({
        data: { sessionId, name, studentId, comment: comment || undefined },
      });
      setDone(attendee);
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
        Check in for today
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        One tap marks you present.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Full name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            maxLength={80}
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Student ID
          </span>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="2024123456"
            maxLength={30}
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Comment <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Running a few minutes late"
            maxLength={200}
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? "Checking in…" : "I'm here"}
      </button>
    </form>
  );
}

function AdminUnlock({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isAdminName(name)) {
          navigate({ to: "/instructor" });
          return;
        }
        setError("Check-in isn't open yet — please wait for your instructor.");
      }}
      className={`border-t border-border pt-6 text-left ${className ?? ""}`}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Full name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          maxLength={80}
          autoComplete="name"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </label>
      {error && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.99]"
      >
        I'm here
      </button>
    </form>
  );
}
