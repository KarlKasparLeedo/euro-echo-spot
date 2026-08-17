import { supabase } from "@/integrations/supabase/client";
import { currentUserId, monthKey } from "@/lib/finance";

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

export type Member = {
  user_id: string;
  name: string;
  isMe: boolean;
};

export type SharedBudgetRow = {
  category: string;
  limit: number;
  spent: number;
  byMember: { user_id: string; name: string; amount: number }[];
};

export type SharedGoalRow = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  byMember: { user_id: string; name: string; amount: number }[];
};

export type FamilyOverview = {
  household: Household | null;
  members: Member[];
  budgets: SharedBudgetRow[];
  goals: SharedGoalRow[];
};

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function fetchHousehold(): Promise<Household | null> {
  const uid = await currentUserId();
  const { data: membership, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!membership) return null;
  const { data, error: hErr } = await supabase
    .from("households")
    .select("id, name, invite_code, created_by")
    .eq("id", membership.household_id)
    .maybeSingle();
  if (hErr) throw hErr;
  return (data as Household) ?? null;
}

export async function createHousehold(name: string): Promise<Household> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("households")
    .insert({ name: name || "Meie pere", invite_code: randomCode(), created_by: uid })
    .select("id, name, invite_code, created_by")
    .single();
  if (error) throw error;
  const { error: mErr } = await supabase
    .from("household_members")
    .insert({ household_id: data.id, user_id: uid });
  if (mErr) throw mErr;
  return data as Household;
}

export async function joinHousehold(code: string): Promise<void> {
  const { error } = await supabase.rpc("join_household_by_code", {
    _code: code.trim().toUpperCase(),
  });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("ALREADY_MEMBER")) throw new Error("Oled juba peres – lahku esmalt");
    if (msg.includes("CODE_NOT_FOUND")) throw new Error("Sellist kutsekoodi ei leitud");
    throw new Error("Liitumine ebaõnnestus, proovi uuesti");
  }
}

export async function leaveHousehold(): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from("household_members").delete().eq("user_id", uid);
  if (error) throw error;
}

export async function saveDisplayName(name: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: uid, display_name: name }, { onConflict: "id" });
  if (error) throw error;
}

export async function fetchDisplayName(): Promise<string> {
  const uid = await currentUserId();
  const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
  return data?.display_name ?? "";
}

/** Pere jagatud eelarved ja eesmärgid koos liikmete panustega. */
export async function fetchFamilyOverview(key = monthKey(new Date())): Promise<FamilyOverview> {
  const uid = await currentUserId();
  const household = await fetchHousehold();
  if (!household) return { household: null, members: [], budgets: [], goals: [] };

  const [{ data: memberRows }, { data: profileRows }, { data: budgetRows }, { data: goalRows }] =
    await Promise.all([
      supabase.from("household_members").select("user_id").eq("household_id", household.id),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("budgets").select("user_id, category, monthly_limit, shared").eq("shared", true),
      supabase
        .from("goals")
        .select("id, user_id, name, target_amount, saved_amount, deadline, shared")
        .eq("shared", true),
    ]);

  const nameOf = (userId: string) => {
    const profile = (profileRows ?? []).find((p) => p.id === userId);
    if (profile?.display_name) return profile.display_name;
    return userId === uid ? "Mina" : "Pereliige";
  };

  const members: Member[] = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    name: nameOf(m.user_id),
    isMe: m.user_id === uid,
  }));

  const categories = Array.from(new Set((budgetRows ?? []).map((b) => b.category)));
  const start = `${key}-01`;
  const endDate = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0);
  const end = `${key}-${String(endDate.getDate()).padStart(2, "0")}`;

  let txRows: { user_id: string; category: string | null; amount: number }[] = [];
  if (categories.length > 0) {
    const { data } = await supabase
      .from("transactions")
      .select("user_id, category, amount")
      .eq("type", "expense")
      .in("category", categories)
      .gte("date", start)
      .lte("date", end);
    txRows = (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  }

  const budgets: SharedBudgetRow[] = categories.map((category) => {
    const limit = (budgetRows ?? [])
      .filter((b) => b.category === category)
      .reduce((a, b) => a + Number(b.monthly_limit), 0);
    const rows = txRows.filter((t) => t.category === category);
    const byMember = members
      .map((m) => ({
        user_id: m.user_id,
        name: m.name,
        amount: rows.filter((t) => t.user_id === m.user_id).reduce((a, t) => a + t.amount, 0),
      }))
      .filter((m) => m.amount > 0);
    return {
      category,
      limit,
      spent: rows.reduce((a, t) => a + t.amount, 0),
      byMember,
    };
  });

  const goalIds = (goalRows ?? []).map((g) => g.id);
  let allocRows: { user_id: string; goal_id: string; amount: number }[] = [];
  if (goalIds.length > 0) {
    const { data } = await supabase
      .from("goal_allocations")
      .select("user_id, goal_id, amount")
      .in("goal_id", goalIds);
    allocRows = (data ?? []).map((a) => ({ ...a, amount: Number(a.amount) }));
  }

  const goals: SharedGoalRow[] = (goalRows ?? []).map((g) => {
    const rows = allocRows.filter((a) => a.goal_id === g.id);
    const byMember = members
      .map((m) => ({
        user_id: m.user_id,
        name: m.name,
        amount: rows.filter((a) => a.user_id === m.user_id).reduce((acc, a) => acc + a.amount, 0),
      }))
      .filter((m) => m.amount > 0);
    const allocated = rows.reduce((a, r) => a + r.amount, 0);
    return {
      id: g.id,
      name: g.name,
      target: Number(g.target_amount),
      saved: Math.max(Number(g.saved_amount), allocated),
      deadline: g.deadline,
      byMember,
    };
  });

  return { household, members, budgets, goals };
}
