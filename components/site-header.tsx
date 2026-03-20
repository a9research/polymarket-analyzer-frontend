"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/", label: "Terminal" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

function normalizeWalletInput(raw: string) {
  return raw.trim();
}

type SiteHeaderProps = {
  /** 账户页可隐藏大搜索，仅保留导航 */
  variant?: "home" | "account";
};

export function SiteHeader({ variant = "home" }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const onAnalyze = useCallback(() => {
    const w = normalizeWalletInput(q);
    if (!w.startsWith("0x") || w.length < 6) {
      return;
    }
    router.push(`/account/${encodeURIComponent(w)}`);
  }, [q, router]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1920px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="font-headline text-lg font-bold uppercase tracking-widest text-white sm:text-xl"
          >
            Polymarket Analyzer
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "font-jetbrains text-xs py-1 transition-colors",
                  pathname === href
                    ? "border-b-2 border-primary font-bold text-primary"
                    : "text-zinc-500 hover:text-white",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {variant === "home" && (
          <div className="hidden min-w-0 flex-1 max-w-2xl px-2 md:block">
            <div className="group relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-primary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
                placeholder="输入钱包地址如 0x..."
                className="w-full border-0 border-b border-white/10 bg-surface-container-low py-2 pl-10 pr-4 font-jetbrains text-sm text-white outline-none transition-all focus:border-primary focus:ring-0"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={variant === "home" ? onAnalyze : () => router.push("/")}
          className="shrink-0 rounded-sm bg-primary px-4 py-2 font-jetbrains text-xs font-bold text-on-primary transition-all hover:bg-primary-fixed active:scale-95 sm:px-6"
        >
          {variant === "home" ? "分析" : "Terminal"}
        </button>
      </div>

      {/* 窄屏搜索 */}
      {variant === "home" && (
        <div className="border-t border-white/5 px-4 pb-3 md:hidden">
          <div className="group relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
              placeholder="0x..."
              className="w-full border-0 border-b border-white/10 bg-surface-container-low py-2 pl-10 pr-4 font-jetbrains text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      )}
    </header>
  );
}
