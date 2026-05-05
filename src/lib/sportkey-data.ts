import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Plan = { id: string; tier: "bronce" | "plata" | "oro"; name: string; monthly_credits: number; max_gym_level: number; price_cents: number };
export type Gym = { id: string; name: string; description: string | null; address: string; lat: number; lng: number; level: number; photo_url: string | null };
export type Profile = { id: string; full_name: string | null; avatar_url: string | null; base_gym_id: string | null };

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    supabase.from("plans").select("*").eq("active", true).order("price_cents").then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);
  return plans;
}

export function useGyms() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  useEffect(() => {
    supabase.from("gyms").select("*").eq("active", true).order("name").then(({ data }) => setGyms((data as Gym[]) ?? []));
  }, []);
  return gyms;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  return { profile, loading, refresh };
}

export function useBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const refresh = useCallback(async () => {
    if (!user) return setBalance(0);
    const period = new Date(); period.setDate(1);
    const periodStr = period.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("v_credit_balance")
      .select("balance")
      .eq("user_id", user.id)
      .eq("period_start", periodStr)
      .maybeSingle();
    setBalance((data as any)?.balance ?? 0);
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  return { balance, refresh };
}
