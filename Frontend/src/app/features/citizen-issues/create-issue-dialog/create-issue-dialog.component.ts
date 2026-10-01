import { Component, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { type Attachment } from "../../../core/models/attachment.model";
import { type IssuePriority } from "../../../core/models/enums";
import { type CreateIssueRequest, type Issue } from "../../../core/models/issue.model";
import { type Category, type Region } from "../../../core/models/lookup.model";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { IssueLocationMapComponent, type MapPick } from "../../../shared/components/issue-location-map/issue-location-map.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { BootstrapModalDirective } from "../../../shared/directives/bootstrap-modal.directive";
import { GeocodingService } from "../../../shared/services/geocoding.service";
import { isHttpUrl } from "../../../shared/utils/url.util";
import { CitizenIssuesService } from "../citizen-issues.service";

/** The result of a submitted report, for the page to act on. */
export interface CreatedIssue {
  issue: Issue;
  imageUrl: string;
  /** The issue saved but its image did not: the page offers a retry. */
  attachmentFailed: boolean;
  /** The citizen ticked "Mark as urgent": the page starts the Thawani checkout. */
  wantsUrgent: boolean;
}

interface LocationStatus {
  text: string;
  /** location-capture__status modifier: is-loading / is-success / is-error. */
  state: "" | "is-loading" | "is-success" | "is-error";
}

/**
 * The "Create New Issue" dialog: details, priority, the paid urgent option,
 * and the location (map pin, device location, or typed). The image URL is
 * attached in a second call once the issue exists.
 */
@Component({
  selector: "ocsp-create-issue-dialog",
  imports: [ReactiveFormsModule, BootstrapModalDirective, BusyButtonComponent, IssueLocationMapComponent, StatusAlertComponent],
  templateUrl: "./create-issue-dialog.component.html",
  styleUrl: "./create-issue-dialog.component.css"
})
export class CreateIssueDialogComponent {
  readonly categories = input.required<Category[]>();
  readonly regions = input.required<Region[]>();
  readonly created = output<CreatedIssue>();
  /** True while the dialog is open; the floating button turns into a close mark. */
  readonly openChange = output<boolean>();

  private readonly service = inject(CitizenIssuesService);
  private readonly geocoding = inject(GeocodingService);
  private readonly modal = viewChild.required(BootstrapModalDirective);
  private readonly statusAlert = viewChild.required(StatusAlertComponent);

  protected readonly form = new FormGroup({
    title: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    categoryId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] }),
    imageUrl: new FormControl("", { nonNullable: true }),
    priority: new FormControl<IssuePriority>("Medium", { nonNullable: true }),
    urgent: new FormControl(false, { nonNullable: true }),
    location: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    regionId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    latitude: new FormControl<number | null>(null),
    longitude: new FormControl<number | null>(null)
  });

  protected readonly status = signal<StatusMessage | null>(null);
  protected readonly submitting = signal(false);
  protected readonly imageUrlInvalid = signal(false);
  protected readonly locationStatus = signal<LocationStatus>({ text: "Checking whether location capture is available...", state: "" });
  protected readonly geolocationAvailable = typeof navigator !== "undefined" && "geolocation" in navigator;
  protected readonly locating = signal(false);

  private readonly regionId = toSignal(this.form.controls.regionId.valueChanges, { initialValue: "" });
  protected readonly latitude = toSignal(this.form.controls.latitude.valueChanges, { initialValue: null });
  protected readonly longitude = toSignal(this.form.controls.longitude.valueChanges, { initialValue: null });
  protected readonly governorate = computed(() =>
    this.regions().find((region) => String(region.regionId) === this.regionId())?.governorate ?? "");

  /** The last address this dialog wrote, so moving the pin never overwrites the citizen's own words. */
  private lastGeocodedLocation = "";

  constructor() {
    this.resetLocationStatus();
  }

  open(): void {
    this.status.set(null);
    this.modal().show();
  }

  close(): void {
    this.modal().hide();
  }

  protected async submit(): Promise<void> {
    if (this.submitting() || this.form.invalid) return;
    const value = this.form.getRawValue();
    const imageUrl = value.imageUrl.trim();
    if (imageUrl && !isHttpUrl(imageUrl)) {
      this.status.set({ text: "Enter an image URL beginning with http:// or https://.", tone: "danger" });
      this.imageUrlInvalid.set(true);
      return;
    }
    this.imageUrlInvalid.set(false);
    this.status.set(null);
    this.submitting.set(true);

    const payload: CreateIssueRequest = {
      title: value.title.trim(),
      description: value.description.trim(),
      location: value.location.trim(),
      latitude: value.latitude,
      longitude: value.longitude,
      priority: value.priority,
      categoryId: Number(value.categoryId),
      regionId: Number(value.regionId)
    };

    try {
      const created = await firstValueFrom(this.service.createIssue(payload, this.categories(), this.regions()));
      // Attachments are a separate resource; a failure here does not undo the issue, it becomes a retry.
      let attachment: Attachment | null = null;
      let attachmentFailed = false;
      if (imageUrl) {
        try {
          attachment = await this.service.saveImageAttachment(created.issueId, imageUrl);
        } catch {
          attachmentFailed = true;
        }
      }
      this.created.emit({
        issue: this.completeIssue(created, payload, attachment, attachmentFailed),
        imageUrl,
        attachmentFailed,
        wantsUrgent: value.urgent
      });
      this.resetForm();
      this.modal().hide();
    } catch (error) {
      this.status.set({ text: errorMessage(error, "The issue could not be created."), tone: "danger" });
      this.statusAlert().focus();
    } finally {
      this.submitting.set(false);
    }
  }

  protected useCurrentLocation(): void {
    this.locating.set(true);
    this.locationStatus.set({ text: "Requesting your device location...", state: "is-loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        void this.applyPinnedLocation(position.coords.latitude, position.coords.longitude, "Using your current position.");
      },
      (error) => {
        this.locating.set(false);
        this.locationStatus.set({ text: error.message || "Location permission was not granted.", state: "is-error" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  protected onMapPick(pick: MapPick): void {
    void this.applyPinnedLocation(pick.latitude, pick.longitude, "Location pinned.");
  }

  /**
   * Records the point, then asks OpenStreetMap what is there. The address only
   * fills a location the citizen has not typed themselves.
   */
  private async applyPinnedLocation(latitude: number, longitude: number, prefix: string): Promise<void> {
    this.form.patchValue({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });
    const current = this.form.controls.location.value.trim();
    const mayOverwrite = current === "" || current === this.lastGeocodedLocation;

    this.locationStatus.set({ text: `${prefix} Looking up the address...`, state: "is-loading" });
    const address = await this.geocoding.reverseGeocode(latitude, longitude);
    if (!address) {
      this.locationStatus.set({ text: `${prefix} The address could not be looked up - please describe the location below.`, state: "is-success" });
      return;
    }
    if (!mayOverwrite) {
      this.locationStatus.set({ text: `${prefix} Your own location text was kept. Nearby: ${address}`, state: "is-success" });
      return;
    }
    this.form.controls.location.setValue(address);
    this.lastGeocodedLocation = address;
    this.locationStatus.set({ text: `${prefix} Location set to "${address}" - edit it if a landmark would be clearer.`, state: "is-success" });
  }

  /** The created issue with the names and photo resolved, so its card matches every other card. */
  private completeIssue(created: Issue, payload: CreateIssueRequest, attachment: Attachment | null, attachmentFailed: boolean): Issue {
    const category = this.categories().find((item) => Number(item.categoryId) === payload.categoryId);
    const region = this.regions().find((item) => Number(item.regionId) === payload.regionId);
    const issue: Issue = {
      ...created,
      categoryId: created.categoryId ?? payload.categoryId,
      regionId: created.regionId ?? payload.regionId,
      categoryName: created.categoryName || category?.categoryName || "",
      regionName: created.regionName || region?.regionName || "",
      governorate: created.governorate || region?.governorate || "",
      assignedDepartmentName: created.assignedDepartmentName ?? category?.departmentName ?? null,
      ui: { ...created.ui, attachmentsLoaded: !attachmentFailed }
    };
    if (attachment) {
      issue.attachments = [attachment];
      issue.ui = { ...issue.ui, imageUrl: attachment.fileUrl, imageAlt: payload.title, previewLabel: "Issue photo" };
    }
    return issue;
  }

  private resetForm(): void {
    this.form.reset();
    this.lastGeocodedLocation = "";
    this.resetLocationStatus();
  }

  private resetLocationStatus(): void {
    this.locationStatus.set(this.geolocationAvailable
      ? { text: "Use your device location, or enter the location manually.", state: "" }
      : { text: "Location capture is not supported in this browser.", state: "" });
  }
}
