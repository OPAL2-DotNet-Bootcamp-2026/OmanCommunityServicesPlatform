/** Sign-in with a validated return target and role-based fallback. */
import { announceStatus, byId, loadPageElements } from "../dom";
import { createFormBinding, type FormElements } from "../components/form";
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

interface LoginElements extends FormElements {
  email: HTMLInputElement;
  password: HTMLInputElement;
}

export class LoginPage {
  private elements!: LoginElements;
  private readonly bindForm = createFormBinding();

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

  private submitLogin(): Promise<void> {
    return this.auth.login({
      email: this.elements.email.value.trim(),
      password: this.elements.password.value
    }).then((activeSession) => {
      this.session.setFlash({ message: "Signed in successfully.", tone: "success" });
      const requestedTarget = new URLSearchParams(window.location.search).get("returnTo");
      const returnTo = this.session.safeReturnTo(requestedTarget, activeSession.user.role);
      window.location.replace(returnTo || this.session.roleHome(activeSession.user.role));
    });
  }

  start(): void {
    const elements = loadPageElements(
      () => this.cacheElements(), "loginStatus", "The sign-in page failed to start."
    );
    if (!elements) return;
    this.elements = elements;

    // Registration carries the new account's email across to this form.
    const flash = this.session.consumeFlash();
    if (flash) {
      announceStatus(this.elements.status, flash.message, flash.tone);
      if (flash.email) this.elements.email.value = flash.email;
    }

    this.bindForm(this.elements, {
      loadingLabel: "Signing in...",
      failureMessage: "Sign in could not be completed.",
      submit: () => this.submitLogin(),
      onError: () => {
        this.elements.password.value = "";
        this.elements.password.focus();
      }
    });
  }
}
