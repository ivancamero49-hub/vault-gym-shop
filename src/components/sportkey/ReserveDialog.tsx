import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createReservation } from "@/server/reservations.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Gym } from "@/lib/sportkey-data";
import { useBalance } from "@/lib/sportkey-data";
import { toast } from "sonner";
import { MapPin, Calendar, Loader2 } from "lucide-react";

function nextSlots(): { label: string; iso: string }[] {
  const now = new Date();
  const slots: { label: string; iso: string }[] = [];
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getTime() + i * 60 * 60 * 1000);
    slots.push({ label: d.toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" }), iso: d.toISOString() });
  }
  return slots;
}

export function ReserveDialog({ gym, onClose, onDone }: { gym: Gym | null; onClose: () => void; onDone: () => void }) {
  const reserve = useServerFn(createReservation);
  const { balance } = useBalance();
  const [busy, setBusy] = useState<string | null>(null);
  const slots = nextSlots();

  const handle = async (iso: string) => {
    if (!gym) return;
    setBusy(iso);
    try {
      await reserve({ data: { gymId: gym.id, slotStart: iso } });
      toast.success("Reserva confirmada", { description: "−10 créditos" });
      onDone();
      onClose();
    } catch (e: any) {
      toast.error("No se pudo reservar", { description: e.message });
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={!!gym} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border">
        {gym && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{gym.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" /> {gym.address} · Nivel {gym.level}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Próximas franjas (10 créditos)</div>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s.iso}
                    variant="outline"
                    disabled={busy !== null || balance < 10}
                    onClick={() => handle(s.iso)}
                    className="justify-start"
                  >
                    {busy === s.iso ? <Loader2 className="h-4 w-4 animate-spin" /> : s.label}
                  </Button>
                ))}
              </div>
              {balance < 10 && <p className="text-xs text-destructive">Créditos insuficientes ({balance}).</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
