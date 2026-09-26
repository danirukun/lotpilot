import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ChatPanel } from "@/components/ChatPanel";

export const metadata: Metadata = {
  title: "LotPilot live agent",
  description: "Describe your shop. LotPilot ranks matching wholesale lots by fit and margin."
};

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-app py-8">
        <div className="mb-6">
          <span className="label-eyebrow">Live agent</span>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Wholesale buying agent
          </h1>
          <p className="mt-2 max-w-2xl text-paper/65">
            No sign-up. Describe your store or pick a persona. LotPilot ranks lots by fit and
            margin, then runs a simulated buy.
          </p>
        </div>
        <ChatPanel />
      </main>
    </div>
  );
}
