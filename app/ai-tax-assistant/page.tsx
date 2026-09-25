"use client";

import React, { useState } from "react";
import { Container } from "../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { LegalDisclaimerNotice } from "../../components/shared/LegalDisclaimerNotice";
import { ChatMessage } from "../../types/ai";
import { formatCurrencyFromCents } from "../../lib/utils/currency";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-1",
      role: "assistant",
      content:
        "Hello! I am your TaxAIHelp Assistant. I can help you understand US federal tax rules, progressive brackets, deductions, and 1099 self-employment responsibilities.\n\nAll numeric calculations are computed deterministically by our IRS-verified engine. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const samplePrompts = [
    "Calculate federal tax on $75,000 W-2 salary for single filer",
    "I made $60k on 1099 contracts with $12k in expenses. What do I owe?",
    "What is the standard deduction for married filing jointly in 2024?",
    "When are the quarterly estimated tax deadlines for Form 1040-ES?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSubmitting) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const json = await response.json();

      if (json.success && json.data) {
        const assistantMsg: ChatMessage = {
          id: "msg_ast_" + Date.now(),
          role: "assistant",
          content: json.data.answer,
          verifiedCalculation: json.data.verifiedCalculation,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(json.error?.message || "Failed to process request");
      }
    } catch (_err) {
      const errorMsg: ChatMessage = {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content:
          "I encountered an issue processing your query. Please ensure your inputs are clear, or use our dedicated interactive tax calculators directly.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10 bg-surface-50 min-h-[calc(100vh-4rem)]">
      <Container size="lg">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              Gemini + Deterministic Engine
            </Badge>
            <span className="text-xs text-surface-500 font-medium">
              Zero Math Hallucinations
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            AI Tax Assistant
          </h1>
          <p className="mt-2 text-sm sm:text-base text-surface-600">
            Ask federal tax questions, explore deductions, or request calculations. AI provides educational guidance while verified formulas execute via our deterministic engine.
          </p>
        </div>

        {/* Chat Card */}
        <Card className="max-w-3xl mx-auto p-0 overflow-hidden shadow-card border-surface-200">
          <CardHeader className="bg-navy-950 text-white p-4 m-0 border-b border-navy-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white text-sm">
                  T
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    TaxAIHelp Conversational Guide
                  </CardTitle>
                  <p className="text-[11px] text-surface-400">
                    IRS Rev. Proc. 2023-34 Verified • Educational Assistant
                  </p>
                </div>
              </div>
              <Badge variant="neutral" size="sm" className="bg-navy-900 text-surface-300 border-navy-700">
                Active Session
              </Badge>
            </div>
          </CardHeader>

          {/* Messages Feed */}
          <div className="p-6 min-h-[420px] max-h-[550px] overflow-y-auto space-y-4 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-tr-none"
                      : "bg-surface-50 border border-surface-200 text-surface-800 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* If verified calculation was attached */}
                  {msg.verifiedCalculation && (
                    <div className="mt-4 pt-3 border-t border-surface-200 bg-white rounded-lg p-3 text-xs space-y-1.5 font-mono text-surface-800">
                      <div className="font-bold text-brand-700 text-xs mb-1 font-sans">
                        ✓ Verified Calculation by Deterministic Engine:
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Gross Income:</span>
                        <span className="font-semibold">
                          {formatCurrencyFromCents(msg.verifiedCalculation.grossIncomeCents)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Federal Tax Liability:</span>
                        <span className="font-semibold text-brand-700">
                          {formatCurrencyFromCents(msg.verifiedCalculation.totalTaxLiabilityCents)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Effective Tax Rate:</span>
                        <span className="font-semibold">
                          {(msg.verifiedCalculation.effectiveTaxRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <span
                    className={`block mt-2 text-[10px] ${
                      msg.role === "user" ? "text-brand-200" : "text-surface-400"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isSubmitting && (
              <div className="flex justify-start">
                <div className="bg-surface-50 border border-surface-200 rounded-2xl rounded-tl-none p-4 text-sm text-surface-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
                  <span>Processing through deterministic tax engine...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-3 bg-surface-50 border-t border-surface-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-surface-500 font-semibold whitespace-nowrap">Suggested:</span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isSubmitting}
                className="px-2.5 py-1 bg-white border border-surface-200 rounded-full hover:border-brand-300 hover:text-brand-700 whitespace-nowrap text-surface-700 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 bg-white border-t border-surface-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a federal tax question or enter your numbers..."
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-surface-300 px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-surface-50"
              />
              <Button type="submit" disabled={isSubmitting || !inputMessage.trim()} size="md">
                Send
              </Button>
            </form>
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto mt-8">
          <LegalDisclaimerNotice compact />
        </div>
      </Container>
    </div>
  );
}
