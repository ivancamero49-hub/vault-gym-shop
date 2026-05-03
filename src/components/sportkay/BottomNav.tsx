import { Dumbbell, Vault, Store } from "lucide-react";
import { useSportKay } from "@/context/SportKayContext";

const items = [
  { id: "gyms" as const, label: "Gyms", Icon: Dumbbell },
  { id: "vault" as const, label: "Mi Bóveda", Icon: Vault },
  { id: "shop" as const, label: "Tienda", Icon: Store },
];

export function BottomNav() {
  const { view, setView } = useSportKay();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-card">
        <ul className="grid grid-cols-3">
          {items.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setView(id)}
                  className="w-full flex flex-col items-center gap-1 py-3 group"
                >
                  <span
                    className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      active ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
