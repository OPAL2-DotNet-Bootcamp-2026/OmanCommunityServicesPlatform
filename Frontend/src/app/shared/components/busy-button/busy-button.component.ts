import { Component, input } from "@angular/core";

/**
 * A button that swaps its content for a spinner while a request runs, and is
 * disabled meanwhile so it cannot be submitted twice:
 *   <button ocspBusyButton type="submit" [busy]="saving()" busyLabel="Saving...">Save</button>
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- an attribute keeps it a real <button>
  selector: "button[ocspBusyButton]",
  host: {
    "[disabled]": "busy() || disabled()",
    "[attr.aria-busy]": "busy() ? 'true' : null",
    "[class.ocsp-button-busy]": "busy()"
  },
  templateUrl: "./busy-button.component.html",
  styleUrl: "./busy-button.component.css"
})
export class BusyButtonComponent {
  readonly busy = input(false);
  readonly busyLabel = input("Working...");
  /** Disabled for a reason other than being busy. */
  readonly disabled = input(false);
}
