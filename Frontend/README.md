# OCSP Frontend

The web client for the Oman Community Services Platform, built with **Angular 22**
(standalone components, signals, `HttpClient` interceptors, functional route guards).

```bash
npm install
npm start            # http://localhost:4200 (ng serve)
npm run typecheck
npm run lint
npm test             # unit tests (Vitest)
npm run build        # production build in dist/
```

Start the API first (`http` launch profile, port 5037). The client has no mock data.
The API address is in `src/environments/environment.development.ts` (dev) and
`environment.ts` (production builds).

## Pages

| Address | Page | Who |
| --- | --- | --- |
| `/` | Home | everyone |
| `/login`, `/register` | Sign in, create account | signed-out users |
| `/my-issues` | Citizen portal: issues, create dialog, details dialog | Citizen |
| `/payment-result?paymentId=` | Result of an urgent-issue payment (Thawani returns here) | Citizen |
| `/dashboard` | Staff/Admin workspace; `?issueId=` opens an issue | Staff, Admin |
| `/notifications` | Notifications | any signed-in user |

The old `pages/*.html` addresses no longer exist: `pages/my-issues.html` is now `/my-issues`, and so on.

## Folder structure

```
src/
  main.ts · index.html · styles.css        styles.css imports src/styles/ in order
  styles/NN-what-it-styles.css             the site's global CSS, split by section
  environments/                            API address per build
  app/
    app.component.{ts,html,css}            the shell: header, page, help strip, footer, toasts
    app.config.ts                          providers: router, HttpClient + interceptors
    app.routes.ts                          every page, its guard, roles and help strip
    core/                                  app-wide plumbing, no UI
      api/        endpoints, ApiError, interceptors (base URL, token, errors)
      auth/       SessionService, AuthService, route guards
      config/     APP_CONFIG token
      models/     the backend DTOs, one file per entity
      routing/    page addresses, roles per page, route data, help-strip wording
      utils/      small pure functions (dates, filtering, text)
    layout/                                the parts around every page
      site-header/ · site-footer/ · help-strip/ · current-page.service.ts
    shared/                                reusable building blocks
      components/ directives/ pipes/ services/ utils/
    features/                              one folder per feature, holding its pages and its service
      home/ · auth/ · citizen-issues/ · staff-dashboard/ · notifications/ · payments/
```

## Naming rules

- **Every component is a folder** with three files: `name.component.ts`, `.html`, `.css`.
  Related components may sit under a group folder (`shared/components/issue-badges/status-badge/`).
- **The file name says what is inside**: `<what>.<kind>.ts`, where kind is `component`,
  `service`, `guard`, `interceptor`, `directive`, `pipe`, `model` or `util`.
  `staff-dashboard.service.ts` is the staff dashboard's data; `toast.service.ts` shows toasts.
- **Pages end in `-page`**, dialogs in `-dialog`: `my-issues-page/`, `create-issue-dialog/`.
- **Selectors start with `ocsp-`** (`<ocsp-site-header>`). A few components use an attribute
  instead (`<span ocspStatusBadge>`, `<article ocspIssueCard>`) so the element stays a real
  `<span>`/`<button>`/`<div>` and the existing CSS keeps matching.
- `ng generate component features/x/y-page` follows these rules (configured in `angular.json`).

## Styles

The site's CSS is still global, in `src/styles/01-…37-….css`, imported in its original order:
later files deliberately refine earlier ones, so **the order matters**. Each component's `.css`
file names the global files that style it today. Put rules that belong to one component only
in its `.css` (Angular scopes them to that component), and move existing rules there one at a
time as you touch them.

Bootstrap 5, Bootstrap Icons and Leaflet's CSS come from npm (see `angular.json` → `styles`).

## How it fits together

- **HTTP.** Services call `HttpClient` with paths from `core/api/api-endpoints.ts`. Three
  interceptors run on every request: add the API address, add `Authorization: Bearer` (only to
  our API, never to OpenStreetMap), and turn failures into an `ApiError` whose `message` is
  safe to show. A 401 outside sign-in signs the user out and returns them to `/login`.
- **Session.** `SessionService` keeps the JWT in `sessionStorage` (closing the tab signs out),
  rejects an expired token, and exposes `currentUser` as a signal.
- **Guards.** `signedInGuard` checks the session and `route.data.roles`; `guestOnlyGuard`
  sends a signed-in user home. Return-to-after-login only accepts known pages the role may open.
- **Pages** hold state in signals; lists, counts and filters are `computed()`. Optional
  requests (lookups, notifications) degrade to a warning instead of failing the page.
- **Dialogs** wrap Bootstrap's own JavaScript (`BootstrapModalDirective`,
  `BootstrapOffcanvasDirective`), so focus trapping, Escape and backdrops behave as before.

## Adding a page

1. `npx ng generate component features/<feature>/<name>-page`
2. Add a route in `app.routes.ts` with `loadComponent`, a `title`, and, if it needs a
   signed-in user, `canActivate: [signedInGuard]` with `data: { roles: [...] }`.
3. Add its path to `core/routing/app-paths.ts` (and to `PAGE_ROLES` if it is a valid return-to target).
4. Render its own `<main id="mainContent">`; the shell already provides the header and footer.
