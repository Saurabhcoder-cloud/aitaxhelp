"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { isStubMode } from "@/lib/env";
import type { EntitlementPlan } from "@/lib/store/entitlements";

const pricing: Record<EntitlementPlan, { price: string; highlight?: string }> = {
  registration: { price: "$9.99" },
  individual: { price: "$19.99", highlight: "Most Popular" },
  family: { price: "$24.99", highlight: "Best Value" },
};

function CheckoutPageInner() {
  const params = useSearchParams();
  const plan = (params.get("plan") as EntitlementPlan) || "registration";
  const router = useRouter();
  const t = useTranslations("checkout");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entitled, setEntitled] = useState(false);

  useEffect(() => {
    fetch("/api/entitlements/me")
      .then((res) => res.json())
      .then((data) => setEntitled(Boolean(data.entitlement)))
      .catch(() => setEntitled(false));
  }, []);

  const features = useMemo(
    () => [
      t("features.access"),
      t("features.storage"),
      t("features.guidance"),
      plan !== "registration" ? t("features.priority") : null,
    ].filter(Boolean) as string[],
    [plan, t],
  );

  const simulate = async () => {
    setLoading(true);
    const res = await fetch("/api/entitlements/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: t("errors.title"), description: t("errors.detail") });
      return;
    }
    toast({ title: t("success.title"), description: t("success.detail") });
    router.push("/export");
  };

  const checkout = async () => {
    setLoading(true);
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, successUrl: `${window.location.origin}/export`, cancelUrl: window.location.href }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast({ title: t("errors.title"), description: data.error || t("errors.detail") });
    }
  };

  return (
    <div className="container max-w-3xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t("title", { plan })}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold">{pricing[plan].price}</p>
            {pricing[plan].highlight && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {pricing[plan].highlight}
              </span>
            )}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            {isStubMode() ? (
              <Button onClick={simulate} disabled={loading}>
                {loading ? t("processing") : t("simulate")}
              </Button>
            ) : (
              <Button onClick={checkout} disabled={loading}>
                {loading ? t("processing") : t("pay")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push("/export")}
              disabled={loading}>
              {entitled ? t("back") : t("maybeLater")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container max-w-3xl py-12 text-sm text-muted-foreground">Loading checkout...</div>}>
      <CheckoutPageInner />
    </Suspense>
  );
}
