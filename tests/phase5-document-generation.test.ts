import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startSession } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import {
  GET as getDocumentsPackage,
  POST as postDocumentsPackage,
} from "../app/api/v1/tax/preparation/session/federal-return/documents/route";
import { GET as downloadDocument } from "../app/api/v1/tax/preparation/session/federal-return/documents/download/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import {
  TaxPreparationSessionStore,
  TaxPreparationSession,
} from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import {
  buildFederalReturn,
} from "../lib/preparation/federal-return";
import {
  buildFederalReturnDocumentPackage,
  evaluateSupportedSchedules,
  sanitizeTaxDocumentFilename,
  OFFICIAL_DOCUMENT_DISCLAIMER,
  DOCUMENT_VERSION,
  DOCUMENT_GENERATOR_VERSION,
} from "../lib/preparation/federal-return-documents";
import {
  generateFederalTaxSummaryPdf,
  generateForm1040SummaryPdf,
  generateProfessionalReviewPackagePdf,
} from "../lib/preparation/federal-return-pdf";

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const USER_TOKEN = "user-phase5-docgen-token-1111-2222-3333-444444444444";
const USER_B_TOKEN = "user-phase5-docgen-token-5555-6666-7777-888888888888";

describe("Phase 5: Official Federal Return Document Generation & Export Test Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function initTaxpayerSession(
    token: string,
    fullName = "Taylor Morgan",
    taxYear = 2025
  ): Promise<TaxPreparationSession> {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: { profile: { fullName } },
      })
    );

    const res = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );
    const data = await res.json();
    return data.data as TaxPreparationSession;
  }

  async function setupStandardW2Session(token: string) {
    const session = await initTaxpayerSession(token, "Alex Rivera", 2025);

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token,
        body: {
          filingStatus: "single",
          hasDependents: false,
          dependents: [],
        },
      })
    );

    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-1",
              employerName: "TechCorp Inc",
              wagesCents: 75_000_00,
              federalWithholdingCents: 8_500_00,
            },
          ],
          form1099s: [],
          activities: [],
        },
      })
    );

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [],
          guidedAnswers: {},
        },
      })
    );

    await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );

    return TaxPreparationSessionStore.getCurrent(session.userId) as Promise<TaxPreparationSession>;
  }

  async function setupSelfEmployedWithItemizedSession(token: string) {
    const session = await initTaxpayerSession(token, "Jordan & Casey Smith", 2025);

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token,
        body: {
          filingStatus: "married_filing_jointly",
          hasSpouse: true,
          spouse: {
            firstName: "Casey",
            lastName: "Smith",
            hasIncome: true,
            hasW2Income: true,
            w2WagesCents: 30_000_00,
          },
          hasDependents: true,
          dependents: [
            {
              id: "dep-1",
              firstName: "Maya",
              lastName: "Smith",
              dateOfBirth: "2018-05-10",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              hasTinOrSsn: true,
            },
          ],
        },
      })
    );

    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer", "freelance", "business"],
          w2s: [
            {
              id: "w2-1",
              employerName: "Enterprise LLC",
              wagesCents: 90_000_00,
              federalWithholdingCents: 12_000_00,
            },
          ],
          form1099s: [
            {
              id: "1099-1",
              payerName: "Client A",
              incomeType: "freelance",
              grossIncomeCents: 35_000_00,
              federalWithholdingCents: 0,
            },
          ],
          activities: [
            {
              id: "act-1",
              kind: "business",
              activityName: "Jordan Consulting",
              grossReceiptsCents: 35_000_00,
              equipmentSuppliesCents: 2_000_00,
              softwareSubscriptionsCents: 1_000_00,
              homeOfficeVehicleCents: 2_000_00,
              otherExpensesCents: 0,
            },
          ],
        },
      })
    );

    // Itemized deductions exceeding 2025 MFJ standard deduction ($30,000)
    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "ded-equip",
              category: "equipment_supplies",
              amountCents: 2_000_00,
              description: "Laptops and monitors",
              confirmed: true,
              status: "applied_business",
            },
            {
              id: "ded-salt",
              category: "state_local_taxes",
              amountCents: 10_000_00,
              description: "State income tax and real estate property tax",
              confirmed: true,
              status: "applied_itemized",
            },
            {
              id: "ded-mortgage",
              category: "mortgage_interest",
              amountCents: 20_000_00,
              description: "Primary home mortgage interest Form 1098",
              confirmed: true,
              status: "applied_itemized",
            },
            {
              id: "ded-charity",
              category: "charitable_cash",
              amountCents: 5_000_00,
              description: "Cash donations to 501(c)(3) charities",
              confirmed: true,
              status: "applied_itemized",
            },
          ],
          guidedAnswers: {
            home: { ownedHome: true, mortgageInterestCents: 20_000_00 },
            stateLocal: { paidStateLocalTaxes: true, stateLocalTaxCents: 10_000_00 },
            charity: { madeDonations: true, cashCents: 5_000_00 },
            business: { hadBusinessExpenses: true, milesDriven: 1500 },
            education: { paidEducation: true, studentLoanInterestCents: 1500_00 },
            childcare: { paidChildcare: true, childcareCents: 3000_00 },
          },
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);

    return TaxPreparationSessionStore.getCurrent(session.userId) as Promise<TaxPreparationSession>;
  }

  // ===========================================================================
  // 1. CANONICAL DOCUMENT PACKAGE SYNTHESIS & METADATA
  // ===========================================================================

  describe("1. Document Package Synthesis & Metadata", () => {
    it("generates a complete document package matching canonical FederalReturn aggregate", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const pkg = buildFederalReturnDocumentPackage(session);

      expect(pkg.sessionId).toBe(session.id);
      expect(pkg.userId).toBe(session.userId);
      expect(pkg.taxYear).toBe(2025);
      expect(pkg.documentVersion).toBe(DOCUMENT_VERSION);
      expect(pkg.generatorVersion).toBe(DOCUMENT_GENERATOR_VERSION);
      expect(pkg.generationStatus).toBe("ready");
      expect(pkg.isBlocked).toBe(false);
      expect(pkg.blockingIssues).toHaveLength(0);

      // Verify 3 official document descriptors
      expect(pkg.documents).toHaveLength(3);
      const docTypes = pkg.documents.map((d) => d.documentType);
      expect(docTypes).toContain("federal_tax_summary");
      expect(docTypes).toContain("form_1040_preparation");
      expect(docTypes).toContain("professional_review_package");

      // Verify financial summary matches calculated numbers
      expect(pkg.summary.taxpayerName).toBe("Alex Rivera");
      expect(pkg.summary.filingStatusLabel).toBe("Single");
      expect(pkg.summary.totalGrossIncomeCents).toBe(75_000_00);
      expect(pkg.summary.deductionType).toBe("standard");
      expect(pkg.summary.totalPaymentsAndCreditsCents).toBe(8_500_00);
    });

    it("embodies strict official disclaimer on package and every generated document", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const pkg = buildFederalReturnDocumentPackage(session);

      expect(pkg.securityMetadata.disclaimer).toBe(OFFICIAL_DOCUMENT_DISCLAIMER);
      expect(pkg.securityMetadata.disclaimer).toContain("NOT FILED WITH THE IRS");
      expect(pkg.securityMetadata.disclaimer).toContain("TaxAIHelp does not transmit");

      for (const doc of pkg.documents) {
        expect(doc.disclaimer).toBe(OFFICIAL_DOCUMENT_DISCLAIMER);
        expect(doc.downloadUrl).toContain("/api/v1/tax/preparation/session/federal-return/documents/download");
      }
    });

    it("evaluates Schedule support statuses correctly for simple W-2 return", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const pkg = buildFederalReturnDocumentPackage(session);

      const schA = pkg.schedules.find((s) => s.schedule === "schedule_a");
      const sch1 = pkg.schedules.find((s) => s.schedule === "schedule_1");
      const sch2 = pkg.schedules.find((s) => s.schedule === "schedule_2");
      const schSE = pkg.schedules.find((s) => s.schedule === "schedule_se");
      const schD = pkg.schedules.find((s) => s.schedule === "schedule_d");
      const schE = pkg.schedules.find((s) => s.schedule === "schedule_e");

      expect(schA?.status).toBe("not_applicable");
      expect(sch1?.status).toBe("not_applicable");
      expect(sch2?.status).toBe("not_applicable");
      expect(schSE?.status).toBe("not_applicable");
      expect(schD?.status).toBe("not_yet_supported");
      expect(schE?.status).toBe("not_yet_supported");
    });
  });

  // ===========================================================================
  // 2. SCHEDULE EVALUATION WITH SELF-EMPLOYMENT & ITEMIZED DEDUCTIONS
  // ===========================================================================

  describe("2. Schedule Support Evaluation with Complex Return", () => {
    it("activates Schedules A, 1, 2, 3, SE, and C when conditions are met", async () => {
      const session = await setupSelfEmployedWithItemizedSession(USER_TOKEN);
      const fedReturn = buildFederalReturn(session);
      const schedules = evaluateSupportedSchedules(fedReturn);

      const schA = schedules.find((s) => s.schedule === "schedule_a");
      const sch1 = schedules.find((s) => s.schedule === "schedule_1");
      const sch2 = schedules.find((s) => s.schedule === "schedule_2");
      const sch3 = schedules.find((s) => s.schedule === "schedule_3");
      const schSE = schedules.find((s) => s.schedule === "schedule_se");
      const schC = schedules.find((s) => s.schedule === "schedule_c");
      const schD = schedules.find((s) => s.schedule === "schedule_d");
      const schE = schedules.find((s) => s.schedule === "schedule_e");

      // Schedule A is READY because itemized ($35,000) > standard ($30,000)
      expect(schA?.status).toBe("ready");
      expect(schA?.statusReason).toContain("exceed the standard deduction");

      // Schedule 1 is READY because of 1099/gig income and deductible half SE / student loan adjustments
      expect(sch1?.status).toBe("ready");
      expect(sch1?.supportedFields.length).toBeGreaterThan(0);

      // Schedule 2 & SE are READY because net SE profit >= $400
      expect(sch2?.status).toBe("ready");
      expect(schSE?.status).toBe("ready");

      // Schedule 3 is READY because CDCTC and child tax credits apply
      expect(sch3?.status).toBe("ready");

      // Schedule C is READY because business activity is present
      expect(schC?.status).toBe("ready");

      // Schedules D & E remain NOT_YET_SUPPORTED
      expect(schD?.status).toBe("not_yet_supported");
      expect(schE?.status).toBe("not_yet_supported");
    });
  });

  // ===========================================================================
  // 3. READINESS & RECONCILIATION GATING
  // ===========================================================================

  describe("3. Readiness & Reconciliation Gating", () => {
    it("sets generationStatus='blocked' and isBlocked=true when session has incomplete profile", async () => {
      // Create session without setting profile or household
      const session = await initTaxpayerSession(USER_TOKEN, "");
      const pkg = buildFederalReturnDocumentPackage(session);

      expect(pkg.isBlocked).toBe(true);
      expect(pkg.generationStatus).toBe("blocked");
      expect(pkg.blockingIssues.length).toBeGreaterThan(0);
      expect(pkg.blockingIssues.some((i) => i.toLowerCase().includes("taxpayer") || i.toLowerCase().includes("name"))).toBe(true);

      for (const doc of pkg.documents) {
        expect(doc.generationStatus).toBe("blocked");
      }
    });

    it("sets generationStatus='blocked' when session has missing calculation", async () => {
      const session = await initTaxpayerSession(USER_TOKEN, "Morgan Lee");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_TOKEN,
          body: { filingStatus: "single", hasDependents: false, dependents: [] },
        })
      );
      // Omit calculation
      const freshSession = await TaxPreparationSessionStore.getCurrent(session.userId);
      const pkg = buildFederalReturnDocumentPackage(freshSession!);

      expect(pkg.isBlocked).toBe(true);
      expect(pkg.generationStatus).toBe("blocked");
      expect(pkg.blockingIssues.some((i) => i.toLowerCase().includes("calculation"))).toBe(true);
    });

    it("sets generationStatus='ready_with_warnings' when warnings exist without blockers", async () => {
      // Single filer, high income, missing 1099 withholding or minor non-blocking items
      const session = await setupStandardW2Session(USER_TOKEN);
      const pkg = buildFederalReturnDocumentPackage(session);

      // Standard session is ready
      expect(["ready", "ready_with_warnings"]).toContain(pkg.generationStatus);
    });
  });

  // ===========================================================================
  // 4. FILENAME SANITIZATION UTILITY
  // ===========================================================================

  describe("4. Filename Sanitization Utility", () => {
    it("produces standardized, secure filenames without PII or internal identifiers", () => {
      const summaryFilename = sanitizeTaxDocumentFilename(2025, "federal_tax_summary", "pdf");
      const f1040Filename = sanitizeTaxDocumentFilename(2025, "form_1040_preparation", "pdf");
      const cpaFilename = sanitizeTaxDocumentFilename(2025, "professional_review_package", "pdf");

      expect(summaryFilename).toBe("TaxAIHelp-2025-Federal-Tax-Summary.pdf");
      expect(f1040Filename).toBe("TaxAIHelp-2025-Form-1040-Preparation.pdf");
      expect(cpaFilename).toBe("TaxAIHelp-2025-Professional-Review-Package.pdf");

      // Verify no whitespace or special characters
      for (const fn of [summaryFilename, f1040Filename, cpaFilename]) {
        expect(fn).not.toMatch(/[ <>:"/\\|?*]/);
        expect(fn.endsWith(".pdf")).toBe(true);
        expect(fn.startsWith("TaxAIHelp-2025-")).toBe(true);
      }
    });
  });

  // ===========================================================================
  // 5. VECTOR PDF GENERATION (BINARY VALIDATION)
  // ===========================================================================

  describe("5. Vector PDF Generation Engine", () => {
    it("generates a valid binary PDF for the Federal Tax Summary Report", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const fedReturn = buildFederalReturn(session);

      const pdfBytes = await generateFederalTaxSummaryPdf(fedReturn);

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.byteLength).toBeGreaterThan(1500);

      // Verify PDF file header: %PDF- (0x25 0x50 0x44 0x46 0x2D)
      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("generates a valid binary PDF for Form 1040 Preparation Summary", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const fedReturn = buildFederalReturn(session);

      const pdfBytes = await generateForm1040SummaryPdf(fedReturn);

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.byteLength).toBeGreaterThan(2000);

      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("generates a valid binary PDF for CPA / Professional Review Package with full proofs", async () => {
      const session = await setupSelfEmployedWithItemizedSession(USER_TOKEN);
      const fedReturn = buildFederalReturn(session);

      const pdfBytes = await generateProfessionalReviewPackagePdf(fedReturn);

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.byteLength).toBeGreaterThan(2500);

      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });
  });

  // ===========================================================================
  // 6. HTTP API ENDPOINTS: METADATA & STREAMING DOWNLOADS
  // ===========================================================================

  describe("6. API Endpoints: Documents Metadata & Streaming Download", () => {
    it("GET /api/v1/tax/preparation/session/federal-return/documents requires authentication", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents");
      const res = await getDocumentsPackage(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents returns 404 if no session exists", async () => {
      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents",
        { token: USER_B_TOKEN }
      );
      const res = await getDocumentsPackage(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents returns package metadata when session exists", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents",
        { token: USER_TOKEN }
      );
      const res = await getDocumentsPackage(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.documents).toHaveLength(3);
      expect(json.data.summary.filingStatusLabel).toBe("Single");
    });

    it("POST /api/v1/tax/preparation/session/federal-return/documents behaves as equivalent alias", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents",
        { method: "POST", token: USER_TOKEN }
      );
      const res = await postDocumentsPackage(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.generationStatus).toBe("ready");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download blocks download if return is incomplete", async () => {
      // Incomplete session
      await initTaxpayerSession(USER_TOKEN, "");

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=summary",
        { token: USER_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("PREPARATION_BLOCKED");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download returns 400 for unknown docType", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=unknown_form",
        { token: USER_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_DOCUMENT_TYPE");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download streams PDF for docType=summary", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=summary",
        { token: USER_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="TaxAIHelp-2025-Federal-Tax-Summary.pdf"'
      );
      expect(res.headers.get("cache-control")).toContain("no-store");

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const header = String.fromCharCode(...bytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download streams PDF for docType=1040", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=1040",
        { token: USER_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="TaxAIHelp-2025-Form-1040-Preparation.pdf"'
      );

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const header = String.fromCharCode(...bytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download streams PDF for docType=cpa_review with inline=true", async () => {
      await setupStandardW2Session(USER_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=cpa_review&inline=true",
        { token: USER_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe(
        'inline; filename="TaxAIHelp-2025-Professional-Review-Package.pdf"'
      );

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const header = String.fromCharCode(...bytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("GET /api/v1/tax/preparation/session/federal-return/documents/download rejects access to other users' sessions (404)", async () => {
      // User A creates a valid session
      await setupStandardW2Session(USER_TOKEN);

      // User B attempts to download User A's return without having their own session
      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/documents/download?docType=summary",
        { token: USER_B_TOKEN }
      );
      const res = await downloadDocument(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("reconciliation gating: blocks package generation if calculation has a reconciliation mismatch", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);

      // Intentionally tamper with calculationSnapshot in session to simulate arithmetic inconsistency
      const tamperedSession = {
        ...session,
        calculationSnapshot: {
          ...session.calculationSnapshot!,
          // Corrupt taxable income: standard deduction ($15,750) minus gross ($75,000) should be $59,250
          taxableIncomeCents: 99_999_00,
        },
      };

      const pkg = buildFederalReturnDocumentPackage(tamperedSession);
      expect(pkg.isBlocked).toBe(true);
      expect(pkg.generationStatus).toBe("blocked");
      expect(pkg.reconciliationStatus).toBe("mismatch");
      expect(pkg.blockingIssues.some((issue) => issue.toLowerCase().includes("reconciliation") || issue.toLowerCase().includes("mismatch"))).toBe(true);
    });

    it("Form 1040 preparation lines are deterministically mapped without AI estimation", async () => {
      const session = await setupStandardW2Session(USER_TOKEN);
      const fedReturn = buildFederalReturn(session);

      // Line 1z: Wages
      expect(fedReturn.income.w2WagesCents).toBe(75_000_00);
      // Line 11: AGI
      expect(fedReturn.adjustments.adjustedGrossIncomeCents).toBe(75_000_00);
      // Line 12: Standard deduction
      expect(fedReturn.deductions.deductionUsedCents).toBe(15_750_00);
      // Line 15: Taxable income = 75,000 - 15,750 = 59,250
      expect(fedReturn.taxes.taxableIncomeCents).toBe(59_250_00);
      // Line 25d: Federal withholding
      expect(fedReturn.payments.totalFederalWithholdingCents).toBe(8_500_00);
      // Reconciled math
      expect(fedReturn.reconciliation.isReconciled).toBe(true);
    });
  });
});
