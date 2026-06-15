import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookupCep } from "@/lib/sol/cep";
import { UTM_ZONAS, utmToLatLng, latLngToUtm, inferirZona } from "@/lib/sol/utm";
import { toast } from "sonner";

export interface MapValue {
  latitude?: number;
  longitude?: number;
  utmZona?: string;
  utmEasting?: number;
  utmNorthing?: number;
}

interface Props {
  value: MapValue;
  onChange: (v: MapValue) => void;
  onAddressResolved?: (info: { cep?: string; street?: string; neighborhood?: string; city?: string; state?: string }) => void;
}

/**
 * Mapa SIGWeb do empreendimento. Suporta busca por CEP, endereço/cidade e
 * entrada/saída em UTM SIRGAS 2000 (datum EPSG:4674). Clicar no mapa marca
 * o ponto e atualiza coordenadas geográficas e UTM em sincronia.
 */
export function EmpreendimentoMap({ value, onChange, onAddressResolved }: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [Leaflet, setLeaflet] = useState<any>(null);

  const [cepInput, setCepInput] = useState("");
  const [addrInput, setAddrInput] = useState("");
  const [zona, setZona] = useState<string>(value.utmZona ?? "24S");
  const [easting, setEasting] = useState<string>(value.utmEasting?.toString() ?? "");
  const [northing, setNorthing] = useState<string>(value.utmNorthing?.toString() ?? "");

  useEffect(() => {
    (async () => {
      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeaflet(L);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready || !Leaflet || !containerRef.current || mapRef.current) return;
    const center: [number, number] = value.latitude && value.longitude
      ? [value.latitude, value.longitude] : [-14.235, -51.9253];
    const map = Leaflet.map(containerRef.current).setView(center, value.latitude ? 13 : 4);
    Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.on("click", (e: any) => setPoint(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    if (value.latitude && value.longitude) setPoint(value.latitude, value.longitude, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, Leaflet]);

  function setPoint(lat: number, lng: number, fly = true) {
    if (!mapRef.current || !Leaflet) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = Leaflet.marker([lat, lng], { draggable: true })
      .addTo(mapRef.current)
      .on("dragend", (e: any) => {
        const ll = e.target.getLatLng();
        setPoint(ll.lat, ll.lng, false);
      });
    if (fly) mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 14));
    const utm = (() => {
      try { return latLngToUtm(lat, lng, zona || inferirZona(lat, lng)); }
      catch { return null; }
    })();
    if (utm) {
      setZona(utm.zona); setEasting(utm.easting.toFixed(2)); setNorthing(utm.northing.toFixed(2));
    }
    onChange({
      latitude: lat, longitude: lng,
      utmZona: utm?.zona, utmEasting: utm?.easting, utmNorthing: utm?.northing,
    });
  }

  async function buscarCep() {
    let r;
    try { r = await lookupCep(cepInput); } catch (e) { toast.error((e as Error).message); return; }
    onAddressResolved?.({
      cep: cepInput, street: r.street, neighborhood: r.neighborhood, city: r.city, state: r.state,
    });
    const q = `${r.street}, ${r.city}, ${r.state}, Brasil`;
    await buscarEndereco(q);
  }

  async function buscarEndereco(q?: string) {
    const query = q ?? addrInput;
    if (!query.trim()) return;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "pt-BR" } });
      const arr = await resp.json();
      if (!arr?.length) { toast.error("Endereço não encontrado."); return; }
      const { lat, lon } = arr[0];
      setPoint(Number(lat), Number(lon));
    } catch {
      toast.error("Falha ao consultar o serviço de geocodificação.");
    }
  }

  function aplicarUtm() {
    const e = Number(easting), n = Number(northing);
    if (!Number.isFinite(e) || !Number.isFinite(n)) return toast.error("UTM inválido.");
    try {
      const { lat, lng } = utmToLatLng(zona, e, n);
      setPoint(lat, lng);
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[2fr_auto]">
        <div>
          <Label className="text-xs">Busca por endereço / cidade / estado</Label>
          <Input value={addrInput} onChange={(e) => setAddrInput(e.target.value)} placeholder="Ex.: Rua A, Salvador, BA" />
        </div>
        <Button type="button" variant="secondary" onClick={() => buscarEndereco()} className="self-end">Localizar</Button>
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_auto]">
        <div>
          <Label className="text-xs">CEP</Label>
          <Input value={cepInput} onChange={(e) => setCepInput(e.target.value)} placeholder="00000-000" maxLength={9} />
        </div>
        <Button type="button" variant="secondary" onClick={buscarCep} className="self-end">Buscar CEP</Button>
      </div>

      <div className="rounded-md border p-3 bg-muted/30">
        <p className="text-xs font-medium mb-2">Coordenadas UTM — DATUM SIRGAS 2000 (EPSG:4674)</p>
        <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_auto]">
          <div>
            <Label className="text-xs">Zona</Label>
            <Select value={zona} onValueChange={setZona}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UTM_ZONAS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Easting (E)</Label>
            <Input value={easting} onChange={(e) => setEasting(e.target.value)} placeholder="500000" />
          </div>
          <div>
            <Label className="text-xs">Northing (N)</Label>
            <Input value={northing} onChange={(e) => setNorthing(e.target.value)} placeholder="8550000" />
          </div>
          <Button type="button" onClick={aplicarUtm} className="self-end">Aplicar UTM</Button>
        </div>
      </div>

      <div ref={containerRef} className="h-[420px] w-full rounded-md border overflow-hidden" />

      <div className="grid gap-3 md:grid-cols-2 text-xs text-muted-foreground">
        <div>Latitude (SIRGAS 2000): <strong>{value.latitude?.toFixed(7) ?? "—"}</strong></div>
        <div>Longitude (SIRGAS 2000): <strong>{value.longitude?.toFixed(7) ?? "—"}</strong></div>
      </div>
    </div>
  );
}

export default EmpreendimentoMap;