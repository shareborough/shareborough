/**
 * Maps technical error messages to user-friendly strings.
 * Uses pattern matching (includes / regex) so backend message variations are caught.
 */

interface ErrorMapping {
  pattern: RegExp | string;
  userMessage: string;
  type?: "error" | "warning";
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Network / connectivity
  { pattern: "Failed to fetch", userMessage: "Unable to reach the server. Please check your internet connection and try again." },
  { pattern: "NetworkError", userMessage: "Unable to reach the server. Please check your internet connection and try again." },
  { pattern: "Load failed", userMessage: "Unable to reach the server. Please check your internet connection and try again." },
  { pattern: /AbortError/, userMessage: "The request took too long. Please try again." },

  // Auth
  { pattern: "Invalid credentials", userMessage: "The email or password you entered is incorrect." },
  { pattern: "invalid credentials", userMessage: "The email or password you entered is incorrect." },
  { pattern: "email already exists", userMessage: "An account with this email already exists. Try signing in instead." },
  { pattern: /token.*expired/i, userMessage: "Your session has expired. Please sign in again." },
  { pattern: "Unauthorized", userMessage: "You need to sign in to do this." },

  // RPC fallback (the generic "RPC X failed" from rpc.ts)
  { pattern: /^RPC \w+ failed$/, userMessage: "Something went wrong. Please try again in a moment." },

  // Borrow-specific
  { pattern: "Item is not available for borrowing", userMessage: "This item is no longer available for borrowing. Someone may have just borrowed it." },
  { pattern: "Failed to create borrower record", userMessage: "We couldn't save your information. Please try again." },

  // Database constraint errors from AYB
  { pattern: "unique constraint", userMessage: "This already exists. Please use a different name or value." },
  { pattern: /NOT NULL.*violation/i, userMessage: "A required field is missing. Please fill in all required fields." },
  { pattern: /check constraint/i, userMessage: "One of the values you entered is not valid. Please check and try again." },

  // Storage
  { pattern: "Storage quota exceeded", userMessage: "The storage limit has been reached. Please contact the library owner." },
  { pattern: /file.*too large/i, userMessage: "This file is too large. Please use a smaller file." },

  // Rate limiting
  { pattern: "Rate limit exceeded", userMessage: "Too many requests. Please wait a moment and try again.", type: "warning" },

  // Phone auth
  { pattern: "Invalid or expired code", userMessage: "That code is invalid or has expired. Please try again." },
];

export function friendlyError(error: unknown): { message: string; type: "error" | "warning" } {
  const raw = error instanceof Error ? error.message : String(error);
  for (const mapping of ERROR_MAPPINGS) {
    const matches =
      typeof mapping.pattern === "string"
        ? raw.includes(mapping.pattern)
        : mapping.pattern.test(raw);
    if (matches) {
      return { message: mapping.userMessage, type: mapping.type ?? "error" };
    }
  }
  // If the server returned a readable message, show it instead of a generic error.
  // Only fall back to generic if the raw message is empty or looks like a stack trace.
  if (raw && raw.length < 200 && !raw.includes("\n") && !raw.includes("at ")) {
    return { message: raw, type: "error" };
  }
  return { message: "Something went wrong. Please try again.", type: "error" };
}

/** Returns true if the error looks like a network/connectivity failure. */
export function isNetworkError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  return (
    raw.includes("Failed to fetch") ||
    raw.includes("NetworkError") ||
    raw.includes("Load failed")
  );
}
