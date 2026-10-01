import { Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SessionService } from "../../../core/auth/session.service";
import { AppPaths } from "../../../core/routing/app-paths";
import { CountUpDirective } from "../../../shared/directives/count-up.directive";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";

/** The public landing page. Staff never see the "Create an Issue" calls to action. */
@Component({
  selector: "ocsp-home-page",
  imports: [RouterLink, CountUpDirective, RevealOnEnterDirective],
  templateUrl: "./home-page.component.html",
  styleUrl: "./home-page.component.css"
})
export class HomePageComponent {
  private readonly session = inject(SessionService);

  protected readonly paths = AppPaths;
  protected readonly signedIn = computed(() => this.session.currentUser() !== null);
  protected readonly isStaff = computed(() => ["Staff", "Admin"].includes(this.session.currentUser()?.role ?? ""));

  protected readonly steps = [
    { icon: "bi-pin-map", title: "Create an Issue", text: "Pinpoint the location and describe the issue with photos." },
    { icon: "bi-clock-history", title: "Track Progress", text: "Receive real-time updates as our staff works on your report." },
    { icon: "bi-patch-check", title: "Get Resolved", text: "Get notified once the issue is fixed and rate the service." }
  ];
}
