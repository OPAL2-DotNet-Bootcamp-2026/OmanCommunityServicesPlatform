import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom, timeout } from "rxjs";
import { asText, isRecord } from "../../core/utils/text-coercion.util";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
/** Nominatim's usage policy: at most one request a second. */
const MIN_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 8000;
/** Coordinates rounded to 4 places (~11 m) share a cache entry. */
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

/**
 * Turns a map pin into a short written address ("Street 21, Bawshar, Muscat")
 * using OpenStreetMap's free Nominatim service. Never throws: a failed lookup
 * must not block reporting, and the citizen can always type the location.
 */
@Injectable({ providedIn: "root" })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, string | null>();
  private lastRequestAt = 0;

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const key = `${latitude.toFixed(CACHE_PRECISION)},${longitude.toFixed(CACHE_PRECISION)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const sinceLast = Date.now() - this.lastRequestAt;
    if (sinceLast < MIN_INTERVAL_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_INTERVAL_MS - sinceLast));
    }
    this.lastRequestAt = Date.now();

    let result: string | null = null;
    try {
      const payload = await firstValueFrom(this.http.get<unknown>(NOMINATIM_REVERSE, {
        // Oman is bilingual; ask for English and fall back to whatever exists.
        params: { format: "jsonv2", lat: latitude, lon: longitude, zoom: 18, addressdetails: 1, "accept-language": "en" }
      }).pipe(timeout(REQUEST_TIMEOUT_MS)));
      result = isRecord(payload) ? shortAddress(payload) || null : null;
    } catch {
      // The address stays editable by hand.
    }
    this.cache.set(key, result);
    return result;
  }
}

/** Nominatim's display_name runs to the country; keep the parts a crew navigates by. */
function shortAddress(response: Record<string, unknown>): string {
  if (!isRecord(response["address"])) {
    return asText(response["display_name"]).split(",").slice(0, 3).join(", ").trim();
  }
  const address = response["address"] as NominatimAddress;
  const locality = address.neighbourhood ?? address.suburb ?? address.village;
  const settlement = address.city ?? address.town ?? address.county;
  const parts = [address.road, locality, settlement, address.state]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0);
  // Drop duplicates such as "Muscat, Muscat".
  return [...new Set(parts)].slice(0, 3).join(", ");
}
