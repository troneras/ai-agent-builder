/**
 * Square configuration utilities
 * Handles environment-dependent Square integration configuration
 */

/**
 * Get the Square provider config key based on environment
 * @returns "squareup" for production, "squareup-sandbox" for all other environments
 */
export function getSquareProviderConfigKey(): string {
  const squareEnv = Deno.env.get("SQUARE_ENV");
  return squareEnv === "PRODUCTION" ? "squareup" : "squareup-sandbox";
}

/**
 * Check if we're in production Square environment
 * @returns true if SQUARE_ENV is "PRODUCTION", false otherwise
 */
export function isSquareProduction(): boolean {
  return Deno.env.get("SQUARE_ENV") === "PRODUCTION";
}
