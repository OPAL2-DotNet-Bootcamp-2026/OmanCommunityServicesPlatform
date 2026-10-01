import { Component } from "@angular/core";

/**
 * The paid "Urgent" badge. Show it only when issue.isUrgent is true, which the
 * server sets once Thawani confirms the payment:
 *   @if (issue.isUrgent) { <span ocspUrgentBadge></span> }
 * Filled amber so it never reads as the outlined "High" priority.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <span> so the badge CSS (child selectors) applies
  selector: "span[ocspUrgentBadge]",
  host: { class: "priority-badge priority-badge--urgent", title: "Paid urgent service" },
  templateUrl: "./urgent-badge.component.html",
  styleUrl: "./urgent-badge.component.css"
})
export class UrgentBadgeComponent {}
