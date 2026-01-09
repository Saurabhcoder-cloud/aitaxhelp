"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface DraftSummary {
  filer: {
    filingStatus: string;
    state: string;
    dependentsCount: number;
  };
  income: {
    wages: number;
    "1099": number;
    interest: number;
    dividends: number;
  };
  adjustments: {
    standardOrItemized: string;
    totalDeductions: number;
  };
  credits: {
    childTaxCredit: number;
    eitc: number;
    other: number;
  };
  result: {
    refundOrBalance: number;
    estimatedTax: number;
    effectiveRate: number;
  };
}

interface DraftResponse {
  summary: DraftSummary;
  forms: { name: string; status: string }[];
  audit?: {
    uploadedAt: string;
    processedAt?: string;
    draftedAt?: string;
    consentedAt?: string;
  };
}

export default function ReviewPage() {
  const { state, updateState } = useClientState();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("flow.review");
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [hasEntitlement, setHasEntitlement] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/entitlements/me")
      .then((res) => res.json())
      .then((data) => setHasEntitlement(Boolean(data.entitlement)))
      .catch(() => setHasEntitlement(false));

    if (!state.uploadId) {
      router.push("/upload");
      return;
    }
    fetch(`/api/draft/${state.uploadId}`)
      .then((res) => res.json())
      .then((data) => {
        setDraft(data);
        updateState({ uploadStatus: "drafted" });
      })
      .catch(() => toast({ title: t("errors.title"), description: t("errors.detail") }));
  }, [state.uploadId, router, toast, t, updateState]);

  const auditSteps = useMemo(
    () => [
      { label: t("audit.uploaded"), at: draft?.audit?.uploadedAt },
      { label: t("audit.processed"), at: draft?.audit?.processedAt },
      { label: t("audit.drafted"), at: draft?.audit?.draftedAt },
      { label: t("audit.consented"), at: draft?.audit?.consentedAt },
    ],
    [draft?.audit, t]
  );

  if (!draft) {
    return (
      <div className="container max-w-4xl py-12">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const { summary } = draft;

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("stub")}</span>
          </div>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => router.push(hasEntitlement ? "/export" : "/checkout?plan=registration")}>{t("goExport")}</Button>
      </div>

      {!hasEntitlement && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{t("gating.title")}</p>
              <p>{t("gating.description")}</p>
            </div>
            <Button size="sm" onClick={() => router.push("/checkout?plan=registration")}>{t("gating.cta")}</Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">{t("tabs.summary")}</TabsTrigger>
          <TabsTrigger value="forms">{t("tabs.forms")}</TabsTrigger>
          <TabsTrigger value="qa">{t("tabs.qa")}</TabsTrigger>
          <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t("cards.overview.title")}</CardTitle>
              <CardDescription>{t("cards.overview.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryStat label={t("cards.overview.refund")} value={`$${summary.result.refundOrBalance.toLocaleString()}`} />
              <SummaryStat label={t("cards.overview.estimate")} value={`$${summary.result.estimatedTax.toLocaleString()}`} />
              <SummaryStat
                label={t("cards.overview.effective")}
                value={`${(summary.result.effectiveRate * 100).toFixed(1)}%`}
              />
              <SummaryList
                title={t("cards.overview.credits")}
                items={[
                  `${t("fields.credits.ctc")}: $${summary.credits.childTaxCredit.toLocaleString()}`,
                  `${t("fields.credits.eitc")}: $${summary.credits.eitc.toLocaleString()}`,
                  `${t("fields.credits.other")}: $${summary.credits.other.toLocaleString()}`,
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("cards.actions.title")}</CardTitle>
              <CardDescription>{t("cards.actions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("cards.actions.items.0")}</p>
              <p>{t("cards.actions.items.1")}</p>
              <p>{t("cards.actions.items.2")}</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>{t("cards.profile.title")}</CardTitle>
              <CardDescription>{t("cards.profile.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SummaryList
                title={t("fields.filer.title")}
                items={[
                  `${t("fields.filer.status")}: ${summary.filer.filingStatus}`,
                  `${t("fields.filer.state")}: ${summary.filer.state}`,
                  `${t("fields.filer.dependents")}: ${summary.filer.dependentsCount}`,
                ]}
              />
              <SummaryList
                title={t("fields.income.title")}
                items={[
                  `${t("fields.income.wages")}: $${summary.income.wages.toLocaleString()}`,
                  `${t("fields.income.form1099")}: $${summary.income["1099"].toLocaleString()}`,
                  `${t("fields.income.interest")}: $${summary.income.interest.toLocaleString()}`,
                  `${t("fields.income.dividends")}: $${summary.income.dividends.toLocaleString()}`,
                ]}
              />
              <SummaryList
                title={t("fields.adjustments.title")}
                items={[
                  `${t("fields.adjustments.method")}: ${summary.adjustments.standardOrItemized}`,
                  `${t("fields.adjustments.total")}: $${summary.adjustments.totalDeductions.toLocaleString()}`,
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="grid gap-4 md:grid-cols-2">
          {draft.forms.map((form) => (
            <Card key={form.name}>
              <CardHeader>
                <CardTitle>{form.name}</CardTitle>
                <CardDescription>{t("forms.status", { status: form.status })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{t("forms.placeholder")}</p>
                <Button variant="secondary" size="sm">
                  {t("forms.edit")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="qa" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("qa.title")}</CardTitle>
              <CardDescription>{t("qa.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t("qa.items.0")}</p>
              <p>{t("qa.items.1")}</p>
              <p>{t("qa.items.2")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("assist.title")}</CardTitle>
              <CardDescription>{t("assist.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t("assist.detail")}</p>
              <Button variant="secondary" size="sm">{t("assist.addNote")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="grid gap-4 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t("audit.title")}</CardTitle>
              <CardDescription>{t("audit.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {auditSteps.map((step) => (
                <div key={step.label} className="rounded-lg border border-border/70 bg-muted/40 p-4">
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.at ? new Date(step.at).toLocaleString() : t("audit.pending")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{t("stubBanner.title")}</CardTitle>
          <CardDescription>{t("stubBanner.description")}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
