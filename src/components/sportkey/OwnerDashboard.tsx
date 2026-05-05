import { useEffect, useState } from "react";
import { useOwnedGyms } from "@/lib/sportkey-data";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { validateQr } from "@/server/qr.functions";
import { markOrderPickedUp } from "@/server/shop.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Building2, Wallet, Package, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OwnerDashboard() {
  const gyms = useOwnedGyms();
  const [gymId, setGymId] = useState<string | null>(null);
  useEffect(() => { if (!gymId && gyms[0]) setGymId(gyms[0].id); }, [gyms, gymId]);

  if (gyms.length === 0) {
    return (
      <section className="px-5 pt-10 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="mt-4 text-xl font-bold">Panel de Dueños</h2>
        <p className="text-sm text-muted-foreground mt-2">No tienes gimnasios asignados todavía.</p>
      </section>
    );
  }

  return (
    <section className="px-5 pt-6 pb-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panel del gimnasio</h2>
        <select value={gymId ?? ""} onChange={(e) => setGymId(e.target.value)} className="mt-3 w-full bg-card border border-border rounded-xl px-3 py-2 text-sm">
          {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      {gymId && <GymPanel gymId={gymId} />}
    </section>
  );
}

function GymPanel({ gymId }: { gymId: string }) {
  const [fund, setFund] = useState(0);
  const [visits, setVisits] = useState<{ day: string; visits: number }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const refresh = async () => {
    const [{ data: f }, { data: v }, { data: p }, { data: o }] = await Promise.all([
      supabase.from("v_gym_fund_balance").select("balance").eq("gym_id", gymId).maybeSingle(),
      supabase.from("v_gym_visits_daily").select("*").eq("gym_id", gymId).order("day", { ascending: false }).limit(14),
      supabase.from("products").select("*").eq("gym_id", gymId).order("name"),
      supabase.from("orders").select("id, pickup_code, total_credits, status, created_at").eq("gym_id", gymId).order("created_at", { ascending: false }).limit(10),
    ]);
    setFund((f as any)?.balance ?? 0);
    setVisits(((v as any[]) ?? []).map((r) => ({ day: new Date(r.day).toLocaleDateString("es-ES", { weekday: "short" }), visits: r.visits })).reverse());
    setProducts((p as any[]) ?? []);
    setOrders((o as any[]) ?? []);
  };
  useEffect(() => { refresh(); }, [gymId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
          <div className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1"><Wallet className="h-3 w-3" /> Fondo</div>
          <div className="text-3xl font-bold text-primary tabular-nums mt-1">{fund}</div>
          <div className="text-[10px] text-muted-foreground">créditos para inventario</div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Visitas (14d)</div>
          <div className="text-3xl font-bold tabular-nums mt-1">{visits.reduce((a, b) => a + b.visits, 0)}</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">Visitas diarias</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visits}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0 0)" />
              <XAxis dataKey="day" tick={{ fill: "oklch(0.65 0 0)", fontSize: 10 }} />
              <YAxis tick={{ fill: "oklch(0.65 0 0)", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.22 0 0)", borderRadius: 12 }} />
              <Bar dataKey="visits" fill="oklch(0.94 0.27 130)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Scanner gymId={gymId} onValidated={refresh} />

      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Pedidos pendientes</div>
        <div className="space-y-2">
          {orders.filter((o) => o.status === "pending").map((o) => <OrderRow key={o.id} order={o} onDone={refresh} />)}
          {orders.filter((o) => o.status === "pending").length === 0 && <p className="text-xs text-muted-foreground">Sin pedidos pendientes.</p>}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-1"><Package className="h-3 w-3" /> Inventario</div>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-sm">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.price_credits} créditos</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Stock</div>
                <div className="font-bold tabular-nums">{p.stock}</div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-xs text-muted-foreground">Sin productos.</p>}
        </div>
      </div>
    </div>
  );
}

function Scanner({ gymId, onValidated }: { gymId: string; onValidated: () => void }) {
  const validate = useServerFn(validateQr);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await validate({ data: { token, gymId } });
      toast.success("Acceso validado");
      setToken("");
      onValidated();
    } catch (e: any) { toast.error("QR rechazado", { description: e.message }); }
    finally { setBusy(false); }
  };
  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
      <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-1"><ScanLine className="h-3 w-3" /> Validar entrada</div>
      <div className="flex gap-2">
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Pega el token QR" />
        <Button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">En producción se usaría cámara. Aquí pega el token decodificado para demo.</p>
    </div>
  );
}

function OrderRow({ order, onDone }: { order: any; onDone: () => void }) {
  const mark = useServerFn(markOrderPickedUp);
  const [busy, setBusy] = useState(false);
  return (
    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
      <div>
        <div className="font-bold tracking-widest">{order.pickup_code}</div>
        <div className="text-xs text-muted-foreground">{order.total_credits} créditos · {new Date(order.created_at).toLocaleString("es-ES")}</div>
      </div>
      <Button size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await mark({ data: { orderId: order.id } }); toast.success("Entregado"); onDone(); }
        catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
      }}>Entregar</Button>
    </div>
  );
}
