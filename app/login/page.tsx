"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isStubMode } from "@/lib/env";

export default function LoginPage() {
  const t = useTranslations("flow.auth");
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirect = params.get("redirect") ?? "/start";

  const requestCode = async () => {
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      setError(t("invalid"));
      return;
    }
    const data = await res.json();
    setSentCode(data.code || "sent");
  };

  const verify = async () => {
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      setError(t("invalid"));
      return;
    }
    router.push(redirect);
  };

  return (
    <div className="container max-w-xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={requestCode} disabled={!email}>
              {t("requestCode")}
            </Button>
            {isStubMode() && sentCode && (
              <span className="text-xs text-muted-foreground">{t("stubHint")}: {sentCode}</span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">{t("codeLabel")}</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button type="button" onClick={verify} disabled={!code || !email}>
            {t("verify")}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">{t("noAccount")}</p>
    </div>
  );
}
