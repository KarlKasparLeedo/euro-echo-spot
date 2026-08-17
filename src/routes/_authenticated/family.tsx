import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { fetchFamilyOverview } from "@/lib/household";
import { availableMonths, fetchTransactions, monthKey, monthLabel } from "@/lib/finance";
import { formatEur } from "@/lib/categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HouseholdCard } from "@/components/HouseholdCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MEMBER_FILL = ["bg-primary", "bg-success", "bg-warning", "bg-destructive"];
const MEMBER_TRACK = ["bg-primary/15", "bg-success/15", "bg-warning/15", "bg-destructive/15"];
const MEMBER_PROGRESS = [
  "[&>div]:bg-primary",
  "[&>div]:bg-success",
  "[&>div]:bg-warning",
  "[&>div]:bg-destructive",
];

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
  const { data } = useQuery({
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
                const members = b.byMember;
                const totalLimit = members.reduce((a, m) => a + m.limit, 0);
                const scale = Math.max(totalLimit, b.spent, 1);
                const overflow = Math.max(b.spent - totalLimit, 0);
                const left = Math.max(totalLimit - b.spent, 0);
                const limitMark = totalLimit > 0 ? (totalLimit / scale) * 100 : 100;
                return (
                  <div key={b.category} className="space-y-2">
                    <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className="text-muted-foreground">
                        {formatEur(b.spent)} / {totalLimit > 0 ? formatEur(totalLimit) : "eelarveta"}
                        {totalLimit > 0 && (
                          <span className={overflow > 0 ? "ml-2 text-destructive" : "ml-2"}>
                            {overflow > 0 ? `ületatud ${formatEur(overflow)}` : `jäänud ${formatEur(left)}`}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="relative h-5 w-full overflow-hidden rounded-md border bg-muted/60">
                      <div className="flex h-full w-full">
                        {members.map((m, i) => (
                          <div
                            key={m.user_id}
                            className={`h-full ${MEMBER_FILL[i % MEMBER_FILL.length]}`}
                            style={{ width: `${(Math.min(m.amount, Math.max(scale - 0, 0)) / scale) * 100}%` }}
                            title={`${m.name}: ${formatEur(m.amount)}`}
                          />
                        ))}
                        {overflow > 0 && (
                          <div
                            className="h-full bg-destructive/70"
                            style={{ width: `${(overflow / scale) * 100}%` }}
                            title={`Ületatud ${formatEur(overflow)}`}
                          />
                        )}
                      </div>
                      {totalLimit > 0 && limitMark < 100 && (
                        <div
                          className="absolute inset-y-0 w-0.5 bg-foreground/60"
                          style={{ left: `${limitMark}%` }}
                          title={`Eelarve ${formatEur(totalLimit)}`}
                        />
                      )}
                    </div>

                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {members.length === 0 && <span>selle kuu kulutusi pole</span>}
                      {members.map((m, i) => {
                        const pct = m.limit > 0 ? Math.round((m.amount / m.limit) * 100) : null;
                        return (
                          <span key={m.user_id} className="flex items-center gap-1.5">
                            <span
                              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${MEMBER_FILL[i % MEMBER_FILL.length]}`}
                            />
                            <span className="text-foreground">{m.name}</span>
                            {formatEur(m.amount)}
                            {m.limit > 0 ? ` / ${formatEur(m.limit)} (${pct}%)` : " (eelarveta)"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jagatud eesmärgid</CardTitle>
              <CardDescription>Iga eesmärgi juures on näha, kelle eesmärk see on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.goals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ühtegi eesmärki pole veel jagatuks märgitud.
                </p>
              )}
              {data.members
                .filter((m) => data.goals.some((g) => g.ownerId === m.user_id))
                .map((owner, oi) => {
                  const ownerGoals = data.goals.filter((g) => g.ownerId === owner.user_id);
                  return (
                    <div key={owner.user_id} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-sm ${MEMBER_FILL[oi % MEMBER_FILL.length]}`}
                        />
                        <span>{owner.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {ownerGoals.length} eesmärki
                        </span>
                      </div>
                      {ownerGoals.map((g) => {
                        const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                        return (
                          <div
                            key={g.id}
                            className={`space-y-2 rounded-lg border-l-4 py-1 pl-3 ${MEMBER_TRACK[oi % MEMBER_TRACK.length]}`}
                          >
                            <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                              <span className="flex items-center gap-2 font-medium">
                                {g.name}
                                <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                  {g.isMine ? "sinu eesmärk" : `${g.ownerName} eesmärk`}
                                </span>
                                {g.saved >= g.target && g.target > 0 && (
                                  <span className="rounded-full bg-success px-2 py-0.5 text-xs text-success-foreground">
                                    Täidetud
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground">
                                {formatEur(g.saved)} / {formatEur(g.target)}
                              </span>
                            </div>
                            <Progress
                              value={Math.min(pct, 100)}
                              className={MEMBER_PROGRESS[oi % MEMBER_PROGRESS.length]}
                            />
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {g.byMember.length === 0 && <span>panuseid pole veel kirjas</span>}
                              {g.byMember.map((m) => (
                                <span key={m.user_id}>
                                  panustas {m.name}: {formatEur(m.amount)}
                                </span>
                              ))}
                              {g.deadline && <span>tähtaeg {g.deadline}</span>}
                            </div>
                          </div>
                        );
                      })}
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
