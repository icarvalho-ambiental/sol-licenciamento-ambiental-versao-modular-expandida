import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEmpreendimentosGeo } from "@/lib/sol/sol-functions";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/empreendimentos/mapa")({ component: MapaPage });

function MapaPage() {
  const fn = useServerFn(listEmpreendimentosGeo);
  const { data = [], isLoading } = useQuery({ queryKey: ["empreendimentos-geo"], queryFn: () => fn() });
  const [ready, setReady] = useState(false);
  const [Map, setMap] = useState<any>(null);

  // Carrega Leaflet apenas no cliente (evita SSR)
  useEffect(() => {
    (async () => {
      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");
      // Corrige ícones padrão do Leaflet em bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const rl = await import("react-leaflet");
      setMap(rl);
      setReady(true);
    })();
  }, []);

  const points = (data as any[]).map((e) => ({
    id: e.id, nome: e.nome,
    lat: Number(e.latitude), lng: Number(e.longitude),
    endereco: e.endereco,
    empresa: e.empresas?.nome_fantasia || e.empresas?.pessoas_juridicas?.razao_social,
    cidade: e.cidades ? `${e.cidades.nome}/${e.cidades.uf}` : null,
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [-14.235, -51.9253]; // Brasil

  return (
    <AppShell>
      <PageHeader
        title="Mapa de empreendimentos"
        subtitle="Localização geográfica dos empreendimentos cadastrados."
        breadcrumb={["Empreendimentos", "Mapa"]}
        actions={
          <Link to="/empreendimentos/novo">
            <Button size="sm" className="gap-1"><Plus size={16}/> Novo Empreendimento</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="h-[70vh] w-full overflow-hidden rounded-md">
            {isLoading || !ready || !Map ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Carregando mapa…
              </div>
            ) : (
              <Map.MapContainer center={center} zoom={points.length ? 6 : 4} style={{ height: "100%", width: "100%" }}>
                <Map.LayersControl position="topright">
                  <Map.LayersControl.BaseLayer name="Satélite (Esri)" checked>
                    <Map.TileLayer
                      attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                  </Map.LayersControl.BaseLayer>
                  <Map.LayersControl.BaseLayer name="Híbrido (Satélite + Rótulos)">
                    <Map.LayerGroup>
                      <Map.TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='Tiles &copy; Esri'
                        maxZoom={19}
                      />
                      <Map.TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        attribution='Labels &copy; Esri'
                        maxZoom={19}
                      />
                    </Map.LayerGroup>
                  </Map.LayersControl.BaseLayer>
                  <Map.LayersControl.BaseLayer name="Ruas (OpenStreetMap)">
                    <Map.TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </Map.LayersControl.BaseLayer>
                  <Map.LayersControl.BaseLayer name="Topográfico">
                    <Map.TileLayer
                      attribution='Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
                      url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                      maxZoom={17}
                    />
                  </Map.LayersControl.BaseLayer>
                </Map.LayersControl>
                {points.map((p) => (
                  <Map.Marker key={p.id} position={[p.lat, p.lng]}>
                    <Map.Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{p.nome}</div>
                        {p.empresa && <div className="text-muted-foreground">{p.empresa}</div>}
                        {p.cidade && <div className="text-xs">{p.cidade}</div>}
                        {p.endereco && <div className="text-xs mt-1">{p.endereco}</div>}
                      </div>
                    </Map.Popup>
                  </Map.Marker>
                ))}
              </Map.MapContainer>
            )}
          </div>
          {!isLoading && points.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhum empreendimento possui coordenadas (latitude/longitude) cadastradas ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}