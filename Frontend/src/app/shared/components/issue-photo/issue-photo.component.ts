import { Component, computed, input, signal } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { resolveIssueImage } from "./issue-stock-images";

/**
 * The picture on an issue card (photo, stock image or placeholder):
 *   <span ocspIssuePhoto [issue]="issue"></span>
 * If the photo fails to load it falls back to the next choice instead of a broken image.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <span> so the card CSS applies
  selector: "span[ocspIssuePhoto]",
  host: {
    "[class]": "'issue-card-media issue-card-media--attachment issue-card-media--' + (image()?.style ?? 'document')",
    "[attr.data-preview-label]": "image()?.previewLabel ?? 'No preview'",
    "[attr.role]": "image() ? 'img' : null",
    "[attr.aria-label]": "image()?.alt ?? null",
    "[attr.aria-hidden]": "image() ? null : 'true'"
  },
  template: `
    @if (image(); as image) {
      <img class="issue-card-media__image" [src]="image.url" alt="" width="720" height="480"
        loading="lazy" decoding="async" referrerpolicy="no-referrer" (error)="failedUrl.set(image.url)">
    } @else {
      <i class="bi bi-image"></i>
    }
  `
})
export class IssuePhotoComponent {
  readonly issue = input.required<Issue>();
  protected readonly failedUrl = signal("");
  protected readonly image = computed(() => resolveIssueImage(this.issue(), this.failedUrl()));
}
