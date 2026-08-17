import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PiggyBank, Wallet } from "lucide-react";
import { fundGoal, type GoalFundSource } from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
  freeBuffer: number;
  monthFree: number;
};

export function GoalFundDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
  freeBuffer,
  monthFree,
}: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<GoalFundSource>("buffer");

  const available = source === "buffer" ? freeBuffer : monthFree;

  const fund = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Sisesta korrektne summa");
      if (value > available + 0.001)
        throw new Error(
          source === "buffer"
            ? "Kogumiskonto vabas puhvris pole nii palju raha"
            : "Selle kuu vaba raha ei kata seda summat",
        );
      await fundGoal(goalId, value, source);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Raha lisatud eesmärgile");
      setAmount("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lisa raha: {goalName}</DialogTitle>
          <DialogDescription>Vali, kust raha eesmärgi jaoks tuleb.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSource("buffer")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                source === "buffer" ? "border-primary bg-muted" : "hover:bg-muted"
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <PiggyBank className="h-4 w-4 text-primary" /> Kogumiskonto
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                vaba puhver {formatEur(freeBuffer)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSource("month")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                source === "month" ? "border-primary bg-muted" : "hover:bg-muted"
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Wallet className="h-4 w-4 text-primary" /> Selle kuu raha
              </p>
              <p className="mt-1 text-xs text-muted-foreground">vaba {formatEur(monthFree)}</p>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fund-amount">Summa (€)</Label>
            <Input
              id="fund-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {source === "buffer"
                ? "Raha jääb kogumiskontole, aga märgitakse selle eesmärgi sahtlisse."
                : "Raha kantakse kuu kulutuste kontolt kogumiskontole ja märgitakse eesmärgile."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Loobu
          </Button>
          <Button onClick={() => fund.mutate()} disabled={fund.isPending}>
            Lisa raha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
