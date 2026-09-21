/**
 * Transient action messages, shared by the citizen, staff and admin write
 * flows. Ported from the ocsp.feedback half of animations.js.
 *
 * Every message is written with textContent rather than innerHTML: the text
 * usually comes from an API error, and must never be able to inject markup.
 */
import { prefersReducedMotion } from "./motion";
import { createElement } from "../elements";

export type ToastTone = "success" | "danger" | "warning" | "info";

export interface ToastOptions {
  tone?: ToastTone;
  title?: string;
  /** Milliseconds on screen. 0 keeps it until dismissed. */
  duration?: number;
  /**
   * Groups repeats. A second toast with the same key refreshes the first
   * instead of stacking, which stops a retry loop filling the screen.
   */
  key?: string;
  /** false renders it silently, for messages already announced elsewhere. */
  announce?: boolean;
}

interface ToneDefinition {
  title: string;
  icon: string;
  duration: number;
}

const TOAST_TONES: Record<ToastTone, ToneDefinition> = {
  success: { title: "Success", icon: "bi-check-circle-fill", duration: 4200 },
  danger: { title: "Failed", icon: "bi-exclamation-octagon-fill", duration: 6200 },
  warning: { title: "Attention", icon: "bi-exclamation-triangle-fill", duration: 5600 },
  info: { title: "Update", icon: "bi-info-circle-fill", duration: 4200 }
};

/** More than this on screen at once is noise, so the oldest is evicted. */
const MAX_VISIBLE_TOASTS = 3;
const LEAVE_ANIMATION_MS = 260;

interface ToastRecord {
  id: number;
  key: string;
  node: HTMLElement;
  message: HTMLElement;
  remaining: number;
  startedAt: number;
  timer: number | null;
  removeTimer: number | null;
  hovered: boolean;
  focused: boolean;
}

const toastRecords = new Map<number, ToastRecord>();
const toastKeyIndex = new Map<string, number>();
let toastViewport: HTMLElement | null = null;
let toastSequence = 0;

function isToastTone(value: unknown): value is ToastTone {
  return typeof value === "string" && value in TOAST_TONES;
}

function ensureToastViewport(): HTMLElement {
  if (toastViewport?.isConnected) {
    return toastViewport;
  }
  const viewport = createElement("section", "ocsp-toast-viewport", { "aria-label": "Action messages" });
  document.body.append(viewport);
  toastViewport = viewport;
  return viewport;
}

function removeToast(id: number): void {
  const record = toastRecords.get(id);
  if (!record) {
    return;
  }
  if (record.timer) window.clearTimeout(record.timer);
  if (record.removeTimer) window.clearTimeout(record.removeTimer);
  record.node.remove();
  toastRecords.delete(id);
  if (toastKeyIndex.get(record.key) === id) {
    toastKeyIndex.delete(record.key);
  }
  if (toastViewport && !toastViewport.childElementCount) {
    toastViewport.remove();
    toastViewport = null;
  }
}

function dismiss(id: number): void {
  const record = toastRecords.get(id);
  if (!record) {
    return;
  }
  if (record.timer) window.clearTimeout(record.timer);
  record.timer = null;

  if (prefersReducedMotion()) {
    removeToast(id);
    return;
  }
  if (record.removeTimer) {
    return;
  }
  record.node.classList.remove("is-visible");
  record.node.classList.add("is-leaving");
  record.removeTimer = window.setTimeout(() => removeToast(id), LEAVE_ANIMATION_MS);
}

function scheduleToast(record: ToastRecord): void {
  if (record.remaining <= 0 || record.timer || record.removeTimer || record.hovered || record.focused) {
    return;
  }
  record.startedAt = performance.now();
  record.timer = window.setTimeout(() => dismiss(record.id), record.remaining);
}

/** Hovering or focusing a toast holds it open; this banks the time left. */
function pauseToast(record: ToastRecord): void {
  if (!record.timer) {
    return;
  }
  window.clearTimeout(record.timer);
  record.timer = null;
  record.remaining = Math.max(0, record.remaining - (performance.now() - record.startedAt));
}

function buildToastNode(
  tone: ToastTone,
  definition: ToneDefinition,
  titleText: string,
  text: string,
  announce: boolean
): { node: HTMLElement; message: HTMLElement; closeButton: HTMLElement } {
  const node = createElement("article", `ocsp-toast ocsp-toast--${tone}`);
  if (announce) {
    // A failure interrupts; anything else waits for a pause in speech.
    node.setAttribute("role", tone === "danger" ? "alert" : "status");
  }

  const icon = createElement("i", `bi ${definition.icon} ocsp-toast__icon`, { "aria-hidden": "true" });

  const content = createElement("div", "ocsp-toast__content");
  const title = createElement("strong", "ocsp-toast__title");
  title.textContent = titleText;
  const message = createElement("p", "ocsp-toast__message");
  message.textContent = text;
  content.append(title, message);

  const closeButton = createElement("button", "ocsp-toast__close", {
    type: "button", "aria-label": "Dismiss message"
  });
  closeButton.append(createElement("i", "bi bi-x-lg", { "aria-hidden": "true" }));

  node.append(icon, content, closeButton);
  return { node, message, closeButton };
}

/** Returns the toast id, or null when there was nothing to say. */
export function show(message: string, options: ToastOptions = {}): number | null {
  const text = String(message ?? "").trim();
  if (!text) {
    return null;
  }

  const tone: ToastTone = isToastTone(options.tone) ? options.tone : "info";
  const definition = TOAST_TONES[tone];
  const durationValue = Number(options.duration);
  const duration = Number.isFinite(durationValue) ? Math.max(0, durationValue) : definition.duration;
  const titleText = String(options.title || definition.title);

  // Tone and title are part of the key, so a later failure can never inherit
  // the colour and wording of an earlier success.
  const key = `${tone}:${titleText}:${String(options.key || text)}`;
  const existingId = toastKeyIndex.get(key);
  const existing = existingId === undefined ? undefined : toastRecords.get(existingId);

  if (existing) {
    pauseToast(existing);
    if (existing.removeTimer) window.clearTimeout(existing.removeTimer);
    existing.removeTimer = null;
    existing.remaining = duration;
    existing.message.textContent = text;
    existing.node.classList.remove("is-leaving");
    existing.node.classList.add("is-visible");
    // Re-insert so a refreshed message counts as the newest for eviction.
    toastRecords.delete(existing.id);
    toastRecords.set(existing.id, existing);
    scheduleToast(existing);
    return existing.id;
  }

  // Never evict something the reader is hovering or has focus inside.
  while (toastRecords.size >= MAX_VISIBLE_TOASTS) {
    const removable =
      [...toastRecords.values()].find((record) => !record.hovered && !record.focused) ??
      toastRecords.values().next().value;
    if (!removable) {
      break;
    }
    removeToast(removable.id);
  }

  const id = ++toastSequence;
  const built = buildToastNode(tone, definition, titleText, text, options.announce !== false);

  const record: ToastRecord = {
    id,
    key,
    node: built.node,
    message: built.message,
    remaining: duration,
    startedAt: 0,
    timer: null,
    removeTimer: null,
    hovered: false,
    focused: false
  };
  toastRecords.set(id, record);
  toastKeyIndex.set(key, id);

  const hold = (interaction: "hovered" | "focused", active: boolean): void => {
    record[interaction] = active;
    if (active) pauseToast(record);
    else scheduleToast(record);
  };
  built.closeButton.addEventListener("click", () => dismiss(id));
  built.node.addEventListener("mouseenter", () => hold("hovered", true));
  built.node.addEventListener("mouseleave", () => hold("hovered", false));
  built.node.addEventListener("focusin", () => hold("focused", true));
  built.node.addEventListener("focusout", (event) => {
    if (!built.node.contains(event.relatedTarget as Node | null)) {
      hold("focused", false);
    }
  });

  ensureToastViewport().append(built.node);
  requestAnimationFrame(() => built.node.classList.add("is-visible"));
  scheduleToast(record);
  return id;
}

const withTone =
  (tone: ToastTone) =>
  (message: string, options: ToastOptions = {}): number | null =>
    show(message, { ...options, tone });

export const success = withTone("success");
export const error = withTone("danger");
export const warning = withTone("warning");
