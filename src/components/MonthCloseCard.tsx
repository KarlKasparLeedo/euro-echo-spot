import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import {
  closeMonth,
  fetchAllocations,
  fetchMonthClosures,
  fetchTransactions,
  monthKey,
  monthKeyToStart,
  monthLabel,
  monthReport,
} from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function MonthCloseCard() {
  const qc = useQueryClient();
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: allocations } = useQuery({ queryKey: ["allocations"], queryFn: fetchAllocations });
  const { data: closures } = useQuery({ queryKey: ["closures"], queryFn: fetchMonthClosures });
  const [amount, setAmount] = useState("");

  const now = new Date();
  const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const currentKey = monthKey(now);
  const closedPrev = (closures ?? []).find((c) => c.month === monthKeyToStart(prevKey));
  const targetKey = closedPrev ? currentKey : prevKey;
  const targetStart = monthKeyToStart(targetKey);
  const closure = (closures ?? []).find((c) => c.month === targetStart);

  const report = monthReport(txns ?? [], targetKey);
  const allocated = (allocations ?? [])
    .filter((a) => a.month === targetStart)
    .reduce((acc, a) => acc + a.amount, 0);
  const available = Math.max(report.surplus - allocated, 0);

  const close = useMutation({
    mutationFn: async () => {
      const raw = amount.trim() === "" ? available : Number(amount.replace(",", "."));
      if (!Number.isFinite(raw) || raw <= 0) throw new Error("Sisesta korrektne summa");
      const value = Math.min(raw, available);
      await closeMonth(targetStart, value);
      return value;
    },
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["closures"] });
      qc.invalidateQueries({ queryKey: ["savings"] });
      setAmount("");
      toast.success(`${formatEur(value)} kanti kogumiskontole`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="h-4 w-4 text-primary" /> Kuu lõpetamine · {monthLabel(targetKey)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Tulud</p>
            <p className="font-semibold">{formatEur(report.income)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kulud</p>
            <p className="font-semibold">{formatEur(report.expense)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ülejääk</p>
            <p className="font-semibold">{formatEur(report.surplus)}</p>
          </div>
        </div>

        {closure ? (
          <p className="text-sm text-muted-foreground">
            Kuu on lõpetatud · kogumiskontole kanti {formatEur(closure.amount)}.
          </p>
        ) : available <= 0 ? (
          <p className="text-sm text-muted-foreground">
            Sellel kuul pole vaba ülejääki, mida kogumiskontole kanda.
          </p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              close.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="close-amount">Summa (€)</Label>
              <Input
                id="close-amount"
                inputMode="decimal"
                placeholder={String(available.toFixed(2))}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-36"
              />
            </div>
            <Button type="submit" disabled={close.isPending}>
              Kanna ülejääk kogumiskontole
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              Vaba ülejääk {formatEur(available)}. Kogumiskontolt saad hiljem otsustada, kui palju läheb
              eesmärkidesse ja kui palju jääb puhvriks.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
