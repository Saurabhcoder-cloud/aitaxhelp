import { getAppEnvironment, AppEnvironment } from "./environment";

/**
 * Build & Runtime Release Metadata (Phase 5 Step 18)
 *
 * Exposes safe, public/admin-visible release metadata.
 * PRIVACY GUARANTEE: Never includes database URLs, API keys, or secret tokens.
 */

export interface BuildMetadata {
  appVersion: string;
  gitCommit: string;
  buildTime: string;
  environment: AppEnvironment;
  nodeVersion: string;
  isProduction: boolean;
}

export const BUILD_INFO: BuildMetadata = {
  appVersion: "0.1.0", // Synced with package.json
  gitCommit:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.GIT_COMMIT ||
    "local-build",
  buildTime: "2026-09-25T14:30:00Z",
  environment: getAppEnvironment(),
  nodeVersion: process.version || "v20.17.0",
  isProduction: getAppEnvironment() === "production",
};

/**
 * Returns dynamic build metadata snapshot.
 */
export function getBuildMetadata(): BuildMetadata {
  const env = getAppEnvironment();
  return {
    ...BUILD_INFO,
    environment: env,
    isProduction: env === "production",
  };
}
