// Standard CORS headers used across all Edge Functions
export const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
} as const;

// Interface for custom headers
export interface ResponseOptions {
  corsHeaders?: Record<string, string>;
  additionalHeaders?: Record<string, string>;
}

/**
 * Create a standardized error response with CORS headers
 * @param message - Error message to return
 * @param status - HTTP status code (default: 400)
 * @param options - Optional response configuration
 * @returns Response object with error payload and proper headers
 */
export function createErrorResponse(
  message: string,
  status = 400,
  options: ResponseOptions = {},
): Response {
  const corsHeaders = options.corsHeaders || DEFAULT_CORS_HEADERS;
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...options.additionalHeaders,
  };

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers,
  });
}

/**
 * Create a standardized success response with CORS headers
 * @param data - Data to return in the response
 * @param options - Optional response configuration
 * @returns Response object with data payload and proper headers
 */
export function createSuccessResponse(
  data: unknown,
  options: ResponseOptions = {},
): Response {
  const corsHeaders = options.corsHeaders || DEFAULT_CORS_HEADERS;
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...options.additionalHeaders,
  };

  return new Response(JSON.stringify(data), {
    headers,
  });
}

/**
 * Create a CORS preflight response
 * @param corsHeaders - Optional custom CORS headers
 * @returns Response object for OPTIONS requests
 */
export function createCorsResponse(
  corsHeaders: Record<string, string> = DEFAULT_CORS_HEADERS,
): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create a standardized internal server error response
 * @param error - The error object or message
 * @param options - Optional response configuration
 * @returns Response object with 500 status and error details
 */
export function createInternalErrorResponse(
  error: unknown,
  options: ResponseOptions = {},
): Response {
  const corsHeaders = options.corsHeaders || DEFAULT_CORS_HEADERS;
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...options.additionalHeaders,
  };

  const errorMessage = error instanceof Error
    ? error.message
    : "Unknown error occurred";

  return new Response(
    JSON.stringify({
      error: "Internal server error",
      details: errorMessage,
    }),
    {
      status: 500,
      headers,
    },
  );
}
