import { Dumbbell, ShoppingBag } from "lucide-react";
import { useSportKay } from "@/context/SportKayContext";

export function BalanceHeader() {
  const { gymBalance, shopBalance } = useSportKay();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sport</p>
            <h1 className="text-2xl font-bold leading-none">
              KAY<span className="text-primary text-glow">.</span>
            </h1>
          </div>
          <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">
            SK
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BalanceCard
            icon={<Dumbbell className="h-4 w-4" />}
            label="Saldo Gym"
            value={gymBalance}
            primary
          />
          <BalanceCard
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Saldo Tienda"
            value={shopBalance}
          />
        </div>
      </div>
    </header>
  );
}

function BalanceCard({
  icon,
  label,
  value,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  primary?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 gradient-card shadow-card ${
        primary ? "border-primary/40" : "border-border"
      }`}
    >
      {primary && (
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      )}
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-3xl font-bold tabular-nums ${primary ? "text-primary text-glow" : "text-foreground"}`}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground">créditos</span>
      </div>
    </div>
  );
}
