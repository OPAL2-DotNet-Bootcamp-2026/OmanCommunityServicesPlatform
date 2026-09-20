/**
 * The handful of DOM helpers every page needs.
 *
 * The JavaScript repeated these in all six page scripts. They are here once so
 * the typing is done once, and so a missing element fails loudly at start-up
 * rather than silently producing "cannot read property of null" later.
 */

import * as feedback from "./components/feedback";
import { revealStatus } from "./components/motion";

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

/**
 * Sets a page's status line AND raises a toast for the outcomes worth
 * interrupting for.
 *
 * Every page repeated this trio - write the alert, animate it in, toast it -
 * so it lives here once. The toast is raised with announce:false because the
 * alert element is already a live region; announcing both would read the
 * message to a screen reader twice.
 */
export function announceStatus(
  element: HTMLElement | null,
  message: string,
  tone: string | null | undefined = "info",
  extraClass = "mb-3"
): void {
  setAlert(element, message, tone, extraClass);
  revealStatus(element);

  const resolved = toTone(tone);
  if (message && resolved !== "info") {
    feedback.show(message, { tone: resolved, announce: false });
  }
}

/** The message from an unknown throw, for a catch block. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Load required page elements, reporting startup errors through the page alert. */
export function loadPageElements<T>(
  load: () => T,
  statusId: string,
  fallback: string,
  extraClass = "mb-3"
): T | null {
  try {
    return load();
  } catch (error) {
    const status = document.getElementById(statusId);
    if (!status) throw error;
    setAlert(status, errorMessage(error, fallback), "danger", extraClass);
    return null;
  }
}

/** Delegate to the first matching action, preserving the caller's action order. */
export function bindActions<T extends HTMLElement>(
  host: EventTarget,
  type: "click" | "submit",
  actions: Record<string, (target: T, event: Event) => void | Promise<void>>
): void {
  host.addEventListener(type, (event) => {
    if (!(event.target instanceof Element)) return;
    for (const [action, handler] of Object.entries(actions)) {
      const selector = `${type === "submit" ? "form" : ""}[data-action="${action}"]`;
      const target = event.target.closest<T>(selector);
      if (!target) continue;
      if (type === "submit") event.preventDefault();
      void handler(target, event);
      return;
    }
  });
}
