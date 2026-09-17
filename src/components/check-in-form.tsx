import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { checkIn, type Attendee } from "@/lib/attendance.functions";

const ADMIN_NAME = "harry keeling";

export function isAdminName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase() === ADMIN_NAME;
}

const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

export function CheckInForm({
  sessionId,
  className,
  title = "Check in for today",
  subtitle = "One tap marks you present.",
}: {
  sessionId: string;
  className?: string;
  title?: string;
  subtitle?: string;
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
      <div
        className={`rounded-2xl border border-border bg-card p-8 text-center ${className ?? ""}`}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="size-7 text-primary-foreground"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

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
            Comment{" "}
            <span className="normal-case tracking-normal">(optional)</span>
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

export function AdminUnlock({ className }: { className?: string }) {
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
          className={inputClass}
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
