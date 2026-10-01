import { Component, computed, input, output } from "@angular/core";
import { type IssueFilters } from "../../../../core/utils/issue-filter.util";
import { RevealOnEnterDirective } from "../../../directives/reveal-on-enter.directive";
import { getStatusMeta } from "../../../utils/issue-display.util";

interface FilterChip {
  key: keyof IssueFilters;
  label: string;
  value: string;
}

/** "Active Filters: Status: Open ×  Priority: High ×   Clear all", shown only while any filter is on. */
@Component({
  selector: "ocsp-active-filters-panel",
  imports: [RevealOnEnterDirective],
  templateUrl: "./active-filters-panel.component.html",
  styleUrl: "./active-filters-panel.component.css"
})
export class ActiveFiltersPanelComponent {
  readonly filters = input.required<IssueFilters>();
  /** The staff dashboard styles the panel slightly differently. */
  readonly variant = input<"citizen" | "staff">("citizen");
  readonly remove = output<keyof IssueFilters>();
  readonly clearAll = output<void>();

  readonly chips = computed<FilterChip[]>(() => {
    const filters = this.filters();
    const chips: FilterChip[] = [
      { key: "search", label: "Search", value: filters.search.trim() },
      { key: "status", label: "Status", value: filters.status && getStatusMeta(filters.status).label },
      { key: "priority", label: "Priority", value: filters.priority },
      { key: "department", label: "Dept", value: filters.department },
      { key: "category", label: "Category", value: filters.category },
      { key: "sort", label: "Sort", value: filters.sort === "newest" ? "" : "Oldest First" }
    ];
    return chips.filter((chip) => chip.value);
  });
}
