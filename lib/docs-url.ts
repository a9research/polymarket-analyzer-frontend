/** 顶栏「文档」、Landing CTA 等与 `NEXT_PUBLIC_DOCS_URL` 一致（未设则回退默认）。 */
export const PUBLIC_DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL?.trim() || "https://docs.polymarket.com";
