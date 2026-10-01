import { Directive, ElementRef, type OnDestroy, effect, inject, input, untracked } from "@angular/core";
import { prefersReducedMotion } from "../utils/reduced-motion.util";

/**
 * Counts a number up to its value, keeping any prefix/suffix:
 *   <span ocspCountUp [countTo]="980" [countMinDigits]="2"></span>
 *   <span ocspCountUp [countTo]="48" countSuffix="hr" [countWhenVisible]="true"></span>
 * Animates from the number currently shown, so a changed value glides to the
 * new one. The real figure is always in aria-label for screen readers.
 */
@Directive({
  selector: "[ocspCountUp]",
  host: { "[attr.aria-label]": "label()" }
})
export class CountUpDirective implements OnDestroy {
  readonly countTo = input.required<number>();
  readonly countMinDigits = input(1);
  readonly countGrouping = input(false);
  readonly countPrefix = input("");
  readonly countSuffix = input("");
  /** Start counting only once the element scrolls into view (home page statistics). */
  readonly countWhenVisible = input(false);
  readonly countDuration = input(520);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private frame = 0;
  private shown = 0;
  /** False until the element has been seen, when countWhenVisible is on. */
  private seen = false;
  private observer: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      const target = Number(this.countTo());
      if (!Number.isFinite(target)) return;
      untracked(() => (this.seen || !this.waitForVisibility() ? this.animate(target) : this.write(0)));
    });
  }

  /** Starts the observer the first time; true while the element is still off screen. */
  private waitForVisibility(): boolean {
    if (!this.countWhenVisible() || typeof IntersectionObserver !== "function" || prefersReducedMotion()) {
      this.seen = true;
      return false;
    }
    this.observer ??= new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.observer?.disconnect();
        this.seen = true;
        this.animate(Number(this.countTo()));
      }
    }, { threshold: 0.45 });
    this.observer.observe(this.element);
    return true;
  }

  protected label(): string {
    return this.format(Number(this.countTo()) || 0);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  private animate(target: number): void {
    cancelAnimationFrame(this.frame);
    const start = this.shown;
    if (prefersReducedMotion() || this.countDuration() <= 0 || start === target) {
      this.write(target);
      return;
    }
    const startedAt = performance.now();
    const step = (now: number): void => {
      const progress = Math.min((now - startedAt) / this.countDuration(), 1);
      // Ease-out quadratic: quick at first, with the final steps still visible.
      const eased = 1 - Math.pow(1 - progress, 2);
      this.write(start + (target - start) * eased);
      if (progress < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private write(value: number): void {
    this.shown = Math.round(value);
    this.element.textContent = this.format(this.shown);
  }

  private format(value: number): string {
    const digits = Math.round(value).toLocaleString("en-US", {
      minimumIntegerDigits: this.countMinDigits(),
      useGrouping: this.countGrouping()
    });
    return `${this.countPrefix()}${digits}${this.countSuffix()}`;
  }
}
