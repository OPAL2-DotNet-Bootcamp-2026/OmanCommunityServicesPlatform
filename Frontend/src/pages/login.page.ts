/**
 * Sign-in form. On success it honours a validated returnTo parameter, falling
 * back to the home page for the user's role.
 */
import { byId, errorMessage, setAlert } from "../dom";
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

interface LoginElements {
  form: HTMLFormElement;
  email: HTMLInputElement;
  password: HTMLInputElement;
  submit: HTMLButtonElement;
  status: HTMLElement;
}

export class LoginPage {
  private elements!: LoginElements;
  private submitting = false;

  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): LoginElements {
    return {
      form: byId<HTMLFormElement>("loginForm"),
      email: byId<HTMLInputElement>("email"),
      password: byId<HTMLInputElement>("password"),
      submit: byId<HTMLButtonElement>("loginSubmit"),
      status: byId<HTMLElement>("loginStatus")
    };
  }

  private setSubmitting(isSubmitting: boolean): void {
    this.submitting = isSubmitting;
    this.elements.submit.disabled = isSubmitting;
    this.elements.form.setAttribute("aria-busy", String(isSubmitting));
    this.elements.submit.innerHTML = isSubmitting
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Signing in...'
      : '<i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>Sign In';
  }

  private submitLogin = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (this.submitting || !this.elements.form.reportValidity()) {
      return;
    }

    setAlert(this.elements.status, "");
    this.setSubmitting(true);

    try {
      const activeSession = await this.auth.login({
        email: this.elements.email.value.trim(),
        password: this.elements.password.value
      });

      const requestedTarget = new URLSearchParams(window.location.search).get("returnTo");
      const returnTo = this.session.safeReturnTo(requestedTarget, activeSession.user.role);
      window.location.replace(returnTo || this.session.roleHome(activeSession.user.role));
    } catch (error) {
      setAlert(
        this.elements.status,
        errorMessage(error, "Sign in could not be completed."),
        "danger"
      );
      this.elements.password.value = "";
      this.elements.password.focus();
      this.elements.status.focus();
    } finally {
      this.setSubmitting(false);
    }
  };

  start(): void {
    try {
      this.elements = this.cacheElements();
    } catch (error) {
      // The status element is the only thing we can report through, and it may
      // be the thing that is missing - so re-throw if we cannot find it.
      const status = document.getElementById("loginStatus");
      if (!status) {
        throw error;
      }
      setAlert(status, errorMessage(error, "The sign-in page failed to start."), "danger");
      return;
    }

    // A flash set by registration carries the new account's email across.
    const flash = this.session.consumeFlash();
    if (flash) {
      setAlert(this.elements.status, flash.message, flash.tone);
      if (flash.email) {
        this.elements.email.value = flash.email;
      }
    }

    this.elements.form.addEventListener("submit", (event) => {
      void this.submitLogin(event);
    });
  }
}
