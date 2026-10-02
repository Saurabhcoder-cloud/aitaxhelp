import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as startSession,
  GET as getSession,
  PATCH as patchSession,
} from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { calculateIncomeTax, calculateSelfEmployedTax } from "../tax-engine";
import { getTaxYearRules } from "../tax-engine/rules";
import {
  deductionExpenseCents,
  itemizedDeductionTotalCents,
  calculateEntryEffectiveAmountCents,
  isBusinessDeductionCategory,
  isItemizedDeductionCategory,
} from "../lib/preparation/deductions";
import {
  deductionDiscoveryInputSchema,
  entrySchema,
} from "../lib/validations/preparation-deductions";
import { buildPreparationSessionDeterministicReply } from "../lib/ai/gemini/service";

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

const USER_A_TOKEN = "user-a-deductions-1111-2222-3333-444444444444";
const USER_B_TOKEN = "user-b-deductions-5555-6666-7777-888888888888";

describe("Phase 2: Interactive Deduction Discovery & Guided Deductions Test Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function initSession(token: string, fullName = "Jane Taxpayer", filingStatus = "single") {
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
    const json = await res.json();
    return json.data;
  }

  async function provideW2Income(token: string, wagesCents = 60_000_00, withholdingCents = 6_000_00) {
    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-job-1",
              employerName: "Tech Corp",
              wagesCents,
              federalWithholdingCents: withholdingCents,
            },
          ],
          form1099s: [],
          activities: [],
        },
      })
    );
  }

  async function provide1099Income(
    token: string,
    grossIncomeCents = 40_000_00,
    withholdingCents = 2_000_00
  ) {
    const res = await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["freelance"],
          w2s: [],
          form1099s: [
            {
              id: "1099-client-1",
              incomeType: "freelance",
              payerName: "Acme Consulting",
              grossIncomeCents,
              federalWithholdingCents: withholdingCents,
            },
          ],
          activities: [],
        },
      })
    );
    expect(res.status).toBe(200);
  }

  // -------------------------------------------------------------------------
  // Scenario 1: No deductions default workflow
  // -------------------------------------------------------------------------
  it("Scenario 1: Default wage session with no extra deductions applies statutory standard deduction", async () => {
    await initSession(USER_A_TOKEN, "Alice Single", "single");
    await provideW2Income(USER_A_TOKEN, 60_000_00, 6_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [],
        },
      })
    );
    expect(dedRes.status).toBe(200);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    // 2025 Single Standard Deduction is $15,750 (IRS IRB 2025-45)
    expect(calc.deductionType).toBe("standard");
    expect(calc.deductionUsedCents).toBe(15_750_00);
    expect(calc.taxableIncomeCents).toBe(60_000_00 - 15_750_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Mortgage interest discovery
  // -------------------------------------------------------------------------
  it("Scenario 2: Mortgage interest and property taxes are discovered and safely stored", async () => {
    await initSession(USER_A_TOKEN, "Bob Homeowner", "single");
    await provideW2Income(USER_A_TOKEN, 100_000_00, 12_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "itemized-mortgage",
              category: "mortgage_interest",
              amountCents: 12_000_00,
              description: "Form 1098 Mortgage Interest",
              confirmed: true,
              status: "unsupported_schedule_a",
            },
            {
              id: "itemized-prop-tax",
              category: "property_taxes",
              amountCents: 4_000_00,
              description: "County Real Estate Taxes",
              confirmed: true,
              status: "unsupported_schedule_a",
            },
          ],
          guidedAnswers: {
            home: {
              ownedHome: true,
              mortgageInterestCents: 12_000_00,
              propertyTaxesCents: 4_000_00,
            },
          },
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;

    expect(session.deductionsSnapshot.entries.length).toBe(2);
    expect(itemizedDeductionTotalCents(session.deductionsSnapshot)).toBe(16_000_00);
    expect(session.deductionsSnapshot.guidedAnswers.home.ownedHome).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Charitable contribution discovery
  // -------------------------------------------------------------------------
  it("Scenario 3: Cash and non-cash charitable donations are recorded in guided answers", async () => {
    await initSession(USER_A_TOKEN, "Carol Donor", "single");
    await provideW2Income(USER_A_TOKEN, 75_000_00, 8_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "charity-cash",
              category: "charitable_cash",
              amountCents: 3_000_00,
              description: "Direct church donations",
              confirmed: true,
            },
            {
              id: "charity-noncash",
              category: "charitable_non_cash",
              amountCents: 500_00,
              description: "Goodwill clothing donation",
              confirmed: true,
            },
          ],
          guidedAnswers: {
            charity: {
              madeDonations: true,
              cashCents: 3_000_00,
              nonCashCents: 500_00,
            },
          },
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;
    expect(itemizedDeductionTotalCents(session.deductionsSnapshot)).toBe(3_500_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Medical expense discovery
  // -------------------------------------------------------------------------
  it("Scenario 4: High out-of-pocket medical expense discovery is captured in session", async () => {
    await initSession(USER_A_TOKEN, "Dan Medical", "single");
    await provideW2Income(USER_A_TOKEN, 50_000_00, 4_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "medical-dental-1",
              category: "medical_dental",
              amountCents: 8_000_00,
              description: "Surgery out-of-pocket",
              confirmed: true,
            },
          ],
          guidedAnswers: {
            medical: {
              hadSignificantMedical: true,
              medicalExpensesCents: 8_000_00,
            },
          },
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;
    expect(session.deductionsSnapshot.guidedAnswers.medical.medicalExpensesCents).toBe(8_000_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: State/local tax discovery (SALT)
  // -------------------------------------------------------------------------
  it("Scenario 5: State and local tax discovery is recorded in session entries", async () => {
    await initSession(USER_A_TOKEN, "Eva Salt", "single");
    await provideW2Income(USER_A_TOKEN, 90_000_00, 9_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "salt-tax-1",
              category: "state_local_taxes",
              amountCents: 6_500_00,
              description: "State income tax",
              confirmed: true,
            },
          ],
          guidedAnswers: {
            stateLocal: {
              paidStateLocalTaxes: true,
              stateLocalTaxCents: 6_500_00,
            },
          },
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;
    expect(itemizedDeductionTotalCents(session.deductionsSnapshot)).toBe(6_500_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Business expense discovery for 1099 freelancer
  // -------------------------------------------------------------------------
  it("Scenario 6: 1099 freelancer enters supplies and software to reduce SE profit", async () => {
    await initSession(USER_A_TOKEN, "Frank Freelancer", "single");
    await provide1099Income(USER_A_TOKEN, 40_000_00, 2_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "biz-supplies",
              category: "equipment_supplies",
              amountCents: 1_200_00,
              description: "Desk and monitor",
              confirmed: true,
              businessUsePercent: 100,
            },
            {
              id: "biz-software",
              category: "software_subscriptions",
              amountCents: 800_00,
              description: "Cloud IDE and hosting",
              confirmed: true,
              businessUsePercent: 100,
            },
          ],
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;
    expect(deductionExpenseCents(session.deductionsSnapshot)).toBe(2_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    // Net profit is $40,000 - $2,000 = $38,000
    expect(calc.selfEmploymentDetails.netSelfEmploymentProfitCents).toBe(38_000_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Mixed W-2 + 1099 deduction workflow
  // -------------------------------------------------------------------------
  it("Scenario 7: Mixed W-2 + 1099 session applies business expenses to 1099 and standard deduction to overall income", async () => {
    await initSession(USER_A_TOKEN, "Grace Mixed", "single");

    // Save combined income
    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          situations: ["employer", "freelance"],
          w2s: [
            {
              id: "w2-job",
              employerName: "Day Job Inc",
              wagesCents: 50_000_00,
              federalWithholdingCents: 5_000_00,
            },
          ],
          form1099s: [
            {
              id: "1099-gig",
              incomeType: "freelance",
              payerName: "Side Gig Corp",
              grossIncomeCents: 20_000_00,
              federalWithholdingCents: 1_000_00,
            },
          ],
          activities: [],
        },
      })
    );

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "biz-exp-1",
              category: "equipment_supplies",
              amountCents: 4_000_00,
              description: "Hardware & Tools",
              confirmed: true,
              businessUsePercent: 100,
            },
          ],
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    // SE profit is 20,000 - 4,000 = 16,000
    expect(calc.selfEmploymentDetails.netSelfEmploymentProfitCents).toBe(16_000_00);
    // Standard deduction is 15,750
    expect(calc.deductionUsedCents).toBe(15_750_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Gig worker expenses (phone/internet & mileage)
  // -------------------------------------------------------------------------
  it("Scenario 8: Gig worker records phone/internet business expense", async () => {
    await initSession(USER_A_TOKEN, "Harry Gig", "single");
    await provide1099Income(USER_A_TOKEN, 25_000_00, 1_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "biz-phone",
              category: "phone_internet",
              amountCents: 1_200_00,
              description: "Cell phone 50% business use",
              confirmed: true,
              businessUsePercent: 50,
            },
          ],
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;

    // 50% of $1,200 is $600
    expect(deductionExpenseCents(session.deductionsSnapshot)).toBe(600_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Multiple business expense categories
  // -------------------------------------------------------------------------
  it("Scenario 9: Multiple expense categories are aggregated correctly in integer cents", async () => {
    await initSession(USER_A_TOKEN, "Irene Business", "single");
    await provide1099Income(USER_A_TOKEN, 60_000_00, 4_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            { id: "e1", category: "equipment_supplies", amountCents: 1_000_00, confirmed: true },
            { id: "e2", category: "software_subscriptions", amountCents: 500_00, confirmed: true },
            { id: "e3", category: "advertising_marketing", amountCents: 750_00, confirmed: true },
            { id: "e4", category: "business_insurance", amountCents: 1_200_00, confirmed: true },
            { id: "e5", category: "other_expenses", amountCents: 350_00, confirmed: true },
          ],
        },
      })
    );
    expect(dedRes.status).toBe(200);
    const session = (await dedRes.json()).data;

    // 1000 + 500 + 750 + 1200 + 350 = 3800
    expect(deductionExpenseCents(session.deductionsSnapshot)).toBe(3_800_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Business-use percentage calculation
  // -------------------------------------------------------------------------
  it("Scenario 10: calculateEntryEffectiveAmountCents correctly calculates fractional business use", () => {
    const entry = {
      id: "test-pct",
      category: "phone_internet" as const,
      amountCents: 150_00, // $150.00
      description: "Home internet",
      relatedIncomeId: null,
      confirmed: true,
      businessUsePercent: 40, // 40%
    };

    // 40% of 150_00 = 60_00
    expect(calculateEntryEffectiveAmountCents(entry)).toBe(60_00);

    // 100% defaults
    expect(calculateEntryEffectiveAmountCents({ ...entry, businessUsePercent: undefined })).toBe(150_00);
    expect(calculateEntryEffectiveAmountCents({ ...entry, businessUsePercent: 100 })).toBe(150_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Negative amount rejection
  // -------------------------------------------------------------------------
  it("Scenario 11: Validation schema rejects negative amounts", () => {
    const invalidEntry = {
      id: "neg-amt",
      category: "equipment_supplies",
      amountCents: -500_00,
      description: "Invalid",
      confirmed: true,
    };
    const result = entrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Invalid percentage rejection
  // -------------------------------------------------------------------------
  it("Scenario 12: Validation schema rejects invalid percentages (0% or >100%)", () => {
    const invalidZeroPct = {
      id: "zero-pct",
      category: "phone_internet",
      amountCents: 100_00,
      description: "Zero pct",
      confirmed: true,
      businessUsePercent: 0,
    };
    expect(entrySchema.safeParse(invalidZeroPct).success).toBe(false);

    const invalidOver100Pct = {
      id: "over-100",
      category: "phone_internet",
      amountCents: 100_00,
      description: "Over 100",
      confirmed: true,
      businessUsePercent: 120,
    };
    expect(entrySchema.safeParse(invalidOver100Pct).success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Unsupported deduction handling (Future Extension)
  // -------------------------------------------------------------------------
  it("Scenario 13: Education and childcare expenses are captured with future_extension status without altering deterministic calculation", async () => {
    await initSession(USER_A_TOKEN, "Jack Future", "single");
    await provideW2Income(USER_A_TOKEN, 60_000_00, 6_000_00);

    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "future-student-loan",
              category: "education_expenses",
              amountCents: 2_500_00,
              description: "Student loan interest",
              confirmed: true,
              status: "future_extension",
            },
            {
              id: "future-childcare-exp",
              category: "childcare_expenses",
              amountCents: 6_000_00,
              description: "Daycare expenses",
              confirmed: true,
              status: "future_extension",
            },
          ],
          guidedAnswers: {
            education: { paidEducation: true, studentLoanInterestCents: 2_500_00 },
            childcare: { paidChildcare: true, childcareCents: 6_000_00 },
          },
        },
      })
    );
    expect(dedRes.status).toBe(200);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    // Standard deduction is preserved safely
    expect(calc.deductionType).toBe("standard");
    expect(calc.deductionUsedCents).toBe(15_750_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Session persistence
  // -------------------------------------------------------------------------
  it("Scenario 14: Guided deduction answers persist across session reloads", async () => {
    await initSession(USER_A_TOKEN, "Karen Persist", "single");
    await provideW2Income(USER_A_TOKEN, 60_000_00, 6_000_00);

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "mort-persist",
              category: "mortgage_interest",
              amountCents: 10_000_00,
              description: "Mortgage 1098",
              confirmed: true,
            },
          ],
          guidedAnswers: {
            home: { ownedHome: true, mortgageInterestCents: 10_000_00 },
          },
        },
      })
    );

    // Reload session from GET endpoint
    const getRes = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "GET",
        token: USER_A_TOKEN,
      })
    );
    const session = (await getRes.json()).data;

    expect(session.deductionsSnapshot.saved).toBe(true);
    expect(session.deductionsSnapshot.entries.length).toBe(1);
    expect(session.deductionsSnapshot.entries[0].amountCents).toBe(10_000_00);
    expect(session.deductionsSnapshot.guidedAnswers.home.ownedHome).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Session ownership / RLS isolation
  // -------------------------------------------------------------------------
  it("Scenario 15: User B cannot view or modify User A's deduction discovery answers", async () => {
    await initSession(USER_A_TOKEN, "User A", "single");
    await provide1099Income(USER_A_TOKEN, 50_000_00, 5_000_00);

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "secret-expense-a",
              category: "equipment_supplies",
              amountCents: 7_500_00,
              description: "Confidential Hardware",
              confirmed: true,
            },
          ],
        },
      })
    );

    // User B initializes their own session
    await initSession(USER_B_TOKEN, "User B", "single");
    const getResB = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "GET",
        token: USER_B_TOKEN,
      })
    );
    const sessionB = (await getResB.json()).data;

    // User B must have an empty deductions snapshot
    expect(sessionB.deductionsSnapshot.entries.length).toBe(0);
    expect(sessionB.deductionsSnapshot.saved).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Phase 1 Household + Credits compatibility
  // -------------------------------------------------------------------------
  it("Scenario 16: MFJ return with 2 qualifying children combines full CTC with guided business expenses", async () => {
    await initSession(USER_A_TOKEN, "Family Taxpayer", "married_filing_jointly");

    // Phase 1 Household
    const houseRes = await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "married_filing_jointly",
          spouse: {
            firstName: "Spouse",
            lastName: "Taxpayer",
            dateOfBirth: "1988-04-12",
          },
          dependents: [
            {
              id: "kid-1",
              firstName: "KidOne",
              lastName: "Taxpayer",
              dateOfBirth: "2018-05-01",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
            },
            {
              id: "kid-2",
              firstName: "KidTwo",
              lastName: "Taxpayer",
              dateOfBirth: "2020-09-15",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
            },
          ],
        },
      })
    );
    expect(houseRes.status).toBe(200);

    // Income
    await provide1099Income(USER_A_TOKEN, 90_000_00, 8_000_00);

    // Guided Deductions
    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "biz-tools",
              category: "equipment_supplies",
              amountCents: 5_000_00,
              confirmed: true,
            },
          ],
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    // Both CTC of $4,000 and business expenses of $5,000 are cleanly applied
    expect(calc.credits.childTaxCreditCents).toBe(400_000);
    expect(calc.selfEmploymentDetails.netSelfEmploymentProfitCents).toBe(85_000_00);
    expect(calc.deductionUsedCents).toBe(31_500_00); // 2025 MFJ standard deduction
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Standard deduction preservation
  // -------------------------------------------------------------------------
  it("Scenario 17: Standard deduction is strictly preserved for Single ($15,750) and MFJ ($31,500)", () => {
    const rules2025 = getTaxYearRules(2025);
    expect(rules2025.standardDeductions.single).toBe(15_750_00);
    expect(rules2025.standardDeductions.married_filing_jointly).toBe(31_500_00);
    expect(rules2025.standardDeductions.head_of_household).toBe(23_625_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Tax-year awareness (2024 vs 2025 vs 2026)
  // -------------------------------------------------------------------------
  it("Scenario 18: Tax-year rules provide distinct statutory standard deductions", () => {
    const rules2024 = getTaxYearRules(2024);
    const rules2025 = getTaxYearRules(2025);
    const rules2026 = getTaxYearRules(2026);

    expect(rules2024.standardDeductions.single).toBe(14_600_00);
    expect(rules2025.standardDeductions.single).toBe(15_750_00);
    expect(rules2026.standardDeductions.single).toBe(16_100_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 19: Tax Situation Summary correctness
  // -------------------------------------------------------------------------
  it("Scenario 19: Tax Situation Summary populates deductionsSummary structure accurately", async () => {
    await initSession(USER_A_TOKEN, "Summary User", "single");
    await provideW2Income(USER_A_TOKEN, 70_000_00, 7_000_00);

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "mort-sum",
              category: "mortgage_interest",
              amountCents: 8_000_00,
              description: "Mortgage interest",
              confirmed: true,
            },
          ],
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const data = (await calcRes.json()).data;
    const summary = data.situationSummary;

    expect(summary.deductionsSummary).toBeDefined();
    expect(summary.deductionsSummary.standardDeductionCents).toBe(15_750_00);
    expect(summary.deductionsSummary.discoveredItemizedCents).toBe(8_000_00);
    expect(summary.deductionsSummary.deductionTypeUsed).toBe("standard");
    expect(summary.informationReceived).toContain(
      "Discovered deductions: $8,000 (Standard deduction applied)"
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 20: Gemini deterministic reply explains deductions accurately
  // -------------------------------------------------------------------------
  it("Scenario 20: Deterministic AI assistant reply explains deductions without recalculating or inventing numbers", async () => {
    await initSession(USER_A_TOKEN, "AI User", "single");
    await provideW2Income(USER_A_TOKEN, 65_000_00, 7_000_00);

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: "charity-ai",
              category: "charitable_cash",
              amountCents: 2_500_00,
              description: "Charity",
              confirmed: true,
            },
          ],
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const session = (await calcRes.json()).data;

    const reply = buildPreparationSessionDeterministicReply(session, "Explain my deductions");
    expect(reply).toContain("Standard Deduction");
    expect(reply).toContain("$15,750.00");
    expect(reply).toContain("Discovered Deductions: $2,500.00");
  });
});
