"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const exportTypes = ["pdf", "json", "csv"] as const;

type ExportType = (typeof exportTypes)[number];

export default function ExportPage() {
  const { state } = useClientState();
  const { toast } = useToast();
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [downloading, setDownloading] = useState<ExportType | null>(null);

  useEffect(() => {
    if (!state.uploadId) router.push("/upload");
  }, [state.uploadId, router]);

  const handleDownload = async (type: ExportType) => {
    if (!state.uploadId) return;
    setDownloading(type);
    const res = await fetch(`/api/export/${state.uploadId}?type=${type}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taxhelp-${state.uploadId}.${type}`;
    link.click();
    setDownloading(null);
    toast({ title: `${type.toUpperCase()} ready`, description: "Mock export completed." });
  };

  return (
    <div className="container max-w-4xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Export or e-file</h1>
        <p className="text-muted-foreground">
          Download PDFs, JSON, or CSV and hand off to an e-file provider. Confirm consent before export.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Consent &amp; data retention</CardTitle>
          <CardDescription>Required before downloading or sending to an e-file partner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox checked={consent} onCheckedChange={(val) => setConsent(Boolean(val))} />
            <span>I consent to data handling and agree to the retention policy.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {exportTypes.map((type) => (
              <Button
                key={type}
                disabled={!consent || downloading === type}
                variant="secondary"
                onClick={() => handleDownload(type)}
              >
                {downloading === type ? "Preparing..." : `Download ${type.toUpperCase()}`}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>E-file handoff placeholder: connect IRS or state partners when ready.</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => router.push("/review")}>Back to review</Button>
        <Button onClick={() => toast({ title: "E-file", description: "Connect provider integration." })}>
          Send to e-file partner
        </Button>
      </div>
    </div>
  );
}
