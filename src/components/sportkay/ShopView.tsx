import { Button } from "@/components/ui/button";
import { useSportKay } from "@/context/SportKayContext";
import { toast } from "sonner";
import { Lock, ShoppingBag } from "lucide-react";
import protein from "@/assets/protein.jpg";
import creatine from "@/assets/creatine.jpg";

const products = [
  { id: 1, name: "Whey Protein", desc: "Aislado · 1 kg", price: 30, img: protein },
  { id: 2, name: "Creatina Monohidrato", desc: "Premium · 300 g", price: 20, img: creatine },
];

export function ShopView() {
  const { buy, shopBalance } = useSportKay();

  const handle = (price: number, name: string) => {
    if (buy(price, name)) {
      toast.success("¡Compra realizada!", { description: `${name} en camino.` });
    }
  };

  return (
    <section className="px-5 pt-6 pb-32 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Tienda Sport Kay</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Canjea tu Saldo Tienda por suplementos de élite.
        </p>
      </div>

      <div className="space-y-4">
        {products.map((p) => {
          const locked = shopBalance < p.price;
          return (
            <article
              key={p.id}
              className="relative overflow-hidden rounded-3xl border border-border gradient-card shadow-card p-4"
            >
              <div className="flex gap-4">
                <div className="h-24 w-24 flex-shrink-0 rounded-2xl overflow-hidden bg-background">
                  <img
                    src={p.img}
                    alt={p.name}
                    width={768}
                    height={768}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold leading-tight">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-primary tabular-nums">{p.price}</span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      créditos
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handle(p.price, p.name)}
                disabled={locked}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide shadow-glow disabled:opacity-40 disabled:shadow-none disabled:bg-secondary disabled:text-muted-foreground"
              >
                {locked ? (
                  <>
                    <Lock className="h-4 w-4 mr-1.5" />
                    Faltan {p.price - shopBalance} créditos
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 mr-1.5" />
                    Comprar
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
