"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UploadRecord } from "@/lib/store/uploads";

const exportTypes = ["pdf", "json", "csv"] as const;

type ExportType = (typeof exportTypes)[number];

export default function ExportPage() {
  const { state, updateState } = useClientState();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("flow.export");
  const locale = useLocale();
  const [consent, setConsent] = useState(false);
  const [downloading, setDownloading] = useState<ExportType | null>(null);
  const [record, setRecord] = useState<UploadRecord | null>(null);

  useEffect(() => {
    if (!state.uploadId) {
      router.push("/upload");
      return;
    }
    fetch(`/api/upload?id=${state.uploadId}`)
      .then((res) => res.json())
      .then((data) => setRecord(data.upload))
      .catch(() => setRecord(null));
  }, [state.uploadId, router]);

  useEffect(() => {
    if (consent && state.uploadId) {
      fetch(`/api/export/${state.uploadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
        .then((res) => res.json())
        .then(() => updateState({ uploadStatus: "consented" }))
        .catch(() => toast({ title: t("errors.title"), description: t("errors.detail") }));
    }
  }, [consent, state.uploadId, locale, toast, t, updateState]);

  const handleDownload = async (type: ExportType) => {
    if (!state.uploadId || !consent) return;
    setDownloading(type);
    const res = await fetch(`/api/export/${state.uploadId}?type=${type}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taxhelp-${state.uploadId}.${type}`;
    link.click();
    setDownloading(null);
    toast({ title: t("downloads.ready", { type: type.toUpperCase() }), description: t("downloads.detail") });
  };

  const auditSteps = useMemo(
    () => [
      { label: t("audit.uploaded"), at: record?.audit?.uploadedAt },
      { label: t("audit.processed"), at: record?.audit?.processedAt },
      { label: t("audit.drafted"), at: record?.audit?.draftedAt },
      { label: t("audit.consented"), at: record?.audit?.consentedAt || record?.consent?.timestamp },
    ],
    [record?.audit, record?.consent, t]
  );

  return (
    <div className="container max-w-4xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("consent.title")}</CardTitle>
          <CardDescription>{t("consent.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={consent}
              onCheckedChange={(val: boolean | "indeterminate") => setConsent(Boolean(val))}
            />
            <span>{t("consent.text")}</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {exportTypes.map((type) => (
              <Button
                key={type}
                disabled={!consent || downloading === type}
                variant="secondary"
                onClick={() => handleDownload(type)}
              >
                {downloading === type ? t("downloads.preparing") : t("downloads.cta", { type: type.toUpperCase() })}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>{t("efile")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
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

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => router.push("/review")}>{t("back")}</Button>
        <Button onClick={() => toast({ title: t("efileCta.title"), description: t("efileCta.description") })}>
          {t("efileCta.cta")}
        </Button>
      </div>
    </div>
  );
}
