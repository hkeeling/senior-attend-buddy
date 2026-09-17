import { createFileRoute } from "@tanstack/react-router";
import {
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getActiveSession,
  listSessions,
  getSessionCheckIns,
  openSession,
  closeSession,
  CLASS_OPTIONS,
  type Attendee,
} from "@/lib/attendance.functions";


const activeSessionQuery = queryOptions({
  queryKey: ["active-session"],
  queryFn: () => getActiveSession(),
  refetchInterval: 4000,
});

const sessionsQuery = queryOptions({
  queryKey: ["sessions"],
  queryFn: () => listSessions(),
});

export const Route = createFileRoute("/instructor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Course Attendance" },
      {
        name: "description",
        content:
          "Open a check-in session, share the link, watch attendance arrive live, and review past sessions.",
      },
      { property: "og:title", content: "Admin Dashboard — Course Attendance" },
      {
        property: "og:description",
        content: "Live attendance roster and session history for Senior Project 1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorPage,
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toCsv(attendees: Attendee[]) {
  const header = "Name,Student ID,Checked In,Comment";
  const rows = attendees.map((a) => {
    const time = new Date(a.checkedInAt).toLocaleString();
    const esc = (v: string | null) =>
      `"${(v ?? "").replace(/"/g, '""')}"`;
    return [esc(a.name), esc(a.studentId), esc(time), esc(a.comment)].join(",");
  });
  return [header, ...rows].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function InstructorPage() {
  const { data } = useSuspenseQuery(activeSessionQuery);
  const { data: sessions } = useSuspenseQuery(sessionsQuery);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {data.session?.className ?? "Attendance"}
            </p>
            <h1 className="font-display text-xl font-semibold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex gap-2">
            <a
              href="/stats"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Stats
            </a>
            <a
              href="/"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Student view
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <CourseOverview
          sessions={sessions}
          activeSessionId={data.session?.id ?? null}
          activeClassName={data.session?.className ?? null}
        />

        {data.session ? (
          <ActiveSession
            sessionId={data.session.id}
            code={data.session.code}
            className={data.session.className}
            openedAt={data.session.openedAt}
            attendees={data.attendees}
            showQr={showQr}
            setShowQr={setShowQr}
            copied={copied}
            setCopied={setCopied}
            onClosed={() => setExpandedId(null)}
          />
        ) : (
          <NoSession />
        )}

        <PastSessions
          sessions={sessions.filter((s) => s.id !== data.session?.id)}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />

      </main>
    </div>
  );
}

function CourseOverview({
  sessions,
  activeSessionId,
  activeClassName,
}: {
  sessions: {
    id: string;
    className: string;
    openedAt: string;
    closedAt: string | null;
    count: number;
  }[];
  activeSessionId: string | null;
  activeClassName: string | null;
}) {
  const openFn = useServerFn(openSession);
  const closeFn = useServerFn(closeSession);
  const queryClient = useQueryClient();
  const [busyClass, setBusyClass] = useState<string | null>(null);
  const [endingNow, setEndingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["active-session"] });
    await queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const handleEndCurrent = async () => {
    if (!activeSessionId) return;
    setEndingNow(true);
    setError(null);
    try {
      await closeFn({ data: { sessionId: activeSessionId } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setEndingNow(false);
    }
  };

  const handleOpen = async (className: string) => {
    setBusyClass(className);
    setError(null);
    try {
      if (activeSessionId) {
        await closeFn({ data: { sessionId: activeSessionId } });
      }
      await openFn({ data: { className } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyClass(null);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Your courses
        </h2>
        {activeSessionId && (
          <button
            onClick={handleEndCurrent}
            disabled={endingNow || busyClass !== null}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60"
          >
            {endingNow ? "Ending…" : "End current session"}
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CLASS_OPTIONS.map((c) => {
          const mine = sessions.filter((s) => s.className === c.name);
          const past = mine.filter((s) => s.id !== activeSessionId);
          const totalPresent = mine.reduce((a, s) => a + s.count, 0);
          const last = past[0];
          const isActive = activeClassName === c.name;
          return (
            <div
              key={c.code}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {c.code}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                    {c.name.replace(`${c.code} - `, "")}
                  </h3>
                </div>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {mine.length} session{mine.length === 1 ? "" : "s"} ·{" "}
                {totalPresent} check-in{totalPresent === 1 ? "" : "s"}
                {last ? ` · last ${formatDate(last.closedAt ?? last.openedAt)}` : ""}
              </p>
              <button
                onClick={() => handleOpen(c.name)}
                disabled={busyClass !== null || endingNow}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                {busyClass === c.name
                  ? "Opening…"
                  : activeSessionId
                    ? "End current & start new session"
                    : "Open a session"}
              </button>
            </div>
          );
        })}
      </div>
      {activeSessionId && (
        <p className="mt-3 text-xs text-muted-foreground">
          Starting a session for a course ends the one that is live now and
          files it in history.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}


function NoSession() {
  const openFn = useServerFn(openSession);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [className, setClassName] = useState<string>(CLASS_OPTIONS[0].name);

  const handleOpen = async () => {
    setBusy(true);
    setError(null);
    try {
      await openFn({ data: { className } });
      await queryClient.invalidateQueries({ queryKey: ["active-session"] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        No session is open
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Pick the class, open the session, and share the check-in link with your
        students. Their names appear here as they check in.
      </p>
      <div className="mx-auto mt-6 max-w-sm text-left">
        <label
          htmlFor="class-select"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
        >
          Class
        </label>
        <select
          id="class-select"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
        >
          {CLASS_OPTIONS.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleOpen}
        disabled={busy}
        className="mt-5 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Opening…" : "Open session"}
      </button>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}


function ActiveSession({
  sessionId,
  code,
  className,
  openedAt,
  attendees,
  showQr,
  setShowQr,
  copied,
  setCopied,
  onClosed,
}: {
  sessionId: string;
  className: string;
  openedAt: string;
  attendees: Attendee[];
  showQr: boolean;
  setShowQr: (v: boolean) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  onClosed: () => void;
}) {
  const closeFn = useServerFn(closeSession);
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(() =>
    new Date(openedAt).toLocaleDateString("en-CA")
  );

  const checkInUrl =
    typeof window !== "undefined" ? window.location.origin + "/" : "/";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleExport = () =>
    downloadCsv(
      `${className.replace(/\s+/g, "-").toLowerCase()}-attendance-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(attendees)
    );

  const handleClose = async () => {
    setClosing(true);
    setError(null);
    try {
      const now = new Date();
      const stamp = new Date(
        `${closeDate}T${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}:00`
      );
      if (Number.isNaN(stamp.getTime())) {
        setError("Please enter a valid date.");
        setClosing(false);
        return;
      }
      await closeFn({
        data: { sessionId, closedAt: stamp.toISOString() },
      });
      onClosed();
      await queryClient.invalidateQueries({ queryKey: ["active-session"] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setClosing(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {className}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
            Open since {formatDate(openedAt)} · students can check in
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-4xl font-semibold text-primary">
            {attendees.length}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">present</span>
        </div>
      </div>


      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Check-in link
          </p>
          <p className="mt-1 truncate font-mono text-sm text-foreground">
            {checkInUrl}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={copyLink}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => setShowQr(!showQr)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            {showQr ? "Hide QR" : "Show QR"}
          </button>
        </div>
        {showQr && (
          <div className="rounded-xl border border-border bg-background p-3">
            <QRCodeSVG value={checkInUrl} size={112} />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Present now
          </h3>
          <button
            onClick={handleExport}
            disabled={attendees.length === 0}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
        {attendees.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nobody has checked in yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {attendees.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-semibold text-accent-foreground">
                  {initials(a.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {a.studentId}
                    {a.comment ? (
                      <span className="font-sans"> · {a.comment}</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatTime(a.checkedInAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <label
            htmlFor="close-date"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            Class date
          </label>
          <input
            id="close-date"
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            className="mt-1.5 block rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground"
          />
        </div>
        <button
          onClick={handleClose}
          disabled={closing}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {closing ? "Closing…" : "End session"}
        </button>
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:flex-1">
          Ending the session stops new check-ins and files today's list in
          history under the date above.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

function PastSessions({
  sessions,
  expandedId,
  setExpandedId,
}: {
  sessions: {
    id: string;
    className: string;
    openedAt: string;
    closedAt: string | null;
    count: number;
  }[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  if (sessions.length === 0) return null;
  const visible =
    filter === "all" ? sessions : sessions.filter((s) => s.className === filter);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Past sessions
        </h2>
        <select
          value={filter}
          aria-label="Filter past sessions by class"
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          No past sessions for this class yet.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {visible.map((s) => (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {formatDate(s.closedAt ?? s.openedAt)}
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {s.className}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {s.count} checked in ·{" "}
                  {s.closedAt ? `ended ${formatTime(s.closedAt)}` : "open"}
                </span>
              </button>
              {expandedId === s.id && <SessionAttendees sessionId={s.id} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


function SessionAttendees({ sessionId }: { sessionId: string }) {
  const query = queryOptions({
    queryKey: ["session-check-ins", sessionId],
    queryFn: () => getSessionCheckIns({ data: { sessionId } }),
  });
  const { data: attendees } = useSuspenseQuery(query);

  return (
    <div className="border-t border-border bg-background/50">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Attendees
        </span>
        <button
          onClick={() =>
            downloadCsv(
              `senior-project-1-${sessionId.slice(0, 8)}.csv`,
              toCsv(attendees)
            )
          }
          disabled={attendees.length === 0}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
        >
          Download CSV
        </button>
      </div>
      {attendees.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          No one checked in to this session.
        </p>
      ) : (
        <ul className="divide-y divide-border px-5 pb-2">
          {attendees.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {a.name}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {a.studentId}
                  {a.comment ? (
                    <span className="font-sans"> · {a.comment}</span>
                  ) : null}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatTime(a.checkedInAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
