import React from "react";
import { Metadata } from "next";
import { AdminNav } from "@/components/layout/AdminNav";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Admin Portal | TaxAIHelp Operations",
  description: "Secure operational oversight, CPA/EA lead management, and audit logging.",
  path: "/admin",
  noIndex: true, // Never index privileged admin routes
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-100 flex flex-col">
      <AdminNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminAuthGuard>{children}</AdminAuthGuard>
      </main>
    </div>
  );
}
