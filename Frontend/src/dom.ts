/**
 * The handful of DOM helpers every page needs.
 *
 * The JavaScript repeated these in all six page scripts. They are here once so
 * the typing is done once, and so a missing element fails loudly at start-up
 * rather than silently producing "cannot read property of null" later.
 */

export type Tone = "success" | "danger" | "warning" | "info";

const TONES: Tone[] = ["success", "danger", "warning", "info"];

/** A required element. Throws at start-up if the markup and code disagree. */
export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

/** An element the page can work without. */
export function optionalById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function toTone(value: string | null | undefined): Tone {
  return TONES.includes(value as Tone) ? (value as Tone) : "info";
}

/**
 * Shows or hides a Bootstrap alert. An empty message hides it, which is how
 * every page clears its status line.
 */
export function setAlert(
  element: HTMLElement | null,
  message: string,
  tone: string | null | undefined = "info",
  extraClass = "mb-3"
): void {
  if (!element) {
    return;
  }
  if (!message) {
    element.className = "alert d-none";
    element.textContent = "";
    return;
  }
  element.className = `alert alert-${toTone(tone)} ${extraClass}`.trim();
  element.textContent = message;
}

/** The message from an unknown throw, for a catch block. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
