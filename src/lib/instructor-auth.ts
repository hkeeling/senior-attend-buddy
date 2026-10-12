import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-function middleware: the caller must be signed in AND on the
// instructor allowlist. Handlers get `context.supabase`, a client scoped to the
// caller's token, so row level security still applies to every query.
export const requireInstructor = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("is_instructor");
    if (error || data !== true) {
      throw new Error("Forbidden: instructor access only");
    }
    return next();
  });
