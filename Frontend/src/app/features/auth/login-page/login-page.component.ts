import { Component, type OnInit, inject, signal, viewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { errorMessage } from "../../../core/api/api-error";
import { AuthService } from "../../../core/auth/auth.service";
import { SessionService } from "../../../core/auth/session.service";
import { AppPaths } from "../../../core/routing/app-paths";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { toToastTone } from "../../../shared/services/toast.service";

/** Sign in, then go back to where the user was heading (if safe) or to their role's home. */
@Component({
  selector: "ocsp-login-page",
  imports: [ReactiveFormsModule, RouterLink, BusyButtonComponent, StatusAlertComponent, RevealOnEnterDirective],
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.css"
})
export class LoginPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly paths = AppPaths;
  protected readonly status = signal<StatusMessage | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(150)] }),
    password: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(6), Validators.maxLength(256)] })
  });

  private readonly statusAlert = viewChild.required(StatusAlertComponent);

  ngOnInit(): void {
    // Registration hands the new account's email across to this form.
    const flash = this.session.consumeFlash();
    if (flash?.message) {
      this.status.set({ text: flash.message, tone: toToastTone(flash.tone) });
    }
    if (flash?.email) {
      this.form.controls.email.setValue(flash.email);
    }
  }

  protected submit(): void {
    if (this.submitting() || this.form.invalid) return;
    this.status.set(null);
    this.submitting.set(true);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (session) => {
        this.session.setFlash({ message: "Signed in successfully.", tone: "success" });
        const requested = this.route.snapshot.queryParamMap.get("returnTo");
        const target = this.session.safeReturnTo(requested, session.user.role) || this.session.roleHome(session.user.role);
        void this.router.navigateByUrl(target, { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.status.set({ text: errorMessage(error, "Sign in could not be completed."), tone: "danger" });
        this.form.controls.password.reset();
        this.statusAlert().focus();
      }
    });
  }
}
