/** Local development: the API's "http" launch profile listens on 5037 without a certificate. */
export const environment = {
  production: false,
  apiBaseUrl: "http://localhost:5037",
  requestTimeoutMs: 12000
};
