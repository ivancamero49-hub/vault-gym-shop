import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const ORDER_FUND_SHARE_PCT = 30; // % de los créditos del pedido que va al fondo del gym

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(20) })).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const ids = data.items.map((i) => i.productId);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products").select("id, gym_id, price_credits, price_cash_cents, stock, active").in("id", ids);
    if (pErr || !products) throw new Error("Productos no encontrados");

    const gymIds = new Set(products.map((p) => p.gym_id));
    if (gymIds.size > 1) throw new Error("Solo un gimnasio por pedido");
    const gymId = products[0].gym_id;

    let totalCredits = 0, totalCash = 0;
    const itemsToInsert: any[] = [];
    for (const i of data.items) {
      const p = products.find((x) => x.id === i.productId);
      if (!p || !p.active) throw new Error("Producto no disponible");
      if (p.stock < i.qty) throw new Error(`Sin stock: ${p.id}`);
      totalCredits += (p.price_credits ?? 0) * i.qty;
      totalCash += (p.price_cash_cents ?? 0) * i.qty;
      itemsToInsert.push({ product_id: p.id, qty: i.qty, unit_credits: p.price_credits, unit_cash_cents: p.price_cash_cents });
    }

    // balance check
    const period = new Date(); period.setDate(1);
    const periodStr = period.toISOString().slice(0, 10);
    const { data: bal } = await supabaseAdmin.from("v_credit_balance").select("balance").eq("user_id", userId).eq("period_start", periodStr).maybeSingle();
    if (((bal as any)?.balance ?? 0) < totalCredits) throw new Error("Créditos insuficientes");

    const pickup = genCode();
    const { data: order, error: oErr } = await supabaseAdmin.from("orders").insert({
      user_id: userId, gym_id: gymId, total_credits: totalCredits, total_cash_cents: totalCash, pickup_code: pickup, status: "pending",
    }).select("id").single();
    if (oErr) throw new Error(oErr.message);

    await supabaseAdmin.from("order_items").insert(itemsToInsert.map((i) => ({ ...i, order_id: order.id })));

    // decrement stock
    for (const i of data.items) {
      const p = products.find((x) => x.id === i.productId)!;
      await supabaseAdmin.from("products").update({ stock: p.stock - i.qty }).eq("id", p.id);
    }

    // debit credits
    if (totalCredits > 0) {
      await supabaseAdmin.from("credit_ledger").insert({
        user_id: userId, amount: -totalCredits, reason: "order", ref_id: order.id, period_start: periodStr,
      });
    }

    // gym fund share
    if (gymId && totalCredits > 0) {
      const share = Math.floor((totalCredits * ORDER_FUND_SHARE_PCT) / 100);
      if (share > 0) await supabaseAdmin.from("gym_funds").insert({ gym_id: gymId, amount: share, reason: "order_share", ref_id: order.id });
    }

    return { ok: true, orderId: order.id, pickupCode: pickup };
  });

export const markOrderPickedUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin.from("orders").select("id, gym_id, status").eq("id", data.orderId).single();
    if (!order) throw new Error("Pedido no encontrado");
    const { data: gym } = await supabaseAdmin.from("gyms").select("owner_id").eq("id", order.gym_id!).single();
    if (gym?.owner_id !== context.userId) throw new Error("No autorizado");
    if (order.status !== "pending") throw new Error("Estado inválido");
    await supabaseAdmin.from("orders").update({ status: "picked_up" }).eq("id", order.id);
    return { ok: true };
  });
