/** Production build settings. ng build swaps in environment.development.ts for dev builds. */
export const environment = {
  production: true,
  /** The API origin, without a trailing slash. Set this to the deployed API before release. */
  apiBaseUrl: "http://localhost:5037",
  requestTimeoutMs: 12000
};
