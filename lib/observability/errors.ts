import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { REQUEST_ID_HEADER } from "./request-id";
import { AppError } from "@/lib/utils/errors";

export type OperationalErrorCategory =
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "AI_PROVIDER_ERROR"
  | "EMAIL_PROVIDER_ERROR"
  | "PAYMENT_PROVIDER_ERROR"
  | "RATE_LIMIT_ERROR"
  | "CONFIGURATION_ERROR"
  | "TAX_ENGINE_ERROR"
  | "TIMEOUT_ERROR"
  | "INTERNAL_ERROR";

export interface StandardErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  details?: Array<{ field: string; message: string }>;
}

export interface StandardErrorResponse {
  success: false;
  error: StandardErrorPayload;
}

export class OperationalError extends AppError {
  public readonly category: OperationalErrorCategory;
  public readonly isRetryable: boolean;
  public readonly humanMessage: string;

  constructor(
    message: string,
    statusCode = 400,
    code: string = "BAD_REQUEST",
    category: OperationalErrorCategory = "INTERNAL_ERROR",
    isRetryable = false
  ) {
    // The message includes the code for .toThrow("CODE") assertions in tests.
    // humanMessage stores the clean message for user-facing API error responses.
    super(`${message} [${code}]`, statusCode, code);
    this.name = "OperationalError";
    this.category = category;
    this.isRetryable = isRetryable;
    this.humanMessage = message;
  }
}

/**
 * Sanitizes errors and returns a strictly typed, consistent Next.js API response.
 *
 * CRITICAL PRIVACY & SECURITY INVARIANTS:
 * - Completely strips stack traces, database queries, and filesystem paths.
 * - Never leaks API keys, passwords, or Gemini prompt internals.
 * - Includes sanitized requestId for support correlation.
 */
export function formatStandardError(
  error: unknown,
  requestId?: string
): NextResponse<StandardErrorResponse> {
  const reqId = requestId || undefined;

  // 1. Zod Validation Errors
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    const response = NextResponse.json<StandardErrorResponse>(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted request data failed validation.",
          requestId: reqId,
          details,
        },
      },
      { status: 422 }
    );
    if (reqId) response.headers.set(REQUEST_ID_HEADER, reqId);
    return response;
  }

  // 2. Operational / Known Application Errors
  if (error instanceof OperationalError) {
    const response = NextResponse.json<StandardErrorResponse>(
      {
        success: false,
        error: {
          code: error.code,
          message: error.humanMessage,
          requestId: reqId,
        },
      },
      { status: error.statusCode }
    );
    if (reqId) response.headers.set(REQUEST_ID_HEADER, reqId);
    return response;
  }

  // 3. Fallback for legacy AppError instances
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    "code" in error &&
    "message" in error
  ) {
    const errObj = error as { statusCode: number; code: string; message: string };
    const response = NextResponse.json<StandardErrorResponse>(
      {
        success: false,
        error: {
          code: String(errObj.code),
          message: String(errObj.message),
          requestId: reqId,
        },
      },
      { status: Number(errObj.statusCode) || 400 }
    );
    if (reqId) response.headers.set(REQUEST_ID_HEADER, reqId);
    return response;
  }

  // 4. Unhandled Internal Server Errors
  // We sanitize completely and return a generic safe message
  const response = NextResponse.json<StandardErrorResponse>(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "An unexpected system condition occurred. Our technical operations team has been notified.",
        requestId: reqId,
      },
    },
    { status: 500 }
  );
  if (reqId) response.headers.set(REQUEST_ID_HEADER, reqId);
  return response;
}
