"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DraftResponse {
  summary: {
    refundEstimate: number;
    taxDue: number;
    credits: string[];
    deductions: string[];
  };
  forms: { name: string; status: string }[];
}

export default function ReviewPage() {
  const { state } = useClientState();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<DraftResponse | null>(null);

  useEffect(() => {
    if (!state.uploadId) {
      router.push("/upload");
      return;
    }
    fetch(`/api/draft/${state.uploadId}`)
      .then((res) => res.json())
      .then(setDraft)
      .catch(() => toast({ title: "Unable to load draft" }));
  }, [state.uploadId, router, toast]);

  if (!draft) {
    return (
      <div className="container max-w-4xl py-12">
        <p className="text-muted-foreground">Loading draft summary...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review your draft return</h1>
          <p className="text-muted-foreground">Edit answers, confirm deductions, and preview filings.</p>
        </div>
        <Button onClick={() => router.push("/export")}>Go to export</Button>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Refund &amp; benefits</TabsTrigger>
          <TabsTrigger value="forms">Draft forms</TabsTrigger>
          <TabsTrigger value="qa">Adaptive Q&amp;A</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Refund &amp; taxes</CardTitle>
              <CardDescription>Stubbed estimate; connect your tax engine later.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryStat label="Refund estimate" value={`$${draft.summary.refundEstimate}`} />
              <SummaryStat label="Tax due" value={`$${draft.summary.taxDue}`} />
              <SummaryList title="Credits" items={draft.summary.credits} />
              <SummaryList title="Deductions" items={draft.summary.deductions} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Next actions</CardTitle>
              <CardDescription>Validate these items before filing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Confirm mileage log and gig expenses.</p>
              <p>• Upload any missing 1099 forms.</p>
              <p>• Verify dependents and credits eligibility.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="grid gap-4 md:grid-cols-2">
          {draft.forms.map((form) => (
            <Card key={form.name}>
              <CardHeader>
                <CardTitle>{form.name}</CardTitle>
                <CardDescription>Status: {form.status}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Editable preview placeholder.</p>
                <Button variant="secondary" size="sm">
                  Edit form
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="qa" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive questions</CardTitle>
              <CardDescription>Rendered in your selected language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Do you have vehicle expenses beyond standard mileage?</p>
              <p>Did you receive any state-specific credits or rebates?</p>
              <p>Upload receipts for large deductions to validate.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assistance</CardTitle>
              <CardDescription>Document any clarifications for support.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>We will keep notes with your return and surface during export.</p>
              <Button variant="secondary" size="sm">Add note</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
