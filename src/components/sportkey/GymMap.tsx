import { useEffect, useRef, useState } from "react";
import { useGyms, type Gym } from "@/lib/sportkey-data";
import { getMapboxToken } from "@/server/config.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function GymList({ gyms, onSelect }: { gyms: Gym[]; onSelect: (g: Gym) => void }) {
  return (
    <div className="space-y-2">
      {gyms.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g)}
          className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all flex items-center gap-3"
        >
          <div className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
            {g.level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{g.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {g.address}
            </div>
          </div>
        </button>
      ))}
      {gyms.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No hay gimnasios disponibles.</p>}
    </div>
  );
}

export function GymMap({ onSelect }: { onSelect: (g: Gym) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const gyms = useGyms();
  const fetchToken = useServerFn(getMapboxToken);
  const [token, setToken] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const webglOk = typeof window !== "undefined" ? hasWebGL() : true;

  useEffect(() => { fetchToken().then((r) => setToken(r.token)).catch(() => setToken("")); }, [fetchToken]);

  useEffect(() => {
    if (!token || !webglOk || !ref.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !ref.current) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: ref.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-3.7038, 40.4368],
          zoom: 11.5,
          attributionControl: false,
        });
        map.on("error", (e: any) => {
          // eslint-disable-next-line no-console
          console.warn("[mapbox]", e?.error?.message ?? e);
          setMapFailed(true);
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        for (const g of gyms) {
          const el = document.createElement("button");
          el.className = "h-9 w-9 rounded-full bg-primary text-primary-foreground border-2 border-background grid place-items-center font-bold text-xs cursor-pointer";
          el.textContent = String(g.level);
          el.onclick = () => onSelect(g);
          new mapboxgl.Marker(el).setLngLat([g.lng, g.lat]).addTo(map);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[mapbox] init failed", err);
        setMapFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token, webglOk, gyms, onSelect]);

  if (token === null) {
    return (
      <div className="h-[40vh] grid place-items-center text-muted-foreground text-sm gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando…
      </div>
    );
  }

  if (!token || !webglOk || mapFailed) {
    return (
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 text-primary" />
          {!token ? "Mapa no configurado" : !webglOk ? "WebGL no disponible — vista en lista" : "Mapa no disponible"}
        </div>
        <GymList gyms={gyms} onSelect={onSelect} />
      </div>
    );
  }

  return <div ref={ref} className="h-[60vh] w-full rounded-2xl overflow-hidden border border-border" />;
}
