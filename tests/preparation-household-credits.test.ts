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
import {
  calculateCredits,
  isQualifyingChildForCtc,
  isQualifyingOtherDependent,
  calculateAgeAtTaxYearEnd,
  countEitcQualifyingChildren,
} from "../tax-engine/calculations/credits";
import { getTaxYearRules } from "../tax-engine/rules";
import { buildPreparationSessionDeterministicReply } from "../lib/ai/gemini/service";
import { assessCalculationReadiness } from "../lib/preparation/situation-summary";
import { HouseholdSnapshot } from "../lib/preparation/household";
import { executePreparationCalculation } from "../lib/preparation/calculation";

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

const USER_A_TOKEN = "user-a-12345678-aaaa-bbbb-cccc-dddddddddddd";
const USER_B_TOKEN = "user-b-87654321-zzzz-yyyy-xxxx-wwwwwwwwwwww";

describe("Phase 1: Family, Household, Dependents & Tax Credits Test Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  // Helper to initialize session
  async function initSession(token: string, fullName = "John Doe", filingStatus = "single") {
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

  // Helper to save basic W-2 income & deductions
  async function provideBasicIncome(token: string, wagesCents = 60_000_00, withholdingCents = 7_000_00) {
    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-primary-1",
              employerName: "Acme Corp",
              wagesCents,
              federalWithholdingCents: withholdingCents,
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
        },
      })
    );
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Single without dependents
  // -------------------------------------------------------------------------
  it("Scenario 1: Single without dependents calculates standard deduction and zero credits", async () => {
    await initSession(USER_A_TOKEN, "Alice Single", "single");
    await provideBasicIncome(USER_A_TOKEN, 50_000_00, 5_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const json = await calcRes.json();
    expect(calcRes.status).toBe(200);
    const data = json.data;
    const calc = data.calculationSnapshot;

    expect(calc.filingStatus).toBe("single");
    expect(calc.deductionUsedCents).toBe(15_750_00); // 2025 statutory standard deduction
    expect(calc.taxableIncomeCents).toBe(34_250_00);
    expect(calc.credits.totalCreditsCents).toBe(0);
    expect(calc.totalTaxLiabilityCents).toBe(calc.federalIncomeTaxCents);
    expect(data.situationSummary.householdSummary.dependentsCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Single with qualifying child (CTC)
  // -------------------------------------------------------------------------
  it("Scenario 2: Single with 1 qualifying child receives $2,000 Child Tax Credit", async () => {
    await initSession(USER_A_TOKEN, "Alice Single Parent", "single");

    // Add 1 qualifying child (born in 2018 -> age 7 in 2025)
    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "single",
          dependents: [
            {
              id: "dep-1",
              firstName: "Timmy",
              lastName: "Single",
              dateOfBirth: "2018-05-15",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
              providedMoreThanHalfSupport: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 60_000_00, 6_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.credits.childTaxCreditCents).toBe(200_000); // $2,000.00
    expect(calc.credits.qualifyingChildrenCount).toBe(1);
    expect(calc.totalTaxLiabilityCents).toBe(calc.taxBeforeCreditsCents - 200_000);
    expect(data.situationSummary.householdSummary.qualifyingChildrenCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: HOH with qualifying child
  // -------------------------------------------------------------------------
  it("Scenario 3: Head of Household with qualifying child uses HOH standard deduction and CTC", async () => {
    await initSession(USER_A_TOKEN, "Hannah HeadOfHousehold", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "head_of_household",
          dependents: [
            {
              id: "dep-hoh-1",
              firstName: "Emily",
              lastName: "HOH",
              dateOfBirth: "2015-08-20",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
              providedMoreThanHalfSupport: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 75_000_00, 8_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.filingStatus).toBe("head_of_household");
    expect(calc.deductionUsedCents).toBe(23_625_00); // 2025 statutory HOH standard deduction
    expect(calc.taxableIncomeCents).toBe(51_375_00);
    expect(calc.credits.childTaxCreditCents).toBe(200_000);
    expect(calc.totalTaxLiabilityCents).toBe(calc.taxBeforeCreditsCents - 200_000);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: MFJ without dependents
  // -------------------------------------------------------------------------
  it("Scenario 4: MFJ without dependents uses MFJ standard deduction ($30,000 for 2025)", async () => {
    await initSession(USER_A_TOKEN, "John & Mary Married", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "married_filing_jointly",
          spouse: {
            firstName: "Mary",
            lastName: "Married",
            dateOfBirth: "1990-04-12",
            hasW2Income: false,
          },
          dependents: [],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 100_000_00, 10_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.filingStatus).toBe("married_filing_jointly");
    expect(calc.deductionUsedCents).toBe(31_500_00); // 2025 statutory MFJ standard deduction
    expect(calc.taxableIncomeCents).toBe(68_500_00);
    expect(calc.credits.totalCreditsCents).toBe(0);
    expect(data.situationSummary.householdSummary.hasSpouse).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: MFJ with dependents (2 qualifying children -> $4,000 CTC)
  // -------------------------------------------------------------------------
  it("Scenario 5: MFJ with 2 qualifying children receives $4,000 Child Tax Credit", async () => {
    await initSession(USER_A_TOKEN, "John & Mary Joint", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "married_filing_jointly",
          spouse: {
            firstName: "Mary",
            lastName: "Joint",
            dateOfBirth: "1991-03-22",
          },
          dependents: [
            {
              id: "dep-mfj-1",
              firstName: "Billy",
              lastName: "Joint",
              dateOfBirth: "2016-01-10",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
              providedMoreThanHalfSupport: true,
            },
            {
              id: "dep-mfj-2",
              firstName: "Sally",
              lastName: "Joint",
              dateOfBirth: "2019-11-05",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
              providedMoreThanHalfSupport: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 120_000_00, 12_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.credits.childTaxCreditCents).toBe(400_000); // $4,000
    expect(calc.credits.qualifyingChildrenCount).toBe(2);
    expect(calc.totalTaxLiabilityCents).toBe(calc.taxBeforeCreditsCents - 400_000);
  });

  // -------------------------------------------------------------------------
  // Scenario 6: MFS (Married Filing Separately)
  // -------------------------------------------------------------------------
  it("Scenario 6: MFS applies single bracket structure and disallows EITC per IRC § 32", async () => {
    await initSession(USER_A_TOKEN, "Mark Separately", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "married_filing_separately",
          spouse: {
            firstName: "Sarah",
            lastName: "Separately",
            dateOfBirth: "1992-06-15",
          },
          dependents: [],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 50_000_00, 5_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.filingStatus).toBe("married_filing_separately");
    expect(calc.deductionUsedCents).toBe(15_750_00); // 2025 statutory MFS standard deduction ($15,750)
    expect(calc.credits.earnedIncomeCreditCents).toBe(0); // Statutory disallowance for MFS
  });

  // -------------------------------------------------------------------------
  // Scenario 7: QSS (Qualifying Surviving Spouse)
  // -------------------------------------------------------------------------
  it("Scenario 7: Qualifying Surviving Spouse receives joint standard deduction and rules", async () => {
    await initSession(USER_A_TOKEN, "Susan Surviving", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "qualifying_surviving_spouse",
          dependents: [
            {
              id: "dep-qss-1",
              firstName: "Lucas",
              lastName: "Surviving",
              dateOfBirth: "2017-09-12",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
              providedMoreThanHalfSupport: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 80_000_00, 8_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(calcRes.status).toBe(200);
    const data = (await calcRes.json()).data;
    const calc = data.calculationSnapshot;

    expect(calc.filingStatus).toBe("qualifying_surviving_spouse");
    expect(calc.deductionUsedCents).toBe(31_500_00); // QSS receives statutory joint standard deduction ($31,500)
    expect(calc.credits.childTaxCreditCents).toBe(200_000);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Multiple dependents (1 under 17 + 1 adult student)
  // -------------------------------------------------------------------------
  it("Scenario 8: Multiple dependents calculates both CTC ($2,000) and ODC ($500)", async () => {
    const rules = getTaxYearRules(2025);
    const credits = calculateCredits(
      {
        taxYear: 2025,
        filingStatus: "single",
        agiCents: 70_000_00,
        earnedIncomeCents: 70_000_00,
        taxBeforeCreditsCents: 6_000_00,
        dependents: [
          {
            id: "dep-child",
            firstName: "Child",
            lastName: "Test",
            dateOfBirth: "2018-01-01", // Age 7 (< 17)
            relationship: "son",
            monthsLivedWithTaxpayer: 12,
            isQualifyingChild: true,
          },
          {
            id: "dep-student",
            firstName: "Student",
            lastName: "Test",
            dateOfBirth: "2004-01-01", // Age 21 (>= 17, student)
            relationship: "daughter",
            monthsLivedWithTaxpayer: 12,
            isFullTimeStudent: true,
            isQualifyingChild: false,
          },
        ],
      },
      rules
    );

    expect(credits.childTaxCreditCents).toBe(200_000); // $2,000
    expect(credits.creditForOtherDependentsCents).toBe(50_000); // $500
    expect(credits.totalCreditsCents).toBe(250_000); // $2,500 total
    expect(credits.qualifyingChildrenCount).toBe(1);
    expect(credits.otherDependentsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Child Tax Credit Phaseout at high income
  // -------------------------------------------------------------------------
  it("Scenario 9: Child Tax Credit phases out above statutory threshold ($200k Single / $400k MFJ)", () => {
    const rules = getTaxYearRules(2025);

    // Single taxpayer with $210,000 AGI ($10,000 over $200,000 phaseout)
    // Phaseout rate: $50 per $1,000 -> 10 x $50 = $500 phaseout. $2,000 - $500 = $1,500.
    const creditsPhased = calculateCredits(
      {
        taxYear: 2025,
        filingStatus: "single",
        agiCents: 210_000_00,
        earnedIncomeCents: 210_000_00,
        taxBeforeCreditsCents: 35_000_00,
        dependents: [
          {
            id: "dep-high-income",
            firstName: "Junior",
            lastName: "Wealth",
            dateOfBirth: "2018-01-01",
            relationship: "son",
            isQualifyingChild: true,
          },
        ],
      },
      rules
    );

    expect(creditsPhased.childTaxCreditCents).toBe(150_000); // $1,500
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Credit for Other Dependents (ODC) for aging parent
  // -------------------------------------------------------------------------
  it("Scenario 10: Credit for Other Dependents provides $500 non-refundable credit for parent", () => {
    const rules = getTaxYearRules(2025);
    const credits = calculateCredits(
      {
        taxYear: 2025,
        filingStatus: "single",
        agiCents: 60_000_00,
        earnedIncomeCents: 60_000_00,
        taxBeforeCreditsCents: 5_000_00,
        dependents: [
          {
            id: "dep-parent",
            firstName: "Grandma",
            lastName: "Elder",
            dateOfBirth: "1955-03-10",
            relationship: "parent",
            providedMoreThanHalfSupport: true,
            isQualifyingChild: false,
          },
        ],
      },
      rules
    );

    expect(credits.childTaxCreditCents).toBe(0);
    expect(credits.creditForOtherDependentsCents).toBe(50_000); // $500
    expect(credits.totalCreditsCents).toBe(50_000);
  });

  // -------------------------------------------------------------------------
  // Scenario 11: EITC applicable scenario with qualifying child
  // -------------------------------------------------------------------------
  it("Scenario 11: Earned Income Tax Credit calculates statutory credit for lower-income worker", () => {
    const rules = getTaxYearRules(2025);
    // Single with 1 child, $20,000 earned income
    const credits = calculateCredits(
      {
        taxYear: 2025,
        filingStatus: "single",
        agiCents: 20_000_00,
        earnedIncomeCents: 20_000_00,
        taxBeforeCreditsCents: 500_00,
        dependents: [
          {
            id: "dep-eitc-child",
            firstName: "Baby",
            lastName: "Worker",
            dateOfBirth: "2020-04-01",
            relationship: "son",
            monthsLivedWithTaxpayer: 12,
            isQualifyingChild: true,
          },
        ],
      },
      rules
    );

    expect(credits.earnedIncomeCreditCents).toBeGreaterThan(0);
    expect(credits.earnedIncomeCreditCents).toBeLessThanOrEqual(rules.credits!.eitc!.tiers[1].maxCreditCents);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Combined calculation: W-2 + MFJ + Dependents
  // -------------------------------------------------------------------------
  it("Scenario 12: Combined calculation offsets federal tax before credits down to final liability", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      w2WagesCents: 80_000_00,
      otherIncomeCents: 0,
      federalWithholdingCents: 7_000_00,
      itemizedDeductionCents: 0,
      dependents: [
        {
          id: "dep-1",
          firstName: "Child1",
          lastName: "Test",
          dateOfBirth: "2018-01-01",
          relationship: "son",
          isQualifyingChild: true,
        },
      ],
    });

    expect(result.taxBeforeCreditsCents).toBeGreaterThan(0);
    expect(result.credits!.childTaxCreditCents).toBe(200_000);
    expect(result.totalTaxLiabilityCents).toBe(result.taxBeforeCreditsCents! - 200_000);
    expect(result.estimatedRefundCents).toBe(result.totalPaymentsAndWithholdingCents - result.totalTaxLiabilityCents);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: W-2 + 1099 + Spouse W-2 combined return
  // -------------------------------------------------------------------------
  it("Scenario 13: Combined primary 1099 + primary W-2 + spouse W-2 handles joint return", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      gross1099IncomeCents: 30_000_00,
      businessExpensesCents: 5_000_00,
      w2WagesCents: 40_000_00, // Primary W-2
      federalWithholdingCents: 9_000_00, // Combined withholding
      spouse: {
        firstName: "Spouse",
        lastName: "Worker",
        dateOfBirth: "1990-05-15",
        hasW2Income: true,
        w2WagesCents: 35_000_00, // Spouse W-2
        federalWithholdingCents: 3_500_00,
      },
      dependents: [
        {
          id: "dep-s13",
          firstName: "Kid",
          lastName: "Worker",
          dateOfBirth: "2019-02-10",
          relationship: "son",
          isQualifyingChild: true,
        },
      ],
    });

    // Total income = 40k (primary W2) + 35k (spouse W2) + 25k (net 1099) = 100k
    expect(result.grossIncomeCents).toBe(100_000_00);
    expect(result.credits!.childTaxCreditCents).toBe(200_000);
    expect(result.selfEmploymentTaxCents).toBeGreaterThan(0);
    expect(result.totalPaymentsAndWithholdingCents).toBe(9_000_00);
  });

  // -------------------------------------------------------------------------
  // Scenario 14: W-2 + Spouse 1099/self-employment (Separate Schedule SE)
  // -------------------------------------------------------------------------
  it("Scenario 14: Spouse self-employment tax is computed on spouse net profit with separate SE cap", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      gross1099IncomeCents: 0,
      businessExpensesCents: 0,
      w2WagesCents: 60_000_00, // Primary W-2
      federalWithholdingCents: 8_000_00,
      spouse: {
        firstName: "Freelance",
        lastName: "Spouse",
        dateOfBirth: "1988-08-08",
        hasSelfEmploymentIncome: true,
        gross1099IncomeCents: 40_000_00,
        businessExpensesCents: 10_000_00, // Net profit $30,000
      },
    });

    expect(result.selfEmploymentTaxCents).toBeGreaterThan(0);
    expect(result.grossIncomeCents).toBe(90_000_00); // 60k W2 + 30k Net SE
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Missing dependent information validation
  // -------------------------------------------------------------------------
  it("Scenario 15: Missing dependent name or date of birth triggers validation error", () => {
    const readiness = assessCalculationReadiness({
      profile: {
        fullName: "Test User",
        filingStatus: "single",
        taxYear: 2025,
        hasW2Income: true,
        has1099Income: false,
        hasBusinessExpenses: false,
        profileReused: false,
      },
      steps: {
        taxpayer_profile: "current",
        income: "completed",
        documents: "completed",
        deductions: "completed",
        calculation: "not_started",
        review: "not_started",
      },
      household: {
        filingStatus: "single",
        dependents: [
          {
            id: "dep-invalid",
            firstName: "", // Missing name
            lastName: "",
            dateOfBirth: "", // Missing DOB
            relationship: "son",
            monthsLivedWithTaxpayer: 12,
          },
        ],
      },
      income: {
        situations: ["employer"],
        w2s: [{ id: "w2-1", employerName: "Acme", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
        form1099s: [],
        activities: [],
      },
      documents: { documents: [] },
      deductions: { saved: true, hasBusinessExpenses: false, standardDeductionAcknowledged: true, entries: [] },
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.errors.some((e) => e.includes("missing their name"))).toBe(true);
    expect(readiness.errors.some((e) => e.includes("missing a valid date of birth"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Invalid dependent data (future DOB and duplicates)
  // -------------------------------------------------------------------------
  it("Scenario 16: Future date of birth and duplicate dependents are blocked deterministically", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const futureDob = futureDate.toISOString().split("T")[0];

    const readiness = assessCalculationReadiness({
      profile: {
        fullName: "Test User",
        filingStatus: "single",
        taxYear: 2025,
        hasW2Income: true,
        has1099Income: false,
        hasBusinessExpenses: false,
        profileReused: false,
      },
      steps: {
        taxpayer_profile: "completed",
        income: "completed",
        documents: "completed",
        deductions: "completed",
        calculation: "not_started",
        review: "not_started",
      },
      household: {
        filingStatus: "single",
        dependents: [
          {
            id: "dep-dup-1",
            firstName: "Clone",
            lastName: "Child",
            dateOfBirth: futureDob,
            relationship: "son",
            monthsLivedWithTaxpayer: 12,
          },
          {
            id: "dep-dup-2",
            firstName: "Clone",
            lastName: "Child",
            dateOfBirth: futureDob,
            relationship: "son",
            monthsLivedWithTaxpayer: 12,
          },
        ],
      },
      income: {
        situations: ["employer"],
        w2s: [{ id: "w2-1", employerName: "Acme", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
        form1099s: [],
        activities: [],
      },
      documents: { documents: [] },
      deductions: { saved: true, hasBusinessExpenses: false, standardDeductionAcknowledged: true, entries: [] },
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.errors.some((e) => e.includes("cannot be in the future"))).toBe(true);
    expect(readiness.errors.some((e) => e.includes("Duplicate dependent detected"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Calculation readiness blocks HOH without dependent
  // -------------------------------------------------------------------------
  it("Scenario 17: Head of Household without any qualifying dependents is marked not ready", () => {
    const readiness = assessCalculationReadiness({
      profile: {
        fullName: "Test User",
        filingStatus: "head_of_household",
        taxYear: 2025,
        hasW2Income: true,
        has1099Income: false,
        hasBusinessExpenses: false,
        profileReused: false,
      },
      steps: {
        taxpayer_profile: "completed",
        income: "completed",
        documents: "completed",
        deductions: "completed",
        calculation: "not_started",
        review: "not_started",
      },
      household: {
        filingStatus: "head_of_household",
        dependents: [], // No dependents!
      },
      income: {
        situations: ["employer"],
        w2s: [{ id: "w2-1", employerName: "Acme", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
        form1099s: [],
        activities: [],
      },
      documents: { documents: [] },
      deductions: { saved: true, hasBusinessExpenses: false, standardDeductionAcknowledged: true, entries: [] },
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.errors.some((e) => e.includes("Head of Household requires at least one qualifying dependent"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Tax Situation Summary accurately reflects household and credits
  // -------------------------------------------------------------------------
  it("Scenario 18: Tax Situation Summary populates structured household and credits summaries", async () => {
    await initSession(USER_A_TOKEN, "Summary Test", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "single",
          dependents: [
            {
              id: "dep-sum-1",
              firstName: "Leo",
              lastName: "Summary",
              dateOfBirth: "2020-03-15",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 70_000_00, 7_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const data = (await calcRes.json()).data;
    const summary = data.situationSummary;

    expect(summary.householdSummary).toBeDefined();
    expect(summary.householdSummary.filingStatus).toBe("single");
    expect(summary.householdSummary.dependentsCount).toBe(1);
    expect(summary.householdSummary.qualifyingChildrenCount).toBe(1);

    expect(summary.creditsSummary).toBeDefined();
    expect(summary.creditsSummary.childTaxCreditCents).toBe(200_000);
    expect(summary.creditsSummary.totalCreditsCents).toBe(200_000);
    expect(summary.creditsSummary.finalFederalTaxLiabilityCents).toBe(
      summary.creditsSummary.taxBeforeCreditsCents - 200_000
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 19: AI receives verified credits but does NOT calculate them
  // -------------------------------------------------------------------------
  it("Scenario 19: Deterministic reply explains verified credits without recalculating or guessing", async () => {
    await initSession(USER_A_TOKEN, "AI Verification User", "single");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "single",
          dependents: [
            {
              id: "dep-ai-1",
              firstName: "Maya",
              lastName: "Verification",
              dateOfBirth: "2019-07-04",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
            },
          ],
        },
      })
    );

    await provideBasicIncome(USER_A_TOKEN, 65_000_00, 7_000_00);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const session = (await calcRes.json()).data;

    // Ask AI about credits
    const reply = buildPreparationSessionDeterministicReply(session, "Explain my family credits");
    expect(reply).toContain("Verified Family & Tax Credits");
    expect(reply).toContain("Child Tax Credit (CTC): $2,000.00");
    expect(reply).toContain("Total Family Credits Applied: $2,000.00");

    // Ask AI checklist
    const checklist = buildPreparationSessionDeterministicReply(session, "What should I review before submitting?");
    expect(checklist).toContain("Taxpayer & Household Profile");
    expect(checklist).toContain("Family Credits");
  });

  // -------------------------------------------------------------------------
  // Scenario 20: RLS / User Isolation
  // -------------------------------------------------------------------------
  it("Scenario 20: User isolation ensures User B cannot see or overwrite User A's household data", async () => {
    // 1. User A creates session with dependent
    await initSession(USER_A_TOKEN, "User Alpha", "single");
    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          filingStatus: "single",
          dependents: [
            {
              id: "dep-user-a",
              firstName: "AlphaChild",
              lastName: "Alpha",
              dateOfBirth: "2017-01-01",
              relationship: "son",
              monthsLivedWithTaxpayer: 12,
              isQualifyingChild: true,
            },
          ],
        },
      })
    );

    // 2. User B creates independent session
    await initSession(USER_B_TOKEN, "User Beta", "single");

    // 3. User B gets their session - must NOT see User A's dependent
    const getResB = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "GET",
        token: USER_B_TOKEN,
      })
    );
    const dataB = (await getResB.json()).data;
    expect(dataB.householdSnapshot.dependents.length).toBe(0);

    // 4. User A gets their session - must still have their dependent
    const getResA = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "GET",
        token: USER_A_TOKEN,
      })
    );
    const dataA = (await getResA.json()).data;
    expect(dataA.householdSnapshot.dependents.length).toBe(1);
    expect(dataA.householdSnapshot.dependents[0].firstName).toBe("AlphaChild");
  });
});
