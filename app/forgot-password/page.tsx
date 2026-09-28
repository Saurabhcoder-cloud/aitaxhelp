"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { requestPasswordReset } from "@/lib/utils/auth-client";
import { ShieldCheck, Mail, ArrowLeft, Send, Info } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresConfig, setRequiresConfig] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setResultMessage(null);

    const res = await requestPasswordReset(email.trim());
    setIsSubmitting(false);

    setIsSuccess(res.success);
    setResultMessage(res.message);
    setRequiresConfig(Boolean(res.requiresSupabaseConfig));
  };

  return (
    <div className="py-12 sm:py-20 bg-surface-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Container size="sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Badge variant="neutral" size="sm" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              Account Security & Recovery
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            Reset your Password
          </h1>
          <p className="text-xs sm:text-sm text-surface-600 mt-1 max-w-sm mx-auto">
            Enter the email address associated with your TaxAIHelp account to receive password reset instructions.
          </p>
        </div>

        {resultMessage && (
          <Alert
            variant={isSuccess ? (requiresConfig ? "info" : "success") : "error"}
            title={isSuccess ? (requiresConfig ? "Development Notice" : "Instructions Sent") : "Request Notice"}
            className="mb-6"
          >
            {resultMessage}
          </Alert>
        )}

        <Card className="shadow-card border-surface-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" id="recoveryEmail" required>
              <div className="relative">
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taxpayer@example.com"
                  disabled={isSubmitting}
                  required
                  className="pl-9"
                />
                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={isSubmitting || !email.trim()}
              isLoading={isSubmitting}
              className="w-full mt-2 font-semibold shadow-sm"
            >
              <span>Send Recovery Link</span>
              <Send className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Architectural transparency note */}
          <div className="mt-6 p-3.5 rounded-xl bg-surface-50 border border-surface-200 text-xs text-surface-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-surface-900 block">
                Security Architecture Notice
              </span>
              <p className="leading-relaxed text-[11px]">
                In live environments, password recovery is fulfilled via cryptographic JWT tokens sent to your verified email address by Supabase Auth. TaxAIHelp never stores raw passwords.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
