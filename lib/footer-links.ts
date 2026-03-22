/** 页脚社交/外链：仅 `NEXT_PUBLIC_*`，trim 后非空才展示。 */

/** 必须直接写 `process.env.NEXT_PUBLIC_*`，勿用 `process.env[key]`，否则客户端打包无法内联，会与服务端 SSR 不一致（hydration 报错）。 */
function trimEnv(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export type FooterSocialId =
  | "x"
  | "discord"
  | "telegram"
  | "medium"
  | "docs"
  | "github";

export type FooterSocialLink = {
  id: FooterSocialId;
  href: string;
};

/**
 * 文档：优先 `NEXT_PUBLIC_FOOTER_DOCS_URL`，否则 `NEXT_PUBLIC_DOCS_URL`（与顶栏同源；均未配置则页脚不显示「文档」）。
 */
export function getFooterSocialLinks(): FooterSocialLink[] {
  const out: FooterSocialLink[] = [];
  const push = (id: FooterSocialId, href: string) => {
    if (href) out.push({ id, href });
  };

  push("x", trimEnv(process.env.NEXT_PUBLIC_FOOTER_X_URL));
  push("discord", trimEnv(process.env.NEXT_PUBLIC_FOOTER_DISCORD_URL));
  push("telegram", trimEnv(process.env.NEXT_PUBLIC_FOOTER_TELEGRAM_URL));
  push("medium", trimEnv(process.env.NEXT_PUBLIC_FOOTER_MEDIUM_URL));

  const docs =
    trimEnv(process.env.NEXT_PUBLIC_FOOTER_DOCS_URL) ||
    trimEnv(process.env.NEXT_PUBLIC_DOCS_URL);
  push("docs", docs);

  push("github", trimEnv(process.env.NEXT_PUBLIC_FOOTER_GITHUB_URL));

  return out;
}
