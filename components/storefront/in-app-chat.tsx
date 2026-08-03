"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, ArrowLeft, Loader2, ChevronRight, MessageSquare, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  submitProductEnquiry, 
  listCustomerEnquiries, 
  getCustomerEnquiryMessages, 
  sendCustomerMessage 
} from "@/actions/storefront/enquiry";
import { createClient } from "@/lib/supabase/client";

interface EnquiryThread {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "replied" | "closed";
  createdAt: string;
}

interface MessageItem {
  id: string;
  enquiryId: string;
  sender: "customer" | "admin";
  message: string;
  createdAt: string;
}

export function InAppChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Navigation & list states
  const [threads, setThreads] = useState<EnquiryThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  
  // Product context from event
  const [productContext, setProductContext] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [view, setView] = useState<"list" | "chat" | "new-enquiry">("list");

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [initialMsg, setInitialMsg] = useState("");
  const [replyMsg, setReplyMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initialize or load session token & contact info
  useEffect(() => {
    if (typeof window === "undefined") return;

    let token = localStorage.getItem("scrinhouse_chat_session_token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("scrinhouse_chat_session_token", token);
    }
    setSessionToken(token);

    const savedName = localStorage.getItem("scrinhouse_chat_name") || "";
    const savedEmail = localStorage.getItem("scrinhouse_chat_email") || "";
    const savedPhone = localStorage.getItem("scrinhouse_chat_phone") || "";

    setCustomerName(savedName);
    setCustomerEmail(savedEmail);
    setCustomerPhone(savedPhone);
  }, []);

  // 2. Custom event listener to open chat on product pages
  useEffect(() => {
    function handleOpenChat(e: Event) {
      const customEvent = e as CustomEvent;
      const { productId, productName, productSlug } = customEvent.detail || {};
      
      setProductContext({ id: productId, name: productName, slug: productSlug });
      setIsOpen(true);
      setView("new-enquiry");
      setInitialMsg(`Hi, I'd like to make an enquiry regarding "${productName}".`);
    }

    async function handleOpenThreadEvent(e: Event) {
      const customEvent = e as CustomEvent;
      const { enquiryId } = customEvent.detail || {};
      if (!enquiryId || !sessionToken) return;

      setIsOpen(true);
      await loadThreads(sessionToken);
      handleOpenThread(enquiryId);
    }

    window.addEventListener("scrinhouse-open-chat", handleOpenChat);
    window.addEventListener("scrinhouse-open-thread", handleOpenThreadEvent);
    return () => {
      window.removeEventListener("scrinhouse-open-chat", handleOpenChat);
      window.removeEventListener("scrinhouse-open-thread", handleOpenThreadEvent);
    };
  }, [sessionToken]);

  // 3. Load customer threads
  async function loadThreads(token: string) {
    setListLoading(true);
    try {
      const data = await listCustomerEnquiries(token);
      setThreads(data);
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setListLoading(false);
    }
  }

  // Reload threads automatically when widget opens
  useEffect(() => {
    if (isOpen && sessionToken) {
      loadThreads(sessionToken);
    }
  }, [isOpen, sessionToken]);

  // Subscribe to real-time chat messages and status updates
  useEffect(() => {
    if (!isOpen || !activeThreadId) return;

    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel(`enquiry_messages_${activeThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_enquiry_messages",
          filter: `enquiry_id=eq.${activeThreadId}`,
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            enquiry_id: string;
            sender: "customer" | "admin";
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
                sender: newMsg.sender,
                message: newMsg.message,
                createdAt: newMsg.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [isOpen, activeThreadId]);

  // Subscribe to real-time updates on active thread attributes (such as replies status)
  useEffect(() => {
    if (!isOpen || !sessionToken) return;

    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel(`enquiry_status_${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "product_enquiries",
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            status: EnquiryThread["status"];
          };
          if (!updated) return;

          setThreads((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? { ...t, status: updated.status }
                : t
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [isOpen, sessionToken]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, view]);

  // Load chat messages when selecting a thread
  const handleOpenThread = useCallback(async (threadId: string) => {
    if (!sessionToken) return;
    setActiveThreadId(threadId);
    setView("chat");
    setMessagesLoading(true);
    try {
      const msgs = await getCustomerEnquiryMessages(threadId, sessionToken);
      setMessages(msgs);
      
      // Clear status locally or refresh thread list status
      setThreads((prev) => 
        prev.map((t) => (t.id === threadId ? { ...t, status: (t.status === "replied" ? "pending" : t.status) as EnquiryThread["status"] } : t))
      );
    } catch {
      toast.error("Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }, [sessionToken]);

  // Submit new enquiry thread
  async function handleCreateEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken || !productContext) return;
    
    if (!customerName || !customerEmail || !customerPhone || !initialMsg) {
      toast.error("Please fill in all details.");
      return;
    }

    setSubmitting(true);
    try {
      // Save contact details to local storage
      localStorage.setItem("scrinhouse_chat_name", customerName);
      localStorage.setItem("scrinhouse_chat_email", customerEmail);
      localStorage.setItem("scrinhouse_chat_phone", customerPhone);

      const res = await submitProductEnquiry(
        productContext.id,
        {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          message: initialMsg,
        },
        sessionToken
      );

      if (!res.success) {
        toast.error(res.error ?? "Failed to create enquiry.");
        return;
      }

      toast.success("Enquiry submitted!");
      setInitialMsg("");
      await loadThreads(sessionToken);
      
      // Auto open the newly created thread
      if (res.enquiryId) {
        handleOpenThread(res.enquiryId);
      } else {
        setView("list");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Reply message
  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThreadId || !sessionToken || !replyMsg.trim()) return;

    const messageToSend = replyMsg.trim();
    setReplyMsg("");

    // optimistic update
    const tempId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        enquiryId: activeThreadId,
        sender: "customer",
        message: messageToSend,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await sendCustomerMessage(activeThreadId, messageToSend, sessionToken);
      if (!res.success) {
        toast.error(res.error ?? "Failed to send message.");
        // remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      toast.error("Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  const hasUnread = threads.some((t) => t.status === "replied");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Popover Support Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 border border-border bg-card shadow-2xl rounded-lg overflow-hidden flex flex-col h-[520px] animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-[#121212] text-white p-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              {view !== "list" && (
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="text-white/60 hover:text-white mr-1 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <div className="relative flex size-9 shrink-0 items-center justify-center bg-white/10 rounded-full">
                <MessageSquare className="size-5 text-white" />
                <span className="absolute bottom-0 right-0 size-2.5 bg-[#22c55e] rounded-full ring-2 ring-[#121212]" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-white">ScrinHouse Support</h4>
                <p className="text-[10px] text-white/60">In-App Chat · Online</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {/* Body Content depending on View */}
          <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
            
            {/* VIEW 1: THREAD LIST */}
            {view === "list" && (
              <div className="space-y-4 h-full flex flex-col">
                <div className="bg-muted/30 p-3.5 border border-border text-xs text-muted-foreground leading-relaxed flex flex-col gap-1.5">
                  <p className="font-semibold text-foreground">Hi there! 👋</p>
                  <p>Welcome to ScrinHouse support. Ask us about any of our devices, installment options, or request screen and diagnostic repairs.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  <h5 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Your Inquiries</h5>
                  
                  {listLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Loading chats...</span>
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded p-4 text-xs text-muted-foreground">
                      No active support threads. Start one by clicking &quot;Make enquiry&quot; on any product page.
                    </div>
                  ) : (
                    threads.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleOpenThread(t.id)}
                        className="w-full text-left p-3 bg-card border border-border hover:border-foreground/40 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="relative size-10 bg-muted/40 shrink-0 border border-border rounded flex items-center justify-center">
                            {t.productImageUrl ? (
                              <img src={t.productImageUrl} alt={t.productName} className="object-contain size-8" />
                            ) : (
                              <ShoppingBag className="size-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h6 className="text-xs font-semibold text-foreground truncate">{t.productName}</h6>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Status: {t.status === "replied" ? "Admin Replied" : "Pending reply"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.status === "replied" && (
                            <span className="size-2 bg-red-500 rounded-full shrink-0" />
                          )}
                          <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: NEW ENQUIRY FORM */}
            {view === "new-enquiry" && productContext && (
              <form onSubmit={handleCreateEnquiry} className="space-y-3.5">
                <div className="bg-accent/40 border border-border p-3 flex items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center bg-white border border-border text-foreground">
                    <ShoppingBag className="size-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Enquiring about</p>
                    <p className="text-xs font-semibold text-foreground truncate">{productContext.name}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-border p-2.5 text-xs bg-card focus:border-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter email for notifications"
                    className="w-full border border-border p-2.5 text-xs bg-card focus:border-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 024 000 0000"
                    className="w-full border border-border p-2.5 text-xs bg-card focus:border-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Initial Question</label>
                  <textarea
                    rows={3}
                    required
                    value={initialMsg}
                    onChange={(e) => setInitialMsg(e.target.value)}
                    placeholder="Ask us anything..."
                    className="w-full border border-border p-2.5 text-xs bg-card focus:border-foreground focus:outline-none resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full uppercase text-xs font-bold tracking-wider rounded-none h-10 mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" /> Submitting Enquiry...
                    </>
                  ) : (
                    "Send Enquiry Thread"
                  )}
                </Button>
              </form>
            )}

            {/* VIEW 3: ACTIVE CHAT FRAME */}
            {view === "chat" && (
              <div className="flex flex-col h-full space-y-3">
                {messagesLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading chat history...</span>
                  </div>
                ) : (
                  <>
                    {/* Message Bubble Feed */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 flex flex-col">
                      <div className="text-[10px] text-muted-foreground text-center py-2 border-b border-border mb-2">
                        Chat started. Support agents will respond directly here.
                      </div>
                      
                      {messages.map((m) => {
                        const isAdmin = m.sender === "admin";
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col max-w-[80%] ${isAdmin ? "self-start" : "self-end items-end"}`}
                          >
                            <div
                              className={`p-3 text-xs leading-relaxed ${
                                isAdmin
                                  ? "bg-muted text-foreground border border-border"
                                  : "bg-primary text-primary-foreground font-medium"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.message}</p>
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-1">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Editor Input footer */}
                    <form onSubmit={handleSendReply} className="border-t border-border pt-3 mt-auto flex gap-2">
                      <input
                        type="text"
                        value={replyMsg}
                        onChange={(e) => setReplyMsg(e.target.value)}
                        placeholder="Write a message..."
                        className="flex-1 border border-border px-3 py-2 text-xs bg-card focus:border-foreground focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!replyMsg.trim()}
                        className="flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-95"
                      >
                        <Send className="size-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating launcher bubble button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex size-14 items-center justify-center rounded-full bg-[#121212] border border-white/10 text-white shadow-xl hover:bg-neutral-900 transition-transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open In-App Support Chat"
      >
        {isOpen ? <X className="size-6" /> : <MessageSquare className="size-6" />}
        {hasUnread && !isOpen && (
          <span className="absolute top-0 right-0 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-red-500" />
          </span>
        )}
      </button>
    </div>
  );
}
