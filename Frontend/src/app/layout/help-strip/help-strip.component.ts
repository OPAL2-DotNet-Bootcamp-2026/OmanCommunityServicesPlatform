import { Component, input } from "@angular/core";
import { type HelpStripContent } from "../../core/routing/page-route-data";
import { RevealOnEnterDirective } from "../../shared/directives/reveal-on-enter.directive";

/** The "need help?" band above the footer. Its wording comes from the route's data.helpStrip. */
@Component({
  selector: "ocsp-help-strip",
  imports: [RevealOnEnterDirective],
  templateUrl: "./help-strip.component.html"
})
export class HelpStripComponent {
  readonly content = input.required<HelpStripContent>();
}
