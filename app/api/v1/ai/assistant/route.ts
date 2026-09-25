import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processTaxUserMessage } from "@/lib/ai/gemini/service";
import { handleApiError, AppError } from "@/lib/utils/errors";

const assistantRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1500, "Message is too long"),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = assistantRequestSchema.parse(rawBody);

    const response = await processTaxUserMessage(validated.message);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
