import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Create Account",
  description: "Create an account on TaxAIHelp to save calculations and access AI tax guidance.",
  path: "/signup",
  noIndex: true,
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
