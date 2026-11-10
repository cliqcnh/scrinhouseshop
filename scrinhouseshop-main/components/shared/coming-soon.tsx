import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 text-center sm:px-6 lg:px-8">
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" className="mt-2 rounded-full" render={<Link href="/" />}>
        Back to home
      </Button>
    </div>
  );
}
