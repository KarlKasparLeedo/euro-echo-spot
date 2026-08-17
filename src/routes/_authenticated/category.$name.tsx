import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowLeft } from "lucide-react";
import { fetchTransactions, monthKey, MONTH_NAMES, inMonth } from "@/lib/finance";
import { formatEur, SUBCATEGORIES } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/category/$name")({
  head: () => ({
    meta: [
      { title: "Kategooria detailvaade | Finantsjälgija" },
      { name: "description", content: "Vaata ühe kategooria kulusid ajas ja kõiki selle tehinguid." },
      { property: "og:title", content: "Kategooria detailvaade | Finantsjälgija" },
      {
        property: "og:description",
        content: "Vaata ühe kategooria kulusid ajas ja kõiki selle tehinguid.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { name } = Route.useParams();
  const { data } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const txns = (data ?? []).filter((t) => t.type === "expense" && t.category === name);

  const now = new Date();
  const chart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const k = monthKey(d);
    return {
      month: MONTH_NAMES[d.getMonth()]!.slice(0, 3),
      Kulud: txns.filter((t) => inMonth(t, k)).reduce((a, t) => a + t.amount, 0),
    };
  });

  return (
    <div className="space-y-5">
      <Link to="/budgets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tagasi eelarvete juurde
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(SUBCATEGORIES[name] ?? []).map((s) => (
            <Badge key={s} variant="secondary" className="font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kulud viimase 6 kuu jooksul</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} width={40} />
                <Tooltip formatter={(v: number) => formatEur(v)} />
                <Bar dataKey="Kulud" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tehingud</CardTitle>
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Selles kategoorias tehinguid pole</p>
          ) : (
            <ul className="divide-y">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{t.merchant || "Kulu"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.date}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold">{formatEur(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
