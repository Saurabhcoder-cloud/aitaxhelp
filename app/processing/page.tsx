"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  key: "ocr" | "classification" | "validation" | "drafting";
  status: "done" | "pending";
}

export default function ProcessingPage() {
  const router = useRouter();
  const { state, updateState } = useClientState();
  const { toast } = useToast();
  const t = useTranslations("flow.processing");
  const [progress, setProgress] = useState(10);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!state.uploadId) {
      toast({ title: t("errors.missingUpload.title"), description: t("errors.missingUpload.detail") });
      router.push("/upload");
      return;
    }
    const interval = setInterval(async () => {
      const res = await fetch(`/api/process/${state.uploadId}`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setProgress(Math.min(100, data.progress));
      setSteps(data.steps);
      updateState({ uploadStatus: data.status });
      if (data.progress >= 100) {
        clearInterval(interval);
      }
    }, 1400);
    return () => clearInterval(interval);
  }, [state.uploadId, router, toast, updateState, t]);

  return (
    <div className="container max-w-4xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("progress.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
              aria-label={t("progress.aria", { percent: progress })}
            />
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {steps.map((step) => (
              <li key={step.key} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span>{t(`progress.steps.${step.key}`)}</span>
                <span className={step.status === "done" ? "text-green-600" : "text-amber-600"}>
                  {step.status === "done" ? t("progress.done") : t("progress.pending")}
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>{t("note")}</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push("/upload")}>{t("back")}</Button>
            <Button disabled={progress < 80} onClick={() => router.push("/review")}>{t("continue")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
