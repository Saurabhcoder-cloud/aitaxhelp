"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { checkSession } from "@/lib/utils/auth-client";
import { Loader2, ShieldCheck } from "lucide-react";

interface DashboardAuthGuardProps {
  children: React.ReactNode;
}

function GuardInner({ children }: DashboardAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      try {
        const session = await checkSession();
        if (!isMounted) return;

        if (session && session.id) {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
          const search = searchParams?.toString();
          const targetUrl = search ? `${pathname}?${search}` : pathname;
          router.replace(`/login?next=${encodeURIComponent(targetUrl)}`);
        }
      } catch (_err) {
        if (!isMounted) return;
        setStatus("unauthenticated");
        const search = searchParams?.toString();
        const targetUrl = search ? `${pathname}?${search}` : pathname;
        router.replace(`/login?next=${encodeURIComponent(targetUrl)}`);
      }
    }

    verifyAuth();

    const handleAuthChange = () => {
      verifyAuth();
    };

    window.addEventListener("taxaihelp-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      isMounted = false;
      window.removeEventListener("taxaihelp-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [pathname, searchParams, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
        <div className="p-3 bg-brand-50 text-brand-600 rounded-full border border-brand-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-surface-900">Verifying secure taxpayer session...</p>
          <p className="text-xs text-surface-500 mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-bit encrypted authentication guard
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <p className="text-sm font-medium text-surface-600">Verifying session...</p>
        </div>
      }
    >
      <GuardInner>{children}</GuardInner>
    </Suspense>
  );
}
