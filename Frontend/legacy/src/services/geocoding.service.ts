/**
 * User-initiated reverse geocoding for map pins. Cache and space Nominatim
 * requests by at least one second to respect its usage policy.
 */

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const MIN_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 8000;
/** Coordinates rounded to this many places share a cache entry (~11 metres). */
const CACHE_PRECISION = 4;

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

const cache = new Map<string, string | null>();
let lastRequestAt = 0;

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(CACHE_PRECISION)},${longitude.toFixed(CACHE_PRECISION)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Nominatim's display_name is the full chain down to the country, which is far
 * too long for a one-line location field. This keeps the parts a municipal
 * crew would actually navigate by.
 */
function formatAddress(response: NominatimReverseResponse): string {
  const address = response.address;
  if (!address) {
    return String(response.display_name ?? "").split(",").slice(0, 3).join(", ").trim();
  }

  const locality = address.neighbourhood ?? address.suburb ?? address.village;
  const settlement = address.city ?? address.town ?? address.county;

  const parts = [address.road, locality, settlement, address.state]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0);

  // Drop duplicates such as "Muscat, Muscat".
  return [...new Set(parts)].slice(0, 3).join(", ");
}

/**
 * The written address for a point, or null when it cannot be determined.
 *
 * Never throws: a failed lookup must not block reporting an issue, and the
 * citizen can always type the location themselves.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < MIN_INTERVAL_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, MIN_INTERVAL_MS - sinceLast));
  }
  lastRequestAt = Date.now();

  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  // Oman is bilingual; ask for English and fall back to whatever exists.
  url.searchParams.set("accept-language", "en");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let result: string | null = null;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    const payload: unknown = response.ok ? await response.json() : null;
    result = isRecord(payload) ? formatAddress(payload) || null : null;
  } catch {
    // A failed lookup must not block reporting; the address remains editable.
  } finally {
    window.clearTimeout(timeoutId);
  }
  cache.set(key, result);
  return result;
}
