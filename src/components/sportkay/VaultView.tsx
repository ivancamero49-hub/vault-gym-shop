import { Button } from "@/components/ui/button";
import { useSportKay } from "@/context/SportKayContext";
import { toast } from "sonner";
import { Vault, ArrowDownToLine, Sparkles } from "lucide-react";

export function VaultView() {
  const { convertToVault, gymBalance, shopBalance } = useSportKay();

  const handle = () => {
    if (convertToVault()) {
      toast.success("Crédito asegurado en La Bóveda", {
        description: "10 créditos movidos a tu Saldo Tienda.",
      });
    } else {
      toast.error("Sin créditos para mover", { description: "Tu Saldo Gym está vacío." });
    }
  };

  return (
    <section className="px-5 pt-6 pb-32 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Vault className="h-6 w-6 text-primary" />
          La Bóveda
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tu crédito nunca se pierde. Conviértelo en recompensas.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-primary/40 p-6 shadow-glow">
        <div className="absolute inset-0 gradient-vault opacity-20" />
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
            <Sparkles className="h-3 w-3" /> The Vault
          </div>
          <h3 className="text-3xl font-bold leading-tight">
            ¿No pudiste<br />entrenar hoy?
          </h3>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs">
            Mueve 10 créditos de tu Saldo Gym a tu Saldo Tienda y úsalos en suplementos premium.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
            <div className="rounded-xl bg-background/50 border border-border p-3">
              <p className="text-muted-foreground">Gym</p>
              <p className="text-lg font-bold tabular-nums">{gymBalance}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-primary/40 p-3">
              <p className="text-muted-foreground">Tienda</p>
              <p className="text-lg font-bold tabular-nums text-primary">{shopBalance}</p>
            </div>
          </div>

          <Button
            onClick={handle}
            disabled={gymBalance < 10}
            className="mt-6 w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide text-base shadow-glow disabled:opacity-50 disabled:shadow-none"
          >
            <ArrowDownToLine className="h-5 w-5 mr-2" />
            Mover 10 créditos
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Solo conversiones de 10 créditos · Sin caducidad
      </div>
    </section>
  );
}
