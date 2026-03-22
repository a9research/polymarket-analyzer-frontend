"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Github, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { PUBLIC_DOCS_URL } from "@/lib/docs-url";
import { useI18n, type Locale } from "@/lib/i18n-context";
import { ConnectWallet } from "@/components/connect-wallet";
import { isValidAnalyzeWallet } from "@/lib/evm-wallet";

const GITHUB_REPO_URL = "https://github.com/a9research/Polymarket-Analyzer";

function normalizeWalletInput(raw: string) {
  return raw.trim();
}

type SiteHeaderProps = {
  /** landing = 首页无搜索；home = 有搜索；account = 账户页 */
  variant?: "home" | "account" | "landing";
};

export type HeaderNavItem =
  | { kind: "internal"; href: string; label: string }
  | { kind: "external"; href: string; label: string };

function NavLinks({
  items,
  pathname,
  className,
  linkClassName = "font-jetbrains text-xs py-1 transition-colors",
}: {
  items: readonly HeaderNavItem[];
  pathname: string;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-4 sm:gap-5", className)}>
      {items.map((item, i) => {
        const active =
          item.kind === "internal" && pathname === item.href;
        const styles = cn(
          linkClassName,
          active
            ? "border-b-2 border-primary font-bold text-primary"
            : "text-zinc-500 hover:text-white",
        );
        if (item.kind === "external") {
          return (
            <a
              key={`ext-${i}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles}
            >
              {item.label}
            </a>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={styles}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader({ variant = "home" }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [q, setQ] = useState("");

  const navItems = useMemo(
    (): HeaderNavItem[] => [
      { kind: "internal", href: "/", label: t("nav.home") },
      { kind: "internal", href: "/analyzer", label: t("nav.analyzer") },
      {
        kind: "external",
        href: PUBLIC_DOCS_URL,
        label: t("nav.docs"),
      },
    ],
    [t],
  );

  const onAnalyze = useCallback(() => {
    const w = normalizeWalletInput(q);
    if (!isValidAnalyzeWallet(w)) {
      return;
    }
    router.push(`/analyzer?wallet=${encodeURIComponent(w)}`);
  }, [q, router]);

  const showSearch = variant === "home";
  const showMobileCompactNav = variant === "landing";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1920px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 本地矢量 logo */}
            <img
              src="/logo.svg"
              alt="ForeVex"
              width={1072}
              height={313}
              className="h-7 w-auto sm:h-8"
            />
          </Link>
          <NavLinks
            items={navItems}
            pathname={pathname}
            className="hidden lg:flex xl:gap-6"
          />
        </div>

        {showSearch && (
          <div className="hidden min-w-0 flex-1 max-w-xl px-1 md:block lg:max-w-2xl">
            <div className="group relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-primary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
                placeholder={t("header.searchPlaceholder")}
                className="w-full border-0 border-b border-white/10 bg-surface-container-low py-2 pl-10 pr-4 font-jetbrains text-sm text-white outline-none transition-all focus:border-primary focus:ring-0"
              />
            </div>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded border border-white/10 text-zinc-400 transition-colors hover:border-primary/40 hover:text-white"
            aria-label={t("header.githubAria")}
          >
            <Github className="h-[18px] w-[18px]" />
          </a>
          <div
            className="flex rounded border border-white/10 font-jetbrains text-[10px]"
            role="group"
            aria-label={t("header.langShort")}
          >
            {(["zh", "en"] as const satisfies readonly Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  locale === l
                    ? "bg-primary text-on-primary"
                    : "text-zinc-500 hover:text-white",
                )}
              >
                {l === "zh" ? "中" : "EN"}
              </button>
            ))}
          </div>
          <ConnectWallet />
        </div>
      </div>

      {showMobileCompactNav && (
        <div className="border-t border-white/5 px-4 py-3 lg:hidden">
          <NavLinks
            items={navItems}
            pathname={pathname}
            className="gap-3"
          />
        </div>
      )}

      {showSearch && (
        <div className="border-t border-white/5 px-4 pb-3 md:hidden">
          <div className="group relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
              placeholder={t("header.searchPlaceholderShort")}
              className="w-full border-0 border-b border-white/10 bg-surface-container-low py-2 pl-10 pr-4 font-jetbrains text-sm outline-none focus:border-primary"
            />
          </div>
          <NavLinks
            items={navItems}
            pathname={pathname}
            className="mt-3 gap-3"
            linkClassName="font-jetbrains text-[11px] py-0.5 transition-colors"
          />
        </div>
      )}
    </header>
  );
}
