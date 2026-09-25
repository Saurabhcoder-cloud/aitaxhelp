"use client";

import React, { useState } from "react";
import { Container } from "../../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { FormField } from "../../../components/ui/FormField";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="text-center max-w-xl mx-auto mb-10">
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
                    required
                    className="w-full rounded-lg border border-surface-300 p-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </FormField>

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
