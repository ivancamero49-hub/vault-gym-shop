import { createContext, useContext, useState, ReactNode } from "react";

type View = "gyms" | "vault" | "shop";

interface SportKayState {
  gymBalance: number;
  shopBalance: number;
  view: View;
  setView: (v: View) => void;
  checkIn: (gymName: string) => boolean;
  convertToVault: () => boolean;
  buy: (price: number, name: string) => boolean;
}

const Ctx = createContext<SportKayState | null>(null);

export function SportKayProvider({ children }: { children: ReactNode }) {
  const [gymBalance, setGym] = useState(50);
  const [shopBalance, setShop] = useState(0);
  const [view, setView] = useState<View>("gyms");

  const checkIn = (_g: string) => {
    if (gymBalance < 10) return false;
    setGym((b) => b - 10);
    return true;
  };

  const convertToVault = () => {
    if (gymBalance < 10) return false;
    setGym((b) => b - 10);
    setShop((s) => s + 10);
    return true;
  };

  const buy = (price: number, _n: string) => {
    if (shopBalance < price) return false;
    setShop((s) => s - price);
    return true;
  };

  return (
    <Ctx.Provider value={{ gymBalance, shopBalance, view, setView, checkIn, convertToVault, buy }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSportKay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSportKay must be inside SportKayProvider");
  return ctx;
}
