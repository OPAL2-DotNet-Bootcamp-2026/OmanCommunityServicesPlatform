import { Component, computed, input } from "@angular/core";
import { type Attachment } from "../../../../core/models/attachment.model";
import { safeUrl } from "../../../utils/url.util";

const ATTACHMENT_STYLES = ["road", "water", "night", "fixed", "document"];

/** The issue's attachments as tiles; each opens in a new tab when it has a safe link. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueAttachmentsSection]",
  host: { class: "mt-4" },
  templateUrl: "./issue-attachments-section.component.html",
  styleUrl: "./issue-attachments-section.component.css"
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
