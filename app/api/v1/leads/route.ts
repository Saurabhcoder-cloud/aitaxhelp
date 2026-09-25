import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/utils/errors";

const leadSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  taxPayerType: z.enum(["individual", "freelancer_1099", "small_business"]),
  urgency: z.enum(["immediate", "this_month", "planning_ahead"]),
  estimatedAnnualIncomeRange: z.string().min(1, "Income range is required"),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = leadSchema.parse(rawBody);

    // In this foundation phase, leads are validated and prepared for Supabase storage
    return NextResponse.json({
      success: true,
      data: {
        leadId: "lead_" + Math.random().toString(36).substring(2, 9),
        status: "received",
        message: "Your inquiry has been received. A licensed tax professional will review your requirements.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
