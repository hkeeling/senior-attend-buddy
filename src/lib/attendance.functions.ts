import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export interface AttendanceSession {
  id: string;
  code: string;
  className: string;
  openedAt: string;
  closedAt: string | null;
}

export interface Attendee {
  id: string;
  name: string;
  studentId: string;
  comment: string | null;
  checkedInAt: string;
}

export interface SessionSummary extends AttendanceSession {
  count: number;
}

interface DbSession {
  id: string;
  code: string;
  class_name: string;
  opened_at: string;
  closed_at: string | null;
}

interface DbCheckIn {
  id: string;
  name: string;
  student_id: string;
  comment: string | null;
  checked_in_at: string;
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function mapSession(row: DbSession): AttendanceSession {
  return {
    id: row.id,
    code: row.code,
    className: row.class_name,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  };
}

function mapAttendee(row: DbCheckIn): Attendee {
  return {
    id: row.id,
    name: row.name,
    studentId: row.student_id,
    comment: row.comment,
    checkedInAt: row.checked_in_at,
  };
}

export const getActiveSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = publicClient();
    const { data: session, error } = await supabase
      .from("sessions")
      .select("id, code, class_name, opened_at, closed_at")
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) {
      return {
        session: null as AttendanceSession | null,
        attendees: [] as Attendee[],
      };
    }
    const { data: checkIns, error: ciError } = await supabase
      .from("check_ins")
      .select("id, name, student_id, comment, checked_in_at")
      .eq("session_id", session.id)
      .order("checked_in_at", { ascending: true });
    if (ciError) throw new Error(ciError.message);
    return {
      session: mapSession(session as DbSession),
      attendees: (checkIns ?? []).map(mapAttendee),
    };
  }
);

export const CLASS_OPTIONS = [
  { code: "CSCI 491", name: "CSCI 491 - Senior Project I" },
  { code: "CSCI 492", name: "CSCI 492 - Senior Project II" },
] as const;

const classNames = CLASS_OPTIONS.map((c) => c.name) as unknown as [
  string,
  ...string[],
];

export const openSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ className: z.enum(classNames).default(classNames[0]) })
      .parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: row, error } = await supabase
        .from("sessions")
        .insert({ code, class_name: data.className })
        .select("id, code, class_name, opened_at, closed_at")
        .single();
      if (!error) return mapSession(row as DbSession);
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not open a session, please try again.");
  });

export const closeSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().uuid(),
        closedAt: z.string().datetime().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ closed_at: data.closedAt ?? new Date().toISOString() })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


const checkInSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(80),
  studentId: z.string().trim().min(1, "Student ID is required").max(30),
  comment: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const checkIn = createServerFn({ method: "POST" })
  .inputValidator((input) => checkInSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: session } = await supabase
      .from("sessions")
      .select("closed_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.closed_at) {
      throw new Error("This session is closed — you can no longer check in.");
    }
    const { data: row, error } = await supabase
      .from("check_ins")
      .insert({
        session_id: data.sessionId,
        name: data.name,
        student_id: data.studentId,
        comment: data.comment,
      })
      .select("id, name, student_id, comment, checked_in_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("You have already checked in to this session.");
      }
      throw new Error(error.message);
    }
    return mapAttendee(row as DbCheckIn);
  });

export const listSessions = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, code, class_name, opened_at, closed_at, check_ins(count)")
      .order("opened_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const counts = (row as unknown as { check_ins: { count: number }[] })
        .check_ins;
      return {
        ...mapSession(row as DbSession),
        count: counts?.[0]?.count ?? 0,
      } satisfies SessionSummary;
    });
  }
);

export const getSessionCheckIns = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ sessionId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: checkIns, error } = await supabase
      .from("check_ins")
      .select("id, name, student_id, comment, checked_in_at")
      .eq("session_id", data.sessionId)
      .order("checked_in_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (checkIns ?? []).map(mapAttendee);
  });

export interface StudentStat {
  studentId: string;
  name: string;
  attended: number;
  rate: number;
  lastAttended: string | null;
  missedSessions: string[];
}

export interface TrendPoint {
  key: string;
  label: string;
  present: number;
  sessions: number;
}

export interface AttendanceStats {
  totalSessions: number;
  totalStudents: number;
  averagePresent: number;
  averageRate: number;
  students: StudentStat[];
  byDate: TrendPoint[];
  byWeek: TrendPoint[];
}

function startOfWeekKey(iso: string) {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
  );
  return monday.toISOString().slice(0, 10);
}

export const getAttendanceStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = publicClient();
    const { data: sessions, error: sErr } = await supabase
      .from("sessions")
      .select("id, opened_at")
      .order("opened_at", { ascending: true });
    if (sErr) throw new Error(sErr.message);
    const { data: checkIns, error: cErr } = await supabase
      .from("check_ins")
      .select("session_id, name, student_id, checked_in_at");
    if (cErr) throw new Error(cErr.message);

    const sessionList = (sessions ?? []) as { id: string; opened_at: string }[];
    const rows = (checkIns ?? []) as {
      session_id: string;
      name: string;
      student_id: string;
      checked_in_at: string;
    }[];

    const perSession = new Map<string, number>();
    const students = new Map<
      string,
      { name: string; sessions: Set<string>; last: string | null }
    >();

    for (const r of rows) {
      perSession.set(r.session_id, (perSession.get(r.session_id) ?? 0) + 1);
      const entry = students.get(r.student_id) ?? {
        name: r.name,
        sessions: new Set<string>(),
        last: null as string | null,
      };
      entry.name = r.name;
      entry.sessions.add(r.session_id);
      if (!entry.last || r.checked_in_at > entry.last) entry.last = r.checked_in_at;
      students.set(r.student_id, entry);
    }

    const totalSessions = sessionList.length;
    const sessionDateById = new Map(
      sessionList.map((s) => [s.id, s.opened_at] as const)
    );

    const studentStats: StudentStat[] = [...students.entries()]
      .map(([studentId, v]) => ({
        studentId,
        name: v.name,
        attended: v.sessions.size,
        rate: totalSessions ? v.sessions.size / totalSessions : 0,
        lastAttended: v.last,
        missedSessions: sessionList
          .filter((s) => !v.sessions.has(s.id))
          .map((s) => sessionDateById.get(s.id)!)
          .filter(Boolean),
      }))
      .sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));

    const bucket = (
      keyFn: (iso: string) => string
    ): TrendPoint[] => {
      const map = new Map<string, { present: number; sessions: number }>();
      for (const s of sessionList) {
        const k = keyFn(s.opened_at);
        const e = map.get(k) ?? { present: 0, sessions: 0 };
        e.sessions += 1;
        e.present += perSession.get(s.id) ?? 0;
        map.set(k, e);
      }
      return [...map.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([key, v]) => ({ key, label: key, ...v }));
    };

    const byDate = bucket((iso) => iso.slice(0, 10));
    const byWeek = bucket(startOfWeekKey);

    const totalPresent = rows.length;
    return {
      totalSessions,
      totalStudents: studentStats.length,
      averagePresent: totalSessions ? totalPresent / totalSessions : 0,
      averageRate:
        studentStats.length
          ? studentStats.reduce((a, s) => a + s.rate, 0) / studentStats.length
          : 0,
      students: studentStats,
      byDate,
      byWeek,
    } satisfies AttendanceStats;
  }
);
