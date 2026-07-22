import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none">
      {/* Sleek animating top progress line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-primary/80 animate-pulse origin-left" />
      
      {/* Minimalist center micro-loader */}
      <div className="rounded-lg border border-border bg-background/90 p-4 shadow-xl flex items-center gap-3 pointer-events-auto select-none backdrop-filter">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Updating view…
        </span>
      </div>
    </div>
  );
}
