/** Account creation followed by sign-in, with an email handoff. */
import { byId, loadPageElements } from "../dom";
import { createFormBinding, type FormElements } from "../components/form";
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

interface RegisterElements extends FormElements {
  name: HTMLInputElement;
  email: HTMLInputElement;
  phone: HTMLInputElement;
  password: HTMLInputElement;
}

export class RegisterPage {
  private elements!: RegisterElements;
  private readonly bindForm = createFormBinding();

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

  private submitRegistration(): Promise<void> {
    const email = this.elements.email.value.trim();
    // Region lookup requires sign-in; anonymous registration accepts null.
    return this.auth.register({
      name: this.elements.name.value.trim(),
      email,
      phoneNumber: this.elements.phone.value.trim() || null,
      password: this.elements.password.value,
      regionId: null
    }).then(() => {
      this.session.setFlash({
        message: "Your account was created successfully. Sign in to continue.",
        tone: "success",
        email
      });
      window.location.replace("login.html");
    });
  }

  start(): void {
    const elements = loadPageElements(
      () => this.cacheElements(), "registerStatus", "The registration page failed to start."
    );
    if (!elements) return;
    this.elements = elements;
    this.bindForm(this.elements, {
      loadingLabel: "Creating account...",
      failureMessage: "Registration could not be completed.",
      submit: () => this.submitRegistration()
    });
  }
}
