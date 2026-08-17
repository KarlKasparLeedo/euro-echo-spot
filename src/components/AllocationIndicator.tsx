import { formatEur } from "@/lib/categories";
import { Progress } from "@/components/ui/progress";

type Props = {
  income: number;
  allocated: number;
  className?: string;
};

/** Näitab, kui palju igakuisest sissetulekust on eelarvetesse määratud ja kui palju veel vaba. */
export function AllocationIndicator({ income, allocated, className }: Props) {
  const remaining = income - allocated;
  const pct = income > 0 ? Math.min((allocated / income) * 100, 100) : 0;
  const over = remaining < 0;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Igakuine sissetulek {income > 0 ? formatEur(income) : "määramata"}
        </span>
        <span className={over ? "font-medium text-destructive" : "font-medium text-primary"}>
          {over
            ? `Üle määratud ${formatEur(Math.abs(remaining))}`
            : `Veel määrata ${formatEur(remaining)}`}
        </span>
      </div>
      <Progress
        value={pct}
        className={`mt-2 ${over ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-warning" : ""}`}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Eelarvetesse määratud {formatEur(allocated)}
        {income > 0 ? ` · ${Math.round((allocated / income) * 100)}% sissetulekust` : ""}
      </p>
    </div>
  );
}
