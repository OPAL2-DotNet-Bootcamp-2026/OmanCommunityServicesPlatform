import { Directive, ElementRef, type OnDestroy, type OnInit, inject, output } from "@angular/core";

/**
 * Emits (nearViewport) once, when the element comes within 240px of the screen.
 * Used to fetch an issue card's photo only when the card is about to be seen:
 *   <article ... ocspNearViewport (nearViewport)="loadPhoto(issue)">
 */
@Directive({ selector: "[ocspNearViewport]" })
export class NearViewportDirective implements OnInit, OnDestroy {
  readonly nearViewport = output<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (typeof IntersectionObserver !== "function") {
      this.nearViewport.emit();
      return;
    }
    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.observer?.disconnect();
        this.nearViewport.emit();
      }
    }, { rootMargin: "240px 0px" });
    this.observer.observe(this.element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
