/**
 * Token storage with support for "Remember me":
 * - rememberMe=true → localStorage (persists across sessions)
 * - rememberMe=false → sessionStorage (cleared when tab closes)
 */

export const TOKEN_KEY = "access_token";

/** Get token from storage. Checks localStorage first, then sessionStorage. */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

/** Save token to storage based on rememberMe. */
export function setStoredToken(token: string, rememberMe: boolean): void {
  clearStoredToken();
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

/** Remove token from both storages. */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Decode JWT payload without verification (client-side only for expiry check). */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

/** Check if JWT is expired. Returns true if expired or invalid. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
