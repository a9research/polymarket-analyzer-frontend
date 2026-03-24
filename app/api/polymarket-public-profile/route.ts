import { NextRequest, NextResponse } from "next/server";
import { ANALYZE_WALLET_RE } from "@/lib/evm-wallet";
import {
  fetchPolymarketUpstream,
  fetchPolymarketUpstreamBare,
} from "@/lib/polymarket-upstream-fetch";

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

/** 同源代理：前端默认 `fetch('/api/polymarket-public-profile?...')`，由 Node 请求 gamma-api（避免浏览器 CORS）。 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!ANALYZE_WALLET_RE.test(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const target = `${gammaBase()}/public-profile?address=${encodeURIComponent(address)}`;
  const hdrs = {
    accept: "application/json",
    "user-agent": UPSTREAM_UA,
  };
  let res: Awaited<ReturnType<typeof fetchPolymarketUpstream>>;
  try {
    try {
      res = await fetchPolymarketUpstreamBare(target, { headers: hdrs });
    } catch (bareErr) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[polymarket-public-profile] bare undici failed, retry with agent/proxy:",
          formatFetchError(bareErr),
        );
      }
      res = await fetchPolymarketUpstream(target, { headers: hdrs });
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[polymarket-public-profile] upstream fetch failed:", target, e);
    }
    return NextResponse.json(
      {
        error: `upstream_unavailable: ${formatFetchError(e)}`,
        hint:
          "Node 访问 gamma-api 失败：可试在 .env.local 设 HTTPS_PROXY（与系统代理一致）、POLYMARKET_GAMMA_ORIGIN 反代，或拉长 POLYMARKET_UPSTREAM_*_TIMEOUT_MS；浏览器地址栏能打开不代表 Node 能出网。",
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
