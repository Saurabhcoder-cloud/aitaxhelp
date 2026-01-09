import { NextResponse } from "next/server";
import { getUpload, updateUploadStatus } from "@/lib/store/uploads";

export async function GET(
  _req: Request,
  { params }: { params: { upload_id: string } }
) {
  const { upload_id } = params;
  const existing = getUpload(upload_id);

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const record = updateUploadStatus(upload_id, {
    status: "drafted",
    audit: { ...existing.audit, draftedAt: existing.audit.draftedAt ?? now },
  });

  return NextResponse.json({
    upload_id,
    summary: {
      filer: {
        filingStatus: "Single",
        state: "CA",
        dependentsCount: 1,
      },
      income: {
        wages: 52000,
        "1099": 18000,
        interest: 120,
        dividends: 75,
      },
      adjustments: {
        standardOrItemized: "standard",
        totalDeductions: 13850,
      },
      credits: {
        childTaxCredit: 2000,
        eitc: 900,
        other: 350,
      },
      result: {
        refundOrBalance: 1425,
        estimatedTax: 7100,
        effectiveRate: 0.11,
      },
    },
    forms: [
      { name: "Form 1040", status: "ready" },
      { name: "Schedule C", status: "ready" },
      { name: "State return", status: "pending" },
    ],
    audit: record?.audit,
  });
}
