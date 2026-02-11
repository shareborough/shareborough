import { ayb } from "./ayb";

const baseUrl = import.meta.env.VITE_AYB_URL ?? "";

/**
 * Call a PostgreSQL function via AYB's RPC endpoint.
 * The SDK doesn't have a built-in RPC wrapper, so we use fetch directly.
 */
export async function rpc<T = unknown>(
  functionName: string,
  params: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ayb.token) {
    headers["Authorization"] = `Bearer ${ayb.token}`;
  }
  const resp = await fetch(`${baseUrl}/api/rpc/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    // Handle auth expiry globally
    if (resp.status === 401) {
      const { clearPersistedTokens } = await import("./ayb");
      clearPersistedTokens();
      window.dispatchEvent(new CustomEvent("ayb:auth-expired"));
      throw new Error("Your session has expired. Please sign in again.");
    }
    const text = await resp.text();
    let message = `RPC ${functionName} failed`;
    if (text) {
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || message;
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }
  // Handle 204 No Content (void-returning functions)
  if (resp.status === 204) {
    return undefined as T;
  }
  const contentType = resp.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }
  return resp.json();
}
