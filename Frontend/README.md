# Frontend — JavaScript to TypeScript

Sixteen files, 4,377 lines, four people. Read this once before you start.

```bash
npm install
npm run dev        # http://localhost:4200
npm run typecheck  # must pass before you open a PR
npm run lint       # must pass before you open a PR
```

The API base URL defaults to `http://localhost:5037`. Override it by creating
`.env.local` with `VITE_API_BASE_URL=...`.

---

## Why we are not just renaming the files

Every module today looks like this:

```js
(function initializeOcspDataService(global) {
  const ocsp = global.OCSP || {};
  const api = ocsp.apiClient; // reaches into a global to find its dependency
  ocsp.dataService = Object.freeze({ ... });
})(window);
```

That works, but it is the opposite of how Angular is built — Angular is ES
modules plus constructor injection, and `window.OCSP` is a global service
locator held together by the order of `<script>` tags in each page.

We are moving to Angular later (`Program.cs:134` already whitelists port 4200
as "your Angular dev server"). So a plain `.js → .ts` rename would give us typed
files we then have to tear apart a second time. Converting the module pattern in
the same pass means doing the work once.

## The three rules

1. **ES modules only.** `import` / `export`. No IIFE, no `window.OCSP`.
2. **Services take dependencies through the constructor**, never from a global.
   `src/bootstrap.ts` is the only place that calls `new`.
3. **Renderers stay pure.** Data in, HTML string out. No fetching, no
   `document.getElementById`. That is what lets them become Angular components
   with the returned string as the template.

## How to convert a file

Every file already exists as a stub — the right name, the real signature, and a
body that throws. So `npm run typecheck` is green today, and you can import a
teammate's module before they have written a line of it.

Delete the `throw`, put your converted logic in its place:

```ts
// what you find
export function renderIssueCard(_issue: Issue): string {
  throw new Error("renderIssueCard - Member 3, from issue-renderers.js:134");
}
```

The message names the source file and line. Each stub also carries notes on
whatever is genuinely tricky in that file — read them, they are the parts that
cost an afternoon if you meet them by surprise.

On the way out:

- drop the `_` prefix from parameters once you use them
- change `protected readonly` to `private readonly` on constructor dependencies
  once you use them (both are only there so an unimplemented stub passes
  `noUnusedLocals`)
- **never change an exported signature** without telling the people who import
  it — adding a new export is free
- replace your page's `<script defer>` list with one line:
  `<script type="module" src="/src/bootstrap.ts"></script>`
- delete the old `.js`. `scripts/` must be empty when the last slice merges.

`enums.ts` and `core/api-endpoints.ts` are already complete — pure transcription
that everyone reads from day one. `Region` in `models.ts` is finished as the
worked example for the other nine models.

## Typing recipes

These four cover almost everything you will hit.

**DOM handles.** Write one helper per page instead of casting at each call site:

```ts
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as T;
}
const searchInput = byId<HTMLInputElement>("searchInput");
```

**Event targets.** Narrow before use:

```ts
list.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  const trigger = event.target.closest<HTMLButtonElement>("[data-issue-id]");
  if (!trigger) return;
  void showIssueDetails(Number(trigger.dataset.issueId));
});
```

**API responses.** The client is generic, so say what you expect:

```ts
const issues = await this.api.get<Issue[]>(this.api.endpoints.myIssues);
```

Never `any` — it fails lint. If a payload really is unknown (error bodies), type
it `unknown` and narrow.

**Keyed state.** Give the key a union, not `string`:

```ts
type FilterKey = "search" | "status" | "priority" | "category" | "region" | "sort";
state.filters[key] = key === "sort" ? "newest" : "";
```

---

## Who converts what

Split along the dependency graph, so **no two people touch the same file** —
HTML pages included.

| | Slice | Lines | Branch |
| --- | --- | --- | --- |
| **M1** | `models.ts` + `core/` (PR A), then notification-renderers + notifications page (PR B) | ~930 | `feature/ts-core-models` |
| **M2** | session + auth services, site-session, login, register | 735 | `feature/ts-session-auth` |
| **M3** | issue-renderers (PR A), then data service, home, my-issues | 1,476 | `feature/ts-citizen-issues` |
| **M4** | dashboard service, dashboard-renderers, dashboard page | 1,484 | `feature/ts-staff-dashboard` |

Two ordering constraints:

- **M1's PR A lands first.** Interface names exist already so imports resolve,
  but the model fields are worksheets, so `issue.title` does not typecheck until
  it merges. Target day 2; nobody writes a method body before day 3.
- **M3 ships `issue-renderers` as its own PR** before starting my-issues — M4
  imports it. M4 does `dashboard.service.ts` while waiting.

M2's slice is the smallest by line count and the hardest by type difficulty
(hand-rolled JWT decoding, storage fallbacks, role narrowing). M4's is the
largest and the most repetitive. M1 and M2 finish sooner by design and then
review M3 and M4's PRs — a 900-line conversion needs a reviewer more than it
needs a second author.

## Working rules

- Branch per slice, PR per logical group, several commits each.
- **`git mv` in its own commit, then type it in the next** — the diff shows as a
  rename plus edits rather than a 900-line delete-and-add.
- `npm run typecheck && npm run lint` pass before you open the PR.
- **Convert behaviour 1:1.** No refactors, no bug fixes, no renames. If you spot
  a bug, put it in the PR description and leave the code alone — a behaviour
  change hidden in a 400-line conversion is invisible to the reviewer.
- Nobody edits `package.json`, `tsconfig.json`, `vite.config.ts` or
  `eslint.config.js` after the foundation PR.

## Layout

```
src/
  bootstrap.ts      composition root - the only place that calls new
  models.ts         backend contract (M1 owns)
  enums.ts          string unions matching the C# enums
  globals.d.ts      window.bootstrap, window.OCSP_RUNTIME_CONFIG
  core/             config, api-client, api-endpoints
  services/         session, auth, data, dashboard
  components/       the four renderer modules
  pages/            one module per HTML page
```

Under Angular: `services/*.service.ts` gain `@Injectable()` and keep their
names, `models.ts` copies over, `components/` become `@Component`s, `pages/`
become routed components, and `bootstrap.ts` becomes `app.routes.ts`.
