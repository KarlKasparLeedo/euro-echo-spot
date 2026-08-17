import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  availableSurplus,
  fetchAllocations,
  fetchGoals,
  fetchTransactions,
  monthStart,
} from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SurplusCard() {
  const qc = useQueryClient();
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const { data: allocations } = useQuery({ queryKey: ["allocations"], queryFn: fetchAllocations });
  const [goalId, setGoalId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const surplus = availableSurplus(txns ?? [], allocations ?? []);
  const openGoals = (goals ?? []).filter((g) => g.saved_amount < g.target_amount);
  const selected = goalId || openGoals[0]?.id || "";

  const allocate = useMutation({
    mutationFn: async () => {
      const goal = (goals ?? []).find((g) => g.id === selected);
      if (!goal) throw new Error("Vali eesmärk");
      const raw = amount.trim() === "" ? surplus : Number(amount.replace(",", "."));
      if (!Number.isFinite(raw) || raw <= 0) throw new Error("Sisesta korrektne summa");
      const value = Math.min(raw, surplus);
      const { error } = await supabase
        .from("goal_allocations")
        .insert({ goal_id: goal.id, amount: value, month: monthStart() });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("goals")
        .update({ saved_amount: goal.saved_amount + value })
        .eq("id", goal.id);
      if (upErr) throw upErr;
      return value;
    },
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["allocations"] });
      setAmount("");
      toast.success(`${formatEur(value)} suunatud eesmärki`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-primary/20 bg-secondary/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4 text-primary" /> Selle kuu ülejääk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight">{formatEur(surplus)}</p>
        {surplus <= 0 ? (
          <p className="text-sm text-muted-foreground">
            Sel kuul pole veel ülejääki, mida suunata. Kui tulud ületavad kulusid, ilmub summa siia.
          </p>
        ) : openGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Lisa esmalt eesmärk, kuhu ülejääk suunata.</p>
        ) : (
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              allocate.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Eesmärk</Label>
              <Select value={selected} onValueChange={setGoalId}>
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alloc-amount">Summa (€)</Label>
              <Input
                id="alloc-amount"
                inputMode="decimal"
                placeholder={String(surplus.toFixed(2))}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:col-span-3" disabled={allocate.isPending}>
              Suuna eesmärki
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
