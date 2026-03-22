"use client";

import { useI18n } from "@/lib/i18n-context";
import { getFooterSocialLinks } from "@/lib/footer-links";

/** 与 `site-header` 中 `NavLinks` 外链条目同一套字重与颜色 */
const footerLinkClass =
  "font-jetbrains text-xs py-1 transition-colors text-zinc-500 hover:text-white";

export function SiteFooter() {
  const { t } = useI18n();
  const links = getFooterSocialLinks();

  if (links.length === 0) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1920px] items-center px-4 py-3 sm:px-6">
        <nav
          className="flex flex-wrap items-center gap-4 sm:gap-5 xl:gap-6"
          aria-label={t("footer.socialNav")}
        >
          {links.map(({ id, href }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={footerLinkClass}
            >
              {t(`footer.labels.${id}`)}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
