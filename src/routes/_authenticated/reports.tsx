import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  availableMonths,
  fetchAllocations,
  fetchBudgets,
  fetchMonthClosures,
  fetchTransactions,
  monthKey,
  monthKeyToStart,
  monthLabel,
  monthReport,
} from "@/lib/finance";
import { CATEGORY_COLORS, formatEur } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Aruanded | Finantsjälgija" },
      {
        name: "description",
        content: "Vaata varasemate kuude tulusid, kulusid, eelarve täitmist ja kogumiskontole kantud summasid.",
      },
      { property: "og:title", content: "Aruanded | Finantsjälgija" },
      {
        property: "og:description",
        content: "Vaata varasemate kuude tulusid, kulusid, eelarve täitmist ja kogumiskontole kantud summasid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: txns } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: budgets } = useQuery({ queryKey: ["budgets"], queryFn: fetchBudgets });
  const { data: allocations } = useQuery({ queryKey: ["allocations"], queryFn: fetchAllocations });
  const { data: closures } = useQuery({ queryKey: ["closures"], queryFn: fetchMonthClosures });

  const months = availableMonths(txns ?? []);
  const [selected, setSelected] = useState<string>("");
  const key = selected || months[0] || monthKey(new Date());
  const report = monthReport(txns ?? [], key);
  const start = monthKeyToStart(key);

  const allocated = (allocations ?? [])
    .filter((a) => a.month === start)
    .reduce((acc, a) => acc + a.amount, 0);
  const closed = (closures ?? []).find((c) => c.month === start)?.amount ?? 0;

  const now = new Date();
  const compare = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const k = monthKey(d);
    const r = monthReport(txns ?? [], k);
    return { month: monthLabel(k).slice(0, 3), Sissetulek: r.income, Kulud: r.expense, Ülejääk: r.surplus };
  });

  const budgetRows = (budgets ?? []).map((b) => {
    const spent = report.byCategory.find((c) => c.name === b.category)?.value ?? 0;
    return { ...b, spent, pct: b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aruanded</h1>
          <p className="text-sm text-muted-foreground">Varasemate kuude kokkuvõtted ja võrdlus</p>
        </div>
        <Select value={key} onValueChange={setSelected}>
          <SelectTrigger className="w-56">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{monthLabel(key)}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Tulud" value={report.income} />
          <Stat label="Kulud" value={report.expense} />
          <Stat label="Ülejääk" value={report.surplus} />
          <Stat label="Kogumiskontole" value={closed} />
          <Stat label="Eesmärkidesse" value={allocated} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kulude jaotus</CardTitle>
          </CardHeader>
          <CardContent>
            {report.byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Selles kuus kulusid pole</p>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={82}
                    >
                      {report.byCategory.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "hsl(210 12% 55%)"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatEur(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Eelarve vs tegelik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Eelarveid pole määratud</p>
            ) : (
              budgetRows.map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.category}</span>
                    <span className="text-muted-foreground">
                      {formatEur(b.spent)} / {formatEur(b.monthly_limit)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(b.pct, 100)}
                    className={
                      b.pct >= 100 ? "[&>div]:bg-destructive" : b.pct >= 80 ? "[&>div]:bg-warning" : ""
                    }
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kuude võrdlus (12 kuud)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} width={45} />
                <Tooltip formatter={(v: number) => formatEur(v)} />
                <Legend />
                <Bar dataKey="Sissetulek" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Kulud" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ülejääk" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Kuu tehingud</CardTitle>
          <Link to="/transactions" className="text-sm text-primary hover:underline">
            Vaata kõiki
          </Link>
        </CardHeader>
        <CardContent>
          {report.txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Selles kuus tehinguid pole</p>
          ) : (
            <ul className="divide-y">
              {report.txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {t.merchant || (t.type === "income" ? "Sissetulek" : "Kulu")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.date} {t.category ? `· ${t.category}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "income" ? "font-semibold text-success" : "font-semibold text-foreground"
                    }
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatEur(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formatEur(value)}</p>
    </div>
  );
}
