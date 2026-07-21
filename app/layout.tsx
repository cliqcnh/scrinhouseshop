import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = localFont({
  variable: "--font-display",
  src: [
    { path: "../public/fonts/CabinetGrotesk-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/CabinetGrotesk-Extrabold.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
});

const body = localFont({
  variable: "--font-body",
  src: [
    { path: "../public/fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Switzer-Semibold.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ScrinHouse — Ghana's Trusted Phone Store & Repair Experts",
    template: "%s | ScrinHouse",
  },
  description:
    "Buy smartphones, accessories, and repair parts, or book a phone repair with doorstep pickup, in Ghana.",
  keywords: ["phone repair Ghana", "buy phones Ghana", "phone accessories", "screen replacement"],
  openGraph: {
    type: "website",
    siteName: "ScrinHouse",
    title: "ScrinHouse — Ghana's Trusted Phone Store & Repair Experts",
    description:
      "Buy smartphones, accessories, and repair parts, or book a phone repair with doorstep pickup, in Ghana.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider delay={150}>
            {children}
            <Toaster position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
