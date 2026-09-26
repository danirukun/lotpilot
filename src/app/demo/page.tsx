import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ChatPanel } from "@/components/ChatPanel";

export const metadata: Metadata = {
  title: "LotPilot live agent",
  description: "Describe your shop. LotPilot retrieves relevant supplier sources."
};

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-app py-8">
        <div className="mb-6">
          <span className="label-eyebrow">Live agent</span>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Wholesale supplier research
          </h1>
          <p className="mt-2 max-w-2xl text-paper/65">
            Describe your store or provide its URL. Review sourced supplier leads and confirm stock,
            grades and prices directly with the supplier.
          </p>
        </div>
        <ChatPanel />
      </main>
    </div>
  );
}
