import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { fetchFamilyOverview } from "@/lib/household";
import { availableMonths, fetchTransactions, monthKey, monthLabel } from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({
    meta: [
      { title: "Pere | Finantsjälgija" },
      {
        name: "description",
        content: "Vaadake koos jagatud eelarvete kulusid ja ühiste eesmärkide täitumist.",
      },
      { property: "og:title", content: "Pere | Finantsjälgija" },
      {
        property: "og:description",
        content: "Vaadake koos jagatud eelarvete kulusid ja ühiste eesmärkide täitumist.",
      },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  const [key, setKey] = useState(monthKey(new Date()));
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data, isLoading } = useQuery({
    queryKey: ["family", key],
    queryFn: () => fetchFamilyOverview(key),
  });

  const months = Array.from(new Set([monthKey(new Date()), ...availableMonths(txns ?? [])]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pere</h1>
          <p className="text-sm text-muted-foreground">
            Siin näete ainult neid eelarveid ja eesmärke, mille olete märkinud jagatuks. Kontojäägid,
            palgad ja üksiktehingud jäävad privaatseks.
          </p>
        </div>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <HouseholdCard />

      {data?.household && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" /> Liikmed
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {data.members.map((m) => (
                <span key={m.user_id} className="rounded-full border px-3 py-1">
                  {m.name}
                  {m.isMe ? " (sina)" : ""}
                </span>
              ))}
            </CardContent>
          </Card>



          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jagatud eelarved</CardTitle>
              <CardDescription>{monthLabel(key)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.budgets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ühtegi eelarvet pole veel jagatuks märgitud.
                </p>
              )}
              {data.budgets.map((b) => {
                const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
                return (
                  <div key={b.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className="text-muted-foreground">
                        {formatEur(b.spent)} / {b.limit > 0 ? formatEur(b.limit) : "eelarveta"}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(pct, 100)}
                      className={pct >= 100 ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-warning" : ""}
                    />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {b.byMember.length === 0 && <span>selle kuu kulutusi pole</span>}
                      {b.byMember.map((m) => (
                        <span key={m.user_id}>
                          {m.name}: {formatEur(m.amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jagatud eesmärgid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.goals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ühtegi eesmärki pole veel jagatuks märgitud.
                </p>
              )}
              {data.goals.map((g) => {
                const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                return (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">
                        {formatEur(g.saved)} / {formatEur(g.target)}
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="[&>div]:bg-success" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {g.byMember.length === 0 && <span>panuseid pole veel kirjas</span>}
                      {g.byMember.map((m) => (
                        <span key={m.user_id}>
                          {m.name}: {formatEur(m.amount)}
                        </span>
                      ))}
                      {g.deadline && <span>tähtaeg {g.deadline}</span>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
