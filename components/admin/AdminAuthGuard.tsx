"use client";

import React, { useEffect, useState } from "react";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { Loader2 } from "lucide-react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      try {
        const res = await fetch("/api/v1/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          if (isMounted) setStatus("unauthorized");
          return;
        }

        const json = await res.json();
        if (json.success && json.data?.authenticated && json.data?.user?.role === "admin") {
          if (isMounted) setStatus("authorized");
        } else {
          if (isMounted) setStatus("unauthorized");
        }
      } catch (_err) {
        if (isMounted) setStatus("unauthorized");
      }
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Verifying administrator authorization...</p>
      </div>
    );
  }

  if (status === "unauthorized") {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
}
