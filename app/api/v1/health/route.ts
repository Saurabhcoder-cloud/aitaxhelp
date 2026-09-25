import { NextResponse } from "next/server";
import { ENGINE_VERSION, SUPPORTED_TAX_YEARS, DEFAULT_TAX_YEAR } from "@/tax-engine";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    platform: "TaxAIHelp",
    engineVersion: ENGINE_VERSION,
    supportedTaxYears: SUPPORTED_TAX_YEARS,
    defaultTaxYear: DEFAULT_TAX_YEAR,
    timestamp: new Date().toISOString(),
  });
}
