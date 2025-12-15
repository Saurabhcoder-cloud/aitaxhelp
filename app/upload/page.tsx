"use client";

import { useTranslations } from "next-intl";
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

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { state, updateState } = useClientState();
  const t = useTranslations("flow.upload");
  const [dragOver, setDragOver] = useState(false);

  const schema = z.object({
    file: z
      .any()
      .refine((file: File) => file instanceof File, t("errors.required"))
      .refine(
        (file: File) => ["application/pdf", "image/png", "image/jpeg"].includes(file.type),
        t("errors.type")
      )
      .refine((file: File) => file.size <= 10 * 1024 * 1024, t("errors.size")),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const file = values.file as File;
    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size }),
      });
      if (initRes.status === 400) {
        // fallback to stub
        const formData = new FormData();
        formData.append("file", file);
        if (state.language) formData.append("language", state.language);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || t("errors.generic"));
        updateState({ uploadId: data.upload_id, fileName: file.name, uploadStatus: "uploaded" });
        toast({ title: t("success.title"), description: t("success.detail") });
        router.push("/processing");
        return;
      }
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || t("errors.generic"));
      }
      const initData = await initRes.json();
      await fetch(initData.presignedUrl, {
        method: "PUT",
        headers: initData.requiredHeaders,
        body: file,
      });
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: initData.uploadId }),
      });
      if (!completeRes.ok) {
        throw new Error(t("errors.generic"));
      }
      updateState({ uploadId: initData.uploadId, fileName: file.name, uploadStatus: "uploaded" });
      toast({ title: t("success.title"), description: t("success.detail") });
      router.push(`/processing?upload_id=${initData.uploadId}`);
    } catch (error: any) {
      toast({ title: t("errors.title"), description: error?.message || t("errors.generic") });
    }
  };

  return (
    <div className="container max-w-4xl py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("secureTitle")}</CardTitle>
            <CardDescription>{t("secureDescription")}</CardDescription>
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
              <p className="text-lg font-semibold">{t("dropTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("dropSubtitle")}</p>
              <div className="mt-4">
                <Label
                  htmlFor="file"
                  className="cursor-pointer rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {t("browse")}
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
                  {t("selected", { name: form.watch("file").name, type: form.watch("file").type })}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p>{t("dataNote")}</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("helper")}</p>
          <Button type="submit">{t("cta")}</Button>
        </div>
      </form>
    </div>
  );
}
