/**
 * Turns coordinates into a written address, so dropping a pin fills the
 * location field instead of leaving the citizen to describe the spot twice.
 *
 * Uses Nominatim, OpenStreetMap's own geocoder - same data as the map tiles,
 * no API key, no billing account.
 *
 * Nominatim's usage policy caps this at one request per second and asks that
 * results be cached. Both are honoured below. The calls are user-initiated -
 * one per pin drop - so the real rate is far under the cap, but a citizen
 * clicking repeatedly around a map would otherwise sail past it.
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

  // Drop duplicates - "Muscat, Muscat" is common in Nominatim's Oman data.
  const unique = [...new Set(parts)];
  return unique.slice(0, 3).join(", ");
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

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      cache.set(key, null);
      return null;
    }

    const formatted = formatAddress(payload);
    const result = formatted.length > 0 ? formatted : null;
    cache.set(key, result);
    return result;
  } catch {
    // Offline, blocked, rate-limited or timed out - all the same to the caller.
    cache.set(key, null);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
