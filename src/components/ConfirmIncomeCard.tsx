import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { confirmVariableIncome, type Recurring } from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function Row({ item }: { item: Recurring }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(item.amount));

  const confirm = useMutation({
    mutationFn: async (value: number) => {
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");
      await confirmVariableIncome(item, value);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Sissetulek kirjas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm">
        Kas said {item.merchant || "sissetuleku"} {formatEur(item.amount)}?
      </p>
      {editing && (
        <div className="space-y-1.5">
          <Label htmlFor={`ci-${item.id}`}>Tegelik summa (€)</Label>
          <Input
            id={`ci-${item.id}`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <Button
            size="sm"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate(Number(amount.replace(",", ".")))}
          >
            Kinnita summa
          </Button>
        ) : (
          <>
            <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(item.amount)}>
              Jah, õige
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Muuda summat
            </Button>
          </>
        )}
        {editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Tagasi
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConfirmIncomeCard({ items }: { items: Recurring[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Kinnita sissetulek</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((r) => (
          <Row key={r.id} item={r} />
        ))}
        <p className="text-xs text-muted-foreground">
          Kui sa pole veel raha saanud, jäta vastamata — küsime hiljem uuesti.
        </p>
      </CardContent>
    </Card>
  );
}
