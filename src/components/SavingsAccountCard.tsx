import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchGoals, fetchSavingsMovements, savingsBalance } from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "deposit" | "withdrawal" | "goal";

const MODE_LABEL: Record<Mode, string> = {
  deposit: "Lisa kogumiskontole",
  withdrawal: "Võta välja (ootamatu kulu)",
  goal: "Suuna eesmärki",
};

export function SavingsAccountCard() {
  const qc = useQueryClient();
  const { data: movements } = useQuery({ queryKey: ["savings"], queryFn: fetchSavingsMovements });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goalId, setGoalId] = useState("");

  const balance = savingsBalance(movements ?? []);
  const openGoals = (goals ?? []).filter((g) => g.saved_amount < g.target_amount);
  const selectedGoal = goalId || openGoals[0]?.id || "";

  const submit = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");
      if (mode !== "deposit" && value > balance) throw new Error("Kogumiskontol pole nii palju raha");
      const goal = mode === "goal" ? (goals ?? []).find((g) => g.id === selectedGoal) : undefined;
      if (mode === "goal" && !goal) throw new Error("Vali eesmärk");

      const { error } = await supabase.from("savings_movements").insert({
        kind: mode,
        amount: value,
        goal_id: goal?.id ?? null,
        note: note.trim() || null,
      });
      if (error) throw error;

      if (goal) {
        const { error: upErr } = await supabase
          .from("goals")
          .update({ saved_amount: goal.saved_amount + value })
          .eq("id", goal.id);
        if (upErr) throw upErr;
      }
      return value;
    },
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      setAmount("");
      setNote("");
      toast.success(`${formatEur(value)} · ${MODE_LABEL[mode]}`);
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
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight">{formatEur(balance)}</p>
        <p className="text-sm text-muted-foreground">
          Siit rahastad eesmärke ja siin on puhver ootamatute suurte väljaminekute jaoks.
        </p>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Toiming</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">{MODE_LABEL.deposit}</SelectItem>
                <SelectItem value="withdrawal">{MODE_LABEL.withdrawal}</SelectItem>
                <SelectItem value="goal">{MODE_LABEL.goal}</SelectItem>
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
          {mode === "goal" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Eesmärk</Label>
              {openGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Lisa esmalt eesmärk.</p>
              ) : (
                <Select value={selectedGoal} onValueChange={setGoalId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {openGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
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
          <Button type="submit" className="sm:col-span-2" disabled={submit.isPending}>
            {MODE_LABEL[mode]}
          </Button>
        </form>

        {(movements ?? []).length > 0 && (
          <ul className="divide-y text-sm">
            {(movements ?? []).slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  {m.date} · {MODE_LABEL[m.kind]}
                  {m.note ? ` · ${m.note}` : ""}
                </span>
                <span className={m.kind === "deposit" ? "text-primary" : "text-muted-foreground"}>
                  {m.kind === "deposit" ? "+" : "−"}
                  {formatEur(m.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
