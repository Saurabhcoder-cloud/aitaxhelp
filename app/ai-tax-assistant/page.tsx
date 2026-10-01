"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { LegalDisclaimerNotice } from "@/components/shared/LegalDisclaimerNotice";
import { ChatMessage, AIAssistantResponse } from "@/types/ai";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { sendAssistantMessage, fetchConversationMessages } from "@/lib/utils/ai-assistant-api";
import {
  Sparkles,
  Calculator,
  Send,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  History,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  X,
  FileText,
  LifeBuoy,
} from "lucide-react";

const SAMPLE_STARTER_PROMPTS = [
  "Calculate federal tax on $85,000 W-2 salary for single filer",
  "I made $60,000 in 1099 freelance income with $12,000 in expenses. What will I owe?",
  "What is the 2025 standard deduction for Married Filing Jointly?",
  "When are the quarterly estimated tax deadlines for Form 1040-ES?",
  "Which tax calculator should I use as a self-employed freelancer?",
];

/**
 * Safe, type-safe inline renderer for assistant markdown text
 * Converts bold (**text**), inline code (`code`), and list items without innerHTML.
 */
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split("\n");

  const renderInline = (str: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-semibold text-surface-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-surface-100 font-mono text-[12px] text-surface-800 border border-surface-200"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div className="space-y-1.5 text-surface-800 leading-relaxed font-sans text-sm break-words overflow-hidden">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-brand-600 font-bold leading-tight">•</span>
              <span className="flex-1">{renderInline(trimmed.substring(2))}</span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="font-semibold text-brand-700 min-w-[1.2rem]">{numMatch[1]}.</span>
              <span className="flex-1">{renderInline(numMatch[2])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function AIAssistantContent() {
  const searchParams = useSearchParams();
  const queryCalculationId = searchParams.get("calculationId") || undefined;
  const queryConversationId = searchParams.get("conversationId") || undefined;
  const querySessionId = searchParams.get("sessionId") || undefined;
  const queryPrompt = searchParams.get("q") || undefined;

  const [conversationId, setConversationId] = useState<string | undefined>(queryConversationId);
  const [activeCalculationId, setActiveCalculationId] = useState<string | undefined>(queryCalculationId);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(querySessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoadNotice, setHistoryLoadNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const calculationExplainedRef = useRef(false);
  const queryProcessedRef = useRef(false);

  const initWelcomeMessage = useCallback(() => {
    setMessages([
      {
        id: "initial-welcome",
        role: "assistant",
        content:
          "Welcome to TaxAIHelp! I am your AI Tax Assistant.\n\n" +
          "Here is how our architecture works:\n" +
          "• **Authoritative Math**: All federal income tax, self-employment tax, brackets, and quarterly estimates are computed strictly by our IRS-verified deterministic tax engine.\n" +
          "• **AI Explanation Layer**: Gemini translates formulas into plain English, classifies your intent, and explains statutory rules.\n\n" +
          "Ask a question below, or select a sample scenario to get started!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedActions: [
          { label: "W-2 Income Tax", action: "Calculate federal tax on $85,000 W-2 salary for single filer" },
          { label: "1099 Contractor Tax", action: "I made $60,000 in 1099 freelance income with $12,000 in expenses. What will I owe?" },
          { label: "Quarterly Deadlines", action: "When are the quarterly estimated tax deadlines for Form 1040-ES?" },
        ],
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string, calculationIdOverride?: string, sessionIdOverride?: string) => {
      const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
      if (!text || isSubmitting) return;

      if (text.length > 1000) {
        setErrorMessage("Message is too long. Please keep queries under 1,000 characters.");
        return;
      }

      setErrorMessage(null);
      setLastFailedText(null);

      const userMsg: ChatMessage = {
        id: "msg_user_" + Date.now(),
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage("");
      setIsSubmitting(true);

      const activeCalcId = calculationIdOverride !== undefined ? calculationIdOverride : activeCalculationId;
      const activeSessId = sessionIdOverride !== undefined ? sessionIdOverride : activeSessionId;

      try {
        const response = await sendAssistantMessage({
          message: text,
          calculationId: activeCalcId,
          sessionId: activeSessId,
          conversationId,
        });

        if (response.success && response.data) {
          const data: AIAssistantResponse = response.data;
          if (data.conversationId) {
            setConversationId(data.conversationId);
          }

          const assistantMsg: ChatMessage = {
            id: "msg_ast_" + Date.now(),
            role: "assistant",
            content: data.answer,
            intent: data.intent,
            verifiedCalculation: data.calculation?.result,
            suggestedActions: data.suggestedActions,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(response.error || "Unable to retrieve response from AI assistant.");
        }
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : "Service error. Please try again.";
        setErrorMessage(errorText);
        setLastFailedText(text);

        // If the calculation or session context was missing or unauthorized, detach it safely to unblock future messages
        if (
          errorText.toLowerCase().includes("referenced calculation was not found") ||
          errorText.toLowerCase().includes("referenced preparation session was not found") ||
          errorText.toLowerCase().includes("not found")
        ) {
          setActiveCalculationId(undefined);
          setActiveSessionId(undefined);
        }

        const errorMsg: ChatMessage = {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          content:
            "I encountered an issue processing your query through our secure server. " +
            "You can retry below, verify your inputs, or jump directly to our interactive tax calculators.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedActions: [
            { label: "Federal Income Tax Calculator", href: "/tax-calculators/income-tax" },
            { label: "Self-Employed Tax Calculator", href: "/tax-calculators/self-employed" },
            { label: "Quarterly Tax Calculator", href: "/tax-calculators/quarterly-tax" },
          ],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSubmitting(false);
        textareaRef.current?.focus();
      }
    },
    [inputMessage, isSubmitting, activeCalculationId, activeSessionId, conversationId]
  );

  const handleRetry = useCallback(() => {
    if (lastFailedText) {
      handleSendMessage(lastFailedText);
    }
  }, [lastFailedText, handleSendMessage]);

  const handleStartNewSession = () => {
    setConversationId(undefined);
    setActiveCalculationId(undefined);
    setActiveSessionId(undefined);
    setErrorMessage(null);
    setLastFailedText(null);
    setHistoryLoadNotice(null);
    setInputMessage("");
    calculationExplainedRef.current = false;
    queryProcessedRef.current = false;
    initWelcomeMessage();
  };

  const handleDetachCalculation = () => {
    setActiveCalculationId(undefined);
  };

  const handleDetachSession = () => {
    setActiveSessionId(undefined);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  // Initialize conversation or load existing messages
  useEffect(() => {
    if (queryConversationId) {
      setIsLoadingHistory(true);
      setHistoryLoadNotice(null);
      fetchConversationMessages(queryConversationId).then((res) => {
        setIsLoadingHistory(false);
        if (res.success && res.data && res.data.length > 0) {
          setConversationId(queryConversationId);
          setMessages(
            res.data.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))
          );
        } else {
          // If conversation cannot be found or is empty, reset to new session cleanly
          setConversationId(undefined);
          setHistoryLoadNotice("Previous conversation could not be loaded. Initialized a fresh session.");
          initWelcomeMessage();
        }
      });
    } else {
      initWelcomeMessage();
    }
  }, [queryConversationId, initWelcomeMessage]);

  // If calculationId was provided in query, ask for explanation automatically once
  useEffect(() => {
    if (queryCalculationId && !calculationExplainedRef.current && messages.length > 0) {
      calculationExplainedRef.current = true;
      handleSendMessage(
        "Please explain my saved tax calculation and provide breakdown guidance.",
        queryCalculationId
      );
    }
  }, [queryCalculationId, messages.length, handleSendMessage]);

  // If sessionId or specific initial query was provided, trigger explanation automatically once
  useEffect(() => {
    if (!queryProcessedRef.current && messages.length > 0) {
      if (queryPrompt) {
        queryProcessedRef.current = true;
        handleSendMessage(queryPrompt, undefined, querySessionId);
      } else if (querySessionId && !queryCalculationId) {
        queryProcessedRef.current = true;
        handleSendMessage(
          "Please explain my active tax preparation session, calculation results, and next steps.",
          undefined,
          querySessionId
        );
      }
    }
  }, [queryPrompt, querySessionId, queryCalculationId, messages.length, handleSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="py-4 sm:py-8 bg-surface-50 min-h-[calc(100vh-4rem)]">
      <Container size="lg">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="emerald" size="sm" className="gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Deterministic Engine
              </Badge>
              <Badge variant="neutral" size="sm" className="gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                Gemini Explanation Layer
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
              AI Tax Assistant
            </h1>
            <p className="text-xs sm:text-sm text-surface-600 mt-1 max-w-2xl">
              Get IRS-compliant educational explanations and verified tax calculations. The deterministic tax engine is the sole calculation authority.
            </p>
          </div>

          {/* Session Actions */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard/conversations">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <History className="w-3.5 h-3.5" />
                <span>Past Sessions</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartNewSession}
              disabled={isSubmitting}
              className="gap-1.5 text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Session</span>
            </Button>
            <Link
              href={`/dashboard/support/new?category=AI_ASSISTANT${
                conversationId ? `&conversationId=${encodeURIComponent(conversationId)}` : ""
              }${activeCalculationId ? `&calculationId=${encodeURIComponent(activeCalculationId)}` : ""}${
                activeSessionId ? `&sessionId=${encodeURIComponent(activeSessionId)}` : ""
              }`}
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-surface-600 hover:text-red-700">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* History load notice if conversation could not be loaded */}
        {historyLoadNotice && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{historyLoadNotice}</span>
            </div>
            <button
              onClick={() => setHistoryLoadNotice(null)}
              className="text-amber-700 hover:text-amber-900 p-1 rounded hover:bg-amber-100"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Attached Preparation Session Context Pill */}
        {activeSessionId && (
          <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-700 shrink-0" />
              <span>
                <strong>Tax Preparation Session Attached:</strong> AI answers are strictly grounded in your active Tax Preparation Session (ID:{" "}
                <span className="font-mono text-brand-800">{activeSessionId.slice(0, 8)}...</span>)
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetachSession}
              className="h-7 px-2.5 text-[11px] text-brand-800 border-brand-300 hover:bg-brand-100"
            >
              <X className="w-3 h-3 mr-1" />
              Detach Session
            </Button>
          </div>
        )}

        {/* Active Attached Calculation Context Pill */}
        {activeCalculationId && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Calculation Context Attached:</strong> AI answers are informed by your saved calculation (ID:{" "}
                <span className="font-mono text-emerald-800">{activeCalculationId.slice(0, 8)}...</span>)
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetachCalculation}
              className="h-7 px-2.5 text-[11px] text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            >
              <X className="w-3 h-3 mr-1" />
              Detach Context
            </Button>
          </div>
        )}

        {/* Main Conversation Container */}
        <Card className="max-w-4xl mx-auto p-0 overflow-hidden shadow-card border-surface-200">
          {/* Header Bar */}
          <CardHeader className="bg-navy-950 text-white px-4 sm:px-5 py-3.5 sm:py-4 m-0 border-b border-navy-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  TaxAIHelp Controlled Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </CardTitle>
                <p className="text-[11px] text-surface-400">
                  IRS Guidelines Verified • Zero Numerical Hallucinations
                </p>
              </div>
            </div>
            {conversationId && (
              <Badge variant="neutral" size="sm" className="bg-navy-900 text-surface-400 border-navy-700 text-[10px] hidden sm:inline-flex">
                Session: {conversationId.slice(0, 8)}...
              </Badge>
            )}
          </CardHeader>

          {/* Messages Feed */}
          <div className="p-3 sm:p-6 min-h-[380px] h-[55vh] sm:h-[580px] max-h-[640px] overflow-y-auto space-y-5 bg-surface-50/50">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center h-64 text-surface-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                <span className="text-xs">Loading conversation history...</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[94%] sm:max-w-[84%] rounded-2xl p-3.5 sm:p-5 text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-none"
                        : "bg-white border border-surface-200 text-surface-900 rounded-tl-none"
                    }`}
                  >
                    {/* Clear visual distinction between Verified Engine Result vs AI Explanation */}
                    {msg.verifiedCalculation && (
                      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-4 text-surface-900">
                        {/* Verified Engine Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5 mb-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>VERIFIED TAX CALCULATION (DETERMINISTIC ENGINE)</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-700">
                            <Badge variant="emerald" size="sm">
                              Tax Year {msg.verifiedCalculation.taxYear}
                            </Badge>
                            <Badge variant="neutral" size="sm">
                              v{msg.verifiedCalculation.engineVersion}
                            </Badge>
                          </div>
                        </div>

                        {/* Numeric Grid (Authoritative Engine Numbers Only) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Gross Income
                            </span>
                            <span className="font-bold text-surface-900 truncate block">
                              {formatCurrencyFromCents(msg.verifiedCalculation.grossIncomeCents)}
                            </span>
                          </div>

                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Standard Deduction
                            </span>
                            <span className="font-bold text-surface-900 truncate block">
                              {formatCurrencyFromCents(msg.verifiedCalculation.deductionUsedCents)}
                            </span>
                          </div>

                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Taxable Income
                            </span>
                            <span className="font-bold text-surface-900 truncate block">
                              {formatCurrencyFromCents(msg.verifiedCalculation.taxableIncomeCents)}
                            </span>
                          </div>

                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Federal Income Tax
                            </span>
                            <span className="font-bold text-brand-700 truncate block">
                              {formatCurrencyFromCents(msg.verifiedCalculation.federalIncomeTaxCents)}
                            </span>
                          </div>

                          {msg.verifiedCalculation.selfEmploymentTaxCents > 0 && (
                            <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                              <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                                Self-Employment Tax
                              </span>
                              <span className="font-bold text-amber-700 truncate block">
                                {formatCurrencyFromCents(msg.verifiedCalculation.selfEmploymentTaxCents)}
                              </span>
                            </div>
                          )}

                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Total Liability
                            </span>
                            <span className="font-bold text-emerald-800 truncate block">
                              {formatCurrencyFromCents(msg.verifiedCalculation.totalTaxLiabilityCents)}
                            </span>
                          </div>

                          <div className="bg-white/90 p-2 sm:p-2.5 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] uppercase font-sans text-surface-500 font-semibold truncate">
                              Effective / Marginal
                            </span>
                            <span className="font-semibold text-surface-800 truncate block">
                              {(msg.verifiedCalculation.effectiveTaxRate * 100).toFixed(1)}% / {(msg.verifiedCalculation.marginalTaxBracket * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-2 bg-emerald-100/70 p-2 sm:p-2.5 rounded-lg border border-emerald-200">
                            <span className="block text-[10px] uppercase font-sans text-emerald-800 font-semibold truncate">
                              Position Balance
                            </span>
                            <span className="font-bold text-emerald-950 truncate block">
                              {msg.verifiedCalculation.estimatedRefundCents > 0
                                ? `Estimated Refund: ${formatCurrencyFromCents(msg.verifiedCalculation.estimatedRefundCents)}`
                                : msg.verifiedCalculation.estimatedAmountOwedCents > 0
                                ? `Estimated Amount Due: ${formatCurrencyFromCents(msg.verifiedCalculation.estimatedAmountOwedCents)}`
                                : "Balanced ($0.00)"}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Calculator CTA */}
                        <div className="mt-3 pt-2 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-emerald-700">
                            Ruleset: {msg.verifiedCalculation.rulesVersion}
                          </span>
                          <Link
                            href={
                              msg.verifiedCalculation.calculatorType === "self_employed"
                                ? "/tax-calculators/self-employed"
                                : msg.verifiedCalculation.calculatorType === "1099"
                                ? "/tax-calculators/1099"
                                : msg.verifiedCalculation.calculatorType === "quarterly_tax"
                                ? "/tax-calculators/quarterly-tax"
                                : "/tax-calculators/income-tax"
                            }
                            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 transition-colors"
                          >
                            Explore in Calculator
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* AI Explanation Content */}
                    <div className="space-y-1.5">
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 mb-1">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>AI Educational Guidance:</span>
                        </div>
                      )}
                      {msg.role === "assistant" ? (
                        <FormattedMessageText text={msg.content} />
                      ) : (
                        <div className="whitespace-pre-line break-words overflow-hidden">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {/* Suggested Action Chips */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-surface-100 flex flex-wrap gap-1.5">
                        {msg.suggestedActions.map((action, idx) =>
                          action.href ? (
                            <Link
                              key={idx}
                              href={action.href}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-surface-100 hover:bg-brand-50 text-surface-700 hover:text-brand-700 border border-surface-200 hover:border-brand-300 rounded-full text-xs font-medium transition-colors"
                            >
                              <Calculator className="w-3 h-3 text-brand-600" />
                              {action.label}
                            </Link>
                          ) : (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(action.action || action.label)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-surface-50 hover:bg-surface-100 text-surface-700 hover:text-surface-900 border border-surface-200 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 text-[10px]">
                      <span className={msg.role === "user" ? "text-brand-200" : "text-surface-400"}>
                        {msg.timestamp}
                      </span>
                      {msg.role === "assistant" && (
                        <span className="text-surface-400 text-[9px]">
                          Educational Guidance • Not CPA Advice
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isSubmitting && (
              <div className="flex justify-start">
                <div className="bg-white border border-surface-200 rounded-2xl rounded-tl-none p-4 text-xs text-surface-600 flex items-center gap-3 shadow-sm">
                  <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-brand-600 animate-ping absolute" />
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  </div>
                  <span className="font-medium text-surface-700">
                    Evaluating with deterministic tax engine & Gemini explanation layer...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          {messages.length <= 1 && (
            <div className="px-4 sm:px-5 py-3 bg-surface-100/70 border-t border-surface-200/80">
              <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block mb-2">
                Frequently Asked Scenarios:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isSubmitting}
                    className="text-left text-xs bg-white hover:bg-brand-50 border border-surface-200 hover:border-brand-300 text-surface-700 hover:text-brand-700 rounded-lg px-3 py-1.5 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner with Retry Action */}
          {errorMessage && (
            <div className="px-4 sm:px-5 py-2.5 bg-rose-50 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800">
              <div className="flex items-center gap-2 max-w-full truncate">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                {lastFailedText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isSubmitting}
                    className="h-6 px-2 text-[11px] text-rose-800 border-rose-300 bg-white hover:bg-rose-100 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setErrorMessage(null);
                    setLastFailedText(null);
                  }}
                  className="h-6 px-2 text-[10px] text-rose-700 border-rose-300 hover:bg-rose-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Input & Composer */}
          <div className="p-3 sm:p-4 bg-white border-t border-surface-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="space-y-2"
            >
              <div className="relative rounded-xl border border-surface-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 bg-white transition-all shadow-inner-sm">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a federal tax question, or provide your income figures (e.g. $75,000 W-2 single)..."
                  rows={2}
                  maxLength={1000}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none disabled:bg-surface-50"
                />

                <div className="flex items-center justify-between px-3 py-2 border-t border-surface-100 bg-surface-50/50 rounded-b-xl">
                  <div className="flex items-center gap-2 text-[11px] text-surface-400">
                    <span className={inputMessage.length >= 950 ? "text-amber-600 font-semibold" : ""}>
                      {inputMessage.length} / 1000
                    </span>
                    <span className="hidden sm:inline">• Press Enter to send, Shift+Enter for new line</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !inputMessage.trim()}
                    size="sm"
                    className="gap-1.5 h-8 px-4 font-semibold shadow-sm"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Card>

        {/* Legal Disclaimer Notice */}
        <div className="max-w-4xl mx-auto mt-6">
          <LegalDisclaimerNotice compact />
        </div>
      </Container>
    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 bg-surface-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <LoadingState message="Loading AI Tax Assistant..." />
        </div>
      }
    >
      <AIAssistantContent />
    </Suspense>
  );
}
