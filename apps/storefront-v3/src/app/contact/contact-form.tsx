"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Send } from "lucide-react";

const SUBJECTS = [
  "General Inquiry",
  "Product Support",
  "Order Status",
  "Returns & Refunds",
  "Partnership",
  "Wholesale",
  "Other",
];

const SUBJECT_CATEGORY_MAP: Record<string, string> = {
  "General Inquiry": "general",
  "Product Support": "product_support",
  "Order Status": "order_status",
  "Returns & Refunds": "returns_refunds",
  Partnership: "general",
  Wholesale: "wholesale",
  Other: "other",
};

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !subject || !message) {
      setError("Please complete all fields before sending your request.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          category: SUBJECT_CATEGORY_MAP[subject] || "general",
          message,
          source: "contact_form",
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to create support ticket");
      }

      setTicketNumber(data?.ticket?.ticket_number || null);
      setSubmitted(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create support ticket",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Support Request Received</h3>
        <p className="text-muted-foreground mb-4">
          Our team will review it and reply as soon as possible.
        </p>
        {ticketNumber && (
          <p className="mb-4 font-mono text-sm font-medium">{ticketNumber}</p>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setSubmitted(false);
            setTicketNumber(null);
          }}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          name="name"
          placeholder="Your name"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className="text-sm font-medium">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Select a subject</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <Textarea
          id="message"
          name="message"
          placeholder="How can we help you?"
          rows={5}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          "Sending..."
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}
