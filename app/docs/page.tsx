"use client";

import Link from "next/link";
import { PUBLIC_DOCS_URL } from "@/lib/docs-url";
import { useI18n } from "@/lib/i18n-context";

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-headline text-3xl font-bold text-white">
        {t("docs.title")}
      </h1>
      <div className="space-y-6 font-jetbrains text-sm leading-relaxed text-zinc-400">
        <p>{t("docs.intro")}</p>
        <p>{t("docs.api")}</p>
        <p>
          <a
            href={PUBLIC_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("docs.linkOut")}
          </a>
        </p>
        <div className="rounded-lg border border-white/10 bg-surface-container-low p-4">
          <h2 className="mb-3 font-headline text-sm font-bold text-white">
            {t("docs.envTitle")}
          </h2>
          <ul className="list-inside list-disc space-y-2 text-zinc-500">
            <li>{t("docs.envApi")}</li>
            <li>{t("docs.envBackend")}</li>
          </ul>
        </div>
        <p>
          <Link href="/" className="text-primary hover:underline">
            ← {t("nav.home")}
          </Link>
        </p>
      </div>
    </main>
  );
}
