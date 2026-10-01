/** URL checks for addresses typed by citizens or returned by the API. */

/** True for an absolute http:// or https:// address, the only kind an image URL may be. */
export function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** "" for anything that is not a relative path or an http(s) URL, so javascript: links never render. */
export function safeUrl(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate);
  if (!hasScheme && !candidate.startsWith("//")) return candidate;
  try {
    return ["http:", "https:"].includes(new URL(candidate, document.baseURI).protocol) ? candidate : "";
  } catch {
    return "";
  }
}
