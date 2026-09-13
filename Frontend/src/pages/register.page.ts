/**
 * Account creation. On success it sets a flash message and sends the user to
 * login rather than signing them straight in.
 */
import { announceStatus, byId, errorMessage, setAlert } from "../dom";
import { setButtonBusy } from "../components/motion";
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

interface RegisterElements {
  form: HTMLFormElement;
  name: HTMLInputElement;
  email: HTMLInputElement;
  phone: HTMLInputElement;
  password: HTMLInputElement;
  submit: HTMLButtonElement;
  status: HTMLElement;
}

export class RegisterPage {
  private elements!: RegisterElements;
  private submitting = false;

  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): RegisterElements {
    return {
      form: byId<HTMLFormElement>("registerForm"),
      name: byId<HTMLInputElement>("name"),
      email: byId<HTMLInputElement>("email"),
      phone: byId<HTMLInputElement>("phoneNumber"),
      password: byId<HTMLInputElement>("password"),
      submit: byId<HTMLButtonElement>("registerSubmit"),
      status: byId<HTMLElement>("registerStatus")
    };
  }

  private setSubmitting(isSubmitting: boolean): void {
    this.submitting = isSubmitting;
    this.elements.form.setAttribute("aria-busy", String(isSubmitting));
    setButtonBusy(this.elements.submit, isSubmitting, "Creating account...");
  }

  private submitRegistration = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (this.submitting || !this.elements.form.reportValidity()) {
      return;
    }

    setAlert(this.elements.status, "");
    this.setSubmitting(true);

    try {
      const email = this.elements.email.value.trim();

      // The anonymous register route accepts a null region; region lookup is a
      // protected backend route and only becomes available after sign-in.
      await this.auth.register({
        name: this.elements.name.value.trim(),
        email,
        phoneNumber: this.elements.phone.value.trim() || null,
        password: this.elements.password.value,
        regionId: null
      });

      this.session.setFlash({
        message: "Your account was created successfully. Sign in to continue.",
        tone: "success",
        email
      });
      window.location.replace("login.html");
    } catch (error) {
      announceStatus(
        this.elements.status,
        errorMessage(error, "Registration could not be completed."),
        "danger"
      );
      this.elements.status.focus();
    } finally {
      this.setSubmitting(false);
    }
  };

  start(): void {
    try {
      this.elements = this.cacheElements();
    } catch (error) {
      const status = document.getElementById("registerStatus");
      if (!status) {
        throw error;
      }
      setAlert(status, errorMessage(error, "The registration page failed to start."), "danger");
      return;
    }

    this.elements.form.addEventListener("submit", (event) => {
      void this.submitRegistration(event);
    });
  }
}
