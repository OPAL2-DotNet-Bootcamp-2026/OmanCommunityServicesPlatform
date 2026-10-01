import { Component, computed, input } from "@angular/core";

/**
 * Placeholder cards that hold the page's shape while a request runs, so the
 * layout does not collapse and then jump. The label is announced once.
 */
@Component({
  selector: "ocsp-loading-skeleton",
  template: `
    <span class="visually-hidden" role="status" aria-live="polite">{{ label() }}</span>
    <div class="ocsp-skeleton-list ocsp-skeleton-list--{{ variant() }}" aria-hidden="true">
      @for (card of cards(); track card) {
        <article class="ocsp-skeleton-card ocsp-skeleton-card--{{ variant() }}">
          <span class="ocsp-skeleton__block {{ variant() === 'notification' ? 'ocsp-skeleton__avatar' : 'ocsp-skeleton__media' }}"></span>
          <div class="ocsp-skeleton__content">
            <span class="ocsp-skeleton__block ocsp-skeleton__eyebrow"></span>
            <span class="ocsp-skeleton__block ocsp-skeleton__title"></span>
            <span class="ocsp-skeleton__block ocsp-skeleton__line"></span>
            <span class="ocsp-skeleton__block ocsp-skeleton__line ocsp-skeleton__line--short"></span>
          </div>
        </article>
      }
    </div>
  `
})
export class LoadingSkeletonComponent {
  readonly count = input(3);
  readonly variant = input<"issue" | "notification">("issue");
  readonly label = input("Loading content...");

  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
