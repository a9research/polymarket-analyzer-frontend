"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Database, LineChart, Shield } from "lucide-react";
import { PUBLIC_DOCS_URL } from "@/lib/docs-url";
import { useI18n } from "@/lib/i18n-context";

const REPO_URL = "https://github.com/a9research/Polymarket-Analyzer";

export function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: LineChart, key: "landing.f1" },
    { icon: Database, key: "landing.f2" },
    { icon: BarChart3, key: "landing.f3" },
    { icon: Shield, key: "landing.f4" },
  ] as const;

  return (
    <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />

      <p className="mb-4 flex items-center gap-2 font-jetbrains text-xs tracking-widest text-secondary">
        <span className="h-2 w-2 animate-pulse-live rounded-full bg-secondary" />
        {t("landing.tagline")}
      </p>

      <h1 className="font-headline text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
        {t("landing.heroTitle")}
        <span className="block text-primary-dim sm:mt-1">{t("landing.heroAccent")}</span>
      </h1>

      <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-zinc-400 sm:text-lg">
        {t("landing.heroDesc")}
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/analyzer"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 font-jetbrains text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed"
        >
          {t("landing.ctaLeaderboard")}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/analyzer"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/20 bg-surface-container-low px-6 py-3 font-jetbrains text-sm font-bold text-white transition-colors hover:border-primary/50 hover:text-primary"
        >
          {t("landing.ctaAnalyzer")}
        </Link>
        <a
          href={PUBLIC_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center font-jetbrains text-sm text-zinc-500 underline-offset-4 hover:text-primary hover:underline sm:px-4"
        >
          {t("landing.ctaDocs")}
        </a>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center font-jetbrains text-sm text-zinc-500 underline-offset-4 hover:text-white hover:underline sm:px-2"
        >
          {t("landing.ctaGithub")}
        </a>
      </div>

      <section className="mt-20 border-t border-white/10 pt-16">
        <h2 className="mb-8 font-headline text-xl font-semibold text-white sm:text-2xl">
          {t("landing.sectionFeatures")}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex gap-4 rounded-lg border border-white/5 bg-surface-container-low/50 p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-jetbrains text-sm leading-relaxed text-zinc-400">
                {t(key)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
