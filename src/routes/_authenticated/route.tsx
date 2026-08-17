import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchOnboardingCompleted } from "@/lib/finance";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (location.pathname !== "/onboarding") {
      let done = true;
      try {
        done = await fetchOnboardingCompleted();
      } catch {
        done = true;
      }
      if (!done) throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
