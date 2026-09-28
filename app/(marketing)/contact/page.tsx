"use client";

import React, { useState } from "react";
import { Container } from "../../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { FormField } from "../../../components/ui/FormField";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";

import Link from "next/link";
import { checkSession } from "@/lib/utils/auth-client";
import { LifeBuoy, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    checkSession().then((session) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="text-center max-w-xl mx-auto mb-8">
          <Badge variant="brand" className="mb-3">
            Contact Support
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Get in Touch
          </h1>
          <p className="mt-3 text-sm sm:text-base text-surface-600">
            Have feedback on our tax calculators, architectural inquiries, or partnership proposals? We would love to hear from you.
          </p>
        </div>

        {isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="text-xs text-brand-950">
                <strong className="block text-sm font-bold text-brand-900">
                  Signed in as an authenticated taxpayer
                </strong>
                Access the Support Center to link calculations, track request status, and message staff directly.
              </div>
            </div>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
            >
              <span>Open Support Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <Card className="shadow-card border-surface-200">
          <CardHeader>
            <CardTitle>Send Us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <Alert variant="success" title="Message Sent Successfully">
                Thank you for contacting TaxAIHelp. Our team will review your inquiry and respond within 1-2 business days.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Full Name" id="contactName" required>
                    <Input
                      id="contactName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Name"
                      required
                    />
                  </FormField>

                  <FormField label="Email Address" id="contactEmail" required>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Subject" id="contactSubject" required>
                  <Input
                    id="contactSubject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Calculator feedback, partnership, or general inquiry"
                    maxLength={150}
                    required
                  />
                </FormField>

                <FormField label="Your Message" id="contactMessage" required>
                  <textarea
                    id="contactMessage"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe your question or comments..."
                    maxLength={2000}
                    required
                    className="w-full rounded-lg border border-surface-300 p-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </FormField>

                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-600">
                  <strong>Privacy Notice:</strong> Do NOT submit Social Security Numbers (SSNs), bank account numbers, or confidential filing documents through this general contact form. Submissions are processed in accordance with our <Link href="/privacy" className="text-brand-600 underline">Privacy Policy</Link>.
                </div>

                <Button type="submit" size="md" className="w-full mt-2">
                  Send Message
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
