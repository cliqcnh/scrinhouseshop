"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { HeaderSearch } from "./header-search";

export function MobileSearchToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close search drawer when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if we clicked outside both the toggle button and suggestions
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="sm:hidden flex items-center">
      {/* Search Toggle Icon next to account */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Toggle search bar"
      >
        {isOpen ? <X className="size-5 text-primary" /> : <Search className="size-5" />}
      </button>

      {/* Full-width Search Input Row drops down under header */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[68px] z-40 border-b border-border bg-white px-4 py-2.5 shadow-md animate-in slide-in-from-top-1 duration-150">
          <HeaderSearch isMobile />
        </div>
      )}
    </div>
  );
}
