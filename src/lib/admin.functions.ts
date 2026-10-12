import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireInstructor } from "@/lib/instructor-auth";

export interface AccountInfo {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isInstructor: boolean;
}

// Admin screen: list every registered account with its instructor status.
// requireInstructor guarantees the caller is an instructor before the
// service-role client is even loaded.
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireInstructor])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
    if (usersError) throw new Error(usersError.message);

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesError) throw new Error(rolesError.message);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name");

    const instructorIds = new Set(
      (roles ?? []).filter((r) => r.role === "instructor").map((r) => r.user_id)
    );
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name] as const)
    );

    return usersData.users
      .map(
        (u): AccountInfo => ({
          id: u.id,
          email: u.email ?? "",
          displayName: nameById.get(u.id) ?? "",
          createdAt: u.created_at,
          isInstructor: instructorIds.has(u.id),
        })
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });

export const grantInstructor = createServerFn({ method: "POST" })
  .middleware([requireInstructor])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: "instructor" },
        { onConflict: "user_id,role" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeInstructor = createServerFn({ method: "POST" })
  .middleware([requireInstructor])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      throw new Error("You can't revoke your own instructor access.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "instructor");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
