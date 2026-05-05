import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const RESERVATION_COST = 10;

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gymId: z.string().uuid(), slotStart: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // gym + plan check
    const { data: gym } = await supabaseAdmin.from("gyms").select("id, level, active").eq("id", data.gymId).single();
    if (!gym?.active) throw new Error("Gimnasio no disponible");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id, plans!inner(max_gym_level)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("current_period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    const maxLevel = (sub as any)?.plans?.max_gym_level ?? 0;
    if (gym.level > maxLevel) throw new Error("Tu plan no cubre este nivel de gimnasio");

    // balance check
    const period = new Date(); period.setDate(1);
    const periodStr = period.toISOString().slice(0, 10);
    const { data: bal } = await supabaseAdmin.from("v_credit_balance").select("balance").eq("user_id", userId).eq("period_start", periodStr).maybeSingle();
    if (((bal as any)?.balance ?? 0) < RESERVATION_COST) throw new Error("Créditos insuficientes");

    // create reservation
    const { data: res, error } = await supabaseAdmin.from("reservations").insert({
      user_id: userId, gym_id: data.gymId, slot_start: data.slotStart, credits_cost: RESERVATION_COST, status: "booked",
    }).select("id").single();
    if (error) throw new Error(error.message);

    // debit credits
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: userId, amount: -RESERVATION_COST, reason: "reservation", ref_id: res.id, period_start: periodStr,
    });

    return { ok: true, reservationId: res.id };
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reservationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: r } = await supabaseAdmin.from("reservations").select("*").eq("id", data.reservationId).eq("user_id", userId).single();
    if (!r) throw new Error("Reserva no encontrada");
    if (r.status !== "booked") throw new Error("No se puede cancelar");

    await supabaseAdmin.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
    const period = new Date(r.slot_start); period.setDate(1);
    const periodStr = period.toISOString().slice(0, 10);
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: userId, amount: r.credits_cost, reason: "refund", ref_id: r.id, period_start: periodStr,
    });
    return { ok: true };
  });
