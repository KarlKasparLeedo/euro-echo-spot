import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGoals,
  fetchSavingsMovements,
  fetchTransactions,
  type SavingsMovement,
  type Txn,
} from "@/lib/finance";
import { CATEGORIES, formatEur } from "@/lib/categories";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        content: "Kõik kulud, sissetulekud ja kogumiskonto liikumised koos filtritega.",
      },
      { property: "og:title", content: "Tehingud | Finantsjälgija" },
      {
        property: "og:description",
        content: "Kõik kulud, sissetulekud ja kogumiskonto liikumised koos filtritega.",
      },
    ],
  }),
  component: TransactionsPage,
});

const WALLET = "Kuu rahakott";
const SAVINGS = "Kogumiskonto";

type Row = {
  id: string;
  date: string;
  title: string;
  meta: string;
  amount: number;
  /** Kuidas summa mõjub: sisse (+), välja (−) või sisemine liigutus. */
  flow: "in" | "out" | "internal";
  from: string | null;
  to: string | null;
  account: "wallet" | "savings";
  type: "income" | "expense" | null;
  category: string | null;
  txn: Txn | null;
};

function movementRow(m: SavingsMovement, goalName: (id: string | null) => string): Row {
  const base = { id: `s-${m.id}`, date: m.date, account: "savings" as const, amount: m.amount };
  switch (m.kind) {
    case "deposit":
      return {
        ...base,
        title: "Sissemakse kogumiskontole",
        meta: m.note ?? "",
        flow: "in",
        from: m.note === "Kuu rahast eesmärgile" ? WALLET : "Väline",
        to: SAVINGS,
        type: null,
        category: null,
        txn: null,
      };
    case "withdrawal":
      return {
        ...base,
        title: "Väljavõtmine kogumiskontolt",
        meta: m.note ?? "",
        flow: "out",
        from: SAVINGS,
        to: WALLET,
        type: null,
        category: null,
        txn: null,
      };
    case "goal":
      return {
        ...base,
        title: `Suunatud eesmärgile: ${goalName(m.goal_id)}`,
        meta: m.note ?? "Raha jääb kogumiskontole, aga on eesmärgi sahtlis",
        flow: "internal",
        from: `${SAVINGS} (vaba)`,
        to: `Eesmärk: ${goalName(m.goal_id)}`,
        type: null,
        category: null,
        txn: null,
      };
    default:
      return {
        ...base,
        title: `Vabastatud eesmärgist: ${goalName(m.goal_id)}`,
        meta: m.note ?? "",
        flow: "internal",
        from: `Eesmärk: ${goalName(m.goal_id)}`,
        to: `${SAVINGS} (vaba)`,
        type: null,
        category: null,
        txn: null,
      };
  }
}

function txnRow(t: Txn): Row {
  const fromSavings = t.type === "income" && t.merchant === "Kogumiskontolt";
  const toSavings = t.type === "expense" && t.merchant === "Kogumiskonto";
  return {
    id: `t-${t.id}`,
    date: t.date,
    title: t.merchant || (t.type === "income" ? "Sissetulek" : "Kulu"),
    meta: [t.category, t.note].filter(Boolean).join(" · "),
    amount: t.amount,
    flow: t.type === "income" ? "in" : "out",
    from: t.type === "income" ? (fromSavings ? SAVINGS : "Väline") : WALLET,
    to: t.type === "income" ? WALLET : toSavings ? SAVINGS : "Väline",
    account: "wallet",
    type: t.type,
    category: t.category,
    txn: t,
  };
}

function TransactionsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: movements } = useQuery({
    queryKey: ["savings_movements"],
    queryFn: fetchSavingsMovements,
  });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const [account, setAccount] = useState("all");
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

  const rows: Row[] = useMemo(() => {
    const goalName = (id: string | null) =>
      goals?.find((g) => g.id === id)?.name ?? "Eesmärk";
    let list: Row[] = [
      ...(data ?? []).map(txnRow),
      ...(movements ?? []).map((m) => movementRow(m, goalName)),
    ];
    if (account !== "all") list = list.filter((r) => r.account === account);
    if (type !== "all") list = list.filter((r) => r.type === type);
    if (category !== "all") list = list.filter((r) => r.category === category);
    if (from) list = list.filter((r) => r.date >= from);
    if (to) list = list.filter((r) => r.date <= to);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q),
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
  }, [data, movements, goals, account, type, category, from, to, search, sort]);

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
            <Label>Konto</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kõik</SelectItem>
                <SelectItem value="wallet">Kuu rahakott</SelectItem>
                <SelectItem value="savings">Kogumiskonto</SelectItem>
              </SelectContent>
            </Select>
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
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.account === "savings" ? "secondary" : "outline"}>
                        {r.account === "savings" ? SAVINGS : WALLET}
                      </Badge>
                      <p className="truncate text-sm font-medium">{r.title}</p>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{r.from}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{r.to}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.date}
                      {r.meta ? ` · ${r.meta}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        r.flow === "in"
                          ? "font-semibold text-success"
                          : r.flow === "internal"
                            ? "font-semibold text-muted-foreground"
                            : "font-semibold"
                      }
                    >
                      {r.flow === "in" ? "+" : r.flow === "out" ? "−" : ""}
                      {formatEur(r.amount)}
                    </span>
                    {r.txn ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Muuda"
                          onClick={() => setEditing(r.txn)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Kustuta"
                          onClick={() => r.txn && del.mutate(r.txn.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        transaction={editing}
      />
    </div>
  );
}
