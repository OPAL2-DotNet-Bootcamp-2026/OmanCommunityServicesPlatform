import { Component, type ElementRef, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { type Observable } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { type Governorate } from "../../../core/models/enums";
import { type Category, type Department, type Region } from "../../../core/models/lookup.model";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { StaffDashboardService } from "../staff-dashboard.service";

export type SetupPanel = "regions" | "departments" | "categories";

const FOCUSABLE = 'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The governorates an admin can pick for a new region (Enums/Governorate.cs). */
const GOVERNORATES: { value: Governorate; label: string }[] = [
  { value: "Muscat", label: "Muscat" }, { value: "Dhofar", label: "Dhofar" }, { value: "Musandam", label: "Musandam" },
  { value: "AlBuraimi", label: "Al Buraimi" }, { value: "AdDakhiliyah", label: "Ad Dakhiliyah" },
  { value: "AlBatinahNorth", label: "North Al Batinah" }, { value: "AlBatinahSouth", label: "South Al Batinah" },
  { value: "AshSharqiyahNorth", label: "North Ash Sharqiyah" }, { value: "AshSharqiyahSouth", label: "South Ash Sharqiyah" },
  { value: "AdhDhahirah", label: "Al Dhahirah" }, { value: "AlWusta", label: "Al Wusta" }
];

/**
 * "Manage Platform Setup" (Admin only): add a region, then a department, then
 * a category. Choosing a type reveals its form. Tab stays inside the dialog,
 * Escape closes it, and focus returns to the button that opened it.
 */
@Component({
  selector: "ocsp-admin-setup-dialog",
  imports: [ReactiveFormsModule, BusyButtonComponent, StatusAlertComponent],
  templateUrl: "./admin-setup-dialog.component.html"
})
export class AdminSetupDialogComponent {
  readonly regions = input.required<Region[]>();
  readonly departments = input.required<Department[]>();
  readonly regionCreated = output<Region>();
  readonly departmentCreated = output<Department>();
  readonly categoryCreated = output<Category>();

  private readonly service = inject(StaffDashboardService);
  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>("dialog");
  private readonly statusAlert = viewChild.required(StatusAlertComponent);
  private returnFocusTo: HTMLElement | null = null;

  protected readonly governorates = GOVERNORATES;
  protected readonly isOpen = signal(false);
  protected readonly panel = signal<SetupPanel | null>(null);
  protected readonly status = signal<StatusMessage | null>(null);
  protected readonly saving = signal(false);

  protected readonly regionForm = new FormGroup({
    regionName: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    governorate: new FormControl<Governorate | "">("", { nonNullable: true, validators: [Validators.required] })
  });
  protected readonly departmentForm = new FormGroup({
    departmentName: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    contactEmail: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(150)] }),
    description: new FormControl("", { nonNullable: true, validators: [Validators.maxLength(500)] }),
    regionId: new FormControl("", { nonNullable: true })
  });
  protected readonly categoryForm = new FormGroup({
    categoryName: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    departmentId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl("", { nonNullable: true, validators: [Validators.maxLength(300)] })
  });

  open(trigger: HTMLElement | null): void {
    this.returnFocusTo = trigger;
    this.status.set(null);
    this.isOpen.set(true);
    requestAnimationFrame(() => this.dialog().nativeElement.focus());
  }

  protected close(): void {
    this.isOpen.set(false);
    this.panel.set(null);
    requestAnimationFrame(() => this.returnFocusTo?.focus());
  }

  protected choose(panel: SetupPanel, event: Event): void {
    event.preventDefault();
    this.panel.set(panel);
    requestAnimationFrame(() => document.getElementById(PANEL_IDS[panel])?.focus());
  }

  protected readonly sortedRegions = computed(() =>
    [...this.regions()].sort((left, right) => left.regionName.localeCompare(right.regionName)));
  protected readonly sortedDepartments = computed(() =>
    [...this.departments()].sort((left, right) => left.departmentName.localeCompare(right.departmentName)));

  protected addRegion(): void {
    const { regionName, governorate } = this.regionForm.getRawValue();
    this.save("Region", this.regionForm, this.service.createRegion({ regionName: regionName.trim(), governorate: governorate as Governorate }),
      (region) => this.regionCreated.emit(region));
  }

  protected addDepartment(): void {
    const value = this.departmentForm.getRawValue();
    this.save("Department", this.departmentForm, this.service.createDepartment({
      departmentName: value.departmentName.trim(),
      contactEmail: value.contactEmail.trim(),
      description: value.description.trim() || null,
      regionId: value.regionId ? Number(value.regionId) : null
    }), (department) => this.departmentCreated.emit(department));
  }

  protected addCategory(): void {
    const value = this.categoryForm.getRawValue();
    this.save("Category", this.categoryForm, this.service.createCategory({
      categoryName: value.categoryName.trim(),
      description: value.description.trim() || null,
      departmentId: Number(value.departmentId)
    }), (category) => this.categoryCreated.emit(category));
  }

  /** Escape closes; Tab and Shift+Tab wrap around inside the dialog. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = this.dialog().nativeElement;
    const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
    } else if (active === (event.shiftKey ? first : last) || !active || !focusable.includes(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  private save<T>(label: string, form: FormGroup, request: Observable<T>, onSaved: (created: T) => void): void {
    if (this.saving() || form.invalid) return;
    const noun = label.toLocaleLowerCase();
    this.saving.set(true);
    this.status.set({ text: `Adding ${noun}...`, tone: "info" });
    request.subscribe({
      next: (created) => {
        // Created already, so a later problem can never turn into a duplicate POST.
        onSaved(created);
        form.reset();
        this.status.set({ text: `${label} added successfully.`, tone: "success" });
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.status.set({ text: errorMessage(error, `The ${noun} could not be added.`), tone: "danger" });
        this.statusAlert().focus();
        this.saving.set(false);
      }
    });
  }
}

const PANEL_IDS: Record<SetupPanel, string> = {
  regions: "adminRegionPanel",
  departments: "adminDepartmentPanel",
  categories: "adminCategoryPanel"
};
