import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="relative flex flex-col items-center gap-4">
        {/* Glowing Brand Icon Badge */}
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-neutral-900 shadow-2xl shadow-neutral-950/20 ring-1 ring-white/20 animate-pulse">
          <Sparkles className="size-8 text-white animate-spin duration-1000" />
        </div>
        
        {/* Subtle Brand Text */}
        <div className="flex items-center gap-1.5 font-heading text-sm font-bold tracking-wider text-foreground">
          <span>SCRIN</span>
          <span className="text-muted-foreground font-medium">HOUSE</span>
        </div>

        {/* Liquid Progress Bar */}
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full bg-foreground animate-pulse" />
        </div>
      </div>
    </div>
  );
}
