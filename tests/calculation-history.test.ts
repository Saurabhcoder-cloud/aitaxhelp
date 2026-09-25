import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../app/api/v1/tax/calculations/route";
import {
  GET as getSingleCalc,
  DELETE as deleteCalc,
  PATCH as patchCalc,
} from "../app/api/v1/tax/calculations/[id]/route";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { calculateIncomeTax } from "../tax-engine";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Calculation History & Persistence Architecture Suite", () => {
  beforeEach(() => {
    TaxCalculationStore.clearStore();
  });

  const validIncomeInput = {
    taxYear: 2025 as const,
    filingStatus: "single" as const,
    w2WagesCents: 8500000,
    otherIncomeCents: 0,
    federalWithholdingCents: 1000000,
    itemizedDeductionCents: 0,
  };

  const sampleResult = calculateIncomeTax(validIncomeInput);

  it("1. Successfully saves valid calculation with server-derived user identity and default title", async () => {
    const payload = {
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      inputSnapshot: validIncomeInput,
      resultSnapshot: sampleResult,
    };

    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: payload,
      token: "test-user-1",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    expect(json.data.userId).toBe("test-user-1");
    expect(json.data.title).toBe("2025 Income Tax Calculation");
    expect(json.data.engineVersion).toBe(sampleResult.engineVersion);
    expect(json.data.rulesVersion).toBe(sampleResult.rulesVersion);
    expect(json.data.resultSnapshot.totalTaxLiabilityCents).toBe(sampleResult.totalTaxLiabilityCents);
  });

  it("2. Strictly rejects unauthenticated save request with 401 UNAUTHORIZED", async () => {
    const payload = {
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      inputSnapshot: validIncomeInput,
      resultSnapshot: sampleResult,
    };

    // No Authorization token supplied
    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("3. Strictly enforces ownership: User A cannot retrieve User B's calculation snapshot", async () => {
    // User A saves a calculation
    const postReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        title: "User A Confidential Scenario",
        inputSnapshot: validIncomeInput,
        resultSnapshot: sampleResult,
      },
      token: "test-user-a",
    });

    const postRes = await POST(postReq);
    const postJson = await postRes.json();
    const calculationId = postJson.data.id;

    // User B attempts to access User A's calculation by ID
    const getReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${calculationId}`,
      {
        method: "GET",
        token: "test-user-b", // Different authenticated user
      }
    );

    const getRes = await getSingleCalc(getReq, { params: { id: calculationId } });
    expect(getRes.status).toBe(404);

    const getJson = await getRes.json();
    expect(getJson.success).toBe(false);
    expect(getJson.error.code).toBe("NOT_FOUND");
  });

  it("4. Strictly enforces ownership: User A cannot delete User B's calculation snapshot", async () => {
    // User A saves calculation
    const postReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        inputSnapshot: validIncomeInput,
        resultSnapshot: sampleResult,
      },
      token: "test-user-a",
    });
    const postJson = await (await POST(postReq)).json();
    const calculationId = postJson.data.id;

    // User B attempts to delete User A's calculation
    const delReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${calculationId}`,
      {
        method: "DELETE",
        token: "test-user-b",
      }
    );
    const delRes = await deleteCalc(delReq, { params: { id: calculationId } });
    expect(delRes.status).toBe(404);

    // Verify calculation still exists for User A
    const verifyReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${calculationId}`,
      {
        method: "GET",
        token: "test-user-a",
      }
    );
    const verifyRes = await getSingleCalc(verifyReq, { params: { id: calculationId } });
    expect(verifyRes.status).toBe(200);
  });

  it("5. Returns empty list for users with no saved calculations", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "GET",
      token: "test-user-new",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(0);
  });

  it("6. Lists calculations ordered newest first (descending created_at)", async () => {
    // First save
    await POST(
      createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
        method: "POST",
        body: {
          calculatorType: "income_tax",
          taxYear: 2025,
          filingStatus: "single",
          title: "Calculation 1",
          inputSnapshot: validIncomeInput,
          resultSnapshot: sampleResult,
        },
        token: "test-user-list",
      })
    );

    // Second save
    await POST(
      createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
        method: "POST",
        body: {
          calculatorType: "income_tax",
          taxYear: 2025,
          filingStatus: "single",
          title: "Calculation 2",
          inputSnapshot: validIncomeInput,
          resultSnapshot: sampleResult,
        },
        token: "test-user-list",
      })
    );

    const listReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "GET",
      token: "test-user-list",
    });
    const listRes = await GET(listReq);
    const json = await listRes.json();

    expect(json.success).toBe(true);
    expect(json.data.length).toBe(2);
    expect(json.data[0].title).toBe("Calculation 2"); // Newest first
    expect(json.data[1].title).toBe("Calculation 1");
  });

  it("7. Preserves exact historical result snapshot without recalculation", async () => {
    const postReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        inputSnapshot: validIncomeInput,
        resultSnapshot: sampleResult,
      },
      token: "test-user-snapshot",
    });
    const saved = (await (await POST(postReq)).json()).data;

    const getReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${saved.id}`,
      {
        method: "GET",
        token: "test-user-snapshot",
      }
    );
    const fetched = (await (await getSingleCalc(getReq, { params: { id: saved.id } })).json()).data;

    expect(fetched.resultSnapshot.grossIncomeCents).toBe(sampleResult.grossIncomeCents);
    expect(fetched.resultSnapshot.adjustedGrossIncomeCents).toBe(sampleResult.adjustedGrossIncomeCents);
    expect(fetched.resultSnapshot.deductionUsedCents).toBe(sampleResult.deductionUsedCents);
    expect(fetched.resultSnapshot.federalIncomeTaxCents).toBe(sampleResult.federalIncomeTaxCents);
    expect(fetched.resultSnapshot.totalTaxLiabilityCents).toBe(sampleResult.totalTaxLiabilityCents);
    expect(fetched.resultSnapshot.effectiveTaxRate).toBe(sampleResult.effectiveTaxRate);
    expect(fetched.resultSnapshot.marginalTaxBracket).toBe(sampleResult.marginalTaxBracket);
    expect(fetched.engineVersion).toBe(sampleResult.engineVersion);
    expect(fetched.rulesVersion).toBe(sampleResult.rulesVersion);
  });

  it("8. Rejects malformed payload: mismatch between request taxYear and resultSnapshot taxYear", async () => {
    const malformedPayload = {
      calculatorType: "income_tax",
      taxYear: 2025, // Request declares 2025
      filingStatus: "single",
      inputSnapshot: validIncomeInput,
      resultSnapshot: {
        ...sampleResult,
        taxYear: 2026, // Mismatched 2026 in snapshot
      },
    };

    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: malformedPayload,
      token: "test-user-val",
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("9. Rejects negative wages in input snapshot", async () => {
    const invalidInput = {
      ...validIncomeInput,
      w2WagesCents: -50000,
    };

    const payload = {
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      inputSnapshot: invalidInput,
      resultSnapshot: sampleResult,
    };

    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: payload,
      token: "test-user-val",
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("10. Renames calculation title cleanly via PATCH", async () => {
    const postReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        inputSnapshot: validIncomeInput,
        resultSnapshot: sampleResult,
      },
      token: "test-user-rename",
    });
    const saved = (await (await POST(postReq)).json()).data;

    const patchReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${saved.id}`,
      {
        method: "PATCH",
        body: { title: "Updated Tax Scenario Name" },
        token: "test-user-rename",
      }
    );
    const patchRes = await patchCalc(patchReq, { params: { id: saved.id } });
    expect(patchRes.status).toBe(200);

    const json = await patchRes.json();
    expect(json.data.title).toBe("Updated Tax Scenario Name");
  });

  it("11. Client-supplied userId in body is completely ignored in favor of auth session", async () => {
    const payload = {
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      userId: "spoofed-admin-id", // Malicious spoof attempt
      inputSnapshot: validIncomeInput,
      resultSnapshot: sampleResult,
    };

    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: payload,
      token: "test-user-legitimate",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.userId).toBe("test-user-legitimate"); // Derived strictly from verified session
    expect(json.data.userId).not.toBe("spoofed-admin-id");
  });

  it("12. Deletes calculation and prevents subsequent access", async () => {
    const postReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations", {
      method: "POST",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        inputSnapshot: validIncomeInput,
        resultSnapshot: sampleResult,
      },
      token: "test-user-delete",
    });
    const saved = (await (await POST(postReq)).json()).data;

    // Delete
    const delReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${saved.id}`,
      {
        method: "DELETE",
        token: "test-user-delete",
      }
    );
    const delRes = await deleteCalc(delReq, { params: { id: saved.id } });
    expect(delRes.status).toBe(200);

    // Verify subsequent GET returns 404
    const getReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${saved.id}`,
      {
        method: "GET",
        token: "test-user-delete",
      }
    );
    const getRes = await getSingleCalc(getReq, { params: { id: saved.id } });
    expect(getRes.status).toBe(404);
  });
});
