"use client";

import React, { useEffect } from "react";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log safely to internal logging (never exposing to client DOM)
    console.error("[TAXAIHELP_CLIENT_ERROR]", error.message);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <Container size="sm" className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-surface-600 max-w-md mx-auto leading-relaxed">
          An unexpected issue occurred while rendering this page. No private or sensitive tax data was compromised.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Button onClick={() => reset()} size="md">
            Try Again
          </Button>
          <Button href="/" variant="outline" size="md">
            Return to Homepage
          </Button>
        </div>
      </Container>
    </div>
  );
}
