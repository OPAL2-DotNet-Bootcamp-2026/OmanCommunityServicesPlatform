import { Component, computed, input } from "@angular/core";
import { type Attachment } from "../../../core/models/attachment.model";
import { safeUrl } from "../../utils/url.util";

const ATTACHMENT_STYLES = ["road", "water", "night", "fixed", "document"];

/** The issue's attachments as tiles; each opens in a new tab when it has a safe link. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueAttachmentsSection]",
  host: { class: "mt-4" },
  template: `
    <span class="content-label"><i class="bi bi-paperclip me-1" aria-hidden="true"></i>{{ label() }}</span>
    <div>
      @if (tiles().length) {
        <div class="attachment-grid">
          @for (tile of tiles(); track tile.id) {
            @if (tile.url) {
              <a class="attachment-thumb attachment-thumb--{{ tile.style }}" [href]="tile.url" target="_blank" rel="noopener" [attr.aria-label]="'Open ' + tile.label">
                <i class="bi {{ tile.icon }}" aria-hidden="true"></i><span>{{ tile.label }}</span>
              </a>
            } @else {
              <span class="attachment-thumb attachment-thumb--{{ tile.style }}">
                <i class="bi {{ tile.icon }}" aria-hidden="true"></i><span>{{ tile.label }}</span>
              </span>
            }
          }
        </div>
      } @else {
        <p class="text-muted small mb-0">No attachments were added to this issue.</p>
      }
    </div>
  `
})
export class IssueAttachmentsSectionComponent {
  readonly attachments = input.required<Attachment[]>();
  readonly label = input("Attachments");

  protected readonly tiles = computed(() => this.attachments().map((attachment) => ({
    id: attachment.attachmentId,
    url: safeUrl(attachment.fileUrl),
    style: ATTACHMENT_STYLES.includes(attachment.style ?? "") ? attachment.style : "document",
    label: attachment.label || attachment.fileName || "Attachment",
    icon: attachment.fileType === "Image" ? "bi-image" : "bi-file-earmark"
  })));
}
