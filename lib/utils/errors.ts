import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Sanitizes errors and returns a structured Next.js API response.
 * Completely strips stack traces, secrets, and raw database errors.
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Zod Validation Errors
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted data failed validation.",
          details,
        },
      },
      { status: 422 }
    );
  }

  // Known Application Errors (including OperationalError subclass)
  if (error instanceof AppError) {
    // OperationalError stores the clean human-readable message in humanMessage
    // to avoid exposing the [CODE] suffix that is appended for test assertions.
    const displayMessage =
      "humanMessage" in error && typeof (error as Record<string, unknown>).humanMessage === "string"
        ? ((error as Record<string, unknown>).humanMessage as string)
        : error.message;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: displayMessage,
        },
      },
      { status: error.statusCode }
    );
  }

  // Unhandled / Internal Server Errors
  // We log the error internally on the server (without leaking secrets)
  console.error("[TAXAIHELP_INTERNAL_ERROR]", error instanceof Error ? error.message : "Unknown error");

  // NEVER return raw error message or stack trace to client
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while processing your request. Please try again later.",
      },
    },
    { status: 500 }
  );
}
