import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  calculationIdParamSchema,
  updateCalculationTitleSchema,
} from "@/lib/validations/calculation-history";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/tax/calculations/[id]
 * Retrieves a single calculation snapshot strictly owned by the authenticated user.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const calculationId = calculationIdParamSchema.parse(params.id);
    const calculation = await TaxCalculationStore.getById(calculationId, user.id);

    if (!calculation) {
      throw new AppError("Calculation not found.", 404, "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/tax/calculations/[id]
 * Deletes a single calculation snapshot strictly owned by the authenticated user.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const calculationId = calculationIdParamSchema.parse(params.id);
    const deleted = await TaxCalculationStore.delete(calculationId, user.id);

    if (!deleted) {
      throw new AppError("Calculation not found.", 404, "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        id: calculationId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/tax/calculations/[id]
 * Renames a calculation title.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const calculationId = calculationIdParamSchema.parse(params.id);
    const rawBody = await req.json();
    const validated = updateCalculationTitleSchema.parse(rawBody);

    const updated = await TaxCalculationStore.updateTitle(
      calculationId,
      user.id,
      validated.title
    );

    if (!updated) {
      throw new AppError("Calculation not found.", 404, "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
