"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { loginDemoUser, setSessionToken } from "@/lib/utils/auth-client";
import { ShieldCheck, Lock, Mail, User, ArrowRight, UserCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const safeToken = `user-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      setSessionToken(safeToken);

      // Register session with server
      await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: safeToken }),
      });

      // Update display name if provided
      if (fullName.trim()) {
        await fetch("/api/v1/auth/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${safeToken}`,
          },
          body: JSON.stringify({
            profile: { fullName: fullName.trim() },
          }),
        });
      }

      setSuccessMessage("Account created successfully! Preparing your tax workspace...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } catch (_err) {
      setErrorMessage("Failed to complete account registration. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDemoSignup = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginDemoUser();
      setSuccessMessage("Entering workspace as Demo Taxpayer...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch (_err) {
      setErrorMessage("Unable to initialize demo workspace.");
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
              Verified Deterministic Platform
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            Create your TaxAIHelp Account
          </h1>
          <p className="text-xs sm:text-sm text-surface-600 mt-1 max-w-sm mx-auto">
            Save deterministic tax scenarios, preserve calculation snapshots, and ask our educational AI assistant.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="error" title="Registration Error" className="mb-6">
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" title="Success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        <Card className="shadow-card border-surface-200 p-6 sm:p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <FormField label="Full Name" id="signupFullName">
              <div className="relative">
                <Input
                  id="signupFullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Taxpayer"
                  disabled={isLoading}
                  className="pl-9"
                />
                <User className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <FormField label="Email Address" id="signupEmail" required>
              <div className="relative">
                <Input
                  id="signupEmail"
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

            <FormField label="Password" id="signupPassword" required>
              <div className="relative">
                <Input
                  id="signupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  required
                  className="pl-9"
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <FormField label="Confirm Password" id="signupConfirmPassword" required>
              <div className="relative">
                <Input
                  id="signupConfirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isLoading}
                  required
                  className="pl-9"
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </FormField>

            <p className="text-[11px] text-surface-500 pt-1 leading-relaxed">
              By creating an account, you acknowledge that TaxAIHelp provides educational calculations and guidance, not official CPA or legal filing advice.
            </p>

            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full mt-2 font-semibold shadow-sm"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-surface-400 font-semibold tracking-wider">
                Or Instant Preview
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDemoSignup}
            disabled={isLoading}
            className="w-full gap-2 text-surface-800 hover:bg-surface-50 border-surface-300 font-medium"
          >
            <UserCheck className="w-4 h-4 text-brand-600" />
            <span>Try Demo Workspace Immediately</span>
          </Button>

          <div className="mt-6 pt-4 border-t border-surface-100 text-center text-xs text-surface-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:text-brand-900 transition-colors"
            >
              Sign In →
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
