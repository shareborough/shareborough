import { AYBClient } from "@allyourbase/js";
import { isNetworkError } from "./errorMessages";

const url = import.meta.env.VITE_AYB_URL ?? "";
export const ayb = new AYBClient(url);

const token = localStorage.getItem("ayb_token");
const refresh = localStorage.getItem("ayb_refresh_token");
if (token && refresh) {
  ayb.setTokens(token, refresh);
}

export function persistTokens() {
  if (ayb.token) localStorage.setItem("ayb_token", ayb.token);
  if (ayb.refreshToken)
    localStorage.setItem("ayb_refresh_token", ayb.refreshToken);
}

export function clearPersistedTokens() {
  localStorage.removeItem("ayb_token");
  localStorage.removeItem("ayb_refresh_token");
  ayb.clearTokens();
}

export function isLoggedIn(): boolean {
  return !!ayb.token;
}

/**
 * Extract the current user's ID from the JWT token.
 * Returns null if no token or invalid token.
 */
export function currentUserId(): string | null {
  if (!ayb.token) return null;
  try {
    const parts = ayb.token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate the current session against the server.
 * Called once on app mount to catch expired/invalid tokens.
 */
export async function validateSession(): Promise<"valid" | "expired" | "offline"> {
  if (!ayb.token) return "expired";
  try {
    // Quick client-side expiry check
    const parts = ayb.token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired — try refresh
        if (ayb.refreshToken) {
          try {
            await ayb.auth.refresh();
            persistTokens();
            return "valid";
          } catch {
            clearPersistedTokens();
            return "expired";
          }
        }
        clearPersistedTokens();
        return "expired";
      }
    }
    // Token not expired client-side — verify with server
    await ayb.auth.me();
    return "valid";
  } catch (err) {
    if (isNetworkError(err)) {
      // Backend is down — keep tokens, they might be valid
      return "offline";
    }
    // Server rejected the token
    clearPersistedTokens();
    return "expired";
  }
}
