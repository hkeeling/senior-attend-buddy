import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SignOutButton } from "@/components/sign-out-button";
import { getAttendanceStats } from "@/lib/attendance.functions";
import { requireSignedIn } from "@/lib/auth";

const statsQuery = queryOptions({
  queryKey: ["attendance-stats"],
  queryFn: () => getAttendanceStats(),
  refetchInterval: 15000,
});

export const Route = createFileRoute("/stats")({
  ssr: false,
  beforeLoad: ({ location }) => requireSignedIn(location),
  head: () => ({
    meta: [
      { title: "Attendance Stats — Senior Project 1" },
      {
        name: "description",
        content:
          "See who attended how many times and how class attendance trends by date or week.",
      },
      { property: "og:title", content: "Attendance Stats — Senior Project 1" },
      {
        property: "og:description",
        content: "Per-student attendance totals and weekly trends for Senior Project 1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatsPage,
});

function formatDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function StatsPage() {
  const { data } = useSuspenseQuery(statsQuery);
  const [mode, setMode] = useState<"date" | "week">("date");

  const points = (mode === "date" ? data.byDate : data.byWeek).map((p) => ({
    ...p,
    label: mode === "date" ? formatDay(p.key) : `Wk of ${formatDay(p.key)}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Attendance
            </p>
            <h1 className="font-display text-xl font-semibold text-foreground">
              Stats &amp; trends
            </h1>
          </div>
          <div className="flex gap-2">
            <a
              href="/instructor"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Back to sessions
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Sessions held" value={String(data.totalSessions)} />
          <StatCard label="Students seen" value={String(data.totalStudents)} />
          <StatCard
            label="Avg. present"
            value={data.averagePresent.toFixed(1)}
          />
          <StatCard label="Avg. attendance" value={pct(data.averageRate)} />
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Attendance trend
            </h2>
            <div className="flex rounded-xl border border-border p-1">
              {(["date", "week"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m === "date" ? "By date" : "By week"}
                </button>
              ))}
            </div>
          </div>

          {points.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No sessions yet — open a session and check-ins will show up here.
            </p>
          ) : (
            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [String(v), "Check-ins"]}
                  />
                  <Bar
                    dataKey="present"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Who attended how often
            </h2>
          </div>
          {data.students.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No check-ins recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.students.map((s) => (
                <li
                  key={s.studentId}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {s.studentId}
                      {s.lastAttended ? (
                        <span className="font-sans">
                          {" "}
                          · last{" "}
                          {new Date(s.lastAttended).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-accent sm:block">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: pct(s.rate) }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {s.attended}/{data.totalSessions} · {pct(s.rate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
