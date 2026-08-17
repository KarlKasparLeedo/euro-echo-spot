import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchOnboardingCompleted } from "@/lib/finance";
import { AppShell } from "@/components/AppShell";

/** Onboarding check runs once per session, not on every navigation. */
let onboardingDone = false;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    let user = sessionData.session?.user ?? null;
    if (!user) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      user = data.user;
    }
    if (!onboardingDone && location.pathname !== "/onboarding") {
      try {
        onboardingDone = await fetchOnboardingCompleted();
      } catch {
        onboardingDone = true;
      }
      if (!onboardingDone) throw redirect({ to: "/onboarding" });
    }
    return { user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
