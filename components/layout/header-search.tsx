"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  const router = useRouter();

  return (
    <form
      role="search"
      className="relative hidden sm:block"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const q = String(formData.get("q") ?? "").trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        placeholder="Search phones, parts, accessories..."
        className="w-56 rounded-full pl-9 lg:w-72"
      />
    </form>
  );
}
