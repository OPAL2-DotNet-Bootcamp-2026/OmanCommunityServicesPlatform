import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Multi-page build. Every HTML file under pages/ is its own Rollup entry and
 * loads src/bootstrap.ts, which routes to the right page module. When the app
 * moves to Angular these entries collapse into one index.html plus app.routes.ts.
 */
export default defineConfig({
  root: fromRoot("."),
  appType: "mpa",

  // No public/ directory: the only local asset reference is the hero image in
  // styles/custome.css, which Vite resolves, hashes and emits from the CSS
  // url() itself. Issue photos arrive as absolute URLs from the API.
  publicDir: false,

  server: {
    // 4200 is already the allowed CORS origin in Program.cs ("AllowFrontend"),
    // so the API needs no change now, nor when Angular takes over this port.
    port: 4200,
    strictPort: true,
    open: "/pages/home.html"
  },

  preview: {
    port: 4200,
    strictPort: true
  },

  build: {
    outDir: fromRoot("./dist"),
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
    rollupOptions: {
      input: {
        index: fromRoot("./index.html"),
        home: fromRoot("./pages/home.html"),
        login: fromRoot("./pages/login.html"),
        register: fromRoot("./pages/register.html"),
        myIssues: fromRoot("./pages/my-issues.html"),
        notifications: fromRoot("./pages/notifications.html"),
        dashboard: fromRoot("./pages/dashboard.html")
      }
    }
  }
});
