import { Component, inject } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs";
import { SessionService } from "./core/auth/session.service";
import { AppPaths } from "./core/routing/app-paths";
import { CurrentPageService } from "./layout/current-page.service";
import { HelpStripComponent } from "./layout/help-strip/help-strip.component";
import { SiteFooterComponent } from "./layout/site-footer/site-footer.component";
import { SiteHeaderComponent } from "./layout/site-header/site-header.component";
import { ToastContainerComponent } from "./shared/components/toast-container/toast-container.component";
import { ToastService, toToastTone } from "./shared/services/toast.service";

/** The page shell: header, the routed page, help strip, footer and toasts. */
@Component({
  selector: "ocsp-root",
  imports: [RouterOutlet, SiteHeaderComponent, HelpStripComponent, SiteFooterComponent, ToastContainerComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css"
})
export class AppComponent {
  protected readonly page = inject(CurrentPageService);

  constructor() {
    const session = inject(SessionService);
    const toast = inject(ToastService);

    // A one-time message set before navigating ("Signed in successfully.").
    // The login page reads its own, because it also prefills the email.
    inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      if (event.urlAfterRedirects.startsWith(AppPaths.login)) return;
      const flash = session.consumeFlash();
      if (flash?.message) {
        toast.show(flash.message, { tone: toToastTone(flash.tone) });
      }
    });
  }

  protected skipToMainContent(event: Event): void {
    event.preventDefault();
    const main = document.getElementById("mainContent");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus();
  }
}
