import { Component, input } from "@angular/core";
import { type HelpStripContent } from "../../core/routing/page-route-data";

/** The "need help?" band above the footer. Its wording comes from the route's data.helpStrip. */
@Component({
  selector: "ocsp-help-strip",
  templateUrl: "./help-strip.component.html"
})
export class HelpStripComponent {
  readonly content = input.required<HelpStripContent>();
}
