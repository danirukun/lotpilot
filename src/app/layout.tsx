import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "LotPilot, AI wholesale buying agent",
  description:
    "LotPilot reads your storefront and retrieves relevant wholesale supplier sources for independent UK retailers.",
  metadataBase: new URL("https://lotpilot-ten.vercel.app"),
  openGraph: {
    title: "LotPilot, AI wholesale buying agent",
    description:
      "Describe your shop. LotPilot finds relevant wholesale supplier sources.",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
