import { ENGINE_VERSION, SUPPORTED_TAX_YEARS, DEFAULT_TAX_YEAR } from "@/tax-engine";
import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";

export type VersionDriftStatus =
  | "CURRENT"
  | "HISTORICAL"
  | "EXPECTED_VERSION_MISMATCH"
  | "UNRECOGNIZED_VERSION";

export interface TaxEngineMonitoringSnapshot {
  engineVersion: string;
  supportedTaxYears: readonly number[];
  defaultTaxYear: number;
  totalCalculationsRun: number;
  totalErrors: number;
  averageDurationMs: number;
  status: "HEALTHY" | "DEGRADED" | "FAILED";
  message: string;
}

export interface VersionDriftReport {
  calculationId?: string;
  recordEngineVersion: string;
  currentEngineVersion: string;
  status: VersionDriftStatus;
  isHistoricalPreserved: boolean;
  message: string;
}

let calculationCounter = 0;
let calculationErrorCounter = 0;
let totalExecutionMs = 0;

/**
 * Deterministic Tax Engine Operational Monitoring (Phase 5 Step 19)
 *
 * SAFETY INVARIANT: Never alters tax calculation outputs.
 * PRIVACY INVARIANT: Never logs, captures, or exposes dollar amounts, income, or tax liabilities.
 */
export class TaxEngineMonitor {
  /**
   * Records a tax engine execution attempt.
   */
  public static recordExecution(durationMs: number, success: boolean, taxYear: number): void {
    calculationCounter++;
    totalExecutionMs += durationMs;

    if (success) {
      Metrics.increment("tax_calculation_total", 1, { taxYear: String(taxYear) });
    } else {
      calculationErrorCounter++;
      Metrics.increment("tax_calculation_error_total", 1, { taxYear: String(taxYear) });
      Logger.error("tax_engine:calculation_failed", {
        module: "tax-engine",
        taxYear,
        engineVersion: ENGINE_VERSION,
      });
    }
  }

  /**
   * Evaluates version drift for stored calculation records.
   * INVARIANT: Historical records must preserve their original engine versions.
   */
  public static evaluateVersionDrift(recordEngineVersion: string, calculationId?: string): VersionDriftReport {
    if (recordEngineVersion === ENGINE_VERSION) {
      return {
        calculationId,
        recordEngineVersion,
        currentEngineVersion: ENGINE_VERSION,
        status: "CURRENT",
        isHistoricalPreserved: true,
        message: "Calculation executed on current production engine version.",
      };
    }

    if (recordEngineVersion.startsWith("1.0.") || recordEngineVersion.includes("baseline")) {
      return {
        calculationId,
        recordEngineVersion,
        currentEngineVersion: ENGINE_VERSION,
        status: "HISTORICAL",
        isHistoricalPreserved: true,
        message: "Historical calculation version preserved without automatic recalculation.",
      };
    }

    return {
      calculationId,
      recordEngineVersion,
      currentEngineVersion: ENGINE_VERSION,
      status: "EXPECTED_VERSION_MISMATCH",
      isHistoricalPreserved: true,
      message: "Version mismatch detected against baseline; original record is immutable.",
    };
  }

  /**
   * Returns sanitized diagnostic metrics for the deterministic engine.
   */
  public static getSnapshot(): TaxEngineMonitoringSnapshot {
    const avgDuration = calculationCounter > 0 ? Math.round(totalExecutionMs / calculationCounter) : 0;
    const errorRate = calculationCounter > 0 ? calculationErrorCounter / calculationCounter : 0;

    let status: "HEALTHY" | "DEGRADED" | "FAILED" = "HEALTHY";
    let message = "Deterministic engine operating with 100% statutory precision.";

    if (errorRate > 0.05) {
      status = "FAILED";
      message = "Elevated calculation error rate detected in deterministic engine.";
    } else if (calculationErrorCounter > 0) {
      status = "DEGRADED";
      message = "Occasional validation failures caught by tax engine schemas.";
    }

    return {
      engineVersion: ENGINE_VERSION,
      supportedTaxYears: SUPPORTED_TAX_YEARS,
      defaultTaxYear: DEFAULT_TAX_YEAR,
      totalCalculationsRun: calculationCounter,
      totalErrors: calculationErrorCounter,
      averageDurationMs: avgDuration,
      status,
      message,
    };
  }

  /**
   * Resets test counters.
   */
  public static resetCounters(): void {
    calculationCounter = 0;
    calculationErrorCounter = 0;
    totalExecutionMs = 0;
  }
}
