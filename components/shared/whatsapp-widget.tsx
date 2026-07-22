"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  const phoneNumber = "233208204749";

  function handleStartChat(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const fullText = userMsg
      ? `${userMsg}\n\n(Page: ${currentUrl})`
      : `Hello ScrinHouse! I have an inquiry regarding this page: ${currentUrl}`;
    
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(fullText)}`;
    window.open(waUrl, "_blank");
    setIsOpen(false);
    setUserMsg("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Popover Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-88 border border-border bg-white shadow-2xl rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-10 shrink-0 items-center justify-center bg-white/10 rounded-full">
                <MessageCircle className="size-6 text-white" />
                <span className="absolute bottom-0 right-0 size-2.5 bg-[#25d366] rounded-full ring-2 ring-[#075e54]" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-white">ScrinHouse Support</h4>
                <p className="text-[10px] text-white/80">Online · Replies in a few minutes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body Message */}
          <div className="p-4 bg-[#efeae2]/30 space-y-4">
            <div className="bg-white p-3 rounded-none border border-border text-xs text-foreground leading-relaxed shadow-sm">
              <p className="font-semibold mb-1">Hi there! 👋</p>
              <p className="text-muted-foreground">
                How can we help you today with phones, repairs, or orders?
              </p>
            </div>

            <form onSubmit={handleStartChat} className="space-y-3">
              <textarea
                rows={2}
                value={userMsg}
                onChange={(e) => setUserMsg(e.target.value)}
                placeholder="Type your message here..."
                className="w-full border border-border p-2.5 text-xs focus:border-foreground focus:outline-none bg-white rounded-none resize-none"
              />

              <Button
                type="submit"
                className="w-full bg-[#25d366] hover:bg-[#128c7e] text-white text-xs font-bold uppercase tracking-wider rounded-none gap-2 py-2.5 h-auto border-none"
              >
                <Send className="size-3.5" /> Start WhatsApp Chat
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl hover:bg-[#128c7e] transition-transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open WhatsApp Chat Support"
      >
        {isOpen ? <X className="size-7" /> : <MessageCircle className="size-7" />}
      </button>
    </div>
  );
}
