import { supabase } from "@/integrations/supabase/client";

export type Txn = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string | null;
  merchant: string | null;
  date: string;
  note: string | null;
  created_at: string;
};

export type Budget = {
  id: string;
  category: string;
  monthly_limit: number;
  rollover: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
};

export type Recurring = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string | null;
  merchant: string | null;
  day_of_month: number;
  note: string | null;
  active: boolean;
  last_applied_month: string | null;
  is_variable: boolean;
};

export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthStart(d = new Date()): string {
  return `${monthKey(d)}-01`;
}

export function monthEnd(d = new Date()): string {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${monthKey(end)}-${String(end.getDate()).padStart(2, "0")}`;
}

export const MONTH_NAMES = [
  "jaanuar",
  "veebruar",
  "märts",
  "aprill",
  "mai",
  "juuni",
  "juuli",
  "august",
  "september",
  "oktoober",
  "november",
  "detsember",
];

export async function fetchTransactions(): Promise<Txn[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Txn[];
}

export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase.from("budgets").select("*").order("category");
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, monthly_limit: Number(b.monthly_limit) })) as Budget[];
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from("goals").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map((g) => ({
    ...g,
    target_amount: Number(g.target_amount),
    saved_amount: Number(g.saved_amount),
  })) as Goal[];
}

export async function fetchRecurring(): Promise<Recurring[]> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("day_of_month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Recurring[];
}

/** Applies recurring transactions for the current month (once per month). */
export async function applyRecurring(items: Recurring[]): Promise<number> {
  const now = new Date();
  const start = monthStart(now);
  const due = items.filter((r) => r.active && !r.is_variable && r.last_applied_month !== start);
  if (due.length === 0) return 0;


  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const rows = due.map((r) => ({
    type: r.type,
    amount: r.amount,
    category: r.type === "expense" ? r.category : null,
    merchant: r.merchant,
    date: `${monthKey(now)}-${String(Math.min(r.day_of_month, lastDay)).padStart(2, "0")}`,
    note: r.note,
  }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;
  const { error: upErr } = await supabase
    .from("recurring_transactions")
    .update({ last_applied_month: start })
    .in(
      "id",
      due.map((r) => r.id),
    );
  if (upErr) throw upErr;
  return rows.length;
}

export function sum(list: Txn[]): number {
  return list.reduce((acc, t) => acc + t.amount, 0);
}

export function inMonth(t: Txn, key: string): boolean {
  return t.date.slice(0, 7) === key;
}

export type Allocation = {
  id: string;
  goal_id: string;
  amount: number;
  month: string;
};

export async function fetchAllocations(): Promise<Allocation[]> {
  const { data, error } = await supabase
    .from("goal_allocations")
    .select("id, goal_id, amount, month")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, amount: Number(a.amount) })) as Allocation[];
}

/** Jooksva kuu tulud miinus kulud. */
export function monthSurplus(txns: Txn[], key = monthKey(new Date())): number {
  const list = txns.filter((t) => inMonth(t, key));
  return sum(list.filter((t) => t.type === "income")) - sum(list.filter((t) => t.type === "expense"));
}

/** Ülejääk, millest on juba suunatud summad maha arvestatud. */
export function availableSurplus(txns: Txn[], allocations: Allocation[], d = new Date()): number {
  const start = monthStart(d);
  const allocated = allocations
    .filter((a) => a.month === start)
    .reduce((acc, a) => acc + a.amount, 0);
  return Math.max(monthSurplus(txns, monthKey(d)) - allocated, 0);
}

export async function fetchOnboardingCompleted(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return true;
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.from("profiles").insert({ id: uid });
    return false;
  }
  return data.onboarding_completed;
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: uid, onboarding_completed: value }, { onConflict: "id" });
  if (error) throw error;
}

export type SavingsMovement = {
  id: string;
  kind: "deposit" | "withdrawal" | "goal";
  amount: number;
  goal_id: string | null;
  note: string | null;
  date: string;
};

export async function fetchSavingsMovements(): Promise<SavingsMovement[]> {
  const { data, error } = await supabase
    .from("savings_movements")
    .select("id, kind, amount, goal_id, note, date")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => ({ ...m, amount: Number(m.amount) })) as SavingsMovement[];
}

/** Kogumiskonto jääk: sissemaksed miinus väljamaksed ja eesmärkidesse suunatud summad. */
export function savingsBalance(movements: SavingsMovement[]): number {
  return movements.reduce((acc, m) => acc + (m.kind === "deposit" ? m.amount : -m.amount), 0);
}

/** Teadaolev igakuine sissetulek korduvatest tehingutest. */
export function plannedMonthlyIncome(recurring: Recurring[]): number {
  return recurring.filter((r) => r.active && r.type === "income").reduce((a, r) => a + r.amount, 0);
}

/** Eelarvetesse juba määratud summa kokku. */
export function budgetsTotal(budgets: Budget[]): number {
  return budgets.reduce((a, b) => a + b.monthly_limit, 0);
}

/** Muutuva summaga sissetulekud, mille palgapäev on käes ja kuu veel kinnitamata. */
export function pendingVariableIncomes(recurring: Recurring[], d = new Date()): Recurring[] {
  const start = monthStart(d);
  return recurring.filter(
    (r) =>
      r.active &&
      r.is_variable &&
      r.type === "income" &&
      r.last_applied_month !== start &&
      d.getDate() >= r.day_of_month,
  );
}

/** Kinnitab muutuva sissetuleku tegeliku summa ja lisab tehingu. */
export async function confirmVariableIncome(r: Recurring, amount: number, d = new Date()): Promise<void> {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const date = `${monthKey(d)}-${String(Math.min(r.day_of_month, lastDay)).padStart(2, "0")}`;
  const { error } = await supabase.from("transactions").insert({
    type: "income" as const,
    amount,
    category: null,
    merchant: r.merchant,
    date,
    note: r.note,
  });
  if (error) throw error;
  const { error: upErr } = await supabase
    .from("recurring_transactions")
    .update({ last_applied_month: monthStart(d) })
    .eq("id", r.id);
  if (upErr) throw upErr;
}
