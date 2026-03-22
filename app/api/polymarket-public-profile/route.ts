import { NextRequest, NextResponse } from "next/server";
import { ANALYZE_WALLET_RE } from "@/lib/evm-wallet";
import { fetchPolymarketUpstream } from "@/lib/polymarket-upstream-fetch";

export const dynamic = "force-dynamic";

const DEFAULT_GAMMA = "https://gamma-api.polymarket.com";

const UPSTREAM_UA =
  process.env.POLYMARKET_GAMMA_USER_AGENT?.trim() ||
  "ForevexPolymarketAnalyzer/1.0 (+https://github.com/polymarket)";

function gammaBase(): string {
  const raw = process.env.POLYMARKET_GAMMA_ORIGIN?.trim() || DEFAULT_GAMMA;
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

/** 可选同源代理：默认前端直连 gamma-api；`NEXT_PUBLIC_POLYMARKET_GAMMA_SERVER_PROXY=1` 时走此路由。 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!ANALYZE_WALLET_RE.test(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const target = `${gammaBase()}/public-profile?address=${encodeURIComponent(address)}`;
  let res: Awaited<ReturnType<typeof fetchPolymarketUpstream>>;
  try {
    res = await fetchPolymarketUpstream(target, {
      timeoutMs: 25_000,
      headers: {
        accept: "application/json",
        "user-agent": UPSTREAM_UA,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[polymarket-public-profile] upstream fetch failed:", target, e);
    }
    return NextResponse.json(
      {
        error: `upstream_unavailable: ${formatFetchError(e)}`,
        hint:
          "Node 访问 gamma-api 超时或被墙：在 .env.local 设 HTTPS_PROXY=http://127.0.0.1:端口（与浏览器代理一致），或配置 POLYMARKET_GAMMA_ORIGIN 反代；也可设 NEXT_PUBLIC_POLYMARKET_GAMMA_SERVER_PROXY=0 改浏览器直连（可能 CORS）。",
      },
      { status: 502 },
    );
  }

  const text = await res.text();
  if (!res.ok && process.env.NODE_ENV === "development") {
    console.error(
      "[polymarket-public-profile] upstream HTTP",
      res.status,
      text.slice(0, 400),
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
