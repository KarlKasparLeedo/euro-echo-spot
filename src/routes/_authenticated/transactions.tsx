import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchTransactions, type Txn } from "@/lib/finance";
import { CATEGORIES, formatEur } from "@/lib/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Tehingud | Finantsjälgija" },
      {
        name: "description",
        content: "Kõik kulud ja sissetulekud koos filtrite, otsingu ja sorteerimisega.",
      },
      { property: "og:title", content: "Tehingud | Finantsjälgija" },
      {
        property: "og:description",
        content: "Kõik kulud ja sissetulekud koos filtrite, otsingu ja sorteerimisega.",
      },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [editing, setEditing] = useState<Txn | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Tehing kustutatud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: Txn[] = useMemo(() => {
    let list = data ?? [];
    if (type !== "all") list = list.filter((t) => t.type === type);
    if (category !== "all") list = list.filter((t) => t.category === category);
    if (from) list = list.filter((t) => t.date >= from);
    if (to) list = list.filter((t) => t.date <= to);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.merchant ?? "").toLowerCase().includes(q) || (t.note ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return sorted;
  }, [data, type, category, from, to, search, sort]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Tehingute ajalugu</h1>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label>Otsing</Label>
            <Input
              placeholder="Koht või märkus"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tüüp</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kõik</SelectItem>
                <SelectItem value="expense">Kulud</SelectItem>
                <SelectItem value="income">Sissetulekud</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kategooria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kõik</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Alates</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kuni</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sorteeri</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Kuupäev (uuemad)</SelectItem>
                <SelectItem value="date-asc">Kuupäev (vanemad)</SelectItem>
                <SelectItem value="amount-desc">Summa (suurem)</SelectItem>
                <SelectItem value="amount-asc">Summa (väiksem)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tehinguid ei leitud</p>
          ) : (
            <ul className="divide-y">
              {rows.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditing(t)}
                    aria-label="Muuda tehingut"
                  >
                    <p className="truncate text-sm font-medium">
                      {t.merchant || (t.type === "income" ? "Sissetulek" : "Kulu")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.date}
                      {t.category ? ` · ${t.category}` : ""}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        t.type === "income" ? "font-semibold text-success" : "font-semibold"
                      }
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatEur(t.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Muuda"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Kustuta"
                      onClick={() => del.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
