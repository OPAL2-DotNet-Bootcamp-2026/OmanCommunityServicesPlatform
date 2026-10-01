import { Component, computed, input } from "@angular/core";
import { getStatusMeta } from "../../utils/issue-display.util";

/** <span ocspStatusBadge [status]="issue.currentStatus"></span> -> "In Progress", coloured. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <span> so the badge CSS (child selectors) applies
  selector: "span[ocspStatusBadge]",
  host: { "[class]": "'status-badge status-badge--' + meta().key" },
  template: "{{ meta().label }}"
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  protected readonly meta = computed(() => getStatusMeta(this.status()));
}
