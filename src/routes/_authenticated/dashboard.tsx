import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Flame, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import {
  fetchTransactions,
  fetchGoals,
  fetchBudgets,
  fetchRecurring,
  fetchSavingsMovements,
  savingsBalance,
  freeBuffer,
  goalSavedFromMovements,
  applyRecurring,
  pendingVariableIncomes,
  monthKey,
  inMonth,
  sum,
  MONTH_NAMES,
  type Txn,
} from "@/lib/finance";
import { CATEGORY_COLORS, formatEur } from "@/lib/categories";
import { ConfirmIncomeCard } from "@/components/ConfirmIncomeCard";
import { MonthCloseCard } from "@/components/MonthCloseCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Ülevaade | Finantsjälgija" },
      {
        name: "description",
        content: "Bilanss, kuu kulud, eelarve progress ja kulutamistempo ühel pilgul.",
      },
      { property: "og:title", content: "Ülevaade | Finantsjälgija" },
      {
        property: "og:description",
        content: "Bilanss, kuu kulud, eelarve progress ja kulutamistempo ühel pilgul.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const txQuery = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const budgetQuery = useQuery({ queryKey: ["budgets"], queryFn: fetchBudgets });
  const recQuery = useQuery({ queryKey: ["recurring"], queryFn: fetchRecurring });
  const savingsQuery = useQuery({ queryKey: ["savings"], queryFn: fetchSavingsMovements });
  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });

  useEffect(() => {
    if (!recQuery.data) return;
    applyRecurring(recQuery.data).then((n) => {
      if (n > 0) {
        txQuery.refetch();
        recQuery.refetch();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recQuery.data]);

  const txns: Txn[] = txQuery.data ?? [];
  const now = new Date();
  const key = monthKey(now);
  const monthTx = txns.filter((t) => inMonth(t, key));
  const expenses = monthTx.filter((t) => t.type === "expense");
  const incomes = monthTx.filter((t) => t.type === "income");
  const totalExpense = sum(expenses);
  const totalIncome = sum(incomes);
  const balance = sum(txns.filter((t) => t.type === "income")) - sum(txns.filter((t) => t.type === "expense"));

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, t) => {
      const c = t.category ?? "Muu/liigitamata";
      acc[c] = (acc[c] ?? 0) + t.amount;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const k = monthKey(d);
    const list = txns.filter((t) => inMonth(t, k));
    return {
      month: MONTH_NAMES[d.getMonth()]!.slice(0, 3),
      Kulud: sum(list.filter((t) => t.type === "expense")),
      Sissetulek: sum(list.filter((t) => t.type === "income")),
    };
  });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyRate = totalExpense / dayOfMonth;
  const projected = dailyRate * daysInMonth;
  const willLast = totalIncome === 0 ? null : projected <= totalIncome;

  const budgets = budgetQuery.data ?? [];
  const budgetRows = budgets
    .map((b) => {
      const spent = expenses.filter((t) => t.category === b.category).reduce((a, t) => a + t.amount, 0);
      return { ...b, spent, pct: b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0 };
    })
    .filter((b) => b.spent > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const savings = savingsBalance(savingsQuery.data ?? []);
  const free = freeBuffer(savingsQuery.data ?? []);
  const goalSaved = goalSavedFromMovements(savingsQuery.data ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ülevaade</h1>
        <p className="text-sm text-muted-foreground">
          {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
        </p>
      </div>

      <ConfirmIncomeCard items={pendingVariableIncomes(recQuery.data ?? [])} />

      <MonthCloseCard />



      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" /> Kontode ülevaade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Kuu kulutuste konto</p>
            <p className="mt-1 text-xl font-semibold">{formatEur(totalIncome - totalExpense)}</p>
            <p className="text-xs text-muted-foreground">selle kuu vaba raha</p>
          </div>
          <Link to="/savings" className="rounded-lg border p-3 transition-colors hover:bg-muted">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <PiggyBank className="h-3.5 w-3.5" /> Kogumiskonto
            </p>
            <p className="mt-1 text-xl font-semibold">{formatEur(savings)}</p>
            <p className="text-xs text-muted-foreground">sellest vaba {formatEur(free)}</p>
          </Link>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Kokku</p>
            <p className="mt-1 text-xl font-semibold">{formatEur(totalIncome - totalExpense + savings)}</p>
            <p className="text-xs text-muted-foreground">mõlemad kontod</p>
          </div>
        </CardContent>
        {(goalsQuery.data ?? []).length > 0 && (
          <CardContent className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Eesmärgid</p>
              <Link to="/goals" className="text-xs text-primary hover:underline">
                Halda eesmärke
              </Link>
            </div>
            {(goalsQuery.data ?? []).map((g) => {
              const saved = goalSaved[g.id] ?? g.saved_amount;
              const pct = g.target_amount > 0 ? (saved / g.target_amount) * 100 : 0;
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {g.name}
                      {pct >= 100 && (
                        <Badge variant="secondary" className="text-[10px]">
                          Täidetud
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {formatEur(saved)} / {formatEur(g.target_amount)}
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="[&>div]:bg-success" />
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <Card className="border-primary/20 bg-secondary/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Praegune bilanss</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{formatEur(balance)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-card p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDownRight className="h-3.5 w-3.5" /> Kuu kulud
              </p>
              <p className="text-lg font-semibold">{formatEur(totalExpense)}</p>
            </div>
            <div className="rounded-lg bg-card p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" /> Kuu sissetulek
              </p>
              <p className="text-lg font-semibold">{formatEur(totalIncome)}</p>
            </div>
          </div>
          {totalIncome - totalExpense > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Sel kuul jääb üle {formatEur(totalIncome - totalExpense)}.{" "}
              <Link to="/savings" className="text-primary hover:underline">
                Kanna kogumiskontole
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" /> Kulutamistempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Keskmiselt {formatEur(dailyRate)} päevas. Kuu lõpuks prognoos {formatEur(projected)}.
          </p>
          {willLast === null ? (
            <Badge variant="secondary">Lisa sissetulek, et näha prognoosi</Badge>
          ) : willLast ? (
            <Badge className="bg-success text-success-foreground">Raha jätkub kuu lõpuni</Badge>
          ) : (
            <Badge variant="destructive">
              Sellises tempos jääb puudu {formatEur(projected - totalIncome)}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kulude jaotus</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Selles kuus kulusid pole</p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {byCategory.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "hsl(210 12% 55%)"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1 text-sm">
                  {byCategory.slice(0, 5).map((c) => (
                    <li key={c.name} className="flex items-center justify-between">
                      <Link
                        to="/category/$name"
                        params={{ name: c.name }}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[c.name] ?? "hsl(210 12% 55%)" }}
                        />
                        {c.name}
                      </Link>
                      <span className="font-medium">{formatEur(c.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Trend (6 kuud)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} width={40} />
                  <Tooltip formatter={(v: number) => formatEur(v)} />
                  <Line type="monotone" dataKey="Kulud" stroke="var(--color-chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Sissetulek" stroke="var(--color-chart-2)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>


      {budgetRows.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Eelarve progress</CardTitle>
            <Link to="/budgets" className="text-sm text-primary hover:underline">
              Halda
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetRows.map((b) => (
              <div key={b.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{b.category}</span>
                  <span className="text-muted-foreground">
                    {formatEur(b.spent)} / {formatEur(b.monthly_limit)}
                  </span>
                </div>
                <Progress
                  value={Math.min(b.pct, 100)}
                  className={b.pct >= 100 ? "[&>div]:bg-destructive" : b.pct >= 80 ? "[&>div]:bg-warning" : ""}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Viimased tehingud</CardTitle>
          <Link to="/transactions" className="text-sm text-primary hover:underline">
            Vaata kõiki
          </Link>
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tehinguid pole veel. Vajuta &quot;+&quot; nuppu, et lisada esimene.
            </p>
          ) : (
            <ul className="divide-y">
              {txns.slice(0, 6).map((t) => (
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
