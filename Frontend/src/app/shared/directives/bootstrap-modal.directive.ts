import { Directive, ElementRef, type OnDestroy, type OnInit, inject, output } from "@angular/core";
import Modal from "bootstrap/js/dist/modal";

/**
 * Drives a Bootstrap .modal from Angular, keeping Bootstrap's focus trap,
 * Escape key and backdrop:
 *   <div class="modal fade" ocspBootstrapModal #dialog="bootstrapModal" (modalHidden)="...">
 *   dialog.show() / dialog.hide()
 */
@Directive({ selector: "[ocspBootstrapModal]", exportAs: "bootstrapModal" })
export class BootstrapModalDirective implements OnInit, OnDestroy {
  /** Fires once the dialog is fully visible (has a size: safe to measure). */
  readonly modalShown = output<void>();
  /** Fires once the dialog has fully closed. */
  readonly modalHidden = output<void>();
  /** Fires as the dialog starts to open. */
  readonly modalShow = output<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private modal: Modal | null = null;
  private readonly onShow = (): void => this.modalShow.emit();
  private readonly onShown = (): void => this.modalShown.emit();
  private readonly onHidden = (): void => this.modalHidden.emit();

  ngOnInit(): void {
    this.modal = Modal.getOrCreateInstance(this.element);
    this.element.addEventListener("show.bs.modal", this.onShow);
    this.element.addEventListener("shown.bs.modal", this.onShown);
    this.element.addEventListener("hidden.bs.modal", this.onHidden);
  }

  show(): void {
    this.modal?.show();
  }

  hide(): void {
    this.modal?.hide();
  }

  ngOnDestroy(): void {
    this.element.removeEventListener("show.bs.modal", this.onShow);
    this.element.removeEventListener("shown.bs.modal", this.onShown);
    this.element.removeEventListener("hidden.bs.modal", this.onHidden);
    this.modal?.dispose();
    // A dialog destroyed while open would leave the page locked behind its backdrop.
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  }
}
