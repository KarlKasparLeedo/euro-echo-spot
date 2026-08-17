import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBudgets,
  fetchRecurring,
  fetchTransactions,
  monthKey,
  inMonth,
  plannedMonthlyIncome,
  budgetsTotal,
} from "@/lib/finance";
import { AllocationIndicator } from "@/components/AllocationIndicator";
import { CATEGORIES, formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Eelarved | Finantsjälgija" },
      {
        name: "description",
        content: "Sea igale kategooriale kuueelarve ja jälgi progressi ning hoiatusi.",
      },
      { property: "og:title", content: "Eelarved | Finantsjälgija" },
      {
        property: "og:description",
        content: "Sea igale kategooriale kuueelarve ja jälgi progressi ning hoiatusi.",
      },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const qc = useQueryClient();
  const { data: budgets } = useQuery({ queryKey: ["budgets"], queryFn: fetchBudgets });
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: recurring } = useQuery({ queryKey: ["recurring"], queryFn: fetchRecurring });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const key = monthKey(new Date());
  const prevKey = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

  const save = useMutation({
    mutationFn: async ({
      category,
      limit,
      rollover,
      shared,
    }: {
      category: string;
      limit: number;
      rollover: boolean;
      shared: boolean;
    }) => {
      const { error } = await supabase
        .from("budgets")
        .upsert(
          { category, monthly_limit: limit, rollover, shared },
          { onConflict: "user_id,category" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["family"] });
      toast.success("Eelarve salvestatud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eelarvete haldus</h1>
        <p className="text-sm text-muted-foreground">
          Sea kuueelarve iga kategooria kohta. Hoiatame 80% ja 100% juures.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sissetuleku jaotus</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationIndicator
            income={plannedMonthlyIncome(recurring ?? [])}
            allocated={budgetsTotal(budgets ?? [])}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((category) => {
          const budget = budgets?.find((b) => b.category === category);
          const spent = (txns ?? [])
            .filter((t) => t.type === "expense" && t.category === category && inMonth(t, key))
            .reduce((a, t) => a + t.amount, 0);
          const prevSpent = (txns ?? [])
            .filter((t) => t.type === "expense" && t.category === category && inMonth(t, prevKey))
            .reduce((a, t) => a + t.amount, 0);
          const base = budget?.monthly_limit ?? 0;
          const rollover = budget?.rollover ?? false;
          const carry = rollover ? Math.max(base - prevSpent, 0) : 0;
          const limit = base + carry;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const draft = drafts[category] ?? String(base || "");

          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <Link to="/category/$name" params={{ name: category }} className="hover:underline">
                    {category}
                  </Link>
                  {limit > 0 && pct >= 80 && (
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${pct >= 100 ? "text-destructive" : "text-warning"}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {pct >= 100 ? "Eelarve ületatud" : "80% täis"}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {formatEur(spent)} / {limit > 0 ? formatEur(limit) : "eelarve puudub"}
                  </span>
                  {carry > 0 && <span>+{formatEur(carry)} ülekanne</span>}
                </div>
                <Progress
                  value={Math.min(pct, 100)}
                  className={pct >= 100 ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-warning" : ""}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`limit-${category}`}>Kuueelarve (€)</Label>
                    <Input
                      id={`limit-${category}`}
                      inputMode="decimal"
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [category]: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      save.mutate({
                        category,
                        limit: Number((draft || "0").replace(",", ".")),
                        rollover,
                      })
                    }
                  >
                    Salvesta
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`roll-${category}`} className="text-sm font-normal">
                    Ülejääk kandub järgmisse kuusse
                  </Label>
                  <Switch
                    id={`roll-${category}`}
                    checked={rollover}
                    onCheckedChange={(v) =>
                      save.mutate({
                        category,
                        limit: budget?.monthly_limit ?? Number((draft || "0").replace(",", ".")),
                        rollover: v,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
