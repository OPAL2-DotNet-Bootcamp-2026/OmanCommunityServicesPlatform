import { DOCUMENT } from "@angular/common";
import { Directive, ElementRef, type OnDestroy, type OnInit, inject, input } from "@angular/core";
import { prefersReducedMotion } from "../utils/reduced-motion.util";

/**
 * Two presets, both from the original motion design:
 *   "content" - data rows (issue cards, comments, notifications)
 *   "static"  - page furniture (hero, section headings, stat blocks)
 */
type RevealPreset = "content" | "static";

const PRESETS: Record<RevealPreset, { interval: number; duration: number; distance: number; maxDelay: number }> = {
  content: { interval: 28, duration: 220, distance: 8, maxDelay: 100 },
  static: { interval: 36, duration: 260, distance: 12, maxDelay: 140 }
};

/** One observer for every revealing element on the page. */
let sharedObserver: IntersectionObserver | null = null;
const onEnter = new WeakMap<Element, () => void>();

function observer(): IntersectionObserver | null {
  if (typeof IntersectionObserver !== "function") return null;
  return (sharedObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        sharedObserver?.unobserve(entry.target);
        onEnter.get(entry.target)?.();
      }
    }),
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
  ));
}

/**
 * Fades and lifts an element in the first time it scrolls into view:
 *   <article class="issue-card" ocspReveal [revealIndex]="$index">
 * Elements kept by @for (same track key) are not re-animated on re-render.
 * Under prefers-reduced-motion it does nothing.
 */
@Directive({ selector: "[ocspReveal]" })
export class RevealOnEnterDirective implements OnInit, OnDestroy {
  /** "content" (default) or "static". */
  readonly ocspReveal = input<RevealPreset | "">("content");
  /** Position in a list; staggers the delay, capped so long lists don't wait. */
  readonly revealIndex = input(0);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private cleanupTimer = 0;

  constructor() {
    inject(DOCUMENT).documentElement.classList.add("ocsp-motion-enabled");
  }

  ngOnInit(): void {
    if (prefersReducedMotion()) {
      return;
    }
    const preset = PRESETS[this.ocspReveal() || "content"];
    const delay = Math.min(this.revealIndex() * preset.interval, preset.maxDelay);
    const style = this.element.style;
    this.element.classList.add("ocsp-motion-enter");
    style.setProperty("--ocsp-motion-delay", `${delay}ms`);
    style.setProperty("--ocsp-motion-distance", `${preset.distance}px`);
    style.setProperty("--ocsp-motion-duration", `${preset.duration}ms`);

    const reveal = (): void => {
      requestAnimationFrame(() => {
        this.element.classList.add("is-visible");
        // transitionend can be missed if the element moves mid-flight; the timer guarantees cleanup.
        this.cleanupTimer = window.setTimeout(() => this.finish(), preset.duration + delay + 100);
      });
    };
    const shared = observer();
    if (shared) {
      onEnter.set(this.element, reveal);
      shared.observe(this.element);
    } else {
      reveal();
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.cleanupTimer);
    sharedObserver?.unobserve(this.element);
    onEnter.delete(this.element);
  }

  /** Leaves the element exactly as authored once the entrance is done. */
  private finish(): void {
    this.element.classList.remove("ocsp-motion-enter", "is-visible");
    for (const property of ["delay", "distance", "duration"]) {
      this.element.style.removeProperty(`--ocsp-motion-${property}`);
    }
  }
}
