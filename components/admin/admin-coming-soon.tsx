import type { LucideIcon } from "lucide-react";

export function AdminComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center">
      <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="font-heading text-xl font-bold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
