import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Contact TaxAIHelp Support & Engineering",
  description:
    "Get in touch with the TaxAIHelp engineering team for feedback on our tax calculators, partnerships, or support inquiries.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
