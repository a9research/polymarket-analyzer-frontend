import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_ORIGIN = "https://data-api.polymarket.com";

/** 部分环境对无 UA 的服务端请求更严格；与浏览器行为接近 */
const UPSTREAM_UA =
  process.env.POLYMARKET_DATA_API_USER_AGENT?.trim() ||
  "ForevexPolymarketAnalyzer/1.0 (+https://github.com/polymarket)";

function upstreamBase(): string {
  const raw = process.env.POLYMARKET_DATA_API_ORIGIN?.trim() || DEFAULT_ORIGIN;
  return raw.replace(/\/$/, "");
}

function formatFetchError(e: unknown): string {
  if (e instanceof Error) {
    const c = (e as Error & { cause?: unknown }).cause;
    if (c instanceof Error) return `${e.message} (${c.name}: ${c.message})`;
    if (c != null) return `${e.message} (cause: ${String(c)})`;
    return e.message;
  }
  return String(e);
}

/** 可选同源代理：默认前端直连 data-api；`NEXT_PUBLIC_POLYMARKET_LEADERBOARD_SERVER_PROXY=1` 时走此路由。 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();

  const pass = [
    "category",
    "timePeriod",
    "orderBy",
    "limit",
    "offset",
    "user",
    "userName",
  ] as const;
  for (const key of pass) {
    const v = sp.get(key);
    if (v != null && v !== "") qs.set(key, v);
  }

  if (!qs.has("timePeriod")) qs.set("timePeriod", "DAY");
  if (!qs.has("orderBy")) qs.set("orderBy", "PNL");
  if (!qs.has("limit")) qs.set("limit", "25");
  if (!qs.has("category")) qs.set("category", "OVERALL");

  const target = `${upstreamBase()}/v1/leaderboard?${qs.toString()}`;
  let res: Response;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    res = await fetch(target, {
      headers: {
        accept: "application/json",
        "user-agent": UPSTREAM_UA,
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[polymarket-leaderboard] upstream fetch failed:", target, e);
    }
    return NextResponse.json(
      {
        error: `upstream_unavailable: ${formatFetchError(e)}`,
        hint: "Node 无法访问 data-api.polymarket.com 时常见：网络/防火墙/地区限制。可设 HTTPS_PROXY、POLYMARKET_DATA_API_ORIGIN（反代），或 NEXT_PUBLIC_POLYMARKET_LEADERBOARD_URL 让浏览器直连。",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  if (!res.ok && process.env.NODE_ENV === "development") {
    console.error(
      "[polymarket-leaderboard] upstream HTTP",
      res.status,
      text.slice(0, 500),
    );
  }
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type":
        res.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
