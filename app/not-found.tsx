import React from "react";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <Container size="sm" className="text-center">
        <span className="text-6xl font-black text-brand-600 font-mono block mb-4">
          404
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
          Tax Page Not Found
        </h1>
        <p className="mt-3 text-sm sm:text-base text-surface-600 max-w-md mx-auto leading-relaxed">
          The page or calculator you requested does not exist or has been relocated to another section.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/tax-calculators" size="md">
            View Tax Calculators
          </Button>
          <Button href="/" variant="outline" size="md">
            Return Home
          </Button>
        </div>
      </Container>
    </div>
  );
}
