"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setSessionToken } from "@/lib/utils/auth-client";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getSafeRedirectUrl } from "@/lib/utils/redirect";
import { useI18n } from "@/lib/i18n";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const rawNext = searchParams.get("next") || searchParams.get("redirectTo");
  const redirectTo = getSafeRedirectUrl(rawNext, "/dashboard");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(t("auth.emailRequired"));
      return;
    }

    if (password.length < 8) {
      setErrorMessage(t("auth.passwordRequired"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const safeToken = `user-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      setSessionToken(safeToken);

      // Register session with server
      const sessionRes = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: safeToken, mode: "signup" }),
      });

      if (!sessionRes.ok) {
        throw new Error("Registration session initialization failed.");
      }

      // Update display name if provided
      if (fullName.trim()) {
        try {
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
        } catch (_profileErr) {
          // Profile update is non-fatal for signup flow
        }
      }

      setSuccessMessage("Account created successfully! Preparing your workspace...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 500);
    } catch (_err) {
      setErrorMessage("Failed to complete account registration. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="py-10 sm:py-16 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50/70 px-4">
      <div className="w-full max-w-[420px]">
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-navy-900 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-surface-900 leading-tight">
              TaxAI<span className="text-brand-600">Help</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            {t("auth.createAccountTitle") || "Create your account"}
          </h1>
          <p className="text-sm text-surface-600 mt-1.5">
            {t("auth.createAccountSubtitle") || "Start your guided tax preparation with TaxAIHelp."}
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl border border-surface-200/90 shadow-sm p-6 sm:p-8">
          {errorMessage && (
            <div
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-800"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="signupFullName"
                className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
              >
                Full Name <span className="text-surface-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="signupFullName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={isLoading}
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-surface-300 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:bg-surface-50 disabled:cursor-not-allowed"
                />
                <User className="w-4 h-4 text-surface-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="signupEmail"
                className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="signupEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isLoading}
                  required
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-surface-300 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:bg-surface-50 disabled:cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="signupPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
              >
                Password <span className="text-surface-400 font-normal lowercase">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="signupPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  required
                  className="w-full h-11 pl-9 pr-10 rounded-xl border border-surface-300 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:bg-surface-50 disabled:cursor-not-allowed"
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600 p-0.5 rounded focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="signupConfirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="signupConfirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  required
                  className="w-full h-11 pl-9 pr-10 rounded-xl border border-surface-300 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:bg-surface-50 disabled:cursor-not-allowed"
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600 p-0.5 rounded focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="text-xs text-surface-500 leading-relaxed pt-1">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-brand-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Switch */}
          <div className="mt-6 pt-5 border-t border-surface-100 text-center text-xs text-surface-500">
            Already have an account?{" "}
            <Link
              href={rawNext ? `/login?next=${encodeURIComponent(rawNext)}` : "/login"}
              className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Subtle Trust & Security Row */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-surface-500 text-center">
          <Lock className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
          <span>Secure account access</span>
          <span className="text-surface-300">•</span>
          <span>Your tax information stays protected</span>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
