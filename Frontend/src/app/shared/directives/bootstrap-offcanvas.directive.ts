import { Directive, ElementRef, type OnDestroy, type OnInit, inject } from "@angular/core";
import Offcanvas from "bootstrap/js/dist/offcanvas";

/**
 * Drives a Bootstrap .offcanvas side drawer (the filter drawer):
 *   <div class="offcanvas offcanvas-end" ocspBootstrapOffcanvas #drawer="bootstrapOffcanvas">
 *   drawer.show() / drawer.hide()
 */
@Directive({ selector: "[ocspBootstrapOffcanvas]", exportAs: "bootstrapOffcanvas" })
export class BootstrapOffcanvasDirective implements OnInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private drawer: Offcanvas | null = null;

  ngOnInit(): void {
    this.drawer = Offcanvas.getOrCreateInstance(this.element);
  }

  show(): void {
    this.drawer?.show();
  }

  hide(): void {
    this.drawer?.hide();
  }

  ngOnDestroy(): void {
    this.drawer?.dispose();
    document.querySelectorAll(".offcanvas-backdrop").forEach((backdrop) => backdrop.remove());
    document.body.style.removeProperty("overflow");
  }
}
