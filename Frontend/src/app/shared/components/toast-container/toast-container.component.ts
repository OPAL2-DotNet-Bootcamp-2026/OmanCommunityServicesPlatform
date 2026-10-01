import { Component, inject } from "@angular/core";
import { ToastService } from "../../services/toast.service";

/** Draws the toasts from ToastService. Placed once, in the app shell. */
@Component({
  selector: "ocsp-toast-container",
  templateUrl: "./toast-container.component.html",
  styleUrl: "./toast-container.component.css"
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  protected onFocusOut(id: number, event: FocusEvent, toast: HTMLElement): void {
    if (!toast.contains(event.relatedTarget as Node | null)) {
      this.toastService.hold(id, "focused", false);
    }
  }
}
