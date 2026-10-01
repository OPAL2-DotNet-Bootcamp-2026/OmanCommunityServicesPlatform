import { Component, input } from "@angular/core";

/** The issue's description, in the citizen and staff issue dialogs. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueDescriptionSection]",
  host: { class: "description-block" },
  template: `
    <span class="content-label">Description</span>
    <p>{{ description() }}</p>
  `
})
export class IssueDescriptionSectionComponent {
  readonly description = input.required<string>();
}
