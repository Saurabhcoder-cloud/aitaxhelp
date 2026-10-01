import React from "react";
import { Metadata } from "next";
import { Container } from "../../components/ui/Container";
import { DashboardNav } from "../../components/layout/DashboardNav";
import { DashboardAuthGuard } from "../../components/dashboard/DashboardAuthGuard";
import { constructMetadata } from "../../lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Taxpayer Dashboard",
  description: "View saved federal tax calculations, AI conversation history, and profile preferences.",
  path: "/dashboard",
  noIndex: true, // Dashboard is private
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <div className="py-10 bg-surface-50 min-h-screen">
        <Container size="xl">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
                  Taxpayer Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-surface-600 mt-0.5">
                  Manage your federal calculations, AI conversations, and tax profile preferences.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  Secure Workspace
                </span>
              </div>
            </div>
            <DashboardNav />
          </div>

          <div className="mt-6">{children}</div>
        </Container>
      </div>
    </DashboardAuthGuard>
  );
}
