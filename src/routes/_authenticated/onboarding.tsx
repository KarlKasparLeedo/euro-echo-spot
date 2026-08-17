import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setOnboardingCompleted } from "@/lib/finance";
import { CATEGORIES, formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Seadistamine | Finantsjälgija" },
      { name: "description", content: "Sea eesmärgid ja igakuised sissetulekud ning kulud." },
      { property: "og:title", content: "Seadistamine | Finantsjälgija" },
      {
        property: "og:description",
        content: "Sea eesmärgid ja igakuised sissetulekud ning kulud.",
      },
    ],
  }),
  component: OnboardingPage,
});

type GoalRow = { name: string; target: string; deadline: string };
type RecRow = { amount: string; merchant: string; category: string; day: string };

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState<GoalRow[]>([{ name: "", target: "", deadline: "" }]);
  const [hasIncome, setHasIncome] = useState<boolean | null>(null);
  const [incomes, setIncomes] = useState<RecRow[]>([
    { amount: "", merchant: "Palk", category: "", day: "1" },
  ]);
  const [hasExpense, setHasExpense] = useState<boolean | null>(null);
  const [expenses, setExpenses] = useState<RecRow[]>([
    { amount: "", merchant: "Üür", category: "Eluase", day: "1" },
  ]);

  const num = (v: string) => Number(v.replace(",", "."));

  async function finish(skip = false) {
    setSaving(true);
    try {
      if (!skip) {
        const goalRows = goals
          .filter((g) => g.name.trim() && num(g.target) > 0)
          .map((g) => ({
            name: g.name.trim(),
            target_amount: num(g.target),
            deadline: g.deadline || null,
          }));
        if (goalRows.length > 0) {
          const { error } = await supabase.from("goals").insert(goalRows);
          if (error) throw error;
        }

        const recRows = [
          ...(hasIncome ? incomes : []).map((r) => ({
            type: "income" as const,
            amount: num(r.amount),
            category: null,
            merchant: r.merchant.trim() || null,
            day_of_month: Math.min(Math.max(Number(r.day) || 1, 1), 28),
          })),
          ...(hasExpense ? expenses : []).map((r) => ({
            type: "expense" as const,
            amount: num(r.amount),
            category: r.category || null,
            merchant: r.merchant.trim() || null,
            day_of_month: Math.min(Math.max(Number(r.day) || 1, 1), 28),
          })),
        ].filter((r) => Number.isFinite(r.amount) && r.amount > 0);

        if (recRows.length > 0) {
          const { error } = await supabase.from("recurring_transactions").insert(recRows);
          if (error) throw error;
        }
      }
      await setOnboardingCompleted(true);
      qc.invalidateQueries();
      toast.success(skip ? "Seadistuse saad hiljem seadetes läbida" : "Valmis!");
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function recEditor(
    rows: RecRow[],
    setRows: (r: RecRow[]) => void,
    withCategory: boolean,
    idPrefix: string,
  ) {
    return (
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-amount-${i}`}>Summa (€)</Label>
              <Input
                id={`${idPrefix}-amount-${i}`}
                inputMode="decimal"
                value={r.amount}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-name-${i}`}>Nimetus</Label>
              <Input
                id={`${idPrefix}-name-${i}`}
                value={r.merchant}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, merchant: e.target.value } : x)))
                }
              />
            </div>
            {withCategory && (
              <div className="space-y-1.5">
                <Label>Kategooria</Label>
                <Select
                  value={r.category || "Eluase"}
                  onValueChange={(v) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, category: v } : x)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${idPrefix}-day-${i}`}>Kuupäev (1-28)</Label>
                <Input
                  id={`${idPrefix}-day-${i}`}
                  type="number"
                  min={1}
                  max={28}
                  value={r.day}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))
                  }
                />
              </div>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eemalda"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRows([
              ...rows,
              { amount: "", merchant: "", category: withCategory ? "Eluase" : "", day: "1" },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Lisa rida
        </Button>
      </div>
    );
  }

  const totalGoals = goals.reduce((a, g) => a + (num(g.target) || 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seadistame sinu rahaasjad</h1>
        <p className="text-sm text-muted-foreground">Samm {step}/3 · võtab paar minutit</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mille poole sa säästad?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`g-name-${i}`}>Nimi</Label>
                  <Input
                    id={`g-name-${i}`}
                    placeholder="Reis"
                    value={g.name}
                    onChange={(e) =>
                      setGoals(goals.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`g-target-${i}`}>Sihtsumma (€)</Label>
                  <Input
                    id={`g-target-${i}`}
                    inputMode="decimal"
                    value={g.target}
                    onChange={(e) =>
                      setGoals(goals.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`g-deadline-${i}`}>Tähtaeg</Label>
                    <Input
                      id={`g-deadline-${i}`}
                      type="date"
                      value={g.deadline}
                      onChange={(e) =>
                        setGoals(goals.map((x, j) => (j === i ? { ...x, deadline: e.target.value } : x)))
                      }
                    />
                  </div>
                  {goals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Eemalda"
                      onClick={() => setGoals(goals.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoals([...goals, { name: "", target: "", deadline: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Lisa eesmärk
              </Button>
              {totalGoals > 0 && (
                <p className="text-sm text-muted-foreground">Kokku {formatEur(totalGoals)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Kas sul on igakuiseid ette teada sissetulekuid?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant={hasIncome === true ? "default" : "outline"} onClick={() => setHasIncome(true)}>
                Jah
              </Button>
              <Button variant={hasIncome === false ? "default" : "outline"} onClick={() => setHasIncome(false)}>
                Ei
              </Button>
            </div>
            {hasIncome && recEditor(incomes, setIncomes, false, "inc")}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kas sul on igakuiseid ette teada kulusid?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant={hasExpense === true ? "default" : "outline"} onClick={() => setHasExpense(true)}>
                Jah
              </Button>
              <Button
                variant={hasExpense === false ? "default" : "outline"}
                onClick={() => setHasExpense(false)}
              >
                Ei
              </Button>
            </div>
            {hasExpense && recEditor(expenses, setExpenses, true, "exp")}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>
          Jäta vahele
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Tagasi
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Edasi</Button>
          ) : (
            <Button onClick={() => finish(false)} disabled={saving}>
              Valmis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
