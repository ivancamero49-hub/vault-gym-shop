import { useState } from "react";
import { useProducts, useBalance } from "@/lib/sportkey-data";
import { useServerFn } from "@tanstack/react-start";
import { createOrder } from "@/server/shop.functions";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Lock, Package } from "lucide-react";
import { toast } from "sonner";

export function ShopView() {
  const { products, refresh } = useProducts();
  const { balance, refresh: refreshBal } = useBalance();
  const order = useServerFn(createOrder);
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (productId: string) => {
    setBusy(productId);
    try {
      const r = await order({ data: { items: [{ productId, qty: 1 }] } });
      toast.success("Pedido creado", { description: `Código de retiro: ${r.pickupCode}` });
      refresh(); refreshBal();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally { setBusy(null); }
  };

  return (
    <section className="px-5 pt-6 space-y-5 pb-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-primary" /> Tienda</h2>
        <p className="text-sm text-muted-foreground mt-1">Canjea créditos por suplementación y merch.</p>
      </div>
      <div className="space-y-3">
        {products.map((p) => {
          const locked = balance < p.price_credits;
          return (
            <article key={p.id} className="p-4 rounded-2xl border border-border bg-card flex gap-3">
              <div className="h-16 w-16 shrink-0 rounded-xl bg-secondary grid place-items-center">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                <div className="text-xs text-muted-foreground mt-1">Stock: {p.stock}</div>
              </div>
              <div className="text-right flex flex-col items-end justify-between">
                <div className="text-primary font-bold tabular-nums">{p.price_credits}</div>
                <Button size="sm" disabled={locked || busy !== null} onClick={() => buy(p.id)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : locked ? <Lock className="h-3.5 w-3.5" /> : "Comprar"}
                </Button>
              </div>
            </article>
          );
        })}
        {products.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin productos disponibles.</p>}
      </div>
    </section>
  );
}
