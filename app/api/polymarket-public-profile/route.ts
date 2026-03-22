import { NextRequest, NextResponse } from "next/server";
import { ANALYZE_WALLET_RE } from "@/lib/evm-wallet";

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
  let res: Response;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
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
      console.error("[polymarket-public-profile] upstream fetch failed:", target, e);
    }
    return NextResponse.json(
      {
        error: `upstream_unavailable: ${formatFetchError(e)}`,
        hint: "检查网络或配置 POLYMARKET_GAMMA_ORIGIN（反代到 gamma-api.polymarket.com）。",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(t);
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
