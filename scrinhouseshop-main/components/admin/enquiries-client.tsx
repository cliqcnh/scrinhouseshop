"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  Send,
  User,
  Mail,
  Phone,
  ExternalLink,
  Loader2,
  Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import {
  listEnquiries,
  getEnquiryMessages,
  replyToEnquiry,
  type EnquiryRow,
  type EnquiryMessage,
} from "@/actions/admin/enquiries";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface EnquiriesClientProps {
  initialEnquiries: EnquiryRow[];
}

export function EnquiriesClient({ initialEnquiries }: EnquiriesClientProps) {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>(initialEnquiries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const selectedEnquiry = enquiries.find((e) => e.id === selectedId);

  // Filter threads
  const filteredEnquiries = enquiries.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.customerName.toLowerCase().includes(q) ||
      e.customerEmail.toLowerCase().includes(q) ||
      e.productName.toLowerCase().includes(q)
    );
  });

  // Load messages when selecting a thread
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    getEnquiryMessages(selectedId)
      .then((res) => {
        setMessages(res);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load message history.");
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [selectedId]);

  // Subscribe to real-time chat messages for selected thread
  useEffect(() => {
    if (!selectedId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`admin_enquiry_messages_${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_enquiry_messages",
          filter: `enquiry_id=eq.${selectedId}`,
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            enquiry_id: string;
            sender: string;
            message: string;
            created_at: string;
          };
          if (!newMsg) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                enquiryId: newMsg.enquiry_id,
                sender: newMsg.sender as "customer" | "admin",
                message: newMsg.message,
                createdAt: newMsg.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  // Subscribe to real-time updates on product_enquiries table to auto-refresh threads list
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin_enquiries_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_enquiries",
        },
        async () => {
          // Re-fetch threads list to keep UI in sync
          try {
            const list = await listEnquiries();
            setEnquiries(list);
          } catch (err) {
            console.error("Failed to sync enquiries list:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || isPending) return;

    const currentReply = replyText.trim();
    setReplyText("");

    // Optimistic message update
    const tempId = `temp-${Date.now()}`;
    const newMsg: EnquiryMessage = {
      id: tempId,
      enquiryId: selectedId,
      sender: "admin",
      message: currentReply,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Optimistically update thread status to replied
    setEnquiries((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, status: "replied" } : e))
    );

    startTransition(async () => {
      try {
        const res = await replyToEnquiry(selectedId, currentReply);
        if (!res.success) {
          toast.error(res.error ?? "Failed to send message.");
          // Revert optimistic updates
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while sending.");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[500px] border border-border rounded-lg overflow-hidden bg-background">
      {/* ── Left Pane: Active Threads ───────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-3.5 border-b border-border/80">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search enquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-muted/30 border-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredEnquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Inbox className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold">No threads found</p>
            </div>
          ) : (
            filteredEnquiries.map((e) => {
              const isSelected = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                    isSelected ? "bg-muted/65" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                      {e.customerName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(e.createdAt)}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground truncate font-medium">
                    Asking: {e.productName}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                      {e.customerPhone}
                    </span>
                    <Badge
                      variant={e.status === "pending" ? "default" : "secondary"}
                      className={`text-[9px] px-1.5 py-0 uppercase font-semibold tracking-wider ${
                        e.status === "pending"
                          ? "bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {e.status === "pending" ? "Pending" : "Replied"}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Pane: Active Chat Window ─────────────────────────── */}
      <div className="flex-1 flex flex-col bg-muted/5 min-w-0">
        {selectedEnquiry ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm z-10 shrink-0">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-4 text-muted-foreground" />
                  {selectedEnquiry.customerName}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {selectedEnquiry.customerEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {selectedEnquiry.customerPhone}
                  </span>
                </div>
              </div>

              {/* Product Reference Card */}
              <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-1.5 text-xs max-w-sm shrink-0">
                <div className="relative size-8 rounded border border-border overflow-hidden bg-background">
                  {selectedEnquiry.productImageUrl && (
                    <Image
                      src={selectedEnquiry.productImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-[11px]">
                    {selectedEnquiry.productName}
                  </p>
                  <Link
                    href={`/admin/products/${selectedEnquiry.productId}`}
                    className="text-[10px] text-primary font-medium flex items-center gap-0.5 hover:underline"
                  >
                    View details <ExternalLink className="size-2.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary mb-2" />
                  <p className="text-xs">Loading message logs...</p>
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isAdmin = m.sender === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                            isAdmin
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-background text-foreground border border-border/80 rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          <p
                            className={`text-[9px] mt-1.5 text-right ${
                              isAdmin ? "text-primary-foreground/75" : "text-muted-foreground"
                            }`}
                          >
                            {formatDate(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Reply Submit Footer */}
            <form onSubmit={handleSendReply} className="p-3 border-t border-border bg-background flex gap-2 items-end shrink-0">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${selectedEnquiry.customerName}...`}
                rows={2}
                disabled={isPending}
                className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!replyText.trim() || isPending}
                className="size-9 shrink-0"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <MessageSquare className="size-12 text-muted-foreground/30 mb-3 animate-pulse" />
            <h3 className="text-sm font-semibold text-foreground">Select an Enquiry</h3>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Choose a message thread from the list on the left to view customer contact info and send replies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
