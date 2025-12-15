"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientState } from "@/lib/state/use-client-state";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  language: z.string().min(2),
  name: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function StartPage() {
  const t = useTranslations();
  const router = useRouter();
  const { state, updateState } = useClientState();

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

  const onSubmit = (values: FormValues) => {
    updateState({ ...state, language: values.language });
    router.push("/upload");
  };

  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Choose your language</h1>
        <p className="text-muted-foreground">
          The assistant and adaptive Q&amp;A will use your preferred language throughout the filing flow.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input id="language" {...form.register("language")} list="languages" />
          <datalist id="languages">
            {(t.raw("languages") as string[]).map((lang) => (
              <option key={lang} value={lang} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" placeholder="Helps personalize your filing" {...form.register("name")} />
        </div>
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          <p>We can auto-detect languages from uploaded documents and questions to save time.</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Secure, translation-ready workflow.</p>
          <Button type="submit">Start filing</Button>
        </div>
      </form>
    </div>
  );
}
