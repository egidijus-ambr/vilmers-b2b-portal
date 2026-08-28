// Shared auth cookie lifetime constant.
//
// Deliberately import-free so it can be safely imported from both server-only modules
// (e.g. src/lib/data/cookies.ts, which has `import "server-only"`) and code that also gets
// bundled for the client (e.g. the Furnisystems SDK's customer module, which is reachable
// from "use client" components via @lib/config). Importing a server-only module from the
// SDK would break the client bundle, so this constant lives in its own neutral file instead.
//
// Matches the backend's 14-day JWT expiry. Previously the `_furni_jwt` cookie was capped at
// 7 days here, which silently logged customers out halfway through a still-valid token's
// lifetime.
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
