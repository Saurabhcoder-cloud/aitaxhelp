import { NextRequest, NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "X-Request-ID";

/**
 * Validates whether an incoming request ID meets security constraints.
 * Must be alphanumeric, dashes, underscores only, between 4 and 64 characters.
 */
export function isValidRequestId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{4,64}$/.test(id);
}

/**
 * Generates a unique, high-entropy request correlation ID.
 */
export function generateRequestId(prefix = "req"): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Extracts and validates an incoming request ID from headers, or generates a fresh one.
 */
export function getOrGenerateRequestId(req: Request | NextRequest): string {
  const incoming =
    req.headers.get(REQUEST_ID_HEADER) ||
    req.headers.get("x-request-id");

  if (incoming && isValidRequestId(incoming.trim())) {
    return incoming.trim();
  }

  return generateRequestId();
}

/**
 * Attaches the request ID to an outgoing NextResponse.
 */
export function withRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}
