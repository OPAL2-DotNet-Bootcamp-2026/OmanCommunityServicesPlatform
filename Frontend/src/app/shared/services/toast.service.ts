import { Injectable, signal } from "@angular/core";
import { prefersReducedMotion } from "../utils/reduced-motion.util";

export type ToastTone = "success" | "danger" | "warning" | "info";

/** A tone from storage or the API; anything unknown becomes "info". */
export function toToastTone(value: string | null | undefined): ToastTone {
  return ["success", "danger", "warning", "info"].includes(value ?? "") ? (value as ToastTone) : "info";
}

export interface ToastOptions {
  tone?: ToastTone;
  title?: string;
  /** Milliseconds on screen. 0 keeps it until dismissed. */
  duration?: number;
  /** A second toast with the same key refreshes the first instead of stacking. */
  key?: string;
  /** false renders it silently, for messages already announced on the page. */
  announce?: boolean;
}

/** One toast as the container draws it. */
export interface ToastView {
  id: number;
  tone: ToastTone;
  icon: string;
  title: string;
  message: string;
  announce: boolean;
  visible: boolean;
  leaving: boolean;
}

interface ToastTimer {
  key: string;
  remaining: number;
  startedAt: number;
  timer: number | null;
  removeTimer: number | null;
  hovered: boolean;
  focused: boolean;
}

const TONES: Record<ToastTone, { title: string; icon: string; duration: number }> = {
  success: { title: "Success", icon: "bi-check-circle-fill", duration: 4200 },
  danger: { title: "Failed", icon: "bi-exclamation-octagon-fill", duration: 6200 },
  warning: { title: "Attention", icon: "bi-exclamation-triangle-fill", duration: 5600 },
  info: { title: "Update", icon: "bi-info-circle-fill", duration: 4200 }
};

/** More than this on screen at once is noise; the oldest is evicted. */
const MAX_VISIBLE = 3;
const LEAVE_ANIMATION_MS = 260;

/**
 * Short action messages in the bottom corner ("Comment added."). Hovering or
 * focusing a toast holds it open. Text is rendered as text, never HTML, since
 * it often comes from an API error.
 */
@Injectable({ providedIn: "root" })
export class ToastService {
  readonly toasts = signal<ToastView[]>([]);
  private readonly timers = new Map<number, ToastTimer>();
  private sequence = 0;

  success(message: string, options: ToastOptions = {}): number | null {
    return this.show(message, { ...options, tone: "success" });
  }

  error(message: string, options: ToastOptions = {}): number | null {
    return this.show(message, { ...options, tone: "danger" });
  }

  warning(message: string, options: ToastOptions = {}): number | null {
    return this.show(message, { ...options, tone: "warning" });
  }

  /** Returns the toast id, or null when there was nothing to say. */
  show(message: string, options: ToastOptions = {}): number | null {
    const text = String(message ?? "").trim();
    if (!text) {
      return null;
    }
    const tone: ToastTone = options.tone && options.tone in TONES ? options.tone : "info";
    const definition = TONES[tone];
    const duration = Number.isFinite(options.duration) ? Math.max(0, Number(options.duration)) : definition.duration;
    const title = options.title || definition.title;
    // Tone and title are in the key, so a failure never inherits an earlier success's look.
    const key = `${tone}:${title}:${options.key || text}`;

    const existing = [...this.timers.entries()].find(([, timer]) => timer.key === key);
    if (existing) {
      const [id, timer] = existing;
      this.pause(timer);
      if (timer.removeTimer) window.clearTimeout(timer.removeTimer);
      timer.removeTimer = null;
      timer.remaining = duration;
      this.update(id, { message: text, visible: true, leaving: false });
      this.schedule(id);
      return id;
    }

    // Never evict a toast the reader is hovering or has focus inside.
    while (this.timers.size >= MAX_VISIBLE) {
      const removable = [...this.timers.entries()].find(([, timer]) => !timer.hovered && !timer.focused)
        ?? [...this.timers.entries()][0];
      if (!removable) break;
      this.remove(removable[0]);
    }

    const id = ++this.sequence;
    this.timers.set(id, { key, remaining: duration, startedAt: 0, timer: null, removeTimer: null, hovered: false, focused: false });
    this.toasts.update((toasts) => [...toasts, {
      id, tone, icon: definition.icon, title, message: text,
      announce: options.announce !== false, visible: false, leaving: false
    }]);
    requestAnimationFrame(() => this.update(id, { visible: true }));
    this.schedule(id);
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    if (timer.timer) window.clearTimeout(timer.timer);
    timer.timer = null;
    if (prefersReducedMotion()) {
      this.remove(id);
      return;
    }
    if (timer.removeTimer) return;
    this.update(id, { visible: false, leaving: true });
    timer.removeTimer = window.setTimeout(() => this.remove(id), LEAVE_ANIMATION_MS);
  }

  /** Called by the container on hover and focus, which hold a toast open. */
  hold(id: number, interaction: "hovered" | "focused", active: boolean): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    timer[interaction] = active;
    if (active) this.pause(timer);
    else this.schedule(id);
  }

  private schedule(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.remaining <= 0 || timer.timer || timer.removeTimer || timer.hovered || timer.focused) {
      return;
    }
    timer.startedAt = performance.now();
    timer.timer = window.setTimeout(() => this.dismiss(id), timer.remaining);
  }

  /** Banks the time left so a held toast resumes where it stopped. */
  private pause(timer: ToastTimer): void {
    if (!timer.timer) return;
    window.clearTimeout(timer.timer);
    timer.timer = null;
    timer.remaining = Math.max(0, timer.remaining - (performance.now() - timer.startedAt));
  }

  private remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.timer) window.clearTimeout(timer.timer);
    if (timer?.removeTimer) window.clearTimeout(timer.removeTimer);
    this.timers.delete(id);
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private update(id: number, changes: Partial<ToastView>): void {
    this.toasts.update((toasts) => toasts.map((toast) => (toast.id === id ? { ...toast, ...changes } : toast)));
  }
}
