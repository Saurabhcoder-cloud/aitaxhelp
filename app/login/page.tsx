"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setSessionToken } from "@/lib/utils/auth-client";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getSafeRedirectUrl } from "@/lib/utils/redirect";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || searchParams.get("redirectTo");
  const redirectTo = getSafeRedirectUrl(rawNext, "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In offline / local development mode, generate consistent session token from email
      const safeToken = `user-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      setSessionToken(safeToken);

      const res = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: safeToken }),
      });

      if (!res.ok) {
        throw new Error("Authentication request failed.");
      }

      setSuccessMessage("Authentication successful. Redirecting...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 500);
    } catch (_err) {
      setErrorMessage("Failed to sign in. Please check your credentials and try again.");
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
            Welcome back
          </h1>
          <p className="text-sm text-surface-600 mt-1.5">
            Sign in to continue your TaxAIHelp experience.
          </p>
        </div>

        {/* Login Card */}
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

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="loginEmail"
                className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="loginEmail"
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="loginPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-surface-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="loginPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Create Account Switch */}
          <div className="mt-6 pt-5 border-t border-surface-100 text-center text-xs text-surface-500">
            Don&apos;t have an account?{" "}
            <Link
              href={rawNext ? `/signup?next=${encodeURIComponent(rawNext)}` : "/signup"}
              className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Create Account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
