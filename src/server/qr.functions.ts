import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

const WINDOW_SECONDS = 30;
const VISIT_SHARE = 5; // créditos al fondo del gym por visita

function sign(payload: string) {
  const secret = process.env.QR_HMAC_SECRET || "dev-secret";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export const issueQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const window = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
    const payload = `${userId}.${window}`;
    const sig = sign(payload);
    return { token: `${payload}.${sig}`, validForSeconds: WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS) };
  });

export const validateQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string(), gymId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // caller must be owner of gymId
    const { data: gym } = await supabaseAdmin.from("gyms").select("id, owner_id").eq("id", data.gymId).single();
    if (!gym || gym.owner_id !== context.userId) throw new Error("No autorizado para este gimnasio");

    const parts = data.token.split(".");
    if (parts.length !== 3) throw new Error("QR inválido");
    const [userId, windowStr, sig] = parts;
    const expected = sign(`${userId}.${windowStr}`);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error("QR inválido");

    const window = parseInt(windowStr, 10);
    const nowWindow = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
    if (Math.abs(nowWindow - window) > 1) throw new Error("QR expirado");

    // optional: link to booked reservation today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: res } = await supabaseAdmin
      .from("reservations").select("id").eq("user_id", userId).eq("gym_id", data.gymId).eq("status", "booked")
      .gte("slot_start", todayStart.toISOString()).limit(1).maybeSingle();

    const { data: ci, error } = await supabaseAdmin.from("check_ins").insert({
      user_id: userId, gym_id: data.gymId, reservation_id: res?.id ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);

    if (res) await supabaseAdmin.from("reservations").update({ status: "used" }).eq("id", res.id);

    // visit share to gym fund
    await supabaseAdmin.from("gym_funds").insert({
      gym_id: data.gymId, amount: VISIT_SHARE, reason: "visit_share", ref_id: ci.id,
    });

    return { ok: true, userId };
  });
