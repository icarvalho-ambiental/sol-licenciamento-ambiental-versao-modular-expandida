// Utilitários geométricos puros (sem PostGIS) para medir distância e área
// a partir de coordenadas WGS84 [lng, lat].

const R = 6371008.8; // raio médio da Terra (m)
const toRad = (d: number) => (d * Math.PI) / 180;

/** Distância haversine entre dois pontos, em metros. */
export function haversine(a: [number, number], b: [number, number]) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Comprimento total de uma polilinha em metros. */
export function lineLength(coords: [number, number][]) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversine(coords[i - 1], coords[i]);
  return total;
}

/** Área aproximada (m²) de um polígono fechado em WGS84 — fórmula esférica. */
export function polygonArea(coords: [number, number][]) {
  if (coords.length < 3) return 0;
  const ring = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]];
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    sum += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((sum * R * R) / 2);
}

export function formatDistance(m: number) {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatArea(m2: number) {
  if (m2 < 10_000) return `${m2.toFixed(0)} m²`;
  if (m2 < 1_000_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${(m2 / 1_000_000).toFixed(2)} km²`;
}