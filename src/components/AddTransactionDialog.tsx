import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, guessCategory } from "@/lib/categories";
import type { Txn } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Kui antud, siis muudetakse olemasolevat tehingut. */
  transaction?: Txn | null;
}) {
  const qc = useQueryClient();
  const editing = !!transaction;
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Muu/liigitamata");
  const [touchedCategory, setTouchedCategory] = useState(false);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState<"month" | "savings">("month");

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setMerchant(transaction.merchant ?? "");
      setCategory(transaction.category ?? "Muu/liigitamata");
      setTouchedCategory(true);
      setDate(transaction.date);
      setNote(transaction.note ?? "");
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id]);

  useEffect(() => {
    if (touchedCategory) return;
    const guess = guessCategory(merchant);
    if (guess) setCategory(guess);
  }, [merchant, touchedCategory]);

  function reset() {
    setType("expense");
    setAmount("");
    setMerchant("");
    setCategory("Muu/liigitamata");
    setTouchedCategory(false);
    setDate(today());
    setNote("");
    setDestination("month");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");

      if (!transaction && type === "income" && destination === "savings") {
        const { error } = await supabase.from("savings_movements").insert({
          kind: "deposit",
          amount: value,
          date,
          note: [merchant.trim(), note.trim()].filter(Boolean).join(" · ") || null,
        });
        if (error) throw error;
        return;
      }

      const payload = {
        type,
        amount: value,
        category: type === "expense" ? category : null,
        merchant: merchant.trim() || null,
        date,
        note: note.trim() || null,
      };
      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", transaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["savings"] });
      toast.success(
        editing
          ? "Tehing salvestatud"
          : type === "expense"
            ? "Kulu lisatud"
            : destination === "savings"
              ? "Sissetulek lisatud kogumiskontole"
              : "Sissetulek lisatud",
      );
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Tehing kustutatud");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Muuda tehingut" : "Uus tehing"}</DialogTitle>
        </DialogHeader>
        <Tabs value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Kulu</TabsTrigger>
            <TabsTrigger value="income">Sissetulek</TabsTrigger>
          </TabsList>
        </Tabs>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="amount">Summa (€)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-semibold h-14"
            />
          </div>

          {type === "expense" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="merchant">Koht / kirjeldus</Label>
                <Input
                  id="merchant"
                  placeholder="nt Selver"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategooria</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    setTouchedCategory(true);
                  }}
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
            </>
          )}

          {type === "income" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="merchant-income">Nimetus</Label>
                <Input
                  id="merchant-income"
                  placeholder="nt Palk"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Kuhu raha läheb?</Label>
                  <Select
                    value={destination}
                    onValueChange={(v) => setDestination(v as "month" | "savings")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Kuu kulutuste konto</SelectItem>
                      <SelectItem value="savings">Kogumiskonto</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Kogumiskontole lisatud raha ei arvestata selle kuu kulutamiseks.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Kuupäev</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Märkus (valikuline)</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvestan..." : "Salvesta"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Kustuta tehing
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
