import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
const steps = [
  ["Read your store", "Share a public storefront or describe the products you want to buy. LotPilot reads relevant stock pages and shows the evidence behind your shop profile."],
  ["Find relevant suppliers", "Search fetched supplier descriptions for your categories, brands and styles. Each result links to its source so you can check the fit."],
  ["Check the details", "Review supplier leads and confirm current stock, condition and prices directly. Buying and negotiation require verified inventory, which is not connected yet."]
];
export default function LandingPage() {
  return <div className="min-h-screen"><SiteHeader />
    <main>
      <section className="container-app py-20 lg:py-28">
        <span className="label-eyebrow">Wholesale research for independent retailers</span>
        <h1 className="mt-4 max-w-4xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">Find wholesale suppliers that fit your shop.</h1>
        <p className="mt-6 max-w-2xl text-lg text-paper/70">Start with your storefront. LotPilot identifies the stock you sell, retrieves relevant supplier sources, and shows you what still needs checking.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/demo" className="btn-primary px-6 py-3">Research my suppliers</Link><a href="#how" className="btn-ghost px-6 py-3">How it works</a></div>
      </section>
      <section id="how" className="container-app border-t border-ink-line py-16">
        <h2 className="font-display text-3xl">From your storefront to sourced supplier leads</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">{steps.map(([title, body], i) => <article key={title} className="card p-6"><span className="font-display text-2xl text-brand-400">0{i + 1}</span><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm text-paper/65">{body}</p></article>)}</div>
      </section>
    </main>
    <footer className="container-app border-t border-ink-line py-8 text-sm text-paper/50">LotPilot · Source-backed supplier research</footer>
  </div>;
}
