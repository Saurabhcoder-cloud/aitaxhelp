import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { upload_id: string } }
) {
  const { upload_id } = params;
  const progress = Math.min(100, Math.floor(Math.random() * 40) * 3);
  return NextResponse.json({
    upload_id,
    progress,
    steps: [
      { label: "OCR", status: progress > 20 ? "done" : "pending" },
      { label: "Classification", status: progress > 50 ? "done" : "pending" },
      { label: "Validation", status: progress > 70 ? "done" : "pending" },
      { label: "Drafting", status: progress >= 100 ? "done" : "pending" },
    ],
    extracted: {
      filerName: "Jordan Lee",
      filingStatus: "Single",
      income: 52000,
      deductions: 8200,
    },
  });
}
