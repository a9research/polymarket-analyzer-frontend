"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { isValidAnalyzeWallet } from "@/lib/evm-wallet";

export function AnalyzerEmptyState() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = useCallback(() => {
    const w = q.trim();
    if (isValidAnalyzeWallet(w)) {
      router.push(`/analyzer?wallet=${encodeURIComponent(w)}`);
    }
  }, [q, router]);

  return (
    <div className="mx-auto w-full max-w-xl px-1">
      <p className="mb-4 font-jetbrains text-sm leading-relaxed text-zinc-500">
        {t("analyzer.emptyHint")}
      </p>
      <div className="group relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-primary"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("analyzer.searchPlaceholder")}
          className="w-full rounded-lg border border-white/10 bg-surface-container-low py-3 pl-10 pr-4 font-jetbrains text-sm text-white outline-none transition-colors focus:border-primary"
          aria-label={t("analyzer.searchAria")}
        />
      </div>
    </div>
  );
}
