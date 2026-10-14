import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const finishSignIn = async () => {
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

  // Pick up the session when the browser returns from Google sign-in.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void finishSignIn();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }
      setNotice(
        "Check your email to confirm your account, then come back and sign in."
      );
      setMode("signin");
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    await finishSignIn();
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/login",
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed.");
    }
    // On success the browser redirects; the login page picks the session up.
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Attendance
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-primary">
          {mode === "signin" ? "Instructor sign-in" : "Create your account"}
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-base font-semibold text-foreground transition hover:bg-accent"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.94 6.71-4.94Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            or with email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                className={inputClass}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              minLength={6}
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
        {notice && (
          <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        <a
          href="/"
          className="mt-2 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to student check-in
        </a>
      </form>
    </div>
  );
}
