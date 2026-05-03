import { createFileRoute } from "@tanstack/react-router";
import { SportKayProvider, useSportKay } from "@/context/SportKayContext";
import { BalanceHeader } from "@/components/sportkay/BalanceHeader";
import { BottomNav } from "@/components/sportkay/BottomNav";
import { GymsView } from "@/components/sportkay/GymsView";
import { VaultView } from "@/components/sportkay/VaultView";
import { ShopView } from "@/components/sportkay/ShopView";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sport Kay — Entrena. Canjea. Repite." },
      {
        name: "description",
        content:
          "Sport Kay: la app premium para entrenar en los mejores gimnasios y convertir tus créditos en suplementos de élite.",
      },
    ],
  }),
  component: Index,
});

function Screen() {
  const { view } = useSportKay();
  return (
    <main className="mx-auto max-w-md min-h-screen">
      <BalanceHeader />
      {view === "gyms" && <GymsView />}
      {view === "vault" && <VaultView />}
      {view === "shop" && <ShopView />}
      <BottomNav />
    </main>
  );
}

function Index() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <SportKayProvider>
        <Screen />
        <Toaster theme="dark" position="top-center" />
      </SportKayProvider>
    </div>
  );
}
