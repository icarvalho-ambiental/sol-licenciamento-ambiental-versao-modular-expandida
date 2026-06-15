import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AppShell } from "@/components/sol/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Trash2, Plus, Layers, Ruler, Search as SearchIcon } from "lucide-react";
import {
  listGisLayers, createGisLayer, deleteGisLayer,
  listGisFeatures, createGisFeature, deleteGisFeature,
} from "@/lib/sol/gis-functions";
import { useCan } from "@/lib/sol/use-tenant";
import { lineLength, polygonArea, formatDistance, formatArea } from "@/lib/sol/geo-measure";

export const Route = createFileRoute("/gis")({
  head: () => ({ meta: [{ title: "GIS — Mapa" }] }),
  component: GisPage,
  errorComponent: NoTenantFallback,
});

function NoTenantFallback({ error }: { error: Error }) {
  const msg = error?.message ?? "";
  const noTenant = /locat[aá]rio|X-Tenant-Id/i.test(msg);
  return (
    <AppShell>
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold">
          {noTenant ? "Nenhum locatário ativo" : "Não foi possível carregar"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {noTenant
            ? "Crie um locatário no onboarding para habilitar este módulo."
            : msg}
        </p>
        <a href="/admin/onboarding" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Ir para onboarding
        </a>
      </div>
    </AppShell>
  );
}

const BASEMAPS: Record<"satelite" | "ruas", maplibregl.StyleSpecification> = {
  satelite: {
    version: 8,
    sources: {
      sat: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      labels: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "© Esri",
      },
    },
    layers: [
      { id: "sat", type: "raster", source: "sat" },
      { id: "labels", type: "raster", source: "labels" },
    ],
  },
  ruas: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  },
};

function GisPage() {
  const qc = useQueryClient();
  const canManage = useCan("gis.gerenciar");
  const canEdit = useCan("gis.feature.editar");

  const fetchLayers = useServerFn(listGisLayers);
  const fetchFeatures = useServerFn(listGisFeatures);
  const mkLayer = useServerFn(createGisLayer);
  const rmLayer = useServerFn(deleteGisLayer);
  const mkFeature = useServerFn(createGisFeature);
  const rmFeature = useServerFn(deleteGisFeature);

  const layersQ = useQuery({ queryKey: ["gis", "layers"], queryFn: () => fetchLayers() });
  const [basemap, setBasemap] = useState<"satelite" | "ruas">("satelite");
  const [layerId, setLayerId] = useState<string | null>(null);
  useEffect(() => {
    if (!layerId && layersQ.data?.length) setLayerId(layersQ.data[0].id);
  }, [layersQ.data, layerId]);

  const featuresQ = useQuery({
    queryKey: ["gis", "features", layerId],
    queryFn: () => fetchFeatures({ data: { layerId: layerId ?? undefined } }),
    enabled: !!layerId,
  });

  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Modo de desenho: ponto | linha | poligono
  const [drawMode, setDrawMode] = useState<"ponto"|"linha"|"poligono">("ponto");
  const drawModeRef = useRef(drawMode);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  const layerIdRef = useRef<string | null>(null);
  useEffect(() => { layerIdRef.current = layerId; }, [layerId]);
  const [verts, setVerts] = useState<[number, number][]>([]);
  const vertsRef = useRef<[number, number][]>([]);
  useEffect(() => { vertsRef.current = verts; }, [verts]);

  // Busca geográfica (Nominatim)
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(searchQ)}`,
        { headers: { "Accept-Language": "pt-BR" } },
      );
      setSearchResults(await r.json());
    } catch {
      toast.error("Falha na busca");
    } finally { setSearching(false); }
  };

  const flyTo = (lng: number, lat: number, label?: string) => {
    const map = mapRef.current; if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 13 });
    const el = document.createElement("div");
    el.style.cssText = "width:16px;height:16px;border-radius:9999px;background:#f59e0b;border:2px solid white;box-shadow:0 0 0 1px #f59e0b";
    const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
    if (label) m.setPopup(new maplibregl.Popup().setText(label));
    m.addTo(map);
    setTimeout(() => m.remove(), 8000);
  };

  // Medidas em tempo real (vértices do desenho atual)
  const liveMeasure = useMemo(() => {
    if (verts.length < 2) return null;
    if (drawMode === "linha") return { kind: "linha", text: formatDistance(lineLength(verts)) };
    if (drawMode === "poligono" && verts.length >= 3) {
      return {
        kind: "poligono",
        text: `${formatArea(polygonArea(verts))} • perímetro ${formatDistance(lineLength([...verts, verts[0]]))}`,
      };
    }
    return null;
  }, [verts, drawMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS[basemap],
      center: [-47.92, -15.78], // Brasília
      zoom: 4,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current.addControl(new maplibregl.ScaleControl({}), "bottom-left");

    mapRef.current.on("click", async (e) => {
      const lid = layerIdRef.current;
      if (!canEdit || !lid) return;
      const mode = drawModeRef.current;
      if (mode === "ponto") {
        try {
          await mkFeature({
            data: {
              layerId: lid,
              geometria: { type: "Point", coordinates: [e.lngLat.lng, e.lngLat.lat] },
              propriedades: { criado_em_mapa: true },
            },
          });
          toast.success("Ponto criado");
          qc.invalidateQueries({ queryKey: ["gis", "features"] });
        } catch (err: any) { toast.error(err?.message ?? "Erro"); }
      } else {
        setVerts((v) => [...v, [e.lngLat.lng, e.lngLat.lat]]);
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  // Troca de basemap sem recriar o mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(BASEMAPS[basemap]);
  }, [basemap]);

  // Source/layer dinâmico para preview do desenho atual
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const id = "draw-preview";
    const data: GeoJSON.Feature = {
      type: "Feature",
      geometry:
        drawMode === "linha"
          ? { type: "LineString", coordinates: verts }
          : { type: "Polygon", coordinates: verts.length > 2 ? [[...verts, verts[0]]] : [verts] },
      properties: {},
    };
    const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
    if (verts.length === 0) {
      if (src) src.setData({ type: "FeatureCollection", features: [] } as any);
      return;
    }
    if (!src) {
      map.addSource(id, { type: "geojson", data: data as any });
      map.addLayer({ id: id+"-line", type: "line", source: id, paint: { "line-color": "#ef4444", "line-width": 3 } });
      map.addLayer({ id: id+"-fill", type: "fill", source: id, paint: { "fill-color": "#ef4444", "fill-opacity": 0.15 }, filter: ["==", "$type", "Polygon"] });
    } else {
      src.setData(data as any);
    }
  }, [verts, drawMode]);

  const finishShape = async () => {
    const lid = layerIdRef.current;
    if (!lid) return toast.error("Selecione uma camada.");
    if (drawMode === "linha" && verts.length < 2) return toast.error("Linha precisa de ≥ 2 vértices.");
    if (drawMode === "poligono" && verts.length < 3) return toast.error("Polígono precisa de ≥ 3 vértices.");
    const geometria =
      drawMode === "linha"
        ? { type: "LineString" as const, coordinates: verts }
        : { type: "Polygon" as const, coordinates: [[...verts, verts[0]]] };
    try {
      await mkFeature({ data: { layerId: lid, geometria, propriedades: { vertices: verts.length } } });
      toast.success("Feição salva");
      setVerts([]);
      qc.invalidateQueries({ queryKey: ["gis", "features"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  // Render markers when features change
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const map = mapRef.current;
    const feats = featuresQ.data ?? [];

    // limpa camadas geojson antigas
    ["gis-lines", "gis-fills", "gis-strokes"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("gis-geo")) map.removeSource("gis-geo");

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: feats
        .filter((f: any) => f.geometria && f.geometria.type !== "Point")
        .map((f: any) => ({ type: "Feature", geometry: f.geometria, properties: { id: f.id } })),
    };
    if (fc.features.length && map.isStyleLoaded()) {
      map.addSource("gis-geo", { type: "geojson", data: fc as any });
      map.addLayer({ id: "gis-fills", type: "fill", source: "gis-geo",
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.18 }, filter: ["==", "$type", "Polygon"] });
      map.addLayer({ id: "gis-strokes", type: "line", source: "gis-geo",
        paint: { "line-color": "#2563eb", "line-width": 2 }, filter: ["==", "$type", "Polygon"] });
      map.addLayer({ id: "gis-lines", type: "line", source: "gis-geo",
        paint: { "line-color": "#2563eb", "line-width": 3 }, filter: ["==", "$type", "LineString"] });
    }

    const bounds = new maplibregl.LngLatBounds();
    let count = 0;
    feats.forEach((f: any) => {
      const g = f.geometria;
      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
        const [lng, lat] = g.coordinates as [number, number];
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 1px #2563eb;cursor:pointer";
        el.title = JSON.stringify(f.propriedades);
        el.onclick = async (ev) => {
          ev.stopPropagation();
          if (!canEdit) return;
          if (!window.confirm("Excluir esta feição?")) return;
          try {
            await rmFeature({ data: { id: f.id } });
            toast.success("Excluída");
            qc.invalidateQueries({ queryKey: ["gis", "features"] });
          } catch (e: any) {
            toast.error(e?.message ?? "Erro");
          }
        };
        const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current!);
        markersRef.current.push(m);
        bounds.extend([lng, lat]);
        count++;
      } else if (g?.type === "LineString") {
        (g.coordinates as [number, number][]).forEach((c) => { bounds.extend(c); count++; });
      } else if (g?.type === "Polygon") {
        (g.coordinates?.[0] as [number, number][])?.forEach((c) => { bounds.extend(c); count++; });
      }
    });
    if (count > 0) {
      try { mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, animate: false }); } catch {}
    }
  }, [featuresQ.data, canEdit, qc, rmFeature]);

  const createLayerMut = useMutation({
    mutationFn: async (input: { nome: string; tipo: any; publico: boolean }) =>
      mkLayer({ data: { nome: input.nome, tipo: input.tipo, publico: input.publico } }),
    onSuccess: () => {
      toast.success("Camada criada");
      qc.invalidateQueries({ queryKey: ["gis", "layers"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"ponto"|"linha"|"poligono"|"misto">("ponto");
  const [novoPublico, setNovoPublico] = useState(false);

  const featCount = featuresQ.data?.length ?? 0;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Layers className="text-primary" />
          <h1 className="text-xl font-semibold">GIS / Web SIG</h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mapa base</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1">
                  <Button size="sm" variant={basemap==="satelite"?"default":"outline"} onClick={()=>setBasemap("satelite")}>Satélite</Button>
                  <Button size="sm" variant={basemap==="ruas"?"default":"outline"} onClick={()=>setBasemap("ruas")}>Ruas</Button>
                </div>
              </CardContent>
            </Card>

            {canEdit && layerId && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ferramenta de desenho</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    {(["ponto","linha","poligono"] as const).map((m) => (
                      <Button key={m} size="sm" variant={drawMode===m?"default":"outline"} onClick={() => { setDrawMode(m); setVerts([]); }}>
                        {m === "ponto" ? "Ponto" : m === "linha" ? "Linha" : "Polígono"}
                      </Button>
                    ))}
                  </div>
                  {drawMode !== "ponto" && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        {verts.length} vértices. Clique no mapa para adicionar.
                      </p>
                      {liveMeasure && (
                        <div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                          <Ruler size={12}/> {liveMeasure.text}
                        </div>
                      )}
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1" disabled={verts.length<2} onClick={finishShape}>Finalizar</Button>
                        <Button size="sm" variant="outline" onClick={() => setVerts([])}>Limpar</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><SearchIcon size={14}/> Buscar lugar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <form onSubmit={(e)=>{e.preventDefault(); doSearch();}} className="flex gap-1">
                  <Input value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} placeholder="Cidade, endereço, coord…" className="h-8 text-xs"/>
                  <Button size="sm" type="submit" disabled={searching}>{searching?"…":"Ir"}</Button>
                </form>
                {searchResults.length > 0 && (
                  <ul className="max-h-48 overflow-auto rounded border divide-y">
                    {searchResults.map((r, i) => (
                      <li key={i}>
                        <button
                          className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-accent"
                          onClick={() => { flyTo(parseFloat(r.lon), parseFloat(r.lat), r.display_name); setSearchResults([]); }}
                        >
                          {r.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-muted-foreground">Geocodificação por © Nominatim/OpenStreetMap.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Camadas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(layersQ.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma camada ainda.</p>
                )}
                {(layersQ.data ?? []).map((l: any) => (
                  <div key={l.id} className={`flex items-center justify-between rounded border px-2 py-1.5 ${layerId===l.id?"border-primary bg-primary/5":""}`}>
                    <button className="flex-1 text-left text-sm" onClick={() => setLayerId(l.id)}>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{l.tipo}{l.publico?" • público":""}</div>
                    </button>
                    {canManage && (
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!window.confirm("Excluir camada e todas as feições?")) return;
                        try { await rmLayer({ data: { id: l.id } }); toast.success("Excluída"); qc.invalidateQueries({queryKey:["gis"]}); if (layerId===l.id) setLayerId(null);} catch(e:any){toast.error(e?.message);}
                      }}><Trash2 size={14}/></Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {canManage && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Nova camada</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={novoNome} onChange={(e)=>setNovoNome(e.target.value)} placeholder="Ex.: Áreas de proteção" />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={novoTipo} onValueChange={(v: any)=>setNovoTipo(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ponto">Ponto</SelectItem>
                        <SelectItem value="linha">Linha</SelectItem>
                        <SelectItem value="poligono">Polígono</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded border px-2 py-1.5">
                    <Label className="text-xs">Camada pública</Label>
                    <Switch checked={novoPublico} onCheckedChange={setNovoPublico} />
                  </div>
                  <Button className="w-full gap-1" disabled={!novoNome.trim() || createLayerMut.isPending}
                    onClick={()=>{ createLayerMut.mutate({nome: novoNome.trim(), tipo: novoTipo, publico: novoPublico}); setNovoNome(""); }}>
                    <Plus size={14}/> Criar
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin size={14}/> Feições</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{featCount} feições na camada ativa.</p>
                {canEdit && layerId && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Clique no mapa para adicionar um ponto.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-lg border" ref={containerRef} />
        </div>
      </div>
    </AppShell>
  );
}