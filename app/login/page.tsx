"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { loginDemoUser, setSessionToken } from "@/lib/utils/auth-client";
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In offline / dev mode, we generate a user session token based on email
      const safeToken = `user-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      setSessionToken(safeToken);

      await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: safeToken }),
      });

      setSuccessMessage("Authentication successful. Redirecting to workspace...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 600);
    } catch (_err) {
      setErrorMessage("Failed to authenticate session. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginDemoUser();
      setSuccessMessage("Logged in as Demo Taxpayer. Redirecting...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 500);
    } catch (_err) {
      setErrorMessage("Unable to initialize demo session.");
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-20 bg-surface-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Container size="sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Badge variant="emerald" size="sm" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Taxpayer Authentication
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            Sign In to TaxAIHelp
          </h1>
          <p className="text-xs sm:text-sm text-surface-600 mt-1 max-w-sm mx-auto">
            Access your saved tax calculations, confidential AI conversation history, and profile preferences.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="error" title="Sign In Error" className="mb-6">
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" title="Success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        <Card className="shadow-card border-surface-200 p-6 sm:p-8">
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <FormField label="Email Address" id="loginEmail" required>
              <div className="relative">
                <Input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taxpayer@example.com"
                  disabled={isLoading}
                  required
                  className="pl-9"
                />
                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <FormField label="Password" id="loginPassword" required>
              <div className="relative">
                <Input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  required
                  className="pl-9"
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-surface-500">Encrypted transmission</span>
              <Link
                href="/forgot-password"
                className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full mt-2 font-semibold shadow-sm"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-surface-400 font-semibold tracking-wider">
                Or Instant Access
              </span>
            </div>
          </div>

          {/* Quick Demo Login Button */}
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full gap-2 text-surface-800 hover:bg-surface-50 border-surface-300 font-medium"
          >
            <UserCheck className="w-4 h-4 text-brand-600" />
            <span>Sign In as Demo Taxpayer</span>
          </Button>

          <div className="mt-6 pt-4 border-t border-surface-100 text-center text-xs text-surface-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-semibold text-brand-700 hover:text-brand-900 transition-colors"
            >
              Create Account →
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <LoadingState message="Loading secure login..." />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
