import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getInstructorStatus } from "@/lib/attendance.functions";
import { safeRedirect } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirect(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Instructor Sign-In — Course Attendance" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

function LoginPage() {
  const { redirect } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const checkInstructor = useServerFn(getInstructorStatus);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    try {
      await checkInstructor();
    } catch {
      await supabase.auth.signOut();
      setError("This account isn't set up as an instructor.");
      setSubmitting(false);
      return;
    }

    queryClient.clear();
    router.history.push(redirect);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Attendance
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-foreground">
          Instructor sign-in
        </h1>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
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
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <a
          href="/"
          className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to student check-in
        </a>
      </form>
    </div>
  );
}
