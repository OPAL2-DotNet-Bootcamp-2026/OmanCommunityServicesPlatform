/**
 * The composition root - the only place in the app that calls new.
 *
 * Every page loads this same file:
 *   <script type="module" src="/src/bootstrap.ts"></script>
 *
 * It builds the two services every page needs, looks up the current page by
 * filename, lazily imports that page and its extra services, and starts it.
 *
 * This is a small router plus a manual injector, which is exactly the pair
 * Angular replaces: the routes table becomes app.routes.ts with lazy
 * loadComponent, and the wiring below becomes @Injectable providers. The page
 * and service classes themselves need no change when that happens.
 *
 * The dynamic imports are deliberate - Vite splits each page into its own
 * chunk, so my-issues does not ship the dashboard's code.
 */
import { ApiClient } from "./core/api-client";
import { config } from "./core/config";
import { SessionService } from "./services/session.service";
import { SiteSession } from "./components/site-session";
import { initializePage as initializeMotion } from "./components/motion";

/** Every page class exposes this. It becomes ngOnInit under Angular. */
export interface Page {
  start(): void;
}

const api = new ApiClient(config);
const session = new SessionService(config, api);

const routes: Record<string, () => Promise<Page>> = {
  "index.html": async () => {
    const [{ HomePage }, { DataService }] = await Promise.all([
      import("./pages/home.page"),
      import("./services/data.service")
    ]);
    return new HomePage(new DataService(api, session), session);
  },

  "login.html": async () => {
    const [{ LoginPage }, { AuthService }] = await Promise.all([
      import("./pages/login.page"),
      import("./services/auth.service")
    ]);
    return new LoginPage(new AuthService(api, session), session);
  },

  "register.html": async () => {
    const [{ RegisterPage }, { AuthService }] = await Promise.all([
      import("./pages/register.page"),
      import("./services/auth.service")
    ]);
    return new RegisterPage(new AuthService(api, session), session);
  },

  "my-issues.html": async () => {
    const [{ MyIssuesPage }, { DataService }] = await Promise.all([
      import("./pages/my-issues.page"),
      import("./services/data.service")
    ]);
    return new MyIssuesPage(new DataService(api, session));
  },

  "notifications.html": async () => {
    const [{ NotificationsPage }, { DataService }] = await Promise.all([
      import("./pages/notifications.page"),
      import("./services/data.service")
    ]);
    return new NotificationsPage(new DataService(api, session), session);
  },

  "dashboard.html": async () => {
    const [{ DashboardPage }, { DashboardService }] = await Promise.all([
      import("./pages/dashboard.page"),
      import("./services/dashboard.service")
    ]);
    return new DashboardPage(new DashboardService(api, session), session);
  }
};

/** A directory URL such as "/" is served by index.html. */
function currentPage(): string {
  return window.location.pathname.split("/").pop() || "index.html";
}

async function startPage(): Promise<void> {
  // The shell owns route protection. If it redirects, the page never starts.
  if (!new SiteSession(session).start()) {
    return;
  }

  // Entrance animations and counters for whatever is already in the markup.
  // Called here rather than on import, so loading the module has no effect.
  initializeMotion();

  const load = routes[currentPage()];
  if (!load) {
    return;
  }
  const page = await load();
  page.start();
}

document.addEventListener("DOMContentLoaded", () => {
  void startPage();
});
