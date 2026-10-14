import { createFileRoute } from "@tanstack/react-router";
import {
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSignedIn } from "@/lib/auth";
import {
  listAccounts,
  grantInstructor,
  revokeInstructor,
  type AccountInfo,
} from "@/lib/admin.functions";

const accountsQuery = queryOptions({
  queryKey: ["admin-accounts"],
  queryFn: () => listAccounts(),
});

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: ({ location }) => requireSignedIn(location),
  head: () => ({
    meta: [
      { title: "Manage Instructors — Course Attendance" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: accounts } = useSuspenseQuery(accountsQuery);

  return (
    <div className="flex-1 bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Attendance
            </p>
            <h1 className="font-display text-xl font-semibold text-primary">
              Manage instructors
            </h1>
          </div>
          <div className="flex gap-2">
            <a
              href="/instructor"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Dashboard
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every registered account appears below. Grant instructor access to let
          an account open sessions and view attendance; revoke it to remove
          that access. You can't revoke your own access.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {accounts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No accounts have signed up yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {accounts.map((a) => (
                <AccountRow key={a.id} account={a} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function AccountRow({ account }: { account: AccountInfo }) {
  const queryClient = useQueryClient();
  const grantFn = useServerFn(grantInstructor);
  const revokeFn = useServerFn(revokeInstructor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (account.isInstructor) {
        await revokeFn({ data: { userId: account.id } });
      } else {
        await grantFn({ data: { userId: account.id } });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
        {(account.displayName || account.email || "?")
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {account.displayName || account.email}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {account.email} · joined{" "}
          {new Date(account.createdAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      {account.isInstructor && (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Instructor
        </span>
      )}
      <button
        onClick={toggle}
        disabled={busy}
        className={
          account.isInstructor
            ? "rounded-xl border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
            : "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        }
      >
        {busy
          ? "Saving…"
          : account.isInstructor
            ? "Revoke access"
            : "Grant instructor"}
      </button>
    </li>
  );
}
