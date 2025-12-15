"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  label: string;
  status: "done" | "pending";
}

export default function ProcessingPage() {
  const router = useRouter();
  const { state } = useClientState();
  const { toast } = useToast();
  const [progress, setProgress] = useState(10);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!state.uploadId) {
      toast({ title: "No upload", description: "Please upload documents first." });
      router.push("/upload");
      return;
    }
    const interval = setInterval(async () => {
      const res = await fetch(`/api/process/${state.uploadId}`, { method: "POST" });
      const data = await res.json();
      setProgress(Math.min(100, data.progress));
      setSteps(data.steps);
      if (data.progress >= 100) {
        clearInterval(interval);
      }
    }, 1400);
    return () => clearInterval(interval);
  }, [state.uploadId, router, toast]);

  return (
    <div className="container max-w-4xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Processing your documents</h1>
        <p className="text-muted-foreground">OCR, classification, validation, and draft building are running.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
              aria-label={`Processing ${progress}%`}
            />
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span>{step.label}</span>
                <span className={step.status === "done" ? "text-green-600" : "text-amber-600"}>
                  {step.status === "done" ? "Complete" : "In progress"}
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>Adaptive Q&amp;A will appear in your chosen language once validation finishes.</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push("/upload")}>
              Back
            </Button>
            <Button disabled={progress < 80} onClick={() => router.push("/review")}>Continue to review</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
