import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-line/70 bg-ink/70 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between">
        <Link href="/" aria-label="LotPilot home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/#how" className="btn-ghost hidden sm:inline-flex">
            How it works
          </Link>
          <Link href="/demo" className="btn-primary">
            Launch agent
          </Link>
        </nav>
      </div>
    </header>
  );
}
