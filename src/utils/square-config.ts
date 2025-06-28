/**
 * Square configuration utilities for frontend
 * Handles environment-dependent Square integration configuration
 */

/**
 * Get the Square provider config key based on environment
 * @returns "squareup" for production, "squareup-sandbox" for all other environments
 */
export function getSquareProviderConfigKey(): string {
    // In Vite/React, use import.meta.env for environment variables
    // Fall back to window object for runtime injection
    const squareEnv = import.meta.env.VITE_SQUARE_ENV ||
        (window as any).__SQUARE_ENV__;

    return squareEnv === "PRODUCTION" ? "squareup" : "squareup-sandbox";
}

/**
 * Check if we're in production Square environment
 * @returns true if SQUARE_ENV is "PRODUCTION", false otherwise
 */
export function isSquareProduction(): boolean {
    const squareEnv = import.meta.env.VITE_SQUARE_ENV ||
        (window as any).__SQUARE_ENV__;

    return squareEnv === "PRODUCTION";
}
