import Link from "next/link";

const FOOTER_LINKS = {
  Shop: [
    { label: "Phones", href: "/category/phones" },
    { label: "Swap / Trade-In", href: "/trade-in" },
    { label: "Accessories", href: "/category/accessories" },
    { label: "Repair Parts", href: "/category/repair-parts" },
  ],
  Repairs: [
    { label: "Book a Repair", href: "/repairs/book" },
    { label: "Track Repair", href: "/track" },
    { label: "Doorstep Pickup", href: "/repairs/pickup" },
  ],
  Company: [
    { label: "About ScrinHouse", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Warranty", href: "/warranty" },
    { label: "Returns", href: "/returns" },
    { label: "FAQ", href: "/faq" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <div>
            <span className="font-heading text-base font-bold tracking-tight text-foreground flex items-baseline">
              ScrinHouse<sup className="text-[10px] font-bold uppercase ml-0.5 align-super">GH</sup>
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              Ghana&apos;s Trusted Phone Store &amp; Repair Experts
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ScrinHouse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
