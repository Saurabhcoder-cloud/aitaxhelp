import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Simple, Transparent Pricing & Plans",
  description:
    "Free deterministic federal tax calculators and calculation history. Upgrade to Premium for expanded AI assistant capacity, unlocked printable reports, and advanced insights.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
