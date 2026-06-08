/**
 * ZoneService — loads Burgas parking zones from burgas-zones.json,
 * caches polygons, and performs point-in-polygon checks using ray-casting.
 */

import zoneData from "../data/burgas-zones.json";

export interface ZoneResult {
  zone: "blue" | "green" | null;
  subZone?: string;
  smsCode?: string;
  hourlyRate?: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

type Ring = LatLng[];

interface CachedPolygon {
  ring: Ring;
  id: string;
  title: string;
  type: "blue" | "green";
  color: string;
}

let cachedPolygons: CachedPolygon[] | null = null;

function ensureLoaded(): void {
  if (cachedPolygons) return;
  cachedPolygons = zoneData.zones.map((z) => ({
    ring: z.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
    id: z.id,
    title: z.title,
    type: z.type as "blue" | "green",
    color: z.color,
  }));
}

function pointInRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i].lng, yi = ring[i].lat;
    const xj = ring[j].lng, yj = ring[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function findPolygon(lat: number, lng: number, polygons: CachedPolygon[]): CachedPolygon | null {
  for (const p of polygons) {
    if (pointInRing(lat, lng, p.ring)) return p;
  }
  return null;
}

export function checkZone(lat: number, lng: number): ZoneResult {
  ensureLoaded();
  const polygons = cachedPolygons!;

  const blue = findPolygon(lat, lng, polygons.filter((p) => p.type === "blue"));
  if (blue) {
    return { zone: "blue", subZone: blue.title };
  }

  const green = findPolygon(lat, lng, polygons.filter((p) => p.type === "green"));
  if (green) {
    return { zone: "green", subZone: green.title };
  }

  return { zone: null };
}

export interface ZonePolygon {
  id: string;
  title: string;
  type: "blue" | "green";
  color: string;
  coordinates: { latitude: number; longitude: number }[];
}

export function getZonePolygons(): ZonePolygon[] {
  ensureLoaded();
  return (cachedPolygons ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    color: p.color,
    coordinates: p.ring.map(({ lat, lng }) => ({ latitude: lat, longitude: lng })),
  }));
}

export function getParkingMachines(): { lat: number; lng: number; title: string }[] {
  return zoneData.machines;
}

export function getMapCenter(): { lat: number; lng: number } {
  return zoneData.center;
}
