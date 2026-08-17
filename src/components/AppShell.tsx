import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ListOrdered,
  PiggyBank,
  Target,
  Settings,
  Plus,
  Wallet,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { cn } from "@/lib/utils";

const AddTxnContext = createContext<() => void>(() => {});
export const useAddTransaction = () => useContext(AddTxnContext);

const NAV = [
  { to: "/dashboard", label: "Ülevaade", icon: LayoutDashboard },
  { to: "/transactions", label: "Tehingud", icon: ListOrdered },
  { to: "/budgets", label: "Eelarved", icon: PiggyBank },
  { to: "/goals", label: "Eesmärgid", icon: Target },
  { to: "/reports", label: "Aruanded", icon: BarChart3 },
  { to: "/settings", label: "Seaded", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AddTxnContext.Provider value={() => setOpen(true)}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
              <Wallet className="h-5 w-5 text-primary" />
              Finantsjälgija
            </Link>
            <nav className="hidden gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-secondary [&.active]:text-secondary-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex">
              Logi välja
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-16">{children}</main>

        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
          aria-label="Lisa tehing"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card md:hidden">
          <div className="grid grid-cols-5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
                  "[&.active]:text-primary",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <AddTransactionDialog open={open} onOpenChange={setOpen} />
      </div>
    </AddTxnContext.Provider>
  );
}
