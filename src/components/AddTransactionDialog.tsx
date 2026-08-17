import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, guessCategory } from "@/lib/categories";
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>("Muu/liigitamata");
  const [touchedCategory, setTouchedCategory] = useState(false);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (touchedCategory) return;
    const guess = guessCategory(merchant);
    if (guess) setCategory(guess);
  }, [merchant, touchedCategory]);

  function reset() {
    setAmount("");
    setMerchant("");
    setCategory("Muu/liigitamata");
    setTouchedCategory(false);
    setDate(today());
    setNote("");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");
      const { error } = await supabase.from("transactions").insert({
        type,
        amount: value,
        category: type === "expense" ? category : null,
        merchant: merchant.trim() || null,
        date,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(type === "expense" ? "Kulu lisatud" : "Sissetulek lisatud");
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Uus tehing</DialogTitle>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
