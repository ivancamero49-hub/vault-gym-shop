import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGyms, type Gym } from "@/lib/sportkey-data";
import { getMapboxToken } from "@/server/config.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";

export function GymMap({ onSelect }: { onSelect: (g: Gym) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const gyms = useGyms();
  const fetchToken = useServerFn(getMapboxToken);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => { fetchToken().then((r) => setToken(r.token)); }, [fetchToken]);

  useEffect(() => {
    if (!token || !ref.current || map.current) return;
    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-3.7038, 40.4368],
      zoom: 11.5,
      attributionControl: false,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  }, [token]);

  useEffect(() => {
    if (!map.current || gyms.length === 0) return;
    const markers: mapboxgl.Marker[] = [];
    for (const g of gyms) {
      const el = document.createElement("button");
      el.className = "h-9 w-9 rounded-full bg-primary text-primary-foreground border-2 border-background shadow-glow grid place-items-center font-bold text-xs";
      el.textContent = String(g.level);
      el.onclick = () => onSelect(g);
      markers.push(new mapboxgl.Marker(el).setLngLat([g.lng, g.lat]).addTo(map.current!));
    }
    return () => { markers.forEach((m) => m.remove()); };
  }, [gyms, onSelect]);

  if (!token) {
    return (
      <div className="h-[60vh] grid place-items-center text-muted-foreground text-sm gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando mapa…
      </div>
    );
  }
  if (token === "") {
    return (
      <div className="h-[40vh] grid place-items-center text-center px-6">
        <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Configura MAPBOX_PUBLIC_TOKEN para ver el mapa.
        </div>
      </div>
    );
  }
  return <div ref={ref} className="h-[60vh] w-full rounded-2xl overflow-hidden border border-border" />;
}
