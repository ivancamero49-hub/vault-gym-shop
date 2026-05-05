import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthGate } from "@/components/sportkey/AuthGate";
import { Onboarding } from "@/components/sportkey/Onboarding";
import { useProfile, useBalance, useGyms } from "@/lib/sportkey-data";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Home, QrCode, ShoppingBag, User, MapPin, LogOut, Loader2, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sport Key — Red de gimnasios y marketplace" },
      { name: "description", content: "Sport Key: accede a la red de gimnasios con QR dinámico, reserva por GPS y canjea créditos en la tienda." },
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
      {view === "qr" && <QrView />}
      {view === "shop" && <ShopPlaceholder />}
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
  const gyms = useGyms();
  const { profile } = useProfile();
  return (
    <section className="px-5 pt-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Cerca de ti</h2>
        <p className="text-sm text-muted-foreground mt-1">Reserva en cualquier gimnasio de la red.</p>
      </div>
      <div className="space-y-3">
        {gyms.map((g) => {
          const isBase = g.id === profile?.base_gym_id;
          return (
            <article key={g.id} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{g.name}</h3>
                    {isBase && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wider">Base</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {g.address}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Nivel {g.level}</div>
                </div>
                <Button size="sm" disabled className="bg-primary/20 text-primary border border-primary/30">
                  Reservar
                </Button>
              </div>
            </article>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Mapa GPS y reservas: próxima fase.
        </p>
      </div>
    </section>
  );
}

function QrView() {
  return (
    <section className="px-5 pt-10 text-center">
      <div className="mx-auto h-64 w-64 rounded-3xl border border-border bg-card grid place-items-center">
        <QrCode className="h-24 w-24 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-xl font-bold">QR Dinámico</h2>
      <p className="text-sm text-muted-foreground mt-1">Disponible en la siguiente fase.</p>
    </section>
  );
}

function ShopPlaceholder() {
  return (
    <section className="px-5 pt-10 text-center">
      <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto" />
      <h2 className="mt-4 text-xl font-bold">Tienda</h2>
      <p className="text-sm text-muted-foreground mt-1">Próximamente: marketplace con créditos.</p>
    </section>
  );
}

function ProfileView() {
  const { profile } = useProfile();
  const { balance } = useBalance();
  const { user, signOut } = useAuth();
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
