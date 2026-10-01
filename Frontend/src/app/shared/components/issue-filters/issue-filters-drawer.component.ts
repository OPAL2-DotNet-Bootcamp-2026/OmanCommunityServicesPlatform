import { Component, input, output, viewChild } from "@angular/core";
import { type IssueFilters } from "../../../core/utils/issue-filter.util";
import { BootstrapOffcanvasDirective } from "../../directives/bootstrap-offcanvas.directive";

/**
 * The "Filter & Sort Issues" side drawer, shared by the citizen and staff
 * lists. Each change applies at once; "Apply Filters" just closes it.
 *   <ocsp-issue-filters-drawer #filters [filters]="filters()" [departments]="..." [categories]="..."
 *     (filtersChange)="filters.set($event)" (resetFilters)="clearFilters()" />
 *   filters.open()
 */
@Component({
  selector: "ocsp-issue-filters-drawer",
  imports: [BootstrapOffcanvasDirective],
  templateUrl: "./issue-filters-drawer.component.html"
})
export class IssueFiltersDrawerComponent {
  readonly filters = input.required<IssueFilters>();
  readonly departments = input.required<string[]>();
  readonly categories = input.required<string[]>();
  readonly filtersChange = output<IssueFilters>();
  readonly resetFilters = output<void>();

  private readonly drawer = viewChild.required(BootstrapOffcanvasDirective);

  open(): void {
    this.drawer().show();
  }

  protected close(): void {
    this.drawer().hide();
  }

  protected set(key: keyof IssueFilters, event: Event): void {
    this.filtersChange.emit({ ...this.filters(), [key]: (event.target as HTMLSelectElement).value });
  }
}
