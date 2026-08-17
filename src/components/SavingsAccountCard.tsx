import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGoals,
  fetchSavingsMovements,
  savingsBalance,
  goalSavedFromMovements,
  allocatedToGoals,
  freeBuffer,
  releaseFromGoal,
  withdrawWithCoverage,
  type SavingsMovementKind,
} from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "deposit" | "goal" | "goal_release" | "withdrawal";

const MODE_LABEL: Record<Mode, string> = {
  deposit: "Lisa kogumiskontole",
  goal: "Märgi eesmärgile",
  goal_release: "Võta eesmärgilt tagasi",
  withdrawal: "Võta kogumiskontolt välja",
};

const MOVEMENT_LABEL: Record<SavingsMovementKind, string> = {
  deposit: "Lisatud kogumiskontole",
  goal: "Märgitud eesmärgile",
  goal_release: "Võetud eesmärgilt tagasi",
  withdrawal: "Võetud kogumiskontolt välja",
};

export function SavingsAccountCard() {
  const qc = useQueryClient();
  const { data: movements } = useQuery({ queryKey: ["savings"], queryFn: fetchSavingsMovements });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goalId, setGoalId] = useState("");

  const list = movements ?? [];
  const total = savingsBalance(list);
  const perGoal = goalSavedFromMovements(list);
  const allocated = allocatedToGoals(list);
  const free = freeBuffer(list);

  const allGoals = goals ?? [];
  const goalOptions =
    mode === "goal_release" ? allGoals.filter((g) => (perGoal[g.id] ?? 0) > 0) : allGoals;
  const selectedGoal = goalId || goalOptions[0]?.id || "";

  const submit = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");

      if (mode === "deposit") {
        const { error } = await supabase
          .from("savings_movements")
          .insert({ kind: "deposit", amount: value, note: note.trim() || null });
        if (error) throw error;
        return value;
      }

      if (mode === "withdrawal") {
        if (value > total) throw new Error("Kogumiskontol pole nii palju raha");
        let missing = Math.max(value - free, 0);
        const coverage: { goalId: string; amount: number }[] = [];
        if (missing > 0) {
          // Katame puudujäägi eesmärkide sahtlitest: esmalt valitud eesmärk, siis suurimad.
          const ordered = [...allGoals].sort((a, b) => {
            if (a.id === selectedGoal) return -1;
            if (b.id === selectedGoal) return 1;
            return (perGoal[b.id] ?? 0) - (perGoal[a.id] ?? 0);
          });
          for (const g of ordered) {
            if (missing <= 0) break;
            const have = perGoal[g.id] ?? 0;
            if (have <= 0) continue;
            const take = Math.min(have, missing);
            coverage.push({ goalId: g.id, amount: take });
            missing -= take;
          }
        }
        await withdrawWithCoverage(value, coverage, note);
        if (coverage.length > 0) {
          toast.info(`Puudujääk kaeti eesmärkidelt: ${formatEur(value - free)}`);
        }
        return value;
      }

      const goal = allGoals.find((g) => g.id === selectedGoal);
      if (!goal) throw new Error("Vali eesmärk");

      if (mode === "goal") {
        if (value > free) throw new Error("Vabas puhvris pole nii palju raha");
        const { error } = await supabase
          .from("savings_movements")
          .insert({ kind: "goal", amount: value, goal_id: goal.id, note: note.trim() || null });
        if (error) throw error;
        const { error: upErr } = await supabase
          .from("goals")
          .update({ saved_amount: goal.saved_amount + value })
          .eq("id", goal.id);
        if (upErr) throw upErr;
        return value;
      }

      // goal_release
      if (value > (perGoal[goal.id] ?? 0)) throw new Error("Sellel eesmärgil pole nii palju raha");
      await releaseFromGoal(goal.id, value, note);
      return value;
    },
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAmount("");
      setNote("");
      toast.success(
        mode === "withdrawal"
          ? `${formatEur(value)} kogumiskontolt kuu rahakotti`
          : `${formatEur(value)} · ${MODE_LABEL[mode]}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" /> Kogumiskonto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{formatEur(total)}</p>
          <p className="text-sm text-muted-foreground">
            Sellest vaba <span className="font-medium text-foreground">{formatEur(free)}</span> · eesmärkidele
            märgitud {formatEur(allocated)}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Kuhu raha on jaotatud</p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" /> Vaba puhver
            </span>
            <span className="font-medium">{formatEur(free)}</span>
          </div>
          {allGoals
            .filter((g) => (perGoal[g.id] ?? 0) > 0)
            .map((g) => {
              const saved = perGoal[g.id] ?? 0;
              const pct = g.target_amount > 0 ? (saved / g.target_amount) * 100 : 0;
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">
                      {formatEur(saved)} / {formatEur(g.target_amount)}
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="[&>div]:bg-success" />
                </div>
              );
            })}
          <p className="text-xs text-muted-foreground">
            Eesmärgile märgitud raha on ikka kogumiskontol. Hädaolukorras saad selle tagasi puhvrisse võtta.
          </p>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Toiming</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as Mode);
                setGoalId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sav-amount">Summa (€)</Label>
            <Input
              id="sav-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {(mode === "goal" || mode === "goal_release") && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Eesmärk</Label>
              {goalOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {mode === "goal" ? "Lisa esmalt eesmärk." : "Ühelgi eesmärgil pole veel raha."}
                </p>
              ) : (
                <Select value={selectedGoal} onValueChange={setGoalId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} · {formatEur(perGoal[g.id] ?? 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sav-note">Märkus</Label>
            <Input
              id="sav-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "withdrawal" ? "Nt auto remont" : "Valikuline"}
            />
          </div>
          {mode === "withdrawal" && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Väljavõetud raha kirjendatakse kuu rahakotti sissetulekuna, kogumiskonto jääk väheneb sama summa võrra.
            </p>
          )}
          {mode === "withdrawal" && free < Number(amount.replace(",", ".") || 0) && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Vaba puhver ei kata summat — puudujääk võetakse eesmärkide pealt (valitud eesmärk esimesena).
            </p>
          )}
          <Button type="submit" className="sm:col-span-2" disabled={submit.isPending}>
            {MODE_LABEL[mode]}
          </Button>
        </form>

        {list.length > 0 && (
          <ul className="divide-y text-sm">
            {list.slice(0, 8).map((m) => {
              const positive = m.kind === "deposit";
              const neutral = m.kind === "goal" || m.kind === "goal_release";
              return (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">
                    {m.date} · {MOVEMENT_LABEL[m.kind]}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                  <span className={positive ? "text-primary" : "text-muted-foreground"}>
                    {neutral ? "" : positive ? "+" : "−"}
                    {formatEur(m.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
