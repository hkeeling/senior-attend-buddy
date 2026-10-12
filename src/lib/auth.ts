import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Route `beforeLoad` guard for instructor pages. This only decides whether to
// show the login page; the server functions enforce the instructor check.
export async function requireSignedIn(location: { href: string }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
}

// Only same-site paths, so a crafted ?redirect= can't send people elsewhere.
export function safeRedirect(value: unknown) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value)
    ? value
    : "/instructor";
}
