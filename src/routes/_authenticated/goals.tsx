import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus, Undo2, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGoals,
  fetchTransactions,
  fetchSavingsMovements,
  goalSavedFromMovements,
  freeBuffer,
  monthSurplus,
  releaseFromGoal,
  type Goal,
} from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GoalFundDialog } from "@/components/GoalFundDialog";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Säästueesmärgid | Finantsjälgija" },
      { name: "description", content: "Sea säästueesmärke ja jälgi nende täitumist progressiribaga." },
      { property: "og:title", content: "Säästueesmärgid | Finantsjälgija" },
      {
        property: "og:description",
        content: "Sea säästueesmärke ja jälgi nende täitumist progressiribaga.",
      },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const qc = useQueryClient();
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: movements } = useQuery({ queryKey: ["savings"], queryFn: fetchSavingsMovements });
  const perGoal = goalSavedFromMovements(movements ?? []);
  const buffer = freeBuffer(movements ?? []);
  const monthFree = Math.max(monthSurplus(txns ?? []), 0);
  const [fundGoalId, setFundGoalId] = useState<string | null>(null);

  const release = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      releaseFromGoal(id, amount, "Võetud eesmärgilt tagasi"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Raha on tagasi vabas puhvris");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [linked, setLinked] = useState<Record<string, boolean>>({});

  const savingsTotal = (txns ?? [])
    .filter((t) => t.type === "expense" && t.category === "Finants ja kohustused")
    .reduce((a, t) => a + t.amount, 0);

  const create = useMutation({
    mutationFn: async () => {
      const value = Number(target.replace(",", "."));
      if (!name.trim() || !Number.isFinite(value) || value <= 0)
        throw new Error("Sisesta nimi ja korrektne sihtsumma");
      const { error } = await supabase.from("goals").insert({
        name: name.trim(),
        target_amount: value,
        deadline: deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setName("");
      setTarget("");
      setDeadline("");
      toast.success("Eesmärk lisatud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Eesmärk kustutatud");
    },
  });

  const setShared = useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) => {
      const { error } = await supabase.from("goals").update({ shared }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["family"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Säästueesmärgid</h1>
        <p className="text-sm text-muted-foreground">
          Nt &quot;Reis: 500 € kuni juuni&quot;. Raha suunamine käib kogumiskonto lehelt.
        </p>
      </div>



      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Uus eesmärk</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="goal-name">Nimi</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reis" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Sihtsumma (€)</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Tähtaeg</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:col-span-4">
              <Plus className="mr-1 h-4 w-4" /> Lisa eesmärk
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(goals ?? []).map((g: Goal) => {
          const isLinked = linked[g.id] ?? false;
          const inSavings = perGoal[g.id] ?? 0;
          const saved = isLinked ? savingsTotal : inSavings > 0 ? inSavings : g.saved_amount;
          const pct = g.target_amount > 0 ? (saved / g.target_amount) * 100 : 0;
          return (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex flex-wrap items-center gap-2">
                    {g.name}
                    {g.shared && <Badge variant="outline">Peres jagatud</Badge>}
                    {saved >= g.target_amount && (
                      <Badge className="bg-success text-success-foreground">Täidetud</Badge>
                    )}
                  </span>
                  <Button variant="ghost" size="icon" aria-label="Kustuta" onClick={() => remove.mutate(g.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {formatEur(saved)} / {formatEur(g.target_amount)}
                  </span>
                  {g.deadline && <span>kuni {g.deadline}</span>}
                </div>
                <Progress value={Math.min(pct, 100)} className="[&>div]:bg-success" />
                {inSavings > 0 && (
                  <div className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <span className="text-muted-foreground">
                      Kogumiskontol märgitud {formatEur(inSavings)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={release.isPending}
                      onClick={() => release.mutate({ id: g.id, amount: inSavings })}
                    >
                      <Undo2 className="mr-1 h-4 w-4" /> Võta tagasi
                    </Button>
                  </div>
                )}
                {!isLinked && (
                  <Button variant="outline" size="sm" onClick={() => setFundGoalId(g.id)}>
                    <PiggyBank className="mr-1 h-4 w-4" /> Lisa raha
                  </Button>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor={`link-${g.id}`} className="text-sm font-normal">
                    Seo kategooriaga &quot;Finants ja kohustused&quot;
                  </Label>
                  <Switch
                    id={`link-${g.id}`}
                    checked={isLinked}
                    onCheckedChange={(v) => setLinked((l) => ({ ...l, [g.id]: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`share-${g.id}`} className="text-sm font-normal">
                    Jaga perega
                  </Label>
                  <Switch
                    id={`share-${g.id}`}
                    checked={g.shared}
                    onCheckedChange={(v) => setShared.mutate({ id: g.id, shared: v })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {fundGoalId && (
        <GoalFundDialog
          open
          onOpenChange={(o) => !o && setFundGoalId(null)}
          goalId={fundGoalId}
          goalName={(goals ?? []).find((g) => g.id === fundGoalId)?.name ?? "Eesmärk"}
          freeBuffer={buffer}
          monthFree={monthFree}
        />
      )}
    </div>
  );
}
