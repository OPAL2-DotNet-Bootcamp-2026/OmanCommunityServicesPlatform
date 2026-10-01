/** Turns a relative attachment path from the API into an absolute URL; absolute ones pass through. */
export function resolveApiAssetUrl(path: string | null | undefined, apiBaseUrl: string): string {
  const candidate = String(path ?? "").trim();
  if (!candidate || /^(?:https?:)?\/\//i.test(candidate) || !apiBaseUrl) {
    return candidate;
  }
  try {
    return new URL(candidate, `${apiBaseUrl}/`).href;
  } catch {
    return "";
  }
}
