import { Component, ElementRef, Injector, afterNextRender, effect, inject, input } from "@angular/core";
import { type ToastTone, ToastService } from "../../services/toast.service";
import { replayAnimation } from "../../utils/reduced-motion.util";

/** A page's status line. Null hides it. */
export interface StatusMessage {
  text: string;
  tone: ToastTone;
}

/**
 * A Bootstrap alert that is hidden when empty, animates in when its message
 * changes, and also raises a toast for anything other than plain info:
 *   <div ocspStatusAlert [status]="status()" spacing="mb-4" tabindex="-1"></div>
 * The toast is silent (announce: false) because the alert is already a live region.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so it can be focused and styled as before
  selector: "div[ocspStatusAlert]",
  host: {
    "[class]": "status() ? 'alert alert-' + status()!.tone + ' ' + spacing() : 'd-none'",
    "[attr.role]": "role()",
    "[attr.aria-live]": "role() === 'alert' ? 'assertive' : 'polite'"
  },
  template: "{{ status()?.text }}"
})
export class StatusAlertComponent {
  readonly status = input<StatusMessage | null>(null);
  readonly spacing = input("mb-3");
  readonly role = input<"alert" | "status">("alert");

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const status = this.status();
      if (!status) return;
      replayAnimation(this.element, "ocsp-status-enter");
      if (status.tone !== "info") {
        this.toast.show(status.text, { tone: status.tone, announce: false });
      }
    });
  }

  /** Focuses the alert once it has rendered; it is display:none until its message arrives. */
  focus(): void {
    afterNextRender(() => this.element.focus(), { injector: this.injector });
  }
}
