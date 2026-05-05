import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Plan = { id: string; tier: "bronce" | "plata" | "oro"; name: string; monthly_credits: number; max_gym_level: number; price_cents: number };
export type Gym = { id: string; name: string; description: string | null; address: string; lat: number; lng: number; level: number; photo_url: string | null; owner_id: string | null };
export type Profile = { id: string; full_name: string | null; avatar_url: string | null; base_gym_id: string | null };
export type Product = { id: string; gym_id: string | null; name: string; description: string | null; image_url: string | null; price_credits: number; price_cash_cents: number; stock: number };
export type Reservation = { id: string; gym_id: string; slot_start: string; status: string; credits_cost: number };

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").eq("active", true).gt("stock", 0).order("name");
    setProducts((data as Product[]) ?? []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { products, refresh };
}

export function useReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const refresh = useCallback(async () => {
    if (!user) return setReservations([]);
    const { data } = await supabase.from("reservations").select("*").eq("user_id", user.id).order("slot_start", { ascending: false }).limit(20);
    setReservations((data as Reservation[]) ?? []);
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  return { reservations, refresh };
}

export function useOwnedGyms() {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("gyms").select("*").eq("owner_id", user.id).then(({ data }) => setGyms((data as Gym[]) ?? []));
  }, [user]);
  return gyms;
}

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
