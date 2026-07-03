"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { apiClient } from "@/lib/api-client";

const FAQ_ITEMS = [
  {
    q: "How do I reset my password?",
    a: "Go to Settings → Password and enter your current password with a new one.",
  },
  {
    q: "How do staff clock in?",
    a: "Use QR Clock Mode to scan the branch QR or tap Clock in/out.",
  },
  {
    q: "How do clients book online?",
    a: "Share your public booking link or enable the client portal from the portal switcher.",
  },
  {
    q: "Where are payouts tracked?",
    a: "Finance shows wallet balance, ledger entries, and payout history.",
  },
];

export default function SupportPage() {
  const { activeOrg } = useAuth();
  const { label } = useBusinessCategory();
  const orgId = activeOrg?.id;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submitMut = useMutation({
    mutationFn: () =>
      apiClient(`/organizations/${orgId}/enquiries`, {
        method: "POST",
        body: JSON.stringify({ subject, message, status: "open" }),
      }),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      toast.success("Enquiry submitted — we'll respond shortly");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submit failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !subject.trim() || !message.trim()) return;
    submitMut.mutate();
  }

  return (
    <ModulePage title="Support" description={`Help and contact for ${label}.`}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Contact us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="mailto:support@hausofwellness.com"
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition hover:bg-muted/30"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">support@hausofwellness.com</p>
                </div>
              </a>
              <a
                href="tel:+254700000000"
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition hover:bg-muted/30"
              >
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">+254 700 000 000</p>
                </div>
              </a>
              <a
                href="https://wa.me/254700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition hover:bg-muted/30"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-muted-foreground">Chat with support</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                FAQ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="rounded-lg border border-border bg-muted/10 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium">{item.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Send an enquiry</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-message">Message</Label>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" disabled={!orgId || submitMut.isPending}>
                  Submit enquiry
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModulePage>
  );
}
