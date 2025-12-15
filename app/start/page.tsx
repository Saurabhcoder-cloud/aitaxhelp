"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientState } from "@/lib/state/use-client-state";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { UploadRecord } from "@/lib/store/uploads";

const schema = z.object({
  language: z.string().min(2),
  name: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function StartPage() {
  const t = useTranslations("flow.start");
  const router = useRouter();
  const { state, updateState } = useClientState();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      language: state.language ?? "en",
      name: "",
    },
  });

  useEffect(() => {
    form.setValue("language", state.language ?? "en");
  }, [state.language, form]);

  const loadUploads = () => {
    fetch("/api/upload")
      .then((res) => res.json())
      .then((data) => setUploads(data.uploads || []))
      .catch(() => setUploads([]));
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const onSubmit = (values: FormValues) => {
    updateState({ language: values.language });
    router.push("/upload");
  };

  const statusLabel = (status: UploadRecord["status"]) => {
    const map: Record<UploadRecord["status"], string> = {
      uploaded: t("resume.status.uploaded"),
      processing: t("resume.status.processing"),
      processed: t("resume.status.processed"),
      drafted: t("resume.status.drafted"),
      consented: t("resume.status.consented"),
    };
    return map[status];
  };

  const continuePath = (record: UploadRecord) => {
    if (record.status === "consented") return "/export";
    if (record.status === "drafted") return "/export";
    if (record.status === "processed") return "/review";
    return "/processing";
  };

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-xl border border-border bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="language">{t("languageLabel")}</Label>
          <Input id="language" {...form.register("language")} list="languages" />
          <datalist id="languages">
            {(t.raw("languages") as string[]).map((lang) => (
              <option key={lang} value={lang} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" placeholder={t("namePlaceholder")} {...form.register("name")} />
        </div>
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          <p>{t("detectionNote")}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("secureNote")}</p>
          <Button type="submit">{t("cta")}</Button>
        </div>
      </form>

      <div className="space-y-3 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("resume.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("resume.subtitle")}</p>
          </div>
          <Button variant="secondary" onClick={loadUploads} size="sm">
            {t("resume.refresh")}
          </Button>
        </div>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("resume.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {uploads.slice(0, 5).map((upload) => (
              <li
                key={upload.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{upload.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(upload.status)} • {new Date(upload.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateState({ uploadId: upload.id, uploadStatus: upload.status });
                    router.push(continuePath(upload));
                  }}
                >
                  {t("resume.continue")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
