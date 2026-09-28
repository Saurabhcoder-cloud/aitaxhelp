import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GET as getSession,
  PATCH as patchSession,
  POST as startSession,
} from "../app/api/v1/tax/preparation/session/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { PREPARATION_CALCULATORS } from "../lib/preparation/calculators";
import { completeCurrentStep, emptyStepMap } from "../lib/preparation/steps";

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
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Tax preparation session", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    UserProfileStore.clear();
  });

  it("requires authentication to start, read, or update a session", async () => {
    const start = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { method: "POST", body: {} })
    );
    const current = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session")
    );
    const update = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        body: { completeStep: "taxpayer_profile" },
      })
    );

    expect(start.status).toBe(401);
    expect(current.status).toBe(401);
    expect(update.status).toBe(401);
  });

  it("creates a draft session for the authenticated user and rejects a client userId", async () => {
    const res = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-a",
        body: { userId: "someone-else" },
      })
    );
    expect(res.status).toBe(422);

    const created = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-a",
        body: {},
      })
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.data.userId).toBe("prep-user-a");
    expect(body.data.status).toBe("draft");
    expect(body.data.currentStep).toBe("taxpayer_profile");
    expect(body.data.steps.taxpayer_profile).toBe("current");
    expect(body.data.taxProfileId).toBeTruthy();
    expect(body.data.title).toContain(String(body.data.taxYear));
  });

  it("resumes the same open session instead of creating a duplicate", async () => {
    const first = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-resume",
        body: {},
      })
    );
    const firstBody = await first.json();

    const second = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-resume",
        body: {},
      })
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.data.id).toBe(firstBody.data.id);

    const current = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        token: "prep-user-resume",
      })
    );
    const currentBody = await current.json();
    expect(currentBody.data.id).toBe(firstBody.data.id);
  });

  it("does not expose another user's session", async () => {
    await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-owner",
        body: {},
      })
    );

    const other = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        token: "prep-user-other",
      })
    );
    const otherBody = await other.json();
    expect(other.status).toBe(200);
    expect(otherBody.data).toBeNull();

    const otherPatch = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "prep-user-other",
        body: { completeStep: "taxpayer_profile" },
      })
    );
    expect(otherPatch.status).toBe(404);
  });

  it("advances only the current step and derives lifecycle status", async () => {
    await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-progress",
        body: {},
      })
    );

    const skipped = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "prep-user-progress",
        body: { completeStep: "income" },
      })
    );
    expect(skipped.status).toBe(409);

    const profileStep = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "prep-user-progress",
        body: { completeStep: "taxpayer_profile" },
      })
    );
    expect(profileStep.status).toBe(200);
    const progressed = await profileStep.json();
    expect(progressed.data.currentStep).toBe("income");
    expect(progressed.data.steps.taxpayer_profile).toBe("completed");
    expect(progressed.data.status).toBe("in_progress");
  });

  it("reuses an existing taxpayer profile instead of starting at a blank profile step", async () => {
    const profile = await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token: "prep-user-known",
        body: {
          profile: { fullName: "Ada Taxpayer" },
          taxProfile: {
            defaultTaxYear: 2025,
            filingStatus: "head_of_household",
            hasW2Income: true,
            has1099Income: true,
            hasBusinessExpenses: false,
          },
        },
      })
    );
    expect(profile.status).toBe(200);

    const started = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: "prep-user-known",
        body: {},
      })
    );
    const body = await started.json();
    expect(body.data.status).toBe("in_progress");
    expect(body.data.currentStep).toBe("income");
    expect(body.data.steps.taxpayer_profile).toBe("completed");
    expect(body.data.profileSnapshot.fullName).toBe("Ada Taxpayer");
    expect(body.data.profileSnapshot.filingStatus).toBe("head_of_household");
    expect(body.data.profileSnapshot.profileReused).toBe(true);
    expect(body.data.suggestedCalculators.map((item: { form: string }) => item.form)).toEqual(
      expect.arrayContaining(["IncomeTaxCalculatorForm", "Tax1099CalculatorForm"])
    );
  });

  it("keeps calculator integration as links to the existing forms", () => {
    expect(PREPARATION_CALCULATORS.map((item) => item.form)).toEqual([
      "IncomeTaxCalculatorForm",
      "Tax1099CalculatorForm",
      "SelfEmployedCalculatorForm",
      "QuarterlyTaxCalculatorForm",
    ]);
  });

  it("marks a session completed only after the review step", () => {
    let steps = emptyStepMap("taxpayer_profile");
    let current: typeof steps extends never ? never : "taxpayer_profile" | "income" | "documents" | "deductions" | "calculation" | "review" =
      "taxpayer_profile";
    const order = [
      "taxpayer_profile",
      "income",
      "documents",
      "deductions",
      "calculation",
      "review",
    ] as const;

    const statuses: string[] = [];
    for (const step of order) {
      const next = completeCurrentStep(steps, current);
      steps = next.steps;
      current = next.currentStep;
      statuses.push(next.status);
      expect(step).toBeTruthy();
    }

    expect(statuses).toEqual([
      "in_progress",
      "in_progress",
      "in_progress",
      "calculation_ready",
      "review",
      "completed",
    ]);
  });

  it("defines owner-only RLS for preparation sessions", () => {
    const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
    const migration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260928_tax_preparation_sessions.sql"),
      "utf8"
    );
    for (const source of [schema, migration]) {
      expect(source).toContain("tax_preparation_sessions");
      expect(source).toContain("ENABLE ROW LEVEL SECURITY");
      expect(source).toContain("auth.uid() = user_id");
    }
  });
});
