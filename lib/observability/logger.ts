export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  module: string;
  message?: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  status?: string;
  errorCode?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface LogOptions {
  module?: string;
  message?: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  status?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /secret/i,
  /ssn/i,
  /ein/i,
  /bank/i,
  /routing/i,
  /accountnumber/i,
  /wages/i,
  /grossincome/i,
  /taxableincome/i,
  /taxliability/i,
  /refund/i,
  /amountowed/i,
  /deduction/i,
  /prompt/i,
  /messages/i,
  /inputsnapshot/i,
  /resultsnapshot/i,
];

/**
 * Deeply redacts sensitive keys and values from logging metadata.
 */
export function redactSensitiveData(obj: unknown): Record<string, string | number | boolean> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitiveKey) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      // Check if string contains secret/token patterns
      if (/bearer\s+[a-zA-Z0-9._-]+/i.test(value)) {
        result[key] = "Bearer [REDACTED]";
      } else if (value.length > 500) {
        result[key] = `${value.slice(0, 500)}...[TRUNCATED]`;
      } else {
        result[key] = value;
      }
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    } else if (value === null || value === undefined) {
      // Skip undefined/null
    } else {
      // Primitive serialization of nested objects
      result[key] = "[OBJECT]";
    }
  }

  return result;
}

declare global {
  // eslint-disable-next-line no-var
  var __observabilityErrorBuffer: LogEntry[] | undefined;
}

function getErrorBuffer(): LogEntry[] {
  if (!globalThis.__observabilityErrorBuffer) {
    globalThis.__observabilityErrorBuffer = [];
  }
  return globalThis.__observabilityErrorBuffer;
}

const MAX_ERROR_BUFFER_SIZE = 100;

export class Logger {
  public static log(level: LogLevel, event: string, options: LogOptions): LogEntry;
  public static log(level: LogLevel, event: string, message: string, metadata?: Record<string, unknown>): LogEntry;
  public static log(
    level: LogLevel,
    event: string,
    optionsOrMessage: LogOptions | string,
    metadataArg?: Record<string, unknown>
  ): LogEntry {
    let moduleName = "app";
    let messageText: string | undefined;
    let requestId: string | undefined;
    let userId: string | undefined;
    let durationMs: number | undefined;
    let status: string | undefined;
    let errorCode: string | undefined;
    let rawMetadata: Record<string, unknown> | undefined;

    if (typeof optionsOrMessage === "string") {
      messageText = optionsOrMessage;
      rawMetadata = metadataArg;
      if (metadataArg && typeof metadataArg.module === "string") {
        moduleName = metadataArg.module;
      }
    } else if (optionsOrMessage && typeof optionsOrMessage === "object") {
      const {
        module: optModule,
        message: optMessage,
        requestId: optReqId,
        userId: optUserId,
        durationMs: optDuration,
        status: optStatus,
        errorCode: optErrorCode,
        metadata: optMeta,
        ...rest
      } = optionsOrMessage;

      if (optModule) moduleName = optModule;
      if (optMessage) messageText = optMessage;
      if (optReqId) requestId = optReqId;
      if (optUserId) userId = optUserId;
      if (optDuration !== undefined) durationMs = optDuration;
      if (optStatus) status = optStatus;
      if (optErrorCode) errorCode = optErrorCode;

      // Combine structured metadata with any extra keys passed in options
      if (optMeta || Object.keys(rest).length > 0) {
        rawMetadata = { ...(optMeta || {}), ...rest };
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      module: moduleName,
      message: messageText,
      requestId,
      userId: userId ? userId.slice(0, 16) : undefined,
      durationMs,
      status,
      errorCode,
      metadata: rawMetadata ? redactSensitiveData(rawMetadata) : undefined,
    };

    // Buffer warnings and errors in-memory for admin diagnostics
    if (level === "error" || level === "warn") {
      const buffer = getErrorBuffer();
      buffer.unshift(entry);
      if (buffer.length > MAX_ERROR_BUFFER_SIZE) {
        buffer.pop();
      }
    }

    // Standard structured stdout in non-test environments
    if (process.env.NODE_ENV !== "test") {
      const output = JSON.stringify(entry);
      if (level === "error") {
        // eslint-disable-next-line no-console
        console.error(output);
      } else if (level === "warn") {
        // eslint-disable-next-line no-console
        console.warn(output);
      } else {
        // eslint-disable-next-line no-console
        console.log(output);
      }
    }

    return entry;
  }

  public static debug(event: string, options: LogOptions): LogEntry;
  public static debug(event: string, message: string, metadata?: Record<string, unknown>): LogEntry;
  public static debug(event: string, optionsOrMessage: LogOptions | string, metadata?: Record<string, unknown>): LogEntry {
    if (typeof optionsOrMessage === "string") {
      return this.log("debug", event, optionsOrMessage, metadata);
    }
    return this.log("debug", event, optionsOrMessage);
  }

  public static info(event: string, options: LogOptions): LogEntry;
  public static info(event: string, message: string, metadata?: Record<string, unknown>): LogEntry;
  public static info(event: string, optionsOrMessage: LogOptions | string, metadata?: Record<string, unknown>): LogEntry {
    if (typeof optionsOrMessage === "string") {
      return this.log("info", event, optionsOrMessage, metadata);
    }
    return this.log("info", event, optionsOrMessage);
  }

  public static warn(event: string, options: LogOptions): LogEntry;
  public static warn(event: string, message: string, metadata?: Record<string, unknown>): LogEntry;
  public static warn(event: string, optionsOrMessage: LogOptions | string, metadata?: Record<string, unknown>): LogEntry {
    if (typeof optionsOrMessage === "string") {
      return this.log("warn", event, optionsOrMessage, metadata);
    }
    return this.log("warn", event, optionsOrMessage);
  }

  public static error(event: string, options: LogOptions): LogEntry;
  public static error(event: string, message: string, metadata?: Record<string, unknown>): LogEntry;
  public static error(event: string, optionsOrMessage: LogOptions | string, metadata?: Record<string, unknown>): LogEntry {
    if (typeof optionsOrMessage === "string") {
      return this.log("error", event, optionsOrMessage, metadata);
    }
    return this.log("error", event, optionsOrMessage);
  }

  /**
   * Retrieves recent sanitized errors for administrative diagnostic inspection.
   */
  public static getRecentErrors(): LogEntry[] {
    return [...getErrorBuffer()];
  }

  /**
   * Clears the diagnostic error buffer (for test resets).
   */
  public static clearRecentErrors(): void {
    const buffer = getErrorBuffer();
    buffer.length = 0;
  }
}
