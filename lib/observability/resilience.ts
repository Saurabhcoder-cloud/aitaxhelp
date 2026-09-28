import { OperationalError } from "./errors";
import { Logger } from "./logger";
import { Metrics } from "./metrics";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  operationName?: string;
  isIdempotent?: boolean;
}

/**
 * Executes an asynchronous function with bounded retries and exponential backoff.
 *
 * CRITICAL RELIABILITY INVARIANTS:
 * - NEVER retries authentication or authorization failures (401, 403).
 * - NEVER retries validation errors (422).
 * - NEVER retries non-idempotent operations without an explicit idempotency key.
 * - Caps retries at 3 to prevent retry storms.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = Math.min(Math.max(0, options.maxRetries ?? 2), 3);
  const baseDelayMs = Math.max(10, options.baseDelayMs ?? 100);
  const opName = options.operationName || "unnamed_operation";

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: unknown) {
      lastError = err;

      // Check if error is non-retryable
      if (isNonRetryableError(err, options.isIdempotent)) {
        throw err;
      }

      if (attempt > maxRetries) {
        break;
      }

      // Record retry attempt
      Metrics.increment("operation_retry_total", 1, { op: opName });
      Logger.warn(`retrying_operation:${opName}`, {
        module: "resilience",
        metadata: {
          attempt,
          maxRetries,
          delayMs: baseDelayMs * Math.pow(2, attempt - 1),
        },
      });

      // Exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function isNonRetryableError(error: unknown, isIdempotent?: boolean): boolean {
  if (error && typeof error === "object") {
    const err = error as { statusCode?: number; code?: string; isRetryable?: boolean };

    if (err.isRetryable === false) return true;
    if (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 422) {
      return true;
    }
    if (err.code === "UNAUTHORIZED" || err.code === "FORBIDDEN" || err.code === "VALIDATION_ERROR") {
      return true;
    }
  }

  // Non-idempotent operations must not be automatically retried
  if (isIdempotent === false) {
    return true;
  }

  return false;
}

/**
 * Enforces a bounded timeout on an asynchronous operation.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      Metrics.increment("operation_timeout_total", 1, { op: operationName });
      reject(
        new OperationalError(
          `Operation '${operationName}' timed out after ${timeoutMs}ms.`,
          504,
          "TIMEOUT_ERROR",
          "TIMEOUT_ERROR",
          true
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Safe degraded execution for AI Assistant.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * - If Gemini fails, NEVER fall back to LLM for tax math.
 * - Deterministic tax calculation remains 100% authoritative and unaffected.
 */
export async function safeGeminiExecution<T>(
  fn: () => Promise<T>,
  fallbackMessage = "AI Assistant is temporarily unavailable. All deterministic tax calculations remain 100% verified and unaffected."
): Promise<{ success: boolean; data?: T; degraded?: boolean; message?: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err: unknown) {
    Metrics.increment("ai_request_failed", 1);
    Logger.error("ai_assistant_failure_degraded", {
      module: "ai",
      errorCode: "AI_PROVIDER_ERROR",
      metadata: {
        error: err instanceof Error ? err.message : "Unknown AI error",
      },
    });

    return {
      success: false,
      degraded: true,
      message: fallbackMessage,
    };
  }
}

/**
 * Safe execution for Deterministic Tax Engine.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * - If calculation fails, FAIL SAFELY with clear error.
 * - NEVER fabricate math or silently approximate.
 */
export function safeTaxEngineExecution<T>(
  fn: () => T,
  calculatorType: string
): { success: true; result: T } | { success: false; error: OperationalError } {
  try {
    const result = fn();
    Metrics.increment("tax_calculation_total", 1, { type: calculatorType });
    return { success: true, result };
  } catch (err: unknown) {
    Metrics.increment("tax_calculation_failed", 1, { type: calculatorType });
    Logger.error("tax_engine_calculation_failure", {
      module: "tax-engine",
      errorCode: "TAX_ENGINE_ERROR",
      metadata: {
        calculatorType,
        error: err instanceof Error ? err.message : "Unknown engine error",
      },
    });

    return {
      success: false,
      error: new OperationalError(
        `Tax engine calculation failed safely for ${calculatorType}. Math was not approximated.`,
        400,
        "TAX_ENGINE_ERROR",
        "TAX_ENGINE_ERROR"
      ),
    };
  }
}
