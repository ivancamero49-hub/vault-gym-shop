import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import { issueQrToken } from "@/server/qr.functions";
import { Loader2, Shield } from "lucide-react";

export function DynamicQR() {
  const issue = useServerFn(issueQrToken);
  const [token, setToken] = useState<string | null>(null);
  const [secs, setSecs] = useState(30);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const r = await issue();
      if (cancelled) return;
      setToken(r.token);
      setSecs(r.validForSeconds);
    };
    tick();
    const id = setInterval(tick, 5000);
    const cd = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => { cancelled = true; clearInterval(id); clearInterval(cd); };
  }, [issue]);

  return (
    <section className="px-5 pt-8 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
        <Shield className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">QR Dinámico</span>
      </div>
      <h2 className="mt-4 text-2xl font-bold">Tu acceso</h2>
      <p className="text-xs text-muted-foreground mt-1">Muéstralo al staff. Se renueva cada 30 s.</p>

      <div className="mt-6 mx-auto h-72 w-72 rounded-3xl bg-white grid place-items-center p-4 shadow-glow">
        {token ? (
          <QRCodeSVG value={token} size={240} bgColor="#ffffff" fgColor="#050505" level="M" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        )}
      </div>

      <div className="mt-4 text-xs text-muted-foreground tabular-nums">Caduca en <span className="text-primary font-bold">{secs}s</span></div>
    </section>
  );
}
