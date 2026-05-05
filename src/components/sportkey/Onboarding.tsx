import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { usePlans, useGyms, useProfile } from "@/lib/sportkey-data";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { subscribeUser } from "@/server/subscriptions.functions";
import { toast } from "sonner";
import { Check, Loader2, MapPin } from "lucide-react";
import { GymMap } from "@/components/sportkey/GymMap";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plans = usePlans();
  const gyms = useGyms();
  const subscribe = useServerFn(subscribeUser);
  const [planId, setPlanId] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string | null>(profile?.base_gym_id ?? null);
  const [busy, setBusy] = useState(false);

  const selectedPlan = plans.find((p) => p.id === planId);
  const eligibleGyms = selectedPlan ? gyms.filter((g) => g.level <= selectedPlan.max_gym_level) : [];

  const submit = async () => {
    if (!user || !planId || !gymId) return;
    setBusy(true);
    try {
      const r = await subscribe({ data: { userId: user.id, planId, baseGymId: gymId } });
      toast.success("¡Suscrito!", { description: `+${r.granted} créditos este mes.` });
      onDone();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="max-w-md mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Bienvenido a Sport Key</h1>
          <p className="text-muted-foreground mt-1 text-sm">Elige tu plan y tu gimnasio base.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">1 · Plan</h2>
          {plans.map((p) => {
            const sel = planId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setPlanId(p.id); setGymId(null); }}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${sel ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.monthly_credits} créditos/mes · gyms nivel ≤ {p.max_gym_level}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold tabular-nums">${(p.price_cents / 100).toFixed(0)}</div>
                    {sel && <Check className="h-4 w-4 text-primary inline mt-1" />}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {selectedPlan && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">2 · Gimnasio Base</h2>
            {eligibleGyms.map((g) => {
              const sel = gymId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGymId(g.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${sel ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {g.address} · Nivel {g.level}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        <Button
          onClick={submit}
          disabled={!planId || !gymId || busy}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-glow"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar suscripción"}
        </Button>
      </div>
    </div>
  );
}
