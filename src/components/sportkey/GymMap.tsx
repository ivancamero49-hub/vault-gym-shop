import { useEffect, useId, useRef, useState } from "react";
import { useGyms, type Gym } from "@/lib/sportkey-data";
import { getMapboxToken } from "@/server/config.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";

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
  const mapId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const gyms = useGyms();
  const fetchToken = useServerFn(getMapboxToken);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => { fetchToken().then((r) => setToken(r.token)).catch(() => setToken("")); }, [fetchToken]);

  useEffect(() => {
    if (!token || !ref.current) return;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !ref.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        ref.current.replaceChildren();
        mapboxgl.accessToken = token;
        mapboxgl.clearPrewarmedResources?.();
        mapboxgl.clearStorage?.(() => undefined);
        mapboxgl.prewarm?.();

        const map = new mapboxgl.Map({
          container: ref.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-64.6833, 10.1333], // Barcelona, Anzoátegui (Venezuela)
          zoom: 12,
          attributionControl: false,
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          antialias: false,
        });
        map.on("error", (e: any) => {
          // eslint-disable-next-line no-console
          console.warn("[mapbox]", e?.error?.message ?? e);
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
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [token, gyms, onSelect, mapId]);

  if (token === null) {
    return (
      <div className="h-[40vh] grid place-items-center text-muted-foreground text-sm gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        key={mapId}
        ref={ref}
        className="min-h-[360px] h-[60vh] max-h-[620px] w-full rounded-2xl overflow-hidden border border-border bg-card"
      />
      {!token && <GymList gyms={gyms} onSelect={onSelect} />}
    </div>
  );
}
