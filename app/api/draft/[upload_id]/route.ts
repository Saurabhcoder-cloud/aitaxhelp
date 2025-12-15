import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { upload_id: string } }
) {
  const { upload_id } = params;
  return NextResponse.json({
    upload_id,
    summary: {
      refundEstimate: 1240,
      taxDue: 0,
      credits: ["Child Tax Credit", "Earned Income Credit"],
      deductions: ["Standard deduction", "Vehicle mileage"],
    },
    forms: [
      { name: "Form 1040", status: "ready" },
      { name: "Schedule C", status: "ready" },
      { name: "State return", status: "pending" },
    ],
  });
}
