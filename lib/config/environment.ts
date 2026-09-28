/**
 * Centralized Environment Identification & Resolution (Phase 5 Step 18)
 *
 * Distinctly identifies:
 * - "development" (local development, test rigs)
 * - "staging"     (pre-production validation environment)
 * - "production"  (live production service)
 *
 * INVARIANT: Never infers "production" solely from NODE_ENV when an explicit
 * APP_ENV is defined (e.g. running a staging cluster with NODE_ENV=production).
 */

export type AppEnvironment = "development" | "staging" | "production";

export interface EnvironmentMetadata {
  environment: AppEnvironment;
  nodeEnv: string;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  label: string;
}

/**
 * Resolves the active application environment.
 * Evaluates APP_ENV with highest priority, then falls back to NODE_ENV.
 */
export function getAppEnvironment(): AppEnvironment {
  const appEnv = (process.env.APP_ENV || "").toLowerCase().trim();

  if (appEnv === "production" || appEnv === "prod") {
    return "production";
  }
  if (appEnv === "staging" || appEnv === "stage") {
    return "staging";
  }
  if (appEnv === "development" || appEnv === "dev") {
    return "development";
  }

  // Fallback to NODE_ENV if APP_ENV is not specified
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase().trim();
  if (nodeEnv === "production") {
    return "production";
  }
  if (nodeEnv === "staging") {
    return "staging";
  }

  return "development";
}

/**
 * Returns true if running in verified production.
 */
export function isProduction(): boolean {
  return getAppEnvironment() === "production";
}

/**
 * Returns true if running in staging pre-production.
 */
export function isStaging(): boolean {
  return getAppEnvironment() === "staging";
}

/**
 * Returns true if running in local development.
 */
export function isDevelopment(): boolean {
  return getAppEnvironment() === "development";
}

/**
 * Returns true if running inside test framework (vitest / jest).
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Returns a complete safe metadata snapshot of runtime environment.
 */
export function getEnvironmentMetadata(): EnvironmentMetadata {
  const env = getAppEnvironment();
  const nodeEnv = process.env.NODE_ENV || "development";

  return {
    environment: env,
    nodeEnv,
    isProduction: env === "production",
    isStaging: env === "staging",
    isDevelopment: env === "development",
    isTest: nodeEnv === "test",
    label: env.toUpperCase(),
  };
}
