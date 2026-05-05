import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthGate } from "@/components/sportkey/AuthGate";
import { Onboarding } from "@/components/sportkey/Onboarding";
import { useProfile, useBalance, useReservations, useOwnedGyms, type Gym } from "@/lib/sportkey-data";
import { GymMap } from "@/components/sportkey/GymMap";
import { ReserveDialog } from "@/components/sportkey/ReserveDialog";
import { DynamicQR } from "@/components/sportkey/DynamicQR";
import { ShopView } from "@/components/sportkey/ShopView";
import { OwnerDashboard } from "@/components/sportkey/OwnerDashboard";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Home, QrCode, ShoppingBag, User, LogOut, Loader2, Zap, Calendar, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sport Key — Red de gimnasios y marketplace" },
      { name: "description", content: "Accede a la red de gimnasios con QR dinámico, reserva por GPS y canjea créditos en la tienda." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
        <Toaster theme="dark" position="top-center" />
      </AuthProvider>
    </div>
  );
}

type View = "home" | "qr" | "shop" | "profile";

function App() {
  const { profile, loading, refresh } = useProfile();
  const [view, setView] = useState<View>("home");

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!profile?.base_gym_id) return <Onboarding onDone={refresh} />;

  return (
    <main className="mx-auto max-w-md min-h-screen pb-24">
      <TopBar />
      {view === "home" && <HomeView />}
      {view === "qr" && <DynamicQR />}
      {view === "shop" && <ShopView />}
      {view === "profile" && <ProfileView />}
      <BottomNav view={view} setView={setView} />
    </main>
  );
}

function TopBar() {
  const { balance } = useBalance();
  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 grid place-items-center rounded-xl bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <div className="font-bold tracking-tight">Sport Key</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Créditos</div>
        <div className="text-lg font-bold text-primary tabular-nums leading-none">{balance}</div>
      </div>
    </header>
  );
}

function HomeView() {
  const [selected, setSelected] = useState<Gym | null>(null);
  const { refresh: refreshBal } = useBalance();
  const { reservations, refresh: refreshRes } = useReservations();

  return (
    <section className="px-5 pt-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Cerca de ti</h2>
        <p className="text-sm text-muted-foreground mt-1">Toca un pin para reservar (10 créditos).</p>
      </div>
      <GymMap onSelect={setSelected} />

      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-1 mb-2">
          <Calendar className="h-3 w-3" /> Tus reservas
        </div>
        <div className="space-y-2">
          {reservations.slice(0, 4).map((r) => (
            <ReservationRow key={r.id} r={r} />
          ))}
          {reservations.length === 0 && <p className="text-xs text-muted-foreground py-2">Aún sin reservas.</p>}
        </div>
      </div>

      <ReserveDialog gym={selected} onClose={() => setSelected(null)} onDone={() => { refreshBal(); refreshRes(); }} />
    </section>
  );
}

function ReservationRow({ r }: { r: any }) {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    supabase.from("gyms").select("name").eq("id", r.gym_id).maybeSingle().then(({ data }) => setName((data as any)?.name ?? ""));
  }, [r.gym_id]);
  const date = new Date(r.slot_start);
  const colors: Record<string, string> = { booked: "text-primary", used: "text-muted-foreground", cancelled: "text-destructive", expired: "text-muted-foreground" };
  return (
    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-sm">
      <div className="min-w-0">
        <div className="font-semibold truncate">{name}</div>
        <div className="text-xs text-muted-foreground">{date.toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${colors[r.status] ?? ""}`}>{r.status}</div>
    </div>
  );
}

function ProfileView() {
  const { profile } = useProfile();
  const { balance } = useBalance();
  const { user, signOut } = useAuth();
  const ownedGyms = useOwnedGyms();
  const [showOwner, setShowOwner] = useState(false);

  if (showOwner) {
    return (
      <div>
        <div className="px-5 pt-4">
          <Button variant="outline" size="sm" onClick={() => setShowOwner(false)}>← Volver al perfil</Button>
        </div>
        <OwnerDashboard />
      </div>
    );
  }

  return (
    <section className="px-5 pt-6 space-y-6">
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Cuenta</div>
        <div className="font-bold text-lg mt-1">{profile?.full_name || user?.email}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
      </div>
      <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5">
        <div className="text-xs uppercase tracking-widest text-primary/80">Saldo del mes</div>
        <div className="text-4xl font-bold text-primary mt-1 tabular-nums">{balance}</div>
        <div className="text-xs text-muted-foreground mt-1">créditos disponibles</div>
      </div>

      {ownedGyms.length > 0 && (
        <Button variant="outline" onClick={() => setShowOwner(true)} className="w-full">
          <Building2 className="h-4 w-4 mr-2" /> Panel de Dueño ({ownedGyms.length})
        </Button>
      )}

      <Button variant="outline" onClick={signOut} className="w-full">
        <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
      </Button>
    </section>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: { id: View; icon: any; label: string }[] = [
    { id: "home", icon: Home, label: "Inicio" },
    { id: "qr", icon: QrCode, label: "QR" },
    { id: "shop", icon: ShoppingBag, label: "Tienda" },
    { id: "profile", icon: User, label: "Perfil" },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {items.map(({ id, icon: Icon, label }) => {
          const active = id === view;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`py-3 flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_oklch(0.94_0.27_130/0.6)]" : ""}`} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
