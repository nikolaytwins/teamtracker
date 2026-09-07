/** CORS for Sophia OpenClaw integration routes. */
export const sophiaCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "x-tt-integration-secret, Authorization, Content-Type",
} as const;
