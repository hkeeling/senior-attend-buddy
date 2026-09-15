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

export const openSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = publicClient();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from("sessions")
        .insert({ code, class_name: "Senior Project 1" })
        .select("id, code, class_name, opened_at, closed_at")
        .single();
      if (!error) return mapSession(data as DbSession);
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not open a session, please try again.");
  }
);

export const closeSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ sessionId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ closed_at: new Date().toISOString() })
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
