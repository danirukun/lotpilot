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
    "LotPilot learns your store DNA, finds matching secondhand wholesale lots, scores fit and margin, and completes the buy. Built for independent UK retailers with their own physical and online stores.",
  metadataBase: new URL("https://lotpilot.vercel.app"),
  openGraph: {
    title: "LotPilot, AI wholesale buying agent",
    description:
      "Describe your shop. LotPilot ranks wholesale lots by fit and margin and completes the buy.",
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
