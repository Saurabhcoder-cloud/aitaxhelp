"use client";

import React, { useState } from "react";
import { Container } from "../../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { FormField } from "../../../components/ui/FormField";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Alert } from "../../../components/ui/Alert";

export default function TaxProfessionalsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [taxPayerType, setTaxPayerType] = useState<"individual" | "freelancer_1099" | "small_business">("freelancer_1099");
  const [urgency, setUrgency] = useState<"immediate" | "this_month" | "planning_ahead">("this_month");
  const [incomeRange, setIncomeRange] = useState("$50k - $100k");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          taxPayerType,
          urgency,
          estimatedAnnualIncomeRange: incomeRange,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      }
    } catch (_err) {
      console.error("Lead submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Information Column */}
          <div className="lg:col-span-6 space-y-6">
            <Badge variant="emerald" size="md">
              Licensed CPA & EA Matching
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-surface-900 tracking-tight leading-tight">
              Connect With a Qualified Tax Professional
            </h1>

            <p className="text-base sm:text-lg text-surface-600 leading-relaxed">
              When your tax profile involves multi-state filings, real estate investments, complex business partnerships, or formal IRS audit representation, working with a licensed Certified Public Accountant (CPA) or Enrolled Agent (EA) is essential.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900">Vetted Practitioners</h4>
                  <p className="text-xs text-surface-600 mt-0.5">
                    We match inquiries strictly with actively licensed CPAs and federally authorized Enrolled Agents.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900">1099 & Small Business Specialists</h4>
                  <p className="text-xs text-surface-600 mt-0.5">
                    Professionals who specialize in pass-through taxation, S-Corp elections, and contractor deductions.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900">No Obligation Initial Consultation</h4>
                  <p className="text-xs text-surface-600 mt-0.5">
                    Review your tax situation and obtain an upfront estimate for tax preparation or planning services.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Form Column */}
          <div className="lg:col-span-6">
            <Card className="shadow-card border-surface-200">
              <CardHeader>
                <CardTitle>Request a Tax Professional Match</CardTitle>
                <p className="text-xs text-surface-500">
                  Tell us about your tax situation so we can connect you with the appropriate licensed specialist.
                </p>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <Alert variant="success" title="Inquiry Received Successfully">
                    Thank you, {fullName}. Your inquiry has been logged. A matched tax professional will review your requirements and reach out via email shortly.
                  </Alert>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Full Name" id="leadName" required>
                      <Input
                        id="leadName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                      />
                    </FormField>

                    <FormField label="Email Address" id="leadEmail" required>
                      <Input
                        id="leadEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        required
                      />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Taxpayer Profile" id="leadType">
                        <Select
                          id="leadType"
                          value={taxPayerType}
                          onChange={(e) => setTaxPayerType(e.target.value as any)}
                          options={[
                            { label: "1099 / Freelancer", value: "freelancer_1099" },
                            { label: "Individual (W-2)", value: "individual" },
                            { label: "Small Business / LLC", value: "small_business" },
                          ]}
                        />
                      </FormField>

                      <FormField label="Timeline / Urgency" id="leadUrgency">
                        <Select
                          id="leadUrgency"
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value as any)}
                          options={[
                            { label: "This Month", value: "this_month" },
                            { label: "Immediate (Filing deadline)", value: "immediate" },
                            { label: "Planning Ahead", value: "planning_ahead" },
                          ]}
                        />
                      </FormField>
                    </div>

                    <FormField label="Annual Estimated Income Range" id="leadIncome">
                      <Select
                        id="leadIncome"
                        value={incomeRange}
                        onChange={(e) => setIncomeRange(e.target.value)}
                        options={[
                          { label: "Under $50,000", value: "Under $50k" },
                          { label: "$50,000 - $100,000", value: "$50k - $100k" },
                          { label: "$100,000 - $250,000", value: "$100k - $250k" },
                          { label: "$250,000+", value: "$250k+" },
                        ]}
                      />
                    </FormField>

                    <Button type="submit" size="md" className="w-full mt-2" isLoading={isSubmitting}>
                      Submit Match Request
                    </Button>

                    <p className="text-[11px] text-surface-500 text-center leading-relaxed mt-3">
                      TaxAIHelp facilitates professional matchmaking. We do not provide formal legal representation. All certified services are executed directly by independent CPAs/EAs.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
