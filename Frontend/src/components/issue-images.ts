/**
 * Lazy thumbnail loading for issue cards, shared by the citizen and staff
 * lists.
 *
 * Issue LIST responses carry no attachments, so a card has nothing to build a
 * preview from. Fetching them for every row on load would fire one request per
 * card and delay the list itself, so they are loaded only as cards approach the
 * viewport, and never more than a few at a time.
 *
 * Both pages had their own copy of this on main; it is one module here.
 */
import type { Attachment, Issue } from "../models";
import { renderIssueImage, safeDomId } from "./issue-renderers";

const MAX_CONCURRENT_IMAGE_LOADS = 3;
/** Start fetching a little before the card is actually on screen. */
const OBSERVER_ROOT_MARGIN = "240px 0px";

/**
 * One semaphore shared by the observer path and the fallback path, so a long
 * dashboard cannot open dozens of connections at once.
 */
export class ImageLoadQueue {
  private active = 0;
  private readonly waiters: (() => void)[] = [];

  async run<T>(request: () => Promise<T>): Promise<T> {
    if (this.active >= MAX_CONCURRENT_IMAGE_LOADS) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active += 1;
    try {
      return await request();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

/**
 * Stores the attachments on the issue and promotes the first image to the
 * card preview. Returns the issue so the caller can re-render its card.
 */
export function applyAttachmentsToIssue(
  issue: Issue | null,
  attachments: Attachment[]
): Issue | null {
  if (!issue) {
    return null;
  }

  const image = attachments.find(
    (attachment) => String(attachment.fileType ?? "").toLowerCase() === "image" && attachment.fileUrl
  );

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

  issue.attachments = attachments;
  issue.ui = ui;
  return issue;
}

/**
 * Locates an issue in a loaded list. Numbers on both sides because an id can
 * arrive as a string from a dataset attribute and as a number from the API.
 */
export function findIssueById(issues: Issue[] | undefined, issueId: number): Issue | null {
  return issues?.find((issue) => Number(issue.issueId) === Number(issueId)) ?? null;
}

/**
 * Swaps a card's image in place after its attachments arrive, leaving the rest
 * of the card alone. The container differs per page - the citizen gallery or
 * the staff list - so it is passed in.
 */
export function refreshIssueCardImage(container: ParentNode, issue: Issue | null): void {
  if (!issue) {
    return;
  }
  const card = container.querySelector(`[data-issue-id="${safeDomId(issue.issueId)}"]`);
  const media = card?.querySelector(".issue-card-media");
  if (media) {
    media.outerHTML = renderIssueImage(issue);
  }
}

export interface HydrationOptions {
  /** The element containing the cards. */
  list: HTMLElement;
  /** Only cards matching this are considered. */
  cardSelector: string;
  findIssue: (issueId: number) => Issue | null;
  fetchAttachments: (issueId: number) => Promise<Attachment[]>;
  /** Re-renders one card's media element in place. */
  onLoaded: (issue: Issue | null, attachments: Attachment[]) => void;
}

/**
 * Owns the observer and the in-flight task map for one list. Re-running
 * observe() after a re-render is safe - the previous observer is disconnected
 * and already-loaded cards are skipped.
 */
export class IssueImageHydrator {
  private observer: IntersectionObserver | null = null;
  private readonly tasks = new Map<number, Promise<void>>();
  private readonly queue = new ImageLoadQueue();

  constructor(private readonly options: HydrationOptions) {}

  private async hydrate(issueId: number): Promise<void> {
    const issue = this.options.findIssue(issueId);
    if (!issue || issue.ui?.attachmentsLoaded) {
      return;
    }

    const inFlight = this.tasks.get(issueId);
    if (inFlight) {
      return inFlight;
    }

    const task = this.queue
      .run(() => this.options.fetchAttachments(issueId))
      .then((attachments) => {
        this.options.onLoaded(this.options.findIssue(issueId), attachments);
      })
      // A preview is optional. A failed background request simply retries the
      // next time filtering or sorting renders this card.
      .catch(() => undefined)
      .finally(() => this.tasks.delete(issueId));

    this.tasks.set(issueId, task);
    return task;
  }

  observe(): void {
    this.observer?.disconnect();

    const pending = [...this.options.list.querySelectorAll<HTMLElement>(this.options.cardSelector)]
      .filter((card) => {
        const issue = this.options.findIssue(Number(card.dataset.issueId));
        return issue && !issue.ui?.attachmentsLoaded;
      });

    if (!pending.length) {
      return;
    }

    // Without IntersectionObserver, a small worker pool keeps requests bounded
    // rather than firing one per card.
    if (typeof IntersectionObserver !== "function") {
      const issueIds = pending.map((card) => Number(card.dataset.issueId));
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < issueIds.length) {
          await this.hydrate(issueIds[cursor++]);
        }
      };
      Array.from({ length: Math.min(3, issueIds.length) }, () => void worker());
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          observer.unobserve(entry.target);
          void this.hydrate(Number((entry.target as HTMLElement).dataset.issueId));
        });
      },
      { rootMargin: OBSERVER_ROOT_MARGIN }
    );

    this.observer = observer;
    pending.forEach((card) => observer.observe(card));
  }
}
