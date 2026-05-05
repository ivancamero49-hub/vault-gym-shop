import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const subInput = z.object({ userId: z.string().uuid(), planId: z.string().uuid(), baseGymId: z.string().uuid() });

export const subscribeUser = createServerFn({ method: "POST" })
  .inputValidator((d) => subInput.parse(d))
  .handler(async ({ data }) => {
    // Verify plan
    const { data: plan, error: pErr } = await supabaseAdmin
      .from("plans")
      .select("id, monthly_credits, max_gym_level, tier")
      .eq("id", data.planId)
      .single();
    if (pErr || !plan) throw new Error("Plan inválido");

    // Verify gym level vs plan
    const { data: gym, error: gErr } = await supabaseAdmin
      .from("gyms")
      .select("id, level")
      .eq("id", data.baseGymId)
      .single();
    if (gErr || !gym) throw new Error("Gimnasio inválido");
    if (gym.level > plan.max_gym_level) throw new Error("Este gimnasio no está disponible para tu plan");

    // Update profile base gym
    const { error: prErr } = await supabaseAdmin
      .from("profiles")
      .update({ base_gym_id: data.baseGymId })
      .eq("id", data.userId);
    if (prErr) throw new Error(prErr.message);

    // Period
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Upsert subscription for current period
    const { error: sErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        { user_id: data.userId, plan_id: data.planId, current_period_start: start, current_period_end: end, status: "active" },
        { onConflict: "user_id,current_period_start" },
      );
    if (sErr) throw new Error(sErr.message);

    // Grant credits if not yet granted this period
    const { data: existing } = await supabaseAdmin
      .from("credit_ledger")
      .select("id")
      .eq("user_id", data.userId)
      .eq("period_start", start)
      .eq("reason", "grant")
      .maybeSingle();

    if (!existing) {
      const { error: lErr } = await supabaseAdmin.from("credit_ledger").insert({
        user_id: data.userId,
        amount: plan.monthly_credits,
        reason: "grant",
        period_start: start,
      });
      if (lErr) throw new Error(lErr.message);
    }

    return { ok: true, granted: plan.monthly_credits };
  });
