import { cn } from "@/lib/utils";

export function Tag({
  children,
  variant = "solid",
  className,
}: {
  children: React.ReactNode;
  variant?: "solid" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-[11px] font-medium uppercase tracking-wide",
        variant === "solid"
          ? "bg-foreground text-background"
          : "border border-foreground/20 bg-background text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
