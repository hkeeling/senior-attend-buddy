import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        router.history.push("/login");
      }}
      className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
    >
      Sign out
    </button>
  );
}
