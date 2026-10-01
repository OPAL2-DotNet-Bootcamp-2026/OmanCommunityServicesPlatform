/**
 * Loading card photos for an issue list. List responses carry no attachments,
 * so each card fetches its own as it nears the screen - never more than three
 * at once, so a long list cannot open dozens of connections.
 */
import { type Attachment } from "../../core/models/attachment.model";
import { type Issue } from "../../core/models/issue.model";

const MAX_CONCURRENT_LOADS = 3;

/** Runs at most MAX_CONCURRENT_LOADS tasks at a time; the rest wait their turn. */
export class PhotoLoadQueue {
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  private readonly inFlight = new Set<number>();

  /** Fetches once per issue at a time; a failure is silent and retried on the next render. */
  async load(issueId: number, fetch: () => Promise<Attachment[]>, onLoaded: (attachments: Attachment[]) => void): Promise<void> {
    if (this.inFlight.has(issueId)) return;
    this.inFlight.add(issueId);
    if (this.active >= MAX_CONCURRENT_LOADS) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      onLoaded(await fetch());
    } catch {
      // A preview is optional.
    } finally {
      this.active -= 1;
      this.inFlight.delete(issueId);
      this.waiting.shift()?.();
    }
  }
}

/** A copy of the issue with its attachments stored and the first image promoted to the card photo. */
export function withPhotoAttachments(issue: Issue, attachments: Attachment[]): Issue {
  const image = attachments.find((attachment) => String(attachment.fileType ?? "").toLowerCase() === "image" && attachment.fileUrl);
  const ui = { ...issue.ui, attachmentsLoaded: true };
  if (image) {
    ui.imageUrl = image.fileUrl;
    ui.imageAlt = issue.title || "Issue image";
    ui.imageStyle = image.style || "document";
    ui.previewLabel = image.label || "Issue photo";
  } else {
    // Cleared rather than left stale: this issue genuinely has no photo.
    delete ui.imageUrl;
    delete ui.imageAlt;
    ui.imageStyle = "document";
    ui.previewLabel = "Issue attachment";
  }
  return { ...issue, attachments, ui };
}
