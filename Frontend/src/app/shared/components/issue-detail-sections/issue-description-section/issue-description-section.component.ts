import { Component, input } from "@angular/core";

/** The issue's description, in the citizen and staff issue dialogs. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueDescriptionSection]",
  host: { class: "description-block" },
  templateUrl: "./issue-description-section.component.html",
  styleUrl: "./issue-description-section.component.css"
})
export class IssueDescriptionSectionComponent {
  readonly description = input.required<string>();
}
