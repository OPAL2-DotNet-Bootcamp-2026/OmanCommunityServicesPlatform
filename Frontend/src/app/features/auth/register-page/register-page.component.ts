import { Component, inject, signal, viewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { errorMessage } from "../../../core/api/api-error";
import { AuthService } from "../../../core/auth/auth.service";
import { SessionService } from "../../../core/auth/session.service";
import { AppPaths } from "../../../core/routing/app-paths";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";

/** Citizen registration. On success the email is carried to the sign-in form. */
@Component({
  selector: "ocsp-register-page",
  imports: [ReactiveFormsModule, RouterLink, BusyButtonComponent, StatusAlertComponent, RevealOnEnterDirective],
  templateUrl: "./register-page.component.html"
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly paths = AppPaths;
  protected readonly status = signal<StatusMessage | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(150)] }),
    phoneNumber: new FormControl("", { nonNullable: true, validators: [Validators.minLength(8), Validators.maxLength(20)] }),
    password: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(6), Validators.maxLength(256)] })
  });

  private readonly statusAlert = viewChild.required(StatusAlertComponent);

  protected submit(): void {
    if (this.submitting() || this.form.invalid) return;
    this.status.set(null);
    this.submitting.set(true);

    const { name, email, phoneNumber, password } = this.form.getRawValue();
    // The region list needs a token, so a new account registers without one.
    this.auth.register({ name, email, phoneNumber: phoneNumber.trim() || null, password, regionId: null }).subscribe({
      next: () => {
        this.session.setFlash({
          message: "Your account was created successfully. Sign in to continue.",
          tone: "success",
          email: email.trim()
        });
        void this.router.navigateByUrl(AppPaths.login, { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.status.set({ text: errorMessage(error, "Registration could not be completed."), tone: "danger" });
        this.statusAlert().focus();
      }
    });
  }
}
