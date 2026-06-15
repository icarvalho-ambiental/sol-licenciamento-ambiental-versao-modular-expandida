import proj4 from "proj4";

/**
 * Conversão UTM ⇄ Lat/Lng no datum SIRGAS 2000 (EPSG:4674).
 * Zonas UTM SIRGAS 2000 Sul: 18S..25S → EPSG:31978..31985.
 * Zonas Norte (extremo norte do Brasil): 18N..22N → EPSG:31972..31976.
 */

const SIRGAS2000 = "+proj=longlat +ellps=GRS80 +no_defs +type=crs";
proj4.defs("EPSG:4674", SIRGAS2000);

type ZoneDef = { zone: number; hemi: "N" | "S"; epsg: string };

const ZONES: ZoneDef[] = [];
for (let z = 18; z <= 22; z++) {
  ZONES.push({ zone: z, hemi: "N", epsg: `EPSG:${31966 + z}` }); // 31972..31976
}
for (let z = 18; z <= 25; z++) {
  ZONES.push({ zone: z, hemi: "S", epsg: `EPSG:${31960 + z}` }); // 31978..31985
}

for (const z of ZONES) {
  const south = z.hemi === "S" ? " +south" : "";
  proj4.defs(
    z.epsg,
    `+proj=utm +zone=${z.zone}${south} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs`,
  );
}

export const UTM_ZONAS = ZONES.map((z) => `${z.zone}${z.hemi}`);

function zoneDef(label: string): ZoneDef {
  const m = label.trim().toUpperCase().match(/^(\d{1,2})([NS])$/);
  if (!m) throw new Error(`Zona UTM inválida: ${label}. Use ex.: 24S`);
  const z = ZONES.find((x) => x.zone === Number(m[1]) && x.hemi === (m[2] as "N" | "S"));
  if (!z) throw new Error(`Zona UTM ${label} não suportada (use 18N–22N ou 18S–25S).`);
  return z;
}

export function utmToLatLng(zona: string, easting: number, northing: number): { lat: number; lng: number } {
  const z = zoneDef(zona);
  const [lng, lat] = proj4(z.epsg, "EPSG:4674", [easting, northing]);
  return { lat, lng };
}

export function latLngToUtm(lat: number, lng: number, zonaForcada?: string) {
  const zona = zonaForcada ?? inferirZona(lat, lng);
  const z = zoneDef(zona);
  const [easting, northing] = proj4("EPSG:4674", z.epsg, [lng, lat]);
  return { zona, easting, northing };
}

/** Infere zona UTM a partir de longitude/latitude (centroide do Brasil). */
export function inferirZona(lat: number, lng: number): string {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const hemi = lat < 0 ? "S" : "N";
  return `${zone}${hemi}`;
}