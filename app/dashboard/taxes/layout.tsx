import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Start My Taxes",
  description: "Resume your federal tax preparation session and track each step.",
  path: "/dashboard/taxes",
  noIndex: true,
});

export default function TaxesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
