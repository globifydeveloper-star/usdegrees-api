/**
 * Shared error-response helper. Full error messages (raw Postgres errors,
 * stack fragments, etc.) are only useful to us server-side — logging them to
 * the client in production leaks internal implementation details. `details`
 * is included in the response only outside production; every route already
 * logs the full error via console.error before calling this.
 */
export function errorDetails(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return error instanceof Error ? error.message : "Unknown error";
}
