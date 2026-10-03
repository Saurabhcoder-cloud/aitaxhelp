import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as startSession,
} from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import {
  GET as getFederalReturn,
  POST as postFederalReturn,
} from "../app/api/v1/tax/preparation/session/federal-return/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore, TaxPreparationSession } from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import {
  buildFederalReturn,
  evaluateFederalReturnReadiness,
  reconcileFederalReturnCalculations,
} from "../lib/preparation/federal-return";
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

const USER_A_TOKEN = "user-phase4-token-aaaa-1111-2222-333333333333";
const USER_B_TOKEN = "user-phase4-token-bbbb-4444-5555-666666666666";

describe("Phase 4: Federal Tax Return Preparation Foundation Test Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function initSession(token: string, fullName = "Jordan Taylor") {
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

  async function completeIncome(token: string, data: {
    situations?: string[];
    w2s?: Array<{ id: string; employerName: string; wagesCents: number; federalWithholdingCents: number }>;
    form1099s?: Array<{ id: string; payerName: string; incomeType: "1099-NEC" | "1099-MISC" | "1099-K"; grossIncomeCents: number; federalWithholdingCents: number }>;
    activities?: Array<{ id: string; kind: "rideshare" | "delivery" | "freelance_service" | "online_sales" | "other"; activityName: string; grossReceiptsCents: number; equipmentSuppliesCents: number; softwareSubscriptionsCents: number; homeOfficeVehicleCents: number; otherExpensesCents: number }>;
  }) {
    const situations = data.situations || (data.form1099s && data.form1099s.length > 0 ? ["freelance"] : ["employer"]);
    return saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations,
          w2s: data.w2s || [],
          form1099s: data.form1099s || [],
          activities: data.activities || [],
        },
      })
    );
  }

  async function completeDeductions(token: string, data: {
    hasBusinessExpenses?: boolean;
    entries?: any[];
    guidedAnswers?: any;
  } = {}) {
    return saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token,
        body: {
          hasBusinessExpenses: data.hasBusinessExpenses ?? false,
          standardDeductionAcknowledged: true,
          entries: data.entries || [],
          guidedAnswers: data.guidedAnswers || {},
        },
      })
    );
  }

  // ===========================================================================
  // SECTION A: Federal Return Mapping Across All Filing Statuses
  // ===========================================================================
  describe("Section A: Federal Return Filing Status Mapping", () => {
    it("A1: maps Single filing status correctly", async () => {
      const session = await initSession(USER_A_TOKEN, "Sam Single");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.filingStatus.status).toBe("single");
      expect(fedReturn.filingStatus.label).toBe("Single");
      expect(fedReturn.filingStatus.requiresSpouse).toBe(false);
      expect(fedReturn.filingStatus.requiresDependent).toBe(false);
      expect(fedReturn.taxpayer.fullName).toBe("Sam Single");
      expect(fedReturn.spouse.hasSpouse).toBe(false);
    });

    it("A2: maps Head of Household filing status correctly", async () => {
      const session = await initSession(USER_A_TOKEN, "Harper Parent");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "head_of_household",
            hasSpouse: false,
            dependents: [
              {
                firstName: "Leo",
                lastName: "Parent",
                dateOfBirth: "2015-05-10",
                relationship: "son",
                monthsLivedWithTaxpayer: 12,
              },
            ],
          },
        })
      );
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.filingStatus.status).toBe("head_of_household");
      expect(fedReturn.filingStatus.label).toBe("Head of Household");
      expect(fedReturn.filingStatus.requiresDependent).toBe(true);
      expect(fedReturn.dependents).toHaveLength(1);
    });

    it("A3: maps Married Filing Jointly with spouse details correctly", async () => {
      const session = await initSession(USER_A_TOKEN, "Chris Partner");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "married_filing_jointly",
            hasSpouse: true,
            spouse: {
              firstName: "Pat",
              lastName: "Partner",
              dateOfBirth: "1990-04-12",
              ssnLast4: "5678",
              hasW2Income: true,
            },
            dependents: [],
          },
        })
      );
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.filingStatus.status).toBe("married_filing_jointly");
      expect(fedReturn.filingStatus.label).toBe("Married Filing Jointly");
      expect(fedReturn.filingStatus.requiresSpouse).toBe(true);
      expect(fedReturn.spouse.hasSpouse).toBe(true);
      expect(fedReturn.spouse.fullName).toBe("Pat Partner");
      expect(fedReturn.spouse.ssnLast4).toBe("5678");
    });

    it("A4: maps Married Filing Separately correctly", async () => {
      const session = await initSession(USER_A_TOKEN, "Morgan Separate");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "married_filing_separately",
            hasSpouse: true,
            spouse: { firstName: "Robin", lastName: "Separate", dateOfBirth: "1988-08-08" },
            dependents: [],
          },
        })
      );
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.filingStatus.status).toBe("married_filing_separately");
      expect(fedReturn.filingStatus.label).toBe("Married Filing Separately");
      expect(fedReturn.filingStatus.requiresSpouse).toBe(true);
    });

    it("A5: maps Qualifying Surviving Spouse correctly", async () => {
      const session = await initSession(USER_A_TOKEN, "Casey Widow");
      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "qualifying_surviving_spouse",
            hasSpouse: false,
            dependents: [
              {
                firstName: "Jamie",
                lastName: "Widow",
                dateOfBirth: "2018-09-01",
                relationship: "daughter",
                monthsLivedWithTaxpayer: 12,
              },
            ],
          },
        })
      );
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.filingStatus.status).toBe("qualifying_surviving_spouse");
      expect(fedReturn.filingStatus.label).toBe("Qualifying Surviving Spouse");
      expect(fedReturn.filingStatus.requiresDependent).toBe(true);
    });
  });

  // ===========================================================================
  // SECTION B: Income Mapping
  // ===========================================================================
  describe("Section B: Income Mapping", () => {
    it("B1: aggregates single W-2, multiple W-2s, 1099, and gig activity accurately", async () => {
      const session = await initSession(USER_A_TOKEN, "Dana Earner");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "married_filing_jointly",
            hasSpouse: true,
            spouse: {
              firstName: "Riley",
              lastName: "Earner",
              dateOfBirth: "1992-05-10",
              ssnLast4: "1234",
              hasW2Income: true,
              w2WagesCents: 40_000_00,
              federalWithholdingCents: 4_000_00,
            },
            dependents: [],
          },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        situations: ["employer", "freelance", "gig"],
        w2s: [
          { id: "w2-1", employerName: "TechCorp", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 },
          { id: "w2-2", employerName: "PartTimeCo", wagesCents: 15_000_00, federalWithholdingCents: 1_200_00 },
        ],
        form1099s: [
          { id: "1099-1", payerName: "Client A", incomeType: "freelance", grossIncomeCents: 20_000_00, federalWithholdingCents: 2_000_00 },
        ],
        activities: [
          {
            id: "act-1",
            activityName: "Rideshare",
            kind: "gig",
            grossReceiptsCents: 8_000_00,
            equipmentSuppliesCents: 1_000_00,
            softwareSubscriptionsCents: 500_00,
            homeOfficeVehicleCents: 500_00,
            otherExpensesCents: 0,
          },
        ],
      });

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      // Taxpayer W2: 50,000 + 15,000 = 65,000
      expect(fedReturn.income.w2WagesCents).toBe(65_000_00);
      // Spouse W2: 40,000
      expect(fedReturn.income.spouseW2WagesCents).toBe(40_000_00);
      // 1099: 20,000
      expect(fedReturn.income.gross1099IncomeCents).toBe(20_000_00);
      // Gig: 8,000
      expect(fedReturn.income.gigBusinessGrossCents).toBe(8_000_00);
      // Total Gross: 65,000 + 40,000 + 20,000 + 8,000 = 133,000
      expect(fedReturn.income.totalGrossIncomeCents).toBe(133_000_00);

      expect(fedReturn.income.w2Records).toHaveLength(2);
      expect(fedReturn.income.form1099Records).toHaveLength(1);
      expect(fedReturn.income.activityRecords).toHaveLength(1);
    });
  });

  // ===========================================================================
  // SECTION C: Household & Dependent Mapping
  // ===========================================================================
  describe("Section C: Household & Dependent Mapping", () => {
    it("C1: correctly flags CTC, ODC, and CDCTC qualifications for dependents", async () => {
      const session = await initSession(USER_A_TOKEN, "Jordan Parent");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "head_of_household",
            hasSpouse: false,
            dependents: [
              {
                id: "dep-child",
                firstName: "Maya",
                lastName: "Parent",
                dateOfBirth: "2018-06-15",
                relationship: "daughter",
                monthsLivedWithTaxpayer: 12,
              },
              {
                id: "dep-adult",
                firstName: "Robert",
                lastName: "Parent",
                dateOfBirth: "1955-03-20",
                relationship: "parent",
                monthsLivedWithTaxpayer: 12,
              },
            ],
          },
        })
      );

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.dependents).toHaveLength(2);

      const child = fedReturn.dependents.find((d) => d.firstName === "Maya")!;
      expect(child.isQualifyingChildForCtc).toBe(true);
      expect(child.isQualifyingCarePerson).toBe(true);
      expect(child.isQualifyingOtherDependent).toBe(false);

      const adult = fedReturn.dependents.find((d) => d.firstName === "Robert")!;
      expect(adult.isQualifyingChildForCtc).toBe(false);
      expect(adult.isQualifyingOtherDependent).toBe(true);
    });
  });

  // ===========================================================================
  // SECTION D: Deductions Mapping
  // ===========================================================================
  describe("Section D: Deductions Mapping", () => {
    it("D1: maps standard deduction and compares against itemized deduction", async () => {
      const session = await initSession(USER_A_TOKEN, "Alex Taxpayer");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Company", wagesCents: 60_000_00, federalWithholdingCents: 6_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN, {
        hasBusinessExpenses: false,
        entries: [
          {
            id: "ded-charity",
            category: "charitable_cash",
            amountCents: 3_000_00,
            description: "Charity",
            confirmed: true,
            status: "applied_itemized",
          },
          {
            id: "ded-student",
            category: "education_expenses",
            amountCents: 1_500_00,
            description: "Student Loan",
            confirmed: true,
            status: "applied_above_the_line",
          },
        ],
        guidedAnswers: {
          charity: { madeDonations: true, cashCents: 3_000_00 },
          education: { paidEducation: true, studentLoanInterestCents: 1_500_00 },
        },
      });

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.deductions.deductionType).toBe("standard");
      expect(fedReturn.deductions.deductionUsedCents).toBe(fedReturn.deductions.standardDeductionCents);
      expect(fedReturn.adjustments.studentLoanInterestDeductionCents).toBe(1_500_00);
    });

    it("D2: elects Schedule A itemized deduction when itemized exceeds standard", async () => {
      const session = await initSession(USER_A_TOKEN, "Morgan Itemizer");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Company", wagesCents: 150_000_00, federalWithholdingCents: 20_000_00 }],
      });

      // Itemized deductions: 15,000 mortgage + 10,000 salt = 25,000 > 15,750 standard deduction
      await completeDeductions(USER_A_TOKEN, {
        hasBusinessExpenses: false,
        entries: [
          {
            id: "ded-mortgage",
            category: "mortgage_interest",
            amountCents: 15_000_00,
            description: "Mortgage",
            confirmed: true,
            status: "applied_itemized",
          },
          {
            id: "ded-salt",
            category: "state_local_taxes",
            amountCents: 10_000_00,
            description: "State taxes",
            confirmed: true,
            status: "applied_itemized",
          },
        ],
        guidedAnswers: {
          home: { ownedHome: true, mortgageInterestCents: 15_000_00 },
          stateLocal: { paidStateLocalTaxes: true, stateLocalTaxCents: 10_000_00 },
        },
      });

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.deductions.deductionType).toBe("itemized");
      expect(fedReturn.deductions.deductionUsedCents).toBeGreaterThan(fedReturn.deductions.standardDeductionCents);
      expect(fedReturn.deductions.itemizedBreakdown).toBeDefined();
    });
  });

  // ===========================================================================
  // SECTION E: Credit Mapping
  // ===========================================================================
  describe("Section E: Credit Mapping", () => {
    it("E1: maps CTC, ACTC, and ODC correctly in credits section", async () => {
      const session = await initSession(USER_A_TOKEN, "Taylor Family");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "head_of_household",
            hasSpouse: false,
            dependents: [
              {
                id: "child-1",
                firstName: "Emma",
                lastName: "Taylor",
                dateOfBirth: "2018-01-01",
                relationship: "daughter",
                monthsLivedWithTaxpayer: 12,
              },
              {
                id: "adult-1",
                firstName: "Grandma",
                lastName: "Taylor",
                dateOfBirth: "1948-01-01",
                relationship: "parent",
                monthsLivedWithTaxpayer: 12,
              },
            ],
          },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Work", wagesCents: 45_000_00, federalWithholdingCents: 3_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.credits.qualifyingChildrenCount).toBe(1);
      expect(fedReturn.credits.otherDependentsCount).toBe(1);
      expect(fedReturn.credits.totalCreditsCents).toBeGreaterThan(0);
      expect(fedReturn.credits.totalNonRefundableCreditsCents + fedReturn.credits.totalRefundableCreditsCents).toBe(
        fedReturn.credits.totalCreditsCents
      );
    });
  });

  // ===========================================================================
  // SECTION F: Taxes, Withholdings, and Refund/Balance Due Mapping
  // ===========================================================================
  describe("Section F: Taxes, Payments, and Balance Due Mapping", () => {
    it("F1: correctly determines refund position when withholdings exceed liability", async () => {
      const session = await initSession(USER_A_TOKEN, "Refund Receiver");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Work", wagesCents: 40_000_00, federalWithholdingCents: 8_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.payments.totalFederalWithholdingCents).toBe(8_000_00);
      expect(fedReturn.refundOrBalanceDue.type).toBe("refund");
      expect(fedReturn.refundOrBalanceDue.estimatedRefundCents).toBeGreaterThan(0);
      expect(fedReturn.refundOrBalanceDue.estimatedAmountOwedCents).toBe(0);
      expect(fedReturn.refundOrBalanceDue.amountCents).toBe(fedReturn.refundOrBalanceDue.estimatedRefundCents);
    });

    it("F2: correctly determines balance due position when liability exceeds withholdings", async () => {
      const session = await initSession(USER_A_TOKEN, "Balance Payer");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        form1099s: [{ id: "1099-1", payerName: "Client", incomeType: "freelance", grossIncomeCents: 50_000_00, federalWithholdingCents: 0 }],
      });

      await completeDeductions(USER_A_TOKEN, { hasBusinessExpenses: false });

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const fedReturn = buildFederalReturn(current);

      expect(fedReturn.taxes.selfEmploymentTaxCents).toBeGreaterThan(0);
      expect(fedReturn.refundOrBalanceDue.type).toBe("balance_due");
      expect(fedReturn.refundOrBalanceDue.estimatedAmountOwedCents).toBeGreaterThan(0);
      expect(fedReturn.refundOrBalanceDue.estimatedRefundCents).toBe(0);
      expect(fedReturn.refundOrBalanceDue.amountCents).toBe(fedReturn.refundOrBalanceDue.estimatedAmountOwedCents);
    });
  });

  // ===========================================================================
  // SECTION G: Federal Return Readiness Engine
  // ===========================================================================
  describe("Section G: Federal Return Readiness Engine", () => {
    it("G1: detects complete readiness when all requirements are satisfied", async () => {
      const session = await initSession(USER_A_TOKEN, "Complete Jordan");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const readiness = evaluateFederalReturnReadiness(current);

      expect(readiness.summaryBlockingItems).toHaveLength(0);
      expect(readiness.overallStatus).toBe("complete");
      expect(readiness.isReadyForReview).toBe(true);
    });

    it("G2: blocks readiness when spouse information is missing for joint return", async () => {
      const session = await initSession(USER_A_TOKEN, "Joint Incomplete");

      const sessionWithIncompleteSpouse: TaxPreparationSession = {
        ...session,
        profileSnapshot: { ...session.profileSnapshot, filingStatus: "married_filing_jointly" },
        householdSnapshot: {
          ...session.householdSnapshot,
          filingStatus: "married_filing_jointly",
          hasSpouse: true,
          spouse: undefined,
        },
      };

      const readiness = evaluateFederalReturnReadiness(sessionWithIncompleteSpouse);

      expect(readiness.isReadyForReview).toBe(false);
      expect(readiness.summaryBlockingItems.length).toBeGreaterThan(0);
      expect(readiness.summaryBlockingItems.some((b) => b.toLowerCase().includes("spouse"))).toBe(true);
    });

    it("G3: flags incomplete when calculation has not been executed", async () => {
      const session = await initSession(USER_A_TOKEN, "Uncalculated User");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      // Intentionally do NOT calculate
      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const readiness = evaluateFederalReturnReadiness(current);

      expect(readiness.isReadyForReview).toBe(false);
      expect(readiness.overallStatus).toBe("incomplete");
      expect(readiness.categories.calculation.status).toBe("incomplete");
      expect(readiness.summaryBlockingItems).toContain(
        "Deterministic tax engine calculation has not been executed yet."
      );
    });
  });

  // ===========================================================================
  // SECTION H: Federal Return Reconciliation Engine
  // ===========================================================================
  describe("Section H: Federal Return Reconciliation Engine", () => {
    it("H1: confirms all 6 mathematical checks pass on calculated session", async () => {
      const session = await initSession(USER_A_TOKEN, "Reconciled Taxpayer");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 75_000_00, federalWithholdingCents: 9_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const reconciliation = reconcileFederalReturnCalculations(current);

      expect(reconciliation.isReconciled).toBe(true);
      expect(reconciliation.checks).toHaveLength(6);
      expect(reconciliation.checks.every((c) => c.passed)).toBe(true);
      expect(reconciliation.mismatches).toHaveLength(0);
    });

    it("H2: detects mathematical discrepancy when numbers are corrupted", async () => {
      const session = await initSession(USER_A_TOKEN, "Tampered Session");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      // Artificially corrupt gross income in calculation snapshot
      const tamperedSession = {
        ...current,
        calculationSnapshot: {
          ...current.calculationSnapshot!,
          grossIncomeCents: 999_999_00, // Deliberate mismatch
        },
      };

      const reconciliation = reconcileFederalReturnCalculations(tamperedSession);

      expect(reconciliation.isReconciled).toBe(false);
      expect(reconciliation.mismatches.length).toBeGreaterThan(0);
      const grossIncomeCheck = reconciliation.checks.find((c) => c.id === "check_gross_income")!;
      expect(grossIncomeCheck.passed).toBe(false);
    });
  });

  // ===========================================================================
  // SECTION I: Session Persistence & Backward Compatibility
  // ===========================================================================
  describe("Section I: Session Persistence & Backward Compatibility", () => {
    it("I1: persists and reloads session cleanly without schema mutation", async () => {
      const session = await initSession(USER_A_TOKEN, "Persistent User");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      const loaded = await TaxPreparationSessionStore.getCurrent(session.userId);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(session.id);

      // Verify buildFederalReturn derives accurately from reloaded session
      const fedReturn = buildFederalReturn(loaded!);
      expect(fedReturn.taxpayer.fullName).toBe("Persistent User");
      expect(fedReturn.filingStatus.status).toBe("single");
    });
  });

  // ===========================================================================
  // SECTION J: Federal Return API Route & Security
  // ===========================================================================
  describe("Section J: Federal Return API Route & Security", () => {
    it("J1: GET /api/v1/tax/preparation/session/federal-return returns 200 with structured return", async () => {
      const session = await initSession(USER_A_TOKEN, "API User");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      const res = await getFederalReturn(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return", {
          method: "GET",
          token: USER_A_TOKEN,
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.taxpayer.fullName).toBe("API User");
      expect(json.data.filingStatus.status).toBe("single");
      expect(json.data.readiness).toBeDefined();
      expect(json.data.reconciliation).toBeDefined();
    });

    it("J2: POST alias returns identical structured return", async () => {
      await initSession(USER_A_TOKEN, "POST User");

      const res = await postFederalReturn(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.taxpayer.fullName).toBe("POST User");
    });

    it("J3: rejects unauthenticated requests with 401", async () => {
      const res = await getFederalReturn(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return", {
          method: "GET",
          // No token
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("J4: enforces strict user ownership isolation", async () => {
      // User A creates session
      await initSession(USER_A_TOKEN, "User A");

      // User B has no session yet
      const res = await getFederalReturn(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return", {
          method: "GET",
          token: USER_B_TOKEN,
        })
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ===========================================================================
  // SECTION K: AI Explanation Boundary (Explanation-Only)
  // ===========================================================================
  describe("Section K: AI Explanation Boundary", () => {
    it("K1: provides deterministic readiness explanation without recalculating", async () => {
      const session = await initSession(USER_A_TOKEN, "AI User");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const reply = buildPreparationSessionDeterministicReply(current, "Is my return ready?");

      expect(reply).toContain("Federal Return Readiness Status");
      expect(reply).toContain("Incomplete — Action Needed");
      expect(reply).toContain("Blocking Items");
    });

    it("K2: provides deterministic reconciliation explanation", async () => {
      const session = await initSession(USER_A_TOKEN, "AI Recon");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 50_000_00, federalWithholdingCents: 5_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const reply = buildPreparationSessionDeterministicReply(current, "Are my calculations reconciled?");

      expect(reply).toContain("Federal Return Calculation Reconciliation");
      expect(reply).toContain("All 6 Mathematical Checks Passed");
    });

    it("K3: provides deterministic Form 1040 line-by-line summary", async () => {
      const session = await initSession(USER_A_TOKEN, "Form 1040 User");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { filingStatus: "single", hasSpouse: false, dependents: [] },
        })
      );

      await completeIncome(USER_A_TOKEN, {
        w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 60_000_00, federalWithholdingCents: 6_000_00 }],
      });

      await completeDeductions(USER_A_TOKEN);

      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);

      const current = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const reply = buildPreparationSessionDeterministicReply(current, "Explain my 1040 summary");

      expect(reply).toContain("Form 1040 Federal Return Summary");
      expect(reply).toContain("Line 1z (W-2 Wages)");
      expect(reply).toContain("Line 9 (Total Gross Income)");
      expect(reply).toContain("Line 11 (Adjusted Gross Income - AGI)");
      expect(reply).toContain("Line 15 (Taxable Income)");
    });
  });
});
