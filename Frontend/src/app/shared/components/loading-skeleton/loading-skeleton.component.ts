import { Component, computed, input } from "@angular/core";

/**
 * Placeholder cards that hold the page's shape while a request runs, so the
 * layout does not collapse and then jump. The label is announced once.
 */
@Component({
  selector: "ocsp-loading-skeleton",
  templateUrl: "./loading-skeleton.component.html",
  styleUrl: "./loading-skeleton.component.css"
})
export class LoadingSkeletonComponent {
  readonly count = input(3);
  readonly variant = input<"issue" | "notification">("issue");
  readonly label = input("Loading content...");

  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
