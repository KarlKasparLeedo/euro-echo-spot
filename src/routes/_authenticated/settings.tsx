import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRecurring, type Recurring, setOnboardingCompleted, resetAllAccounts } from "@/lib/finance";
import { CATEGORIES, formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Seaded | Finantsjälgija" },
      { name: "description", content: "Profiil, korduvad tehingud ja väljalogimine." },
      { property: "og:title", content: "Seaded | Finantsjälgija" },
      { property: "og:description", content: "Profiil, korduvad tehingud ja väljalogimine." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const { data: recurring } = useQuery({ queryKey: ["recurring"], queryFn: fetchRecurring });

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Eluase");
  const [day, setDay] = useState("1");
  const [isVariable, setIsVariable] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");
      const { error } = await supabase.from("recurring_transactions").insert({
        type,
        amount: value,
        category: type === "expense" ? category : null,
        merchant: merchant.trim() || null,
        day_of_month: Math.min(Math.max(Number(day) || 1, 1), 28),
        is_variable: type === "income" ? isVariable : false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
      setAmount("");
      setMerchant("");
      setIsVariable(false);
      toast.success("Korduv tehing lisatud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("recurring_transactions").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
      toast.success("Kustutatud");
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Seaded</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profiil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">E-post</p>
            <p className="font-medium">{email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await setOnboardingCompleted(false);
                navigate({ to: "/onboarding" });
              }}
            >
              Seadista uuesti
            </Button>
            <Button variant="outline" onClick={signOut}>
              Logi välja
            </Button>
          </div>
        </CardContent>
      </Card>





      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Korduvad tehingud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Tüüp</Label>
              <Select value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Kulu</SelectItem>
                  <SelectItem value="income">Sissetulek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Summa (€)</Label>
              <Input
                id="rec-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-merchant">Kirjeldus</Label>
              <Input
                id="rec-merchant"
                placeholder="nt Üür või Palk"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
            {type === "expense" && (
              <div className="space-y-1.5">
                <Label>Kategooria</Label>
                <Select value={category} onValueChange={setCategory}>
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
            <div className="space-y-1.5">
              <Label htmlFor="rec-day">Kuupäev kuus (1-28)</Label>
              <Input id="rec-day" type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            {type === "income" && (
              <label className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={isVariable} onCheckedChange={setIsVariable} aria-label="Summa on iga kuu erinev" />
                <span className="text-sm">
                  Summa on iga kuu erinev (nt põhipalk + boonus) — küsime palgapäeval üle
                </span>
              </label>
            )}
            <Button type="submit" className="sm:col-span-2">
              <Plus className="mr-1 h-4 w-4" /> Lisa korduv tehing
            </Button>
          </form>

          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["income", "Sissetulekud"],
                ["expense", "Kulud"],
              ] as const
            ).map(([kind, title]) => {
              const list = (recurring ?? []).filter((r: Recurring) => r.type === kind);
              const total = list.filter((r) => r.active).reduce((a, r) => a + r.amount, 0);
              return (
                <div key={kind}>
                  <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                  {list.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">Ridu pole</p>
                  ) : (
                    <ul className="divide-y">
                      {list.map((r: Recurring) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {r.merchant || title} · {formatEur(r.amount)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              iga kuu {r.day_of_month}. kuupäeval{r.category ? ` · ${r.category}` : ""}
                              {r.is_variable ? " · muutuv summa" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={r.active}
                              onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })}
                              aria-label="Aktiivne"
                            />
                            <Button variant="ghost" size="icon" aria-label="Kustuta" onClick={() => remove.mutate(r.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="pt-2 text-xs text-muted-foreground">Kuus kokku {formatEur(total)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
