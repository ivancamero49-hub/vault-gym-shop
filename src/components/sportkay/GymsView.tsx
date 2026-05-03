import { Button } from "@/components/ui/button";
import { useSportKay } from "@/context/SportKayContext";
import { toast } from "sonner";
import { MapPin, Zap } from "lucide-react";
import gym1 from "@/assets/gym-1.jpg";
import gym2 from "@/assets/gym-2.jpg";
import gym3 from "@/assets/gym-3.jpg";

const gyms = [
  { id: 1, name: "Iron Vault Studio", location: "Polanco", img: gym1, tag: "Premium" },
  { id: 2, name: "Knockout Boxing Club", location: "Roma Norte", img: gym2, tag: "Boxing" },
  { id: 3, name: "Forge Functional", location: "Condesa", img: gym3, tag: "Crossfit" },
];

export function GymsView() {
  const { checkIn, gymBalance } = useSportKay();

  const handle = (name: string) => {
    if (checkIn(name)) {
      toast.success("¡Entrenamiento iniciado!", {
        description: `Check-in confirmado en ${name}. -10 créditos.`,
      });
    } else {
      toast.error("Saldo insuficiente", { description: "Necesitas 10 créditos." });
    }
  };

  return (
    <section className="px-5 pt-6 pb-32 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Gimnasios</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elige tu templo. 10 créditos por sesión.
        </p>
      </div>

      <div className="space-y-4">
        {gyms.map((g) => (
          <article
            key={g.id}
            className="group relative overflow-hidden rounded-3xl border border-border gradient-card shadow-card"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={g.img}
                alt={g.name}
                width={1024}
                height={768}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                {g.tag}
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold leading-tight">{g.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                {g.location}
              </div>
              <Button
                onClick={() => handle(g.name)}
                disabled={gymBalance < 10}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide shadow-glow disabled:shadow-none disabled:opacity-50"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                Check-in · 10
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
