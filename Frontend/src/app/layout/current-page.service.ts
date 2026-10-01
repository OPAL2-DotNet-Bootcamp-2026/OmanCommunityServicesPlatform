import { DOCUMENT } from "@angular/common";
import { Injectable, inject, signal } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import { type PageRouteData } from "../core/routing/page-route-data";

/**
 * The route data of the page on screen, as a signal, and the <body> class it
 * asks for. The page styles key off body classes (ocsp-portal--staff etc.),
 * which every old HTML page set by hand.
 */
@Injectable({ providedIn: "root" })
export class CurrentPageService {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);

  readonly data = signal<PageRouteData>({});

  constructor() {
    inject(Router).events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.update());
  }

  private update(): void {
    let route = this.route.snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const data = route.data as PageRouteData;
    this.data.set(data);
    this.document.body.className = `site-page ${data.bodyClass ?? ""}`.trim();
  }
}
