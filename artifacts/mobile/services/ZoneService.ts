/**
 * ZoneService — loads Burgas Blue/Green zone GeoJSON, caches polygons,
 * and performs point-in-polygon checks using a ray-casting algorithm.
 *
 * Architecture:
 *   GeoJSON files (data/*.geojson)  →  parsed once on first use
 *   containsPoint(lat, lng)          →  ray-cast against each polygon ring
 *   checkZone(lat, lng)              →  returns ZoneResult
 */

import blueZoneData from "../data/burgas-blue-zone.geojson";
import greenZoneData from "../data/burgas-green-zone.geojson";

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
  properties: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal cache — populated lazily on first call
// ---------------------------------------------------------------------------

let bluePolygons: CachedPolygon[] | null = null;
let greenPolygons: CachedPolygon[] | null = null;

function parseFeatureCollection(
  data: any,
): CachedPolygon[] {
  const polygons: CachedPolygon[] = [];
  for (const feature of data.features ?? []) {
    const geom = feature.geometry;
    if (!geom) continue;

    const rings: number[][][] =
      geom.type === "Polygon"
        ? geom.coordinates
        : geom.type === "MultiPolygon"
          ? geom.coordinates.flat(1)
          : [];

    for (const ringCoords of rings) {
      // GeoJSON coords are [longitude, latitude]
      const ring: Ring = ringCoords.map(([lng, lat]) => ({ lat, lng }));
      polygons.push({ ring, properties: feature.properties ?? {} });
    }
  }
  return polygons;
}

function ensureLoaded(): void {
  if (!bluePolygons) bluePolygons = parseFeatureCollection(blueZoneData);
  if (!greenPolygons) greenPolygons = parseFeatureCollection(greenZoneData);
}

// ---------------------------------------------------------------------------
// Ray-casting point-in-polygon (works for non-convex polygons)
// ---------------------------------------------------------------------------

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

function checkPolygons(
  lat: number,
  lng: number,
  polygons: CachedPolygon[],
): CachedPolygon | null {
  for (const p of polygons) {
    if (pointInRing(lat, lng, p.ring)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine which parking zone (if any) a coordinate falls within.
 * Blue zone is checked first since it is a subset of the Green zone area.
 */
export function checkZone(lat: number, lng: number): ZoneResult {
  ensureLoaded();

  const blue = checkPolygons(lat, lng, bluePolygons!);
  if (blue) {
    return {
      zone: "blue",
      subZone: blue.properties.name as string | undefined,
      smsCode: blue.properties.smsCode as string | undefined,
      hourlyRate: blue.properties.hourlyRate as number | undefined,
    };
  }

  const green = checkPolygons(lat, lng, greenPolygons!);
  if (green) {
    return {
      zone: "green",
      subZone: green.properties.name as string | undefined,
      smsCode: green.properties.smsCode as string | undefined,
      hourlyRate: green.properties.hourlyRate as number | undefined,
    };
  }

  return { zone: null };
}

/**
 * Returns the raw polygon rings for map rendering.
 * Each ring is an array of { latitude, longitude } (react-native-maps format).
 */
export function getZonePolygons(): {
  blue: { latitude: number; longitude: number }[][];
  green: { latitude: number; longitude: number }[][];
} {
  ensureLoaded();
  return {
    blue: (bluePolygons ?? []).map((p) =>
      p.ring.map(({ lat, lng }) => ({ latitude: lat, longitude: lng })),
    ),
    green: (greenPolygons ?? []).map((p) =>
      p.ring.map(({ lat, lng }) => ({ latitude: lat, longitude: lng })),
    ),
  };
}
