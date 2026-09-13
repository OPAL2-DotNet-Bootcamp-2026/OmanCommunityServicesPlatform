# OCSP Frontend

The web client for the Oman Community Services Platform. TypeScript, built with
Vite, structured so the move to Angular is mechanical.

```bash
npm install
npm run dev        # http://localhost:4200
npm run typecheck
npm run lint
npm run build
```

The API base URL defaults to `http://localhost:5037`, matching the `http` launch
profile of the Web API. Override it with a `.env.local` containing
`VITE_API_BASE_URL=...`, or by setting `window.OCSP_RUNTIME_CONFIG` before the
page scripts load on a host that cannot rebuild the bundle.

Start the backend first — the client is API-only and has no mock data.

## Layout

```
src/
  bootstrap.ts        composition root and page router - the only place that calls new
  models.ts           the backend contract as interfaces
  enums.ts            string unions matching the C# enums
  text.ts             safe coercion for untrusted values and form data
  dom.ts              byId / setAlert / errorMessage
  globals.d.ts        window.bootstrap, window.OCSP_RUNTIME_CONFIG
  core/
    config.ts         app configuration
    api-client.ts     HTTP layer, generic methods, ApiError
    api-endpoints.ts  every backend route in one place
    settled.ts        helpers for "one essential request, several optional ones"
  services/           session, auth, data, dashboard
  components/         issue / dashboard / notification renderers, site-session
  pages/              one class per HTML page, each exposing start()
pages/*.html          six entries, each loading /src/bootstrap.ts
```

## How it fits together

Each HTML page loads exactly one module:

```html
<script type="module" src="/src/bootstrap.ts"></script>
```

`bootstrap.ts` builds `ApiClient` and `SessionService`, runs the route guard,
then looks up the current page by filename and lazily imports it with its
services. The dynamic imports are deliberate: Vite gives each page its own
chunk, so my-issues does not ship the dashboard's code.

Three rules hold across the codebase:

1. **ES modules only.** No globals. `window.OCSP` does not exist.
2. **Services are classes; dependencies arrive through the constructor.**
   Nothing reaches out to find a collaborator.
3. **Renderers are pure.** Data in, HTML string out. No fetching, no document
   access. `site-session` is the single deliberate exception — it owns the
   chrome around every page.

Page protection is declared in markup, so the guard stays generic:

```html
<body data-auth-page="protected" data-allowed-roles="Staff, Admin">
```

`data-auth-page` is `public`, `guest` (signed-in users are bounced away) or
`protected`. Role visibility within a page uses `data-role-visible`,
`data-nav-roles` and `data-nav-auth`.

## Moving to Angular

The structure was chosen so this is a port, not a rewrite.

| Here | There |
| --- | --- |
| `core/config.ts` | `environments/environment.ts` + an `APP_CONFIG` token |
| `core/api-client.ts` | `HttpClient` wrapper + auth and error `HttpInterceptor`s |
| `services/*.service.ts` | add `@Injectable({providedIn:"root"})` — names unchanged |
| `models.ts`, `enums.ts` | copied over as they are |
| `components/*-renderers.ts` | `@Component`; the returned template string becomes the template, the arguments become `@Input()`s |
| `pages/*.page.ts` | routed standalone components; `start()` becomes `ngOnInit` |
| `bootstrap.ts` | `app.routes.ts` with lazy `loadComponent` |
| `SiteSession.isPageAllowed` | a `CanActivate` guard |
| `data-auth-page` / `data-allowed-roles` | route `data` on the guard |

Concretely, `DataService` needs one decorator and nothing else:

```ts
@Injectable({ providedIn: "root" })
export class DataService {
  constructor(
    private readonly api: ApiClient,
    private readonly session: SessionService
  ) {}
}
```

Two things to decide when you get there, neither of them blocking:

- **Promises or RxJS.** The services return promises today. Angular's
  `HttpClient` returns observables; `firstValueFrom` bridges them, or convert the
  service bodies. The method signatures stay the same either way.
- **The renderers return HTML strings**, which a template replaces directly. Keep
  them pure and that is a copy-paste; let one start fetching and it becomes a
  rewrite.

Port order that keeps a working app throughout: models and enums, then `core`,
then services, then one page at a time.

## Notes on the code

- The backend serialises its enums as **strings** (`StoreEnumsAsStrings`
  migration), so they are string unions here — `"Open"`, never `0`.
- `Issue` carries fields the DTO does not send. `categoryId`, `regionId` and
  `governorate` are resolved client-side by matching names against the lookup
  lists, which is why they are nullable. `ui` is presentation-only.
- Both dashboards degrade rather than fail: the issue list is the essential
  request, everything around it is `Promise.allSettled`, and the names of failed
  sections surface as warnings on the page.
- Writes update local state from the response instead of refetching, so a later
  read failure can never make a saved change look like a failed one.
- `ApiError` calls `Object.setPrototypeOf` in its constructor. Without it
  `instanceof ApiError` returns false once transpiled, and every page branches
  on that check.
- The dashboard's issue dialog is URL-driven, so Back and Forward work and
  notification deep links (`?issueId=`) are consumed exactly once.
