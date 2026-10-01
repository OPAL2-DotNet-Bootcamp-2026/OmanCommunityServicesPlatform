import { Component, computed, input } from "@angular/core";
import { getPriorityMeta } from "../../utils/issue-display.util";

/** <span ocspPriorityBadge [priority]="issue.priority"></span> -> "High", coloured. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <span> so the badge CSS (child selectors) applies
  selector: "span[ocspPriorityBadge]",
  host: { "[class]": "'priority-badge priority-badge--' + meta().key" },
  template: "{{ meta().label }}"
})
export class PriorityBadgeComponent {
  readonly priority = input.required<string>();
  protected readonly meta = computed(() => getPriorityMeta(this.priority()));
}
