"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in Name, Email, and Message.");
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Thank you! Your message has been sent. We'll get back to you shortly.");
    setForm({ name: "", email: "", phone: "", message: "" });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border border-border p-6 sm:p-8 bg-white rounded-none">
      <h3 className="font-heading text-lg font-bold text-foreground">Send us a Message</h3>
      
      <div>
        <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
          required
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none resize-y"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-none bg-[#1d4ed8] text-white hover:bg-[#1e40af] text-xs font-semibold uppercase tracking-wider gap-2 py-3"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send Message
      </Button>
    </form>
  );
}
