import { Component, computed, input, output } from "@angular/core";
import { type IssueFilters } from "../../../core/utils/issue-filter.util";
import { RevealOnEnterDirective } from "../../directives/reveal-on-enter.directive";
import { getStatusMeta } from "../../utils/issue-display.util";

interface FilterChip {
  key: keyof IssueFilters;
  label: string;
  value: string;
}

/** "Active Filters: Status: Open ×  Priority: High ×   Clear all", shown only while any filter is on. */
@Component({
  selector: "ocsp-active-filters-panel",
  imports: [RevealOnEnterDirective],
  template: `
    @if (chips().length) {
      <div class="ocsp-card active-filters-panel p-3 mb-4">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span class="fw-bold text-dark me-2 d-flex align-items-center gap-1 active-filters__label">
            <i class="bi bi-sliders text-secondary" aria-hidden="true"></i>Active Filters:
          </span>
          <div class="d-flex flex-wrap gap-2" id="activeFilterChips">
            @for (chip of chips(); track chip.key) {
              <span class="badge bg-white text-dark border shadow-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold"
                ocspReveal [revealIndex]="$index">
                <span class="text-muted fw-normal">{{ chip.label }}:</span>
                {{ chip.value }}
                <button type="button" class="btn-close ms-1 active-filter__dismiss" [attr.aria-label]="'Remove ' + chip.label + ' filter'"
                  (click)="remove.emit(chip.key)"></button>
              </span>
            }
          </div>
          <button type="button" class="ocsp-button ocsp-button--cancel ms-auto" (click)="clearAll.emit()">
            <i class="bi bi-trash3" aria-hidden="true"></i>Clear all
          </button>
        </div>
      </div>
    }
  `
})
export class ActiveFiltersPanelComponent {
  readonly filters = input.required<IssueFilters>();
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
