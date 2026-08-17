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
  shared: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
  shared: boolean;
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

/** Sisselogitud kasutaja id. */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Pole sisse logitud");
  return data.user.id;
}

export async function fetchTransactions(): Promise<Txn[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Txn[];
}

export async function fetchBudgets(): Promise<Budget[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", uid)
    .order("category");
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, monthly_limit: Number(b.monthly_limit) })) as Budget[];
}

export async function fetchGoals(): Promise<Goal[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", uid)
    .order("created_at");
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
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("goal_allocations")
    .select("id, goal_id, amount, month")
    .eq("user_id", uid)
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

export type SavingsMovementKind = "deposit" | "withdrawal" | "goal" | "goal_release";

export type SavingsMovement = {
  id: string;
  kind: SavingsMovementKind;
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

/**
 * Kogumiskonto kogusumma: sissemaksed miinus päris väljavõtmised.
 * Eesmärgile märgistamine ei vähenda kogusummat — raha jääb samale kontole.
 */
export function savingsBalance(movements: SavingsMovement[]): number {
  return movements.reduce((acc, m) => {
    if (m.kind === "deposit") return acc + m.amount;
    if (m.kind === "withdrawal") return acc - m.amount;
    return acc;
  }, 0);
}

/** Iga eesmärgi sahtlis olev summa kogumiskontol. */
export function goalSavedFromMovements(movements: SavingsMovement[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of movements) {
    if (!m.goal_id) continue;
    if (m.kind === "goal") map[m.goal_id] = (map[m.goal_id] ?? 0) + m.amount;
    if (m.kind === "goal_release") map[m.goal_id] = (map[m.goal_id] ?? 0) - m.amount;
  }
  for (const k of Object.keys(map)) map[k] = Math.max(map[k] ?? 0, 0);
  return map;
}

/** Eesmärkidesse märgistatud raha kokku. */
export function allocatedToGoals(movements: SavingsMovement[]): number {
  return Object.values(goalSavedFromMovements(movements)).reduce((a, v) => a + v, 0);
}

/** Vaba puhver: kogumiskonto raha, mis pole ühegi eesmärgi külge märgitud. */
export function freeBuffer(movements: SavingsMovement[]): number {
  return savingsBalance(movements) - allocatedToGoals(movements);
}

export type GoalFundSource = "buffer" | "month";

/**
 * Lisab eesmärgile raha konkreetsest allikast.
 * - "buffer": raha on juba kogumiskontol, märgitakse ainult eesmärgi sahtlisse.
 * - "month": kuu kulutuste kontolt kantakse raha kogumiskontole ja sealt eesmärgile.
 */
export async function fundGoal(
  goalId: string,
  amount: number,
  source: GoalFundSource,
  note?: string,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Sisesta korrektne summa");
  const today = new Date().toISOString().slice(0, 10);

  if (source === "month") {
    const { error: txErr } = await supabase.from("transactions").insert({
      type: "expense",
      amount,
      category: "Finants ja kohustused",
      merchant: "Kogumiskonto",
      date: today,
      note: note?.trim() || "Ülekanne eesmärgile",
    });
    if (txErr) throw txErr;
    const { error: depErr } = await supabase.from("savings_movements").insert({
      kind: "deposit",
      amount,
      date: today,
      note: "Kuu rahast eesmärgile",
    });
    if (depErr) throw depErr;
  }

  const { error } = await supabase.from("savings_movements").insert({
    kind: "goal",
    amount,
    goal_id: goalId,
    date: today,
    note: note?.trim() || null,
  });
  if (error) throw error;

  const { data, error: gErr } = await supabase
    .from("goals")
    .select("saved_amount")
    .eq("id", goalId)
    .maybeSingle();
  if (gErr) throw gErr;
  const { error: upErr } = await supabase
    .from("goals")
    .update({ saved_amount: Number(data?.saved_amount ?? 0) + amount })
    .eq("id", goalId);
  if (upErr) throw upErr;
}

/** Tõstab raha eesmärgi sahtlist tagasi vabasse puhvrisse. */
export async function releaseFromGoal(goalId: string, amount: number, note?: string): Promise<void> {
  const { error } = await supabase.from("savings_movements").insert({
    kind: "goal_release",
    amount,
    goal_id: goalId,
    note: note?.trim() || null,
  });
  if (error) throw error;
  const { data, error: gErr } = await supabase
    .from("goals")
    .select("saved_amount")
    .eq("id", goalId)
    .maybeSingle();
  if (gErr) throw gErr;
  const next = Math.max(Number(data?.saved_amount ?? 0) - amount, 0);
  const { error: upErr } = await supabase.from("goals").update({ saved_amount: next }).eq("id", goalId);
  if (upErr) throw upErr;
}

/**
 * Võtab kogumiskontolt raha välja. Kui vaba puhver ei kata summat,
 * vabastab puudujääva osa etteantud eesmärkide sahtlitest.
 */
export async function withdrawWithCoverage(
  amount: number,
  coverage: { goalId: string; amount: number }[],
  note?: string,
): Promise<void> {
  for (const c of coverage) {
    if (c.amount > 0) await releaseFromGoal(c.goalId, c.amount, "Kaetud väljavõtmise jaoks");
  }
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("savings_movements").insert({
    kind: "withdrawal",
    amount,
    date: today,
    note: note?.trim() || null,
  });
  if (error) throw error;

  // Raha liigub kuu rahakotti, seega kirjendame sissetulekuna.
  const { error: txErr } = await supabase.from("transactions").insert({
    type: "income",
    amount,
    category: "Muu",
    merchant: "Kogumiskontolt",
    date: today,
    note: note?.trim() || "Võetud kogumiskontolt välja",
  });
  if (txErr) throw txErr;
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

export type MonthClosure = {
  id: string;
  month: string;
  amount: number;
};

export async function fetchMonthClosures(): Promise<MonthClosure[]> {
  const { data, error } = await supabase
    .from("month_closures")
    .select("id, month, amount")
    .order("month", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => ({ ...m, amount: Number(m.amount) })) as MonthClosure[];
}

/** Kannab kuu ülejäägi kogumiskontole ja märgib kuu lõpetatuks. */
export async function closeMonth(month: string, amount: number): Promise<void> {
  const { error } = await supabase.from("month_closures").insert({ month, amount });
  if (error) throw error;
  if (amount > 0) {
    const { error: movErr } = await supabase.from("savings_movements").insert({
      kind: "deposit",
      amount,
      note: `Kuu ülejääk ${month.slice(0, 7)}`,
      date: month,
    });
    if (movErr) throw movErr;
  }
}

/** Kuu esimene päev ISO kujul (nt "2026-08-01") suvalisest kuuvõtmest. */
export function monthKeyToStart(key: string): string {
  return `${key}-01`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

/** Kuud, mille kohta on tehinguid — uuemast vanemani. */
export function availableMonths(txns: Txn[]): string[] {
  const keys = new Set(txns.map((t) => t.date.slice(0, 7)));
  keys.add(monthKey(new Date()));
  return [...keys].sort().reverse();
}

export type MonthReport = {
  key: string;
  income: number;
  expense: number;
  surplus: number;
  byCategory: Array<{ name: string; value: number }>;
  txns: Txn[];
};

export function monthReport(txns: Txn[], key: string): MonthReport {
  const list = txns.filter((t) => inMonth(t, key));
  const income = sum(list.filter((t) => t.type === "income"));
  const expense = sum(list.filter((t) => t.type === "expense"));
  const byCategory = Object.entries(
    list
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        const c = t.category ?? "Muu/liigitamata";
        acc[c] = (acc[c] ?? 0) + t.amount;
        return acc;
      }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return { key, income, expense, surplus: income - expense, byCategory, txns: list };
}
