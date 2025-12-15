"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useClientState } from "@/lib/state/use-client-state";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, "File is required")
    .refine((file: File) => ["application/pdf", "image/png", "image/jpeg"].includes(file.type), "Unsupported file type")
    .refine((file: File) => file.size <= 10 * 1024 * 1024, "File must be 10MB or smaller"),
});

type FormValues = z.infer<typeof schema>;

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { state, updateState } = useClientState();
  const [dragOver, setDragOver] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const formData = new FormData();
    formData.append("file", values.file);
    if (state.language) formData.append("language", state.language);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Upload failed", description: data.error || "Please try again" });
      return;
    }
    updateState({ ...state, uploadId: data.upload_id, fileName: values.file.name });
    toast({ title: "Upload saved", description: "We are ready to process your documents." });
    router.push("/processing");
  };

  return (
    <div className="container max-w-4xl py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Upload your tax documents</h1>
        <p className="text-muted-foreground">
          Drag &amp; drop or browse for PDF, JPG, or PNG files (10MB max). We only store masked metadata and never train models on your data.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Secure upload</CardTitle>
            <CardDescription>Client-side validation keeps your documents safe before processing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  form.setValue("file", file);
                }
              }}
            >
              <p className="text-lg font-semibold">Drag &amp; drop</p>
              <p className="text-sm text-muted-foreground">PDF, JPG, or PNG up to 10MB</p>
              <div className="mt-4">
                <Label
                  htmlFor="file"
                  className="cursor-pointer rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Browse files
                </Label>
                <Input
                  id="file"
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg"
                  {...form.register("file")}
                />
              </div>
              {form.watch("file") && (
                <p className="mt-3 text-sm text-foreground">
                  Selected: <span className="font-semibold">{form.watch("file").name}</span> ({form.watch("file").type})
                </p>
              )}
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p>Data handling: encryption, delete anytime, never used for model training.</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Need help? We guide you through W-2, 1099, and receipts.</p>
          <Button type="submit">Continue to processing</Button>
        </div>
      </form>
    </div>
  );
}
