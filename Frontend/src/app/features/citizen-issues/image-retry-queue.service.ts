import { Injectable, computed, inject, signal } from "@angular/core";
import { SessionService } from "../../core/auth/session.service";
import { isHttpUrl } from "../../shared/utils/url.util";

/** An image URL whose attachment failed to save, waiting for "Retry image". */
export interface PendingImage {
  issueId: number;
  imageUrl: string;
}

/**
 * Images that failed to attach to a newly created issue. Kept in
 * sessionStorage per user, so a reload still offers the retry and a shared
 * browser never offers someone else's.
 */
@Injectable({ providedIn: "root" })
export class ImageRetryQueueService {
  private readonly session = inject(SessionService);
  private readonly items = signal<PendingImage[]>([]);

  readonly pending = this.items.asReadonly();
  readonly hasPending = computed(() => this.items().length > 0);

  get(issueId: number): PendingImage | undefined {
    return this.items().find((item) => item.issueId === issueId);
  }

  add(issueId: number, imageUrl: string): void {
    this.items.update((items) => [...items.filter((item) => item.issueId !== issueId), { issueId, imageUrl }]);
    this.persist();
  }

  remove(issueId: number): void {
    this.items.update((items) => items.filter((item) => item.issueId !== issueId));
    this.persist();
  }

  /** Loads the saved retries, keeping only issues this user still has and real URLs. */
  restore(ownIssueIds: Set<number>): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      const raw: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
      const records = Array.isArray(raw) ? (raw as Partial<PendingImage>[]) : [];
      this.items.set(records
        .map((record) => ({ issueId: Number(record?.issueId), imageUrl: String(record?.imageUrl ?? "").trim() }))
        .filter((record) => ownIssueIds.has(record.issueId) && isHttpUrl(record.imageUrl)));
      this.persist();
    } catch {
      this.items.set([]);
    }
  }

  private storageKey(): string {
    const userId = Number(this.session.getUser()?.userId);
    return userId > 0 ? `ocsp:pending-image-attachments:${userId}` : "";
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      if (this.items().length) window.sessionStorage.setItem(key, JSON.stringify(this.items()));
      else window.sessionStorage.removeItem(key);
    } catch {
      // Storage can be blocked; the on-page retry still works this session.
    }
  }
}
