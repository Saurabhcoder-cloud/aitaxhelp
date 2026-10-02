"use client";

import React, { useState, useMemo } from "react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { TaxFilingStatus } from "@/types/tax";
import {
  Dependent,
  SpouseInfo,
  HouseholdSnapshot,
  RelationshipType,
  RELATIONSHIP_LABELS,
  FILING_STATUS_LABELS,
  FILING_STATUS_DESCRIPTIONS,
} from "@/lib/preparation/household";
import {
  savePreparationHousehold,
  updatePreparationProgress,
} from "@/lib/utils/preparation-session-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  User,
  Heart,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Baby,
  Calendar,
  Shield,
  HelpCircle,
} from "lucide-react";

const ALL_FILING_STATUSES: TaxFilingStatus[] = [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
];

const RELATIONSHIP_OPTIONS: RelationshipType[] = [
  "son",
  "daughter",
  "stepchild",
  "foster_child",
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "stepbrother",
  "stepsister",
  "grandchild",
  "parent",
  "grandparent",
  "niece",
  "nephew",
  "other_relative",
];

interface HouseholdPanelProps {
  session: TaxPreparationSession;
  onSessionChange: (updated: TaxPreparationSession) => void;
  onContinue?: () => void;
}

export function HouseholdPanel({
  session,
  onSessionChange,
  onContinue,
}: HouseholdPanelProps) {
  const currentHousehold = session.householdSnapshot;
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>(
    currentHousehold?.filingStatus || session.profileSnapshot.filingStatus || "single"
  );

  // Spouse state (for MFJ / MFS)
  const [hasSpouseW2, setHasSpouseW2] = useState<boolean>(
    Boolean(currentHousehold?.spouse?.hasW2Income)
  );
  const [spouseW2Wages, setSpouseW2Wages] = useState<string>(
    currentHousehold?.spouse?.w2WagesCents
      ? (currentHousehold.spouse.w2WagesCents / 100).toFixed(2)
      : ""
  );
  const [spouseWithholding, setSpouseWithholding] = useState<string>(
    currentHousehold?.spouse?.federalWithholdingCents
      ? (currentHousehold.spouse.federalWithholdingCents / 100).toFixed(2)
      : ""
  );
  const [hasSpouse1099, setHasSpouse1099] = useState<boolean>(
    Boolean(currentHousehold?.spouse?.hasSelfEmploymentIncome)
  );
  const [spouse1099Gross, setSpouse1099Gross] = useState<string>(
    currentHousehold?.spouse?.gross1099IncomeCents
      ? (currentHousehold.spouse.gross1099IncomeCents / 100).toFixed(2)
      : ""
  );
  const [spouseBusinessExpenses, setSpouseBusinessExpenses] = useState<string>(
    currentHousehold?.spouse?.businessExpensesCents
      ? (currentHousehold.spouse.businessExpensesCents / 100).toFixed(2)
      : ""
  );
  const [spouseFirstName, setSpouseFirstName] = useState<string>(
    currentHousehold?.spouse?.firstName || ""
  );
  const [spouseLastName, setSpouseLastName] = useState<string>(
    currentHousehold?.spouse?.lastName || ""
  );
  const [spouseDob, setSpouseDob] = useState<string>(
    currentHousehold?.spouse?.dateOfBirth || ""
  );
  const [spouseSsnLast4, setSpouseSsnLast4] = useState<string>(
    currentHousehold?.spouse?.ssnLast4 || ""
  );

  // Dependents state
  const [dependents, setDependents] = useState<Dependent[]>(
    currentHousehold?.dependents || []
  );

  // Form state for adding/editing a dependent
  const [isAddingDependent, setIsAddingDependent] = useState(false);
  const [newDepFirstName, setNewDepFirstName] = useState("");
  const [newDepLastName, setNewDepLastName] = useState("");
  const [newDepDob, setNewDepDob] = useState("");
  const [newDepRelationship, setNewDepRelationship] = useState<RelationshipType>("son");
  const [newDepMonths, setNewDepMonths] = useState<number>(12);
  const [newDepIsQualifyingChild, setNewDepIsQualifyingChild] = useState<boolean>(true);
  const [newDepIsStudent, setNewDepIsStudent] = useState<boolean>(false);
  const [newDepIsDisabled, setNewDepIsDisabled] = useState<boolean>(false);
  const [newDepSsnLast4, setNewDepSsnLast4] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMarried = filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately";

  // Calculate age helper for dependents
  const getDependentAge = (dob: string): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    return session.taxYear - birth.getFullYear();
  };

  const handleAddDependent = () => {
    setError(null);
    if (!newDepFirstName.trim() || !newDepLastName.trim()) {
      setError("Please provide the dependent's first and last name.");
      return;
    }
    if (!newDepDob.trim()) {
      setError("Please provide the dependent's date of birth.");
      return;
    }
    const birthDate = new Date(newDepDob);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
      setError("Dependent's date of birth cannot be in the future.");
      return;
    }

    // Check duplicate
    const isDuplicate = dependents.some(
      (d) =>
        d.firstName.trim().toLowerCase() === newDepFirstName.trim().toLowerCase() &&
        d.lastName.trim().toLowerCase() === newDepLastName.trim().toLowerCase() &&
        d.dateOfBirth === newDepDob
    );
    if (isDuplicate) {
      setError(`A dependent named ${newDepFirstName} ${newDepLastName} with this DOB has already been added.`);
      return;
    }

    const newDep: Dependent = {
      id: crypto.randomUUID(),
      firstName: newDepFirstName.trim(),
      lastName: newDepLastName.trim(),
      dateOfBirth: newDepDob,
      relationship: newDepRelationship,
      monthsLivedWithTaxpayer: Number(newDepMonths) || 12,
      isQualifyingChild: newDepIsQualifyingChild,
      isFullTimeStudent: newDepIsStudent,
      isPermanentlyDisabled: newDepIsDisabled,
      providedMoreThanHalfSupport: true,
      ssnLast4: newDepSsnLast4.trim() ? newDepSsnLast4.trim().slice(0, 4) : undefined,
    };

    setDependents([...dependents, newDep]);
    // Reset form
    setNewDepFirstName("");
    setNewDepLastName("");
    setNewDepDob("");
    setNewDepRelationship("son");
    setNewDepMonths(12);
    setNewDepIsQualifyingChild(true);
    setNewDepIsStudent(false);
    setNewDepIsDisabled(false);
    setNewDepSsnLast4("");
    setIsAddingDependent(false);
  };

  const handleRemoveDependent = (id: string) => {
    setDependents(dependents.filter((d) => d.id !== id));
  };

  const handleSaveHousehold = async (advanceStep = false) => {
    setError(null);
    setSuccessMessage(null);

    // Validation checks
    if (filingStatus === "married_filing_jointly") {
      if (!spouseFirstName.trim() || !spouseLastName.trim()) {
        setError("Married Filing Jointly requires spouse's first and last name.");
        return;
      }
      if (!spouseDob.trim()) {
        setError("Married Filing Jointly requires spouse's date of birth.");
        return;
      }
    }

    if (filingStatus === "head_of_household" && dependents.length === 0) {
      setError("Head of Household filing status requires at least one qualifying dependent or child.");
      return;
    }

    // Build spouse object if married
    let spouseObj: SpouseInfo | undefined = undefined;
    if (isMarried) {
      const w2Cents = Math.round(parseFloat(spouseW2Wages || "0") * 100);
      const withCents = Math.round(parseFloat(spouseWithholding || "0") * 100);
      const gross1099Cents = Math.round(parseFloat(spouse1099Gross || "0") * 100);
      const expCents = Math.round(parseFloat(spouseBusinessExpenses || "0") * 100);

      spouseObj = {
        firstName: spouseFirstName.trim(),
        lastName: spouseLastName.trim(),
        dateOfBirth: spouseDob,
        ssnLast4: spouseSsnLast4.trim() ? spouseSsnLast4.trim().slice(0, 4) : undefined,
        hasW2Income: hasSpouseW2,
        w2WagesCents: hasSpouseW2 ? w2Cents : 0,
        hasSelfEmploymentIncome: hasSpouse1099,
        gross1099IncomeCents: hasSpouse1099 ? gross1099Cents : 0,
        businessExpensesCents: hasSpouse1099 ? expCents : 0,
        federalWithholdingCents: withCents,
      };
    }

    const payload: HouseholdSnapshot = {
      filingStatus,
      spouse: spouseObj,
      dependents,
    };

    setIsSaving(true);
    const saveResult = await savePreparationHousehold(payload);
    if (!saveResult.success || !saveResult.data) {
      setIsSaving(false);
      setError(saveResult.error || "Unable to save household information.");
      return;
    }

    let updatedSession = saveResult.data;
    if (advanceStep && session.currentStep === "taxpayer_profile") {
      const progressResult = await updatePreparationProgress("taxpayer_profile");
      if (progressResult.success && progressResult.data) {
        updatedSession = progressResult.data;
      }
    }

    setIsSaving(false);
    onSessionChange(updatedSession);
    setSuccessMessage("Household information saved successfully.");
    if (advanceStep && onContinue) {
      onContinue();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filing Status Selection Card */}
      <Card className="border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600" />
            <CardTitle className="text-base font-bold text-surface-900">
              Step 1: Filing Status & Household Setup
            </CardTitle>
          </div>
          <p className="text-xs text-surface-600 mt-0.5">
            Select your official IRS filing status for tax year {session.taxYear}. Your filing status determines your standard deduction and credit eligibility.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_FILING_STATUSES.map((status) => {
              const isSelected = filingStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilingStatus(status)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs"
                      : "border-surface-200 hover:border-surface-300 hover:bg-surface-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-surface-900">
                      {FILING_STATUS_LABELS[status]}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-surface-300 shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-surface-600 mt-2 leading-relaxed">
                    {FILING_STATUS_DESCRIPTIONS[status]}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Spouse Information Section (Conditional on Married) */}
      {isMarried && (
        <Card className="border-surface-200 border-l-4 border-l-brand-600">
          <CardHeader className="pb-3 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-brand-600" />
              <CardTitle className="text-base font-bold text-surface-900">
                Spouse Information ({FILING_STATUS_LABELS[filingStatus]})
              </CardTitle>
            </div>
            <p className="text-xs text-surface-600 mt-0.5">
              Enter your spouse&apos;s details and attributable income sources for the combined return.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Spouse First Name *
                </label>
                <Input
                  value={spouseFirstName}
                  onChange={(e) => setSpouseFirstName(e.target.value)}
                  placeholder="e.g. Jane"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Spouse Last Name *
                </label>
                <Input
                  value={spouseLastName}
                  onChange={(e) => setSpouseLastName(e.target.value)}
                  placeholder="e.g. Doe"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={spouseDob}
                  onChange={(e) => setSpouseDob(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  SSN Last 4 (Optional)
                </label>
                <Input
                  maxLength={4}
                  value={spouseSsnLast4}
                  onChange={(e) => setSpouseSsnLast4(e.target.value.replace(/\D/g, ""))}
                  placeholder="XXXX"
                />
              </div>
            </div>

            {/* Spouse Income Attribution */}
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-surface-700">
                Spouse Income Attribution
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-surface-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSpouseW2}
                    onChange={(e) => setHasSpouseW2(e.target.checked)}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Spouse had W-2 wages from an employer</span>
                </label>
                {hasSpouseW2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1">
                    <div>
                      <label className="text-xs text-surface-600 block mb-1">Spouse W-2 Wages ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={spouseW2Wages}
                        onChange={(e) => setSpouseW2Wages(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-surface-600 block mb-1">Spouse Federal Withholding ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={spouseWithholding}
                        onChange={(e) => setSpouseWithholding(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-medium text-surface-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hasSpouse1099}
                    onChange={(e) => setHasSpouse1099(e.target.checked)}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Spouse had 1099, freelance, or self-employment income</span>
                </label>
                {hasSpouse1099 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1">
                    <div>
                      <label className="text-xs text-surface-600 block mb-1">Spouse 1099 Gross Receipts ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={spouse1099Gross}
                        onChange={(e) => setSpouse1099Gross(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-surface-600 block mb-1">Spouse Business Expenses ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={spouseBusinessExpenses}
                        onChange={(e) => setSpouseBusinessExpenses(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dependents Card */}
      <Card className="border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <CardTitle className="text-base font-bold text-surface-900">
                Dependents & Children ({dependents.length})
              </CardTitle>
            </div>
            <p className="text-xs text-surface-600 mt-0.5">
              Add qualifying children and other dependents to calculate the Child Tax Credit ($2,000) and Credit for Other Dependents ($500).
            </p>
          </div>
          {!isAddingDependent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingDependent(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Dependent
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* List of existing dependents */}
          {dependents.length === 0 && !isAddingDependent ? (
            <div className="p-6 text-center rounded-xl bg-surface-50 border border-dashed border-surface-200 space-y-2">
              <Users className="w-8 h-8 text-surface-400 mx-auto" />
              <p className="text-sm font-semibold text-surface-900">No dependents added yet</p>
              <p className="text-xs text-surface-500 max-w-sm mx-auto">
                If you support children or relatives who lived with you, adding them may qualify you for significant tax credits.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingDependent(true)}
                className="mt-2 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Dependent
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {dependents.map((dep) => {
                const age = getDependentAge(dep.dateOfBirth);
                const isUnder17 = age !== null && age < 17;
                const isCtcCandidate = isUnder17 && dep.isQualifyingChild !== false;

                return (
                  <div
                    key={dep.id}
                    className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-surface-900">
                          {dep.firstName} {dep.lastName}
                        </span>
                        <Badge variant="outline" size="sm">
                          {RELATIONSHIP_LABELS[dep.relationship] || dep.relationship}
                        </Badge>
                        {age !== null && (
                          <span className="text-xs text-surface-500 font-medium">
                            Age: {age}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-surface-600">
                        <span>DOB: {dep.dateOfBirth}</span>
                        <span>·</span>
                        <span>Residency: {dep.monthsLivedWithTaxpayer} mos</span>
                        {dep.isFullTimeStudent && (
                          <Badge variant="brand" size="sm">Student</Badge>
                        )}
                        {dep.isPermanentlyDisabled && (
                          <Badge variant="neutral" size="sm">Disabled</Badge>
                        )}
                      </div>
                      <div className="pt-1">
                        {isCtcCandidate ? (
                          <Badge variant="emerald" size="sm">
                            Eligible: Child Tax Credit ($2,000)
                          </Badge>
                        ) : (
                          <Badge variant="brand" size="sm">
                            Eligible: Credit for Other Dependents ($500)
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDependent(dep.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Dependent Form Modal / Panel */}
          {isAddingDependent && (
            <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-brand-950 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-brand-600" />
                  Add New Dependent
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingDependent(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    First Name *
                  </label>
                  <Input
                    value={newDepFirstName}
                    onChange={(e) => setNewDepFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Last Name *
                  </label>
                  <Input
                    value={newDepLastName}
                    onChange={(e) => setNewDepLastName(e.target.value)}
                    placeholder="e.g. Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Date of Birth *
                  </label>
                  <Input
                    type="date"
                    value={newDepDob}
                    onChange={(e) => setNewDepDob(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Relationship to Taxpayer *
                  </label>
                  <select
                    value={newDepRelationship}
                    onChange={(e) => setNewDepRelationship(e.target.value as RelationshipType)}
                    className="w-full text-xs rounded-lg border border-surface-300 p-2 bg-white"
                  >
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {RELATIONSHIP_LABELS[rel]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Months Lived With You in {session.taxYear}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={newDepMonths}
                    onChange={(e) => setNewDepMonths(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    SSN Last 4 (Optional)
                  </label>
                  <Input
                    maxLength={4}
                    value={newDepSsnLast4}
                    onChange={(e) => setNewDepSsnLast4(e.target.value.replace(/\D/g, ""))}
                    placeholder="XXXX"
                  />
                </div>
              </div>

              {/* Qualification Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-brand-200/50">
                <label className="flex items-center gap-2 text-xs text-surface-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDepIsQualifyingChild}
                    onChange={(e) => setNewDepIsQualifyingChild(e.target.checked)}
                    className="rounded border-surface-300 text-brand-600"
                  />
                  <span>
                    Qualifying child test met (provided more than half support, did not file joint return, lived with you &gt; 6 months)
                  </span>
                </label>
                <div className="flex flex-wrap gap-4 pl-6">
                  <label className="flex items-center gap-1.5 text-xs text-surface-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDepIsStudent}
                      onChange={(e) => setNewDepIsStudent(e.target.checked)}
                      className="rounded border-surface-300 text-brand-600"
                    />
                    <span>Full-time student (age 19–23)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-surface-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDepIsDisabled}
                      onChange={(e) => setNewDepIsDisabled(e.target.checked)}
                      className="rounded border-surface-300 text-brand-600"
                    />
                    <span>Permanently &amp; totally disabled</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsAddingDependent(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddDependent}>
                  Confirm Dependent
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error & Success Messages */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSaveHousehold(false)}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Household"}
        </Button>
        <Button
          onClick={() => handleSaveHousehold(true)}
          disabled={isSaving}
          className="shadow-sm"
        >
          {isSaving ? "Saving..." : "Save & Continue to Income"}
        </Button>
      </div>
    </div>
  );
}
