/**
 * Polymarket 官网个人页使用的公开接口（与 docs/apii.md 一致，非保证稳定的公开契约）。
 *
 * - `GET https://data-api.polymarket.com/v1/user-stats?proxyAddress=0x…`
 * - `GET https://user-pnl-api.polymarket.com/user-pnl?user_address=0x…&interval=&fidelity=`
 *
 * 可选覆盖：`NEXT_PUBLIC_POLYMARKET_USER_STATS_URL`（完整 path 前缀，不含 query）、
 * `NEXT_PUBLIC_POLYMARKET_USER_PNL_URL`（同上，默认 `https://user-pnl-api.polymarket.com/user-pnl`）。
 */

export type PolymarketOfficialUserStats = {
  trades?: number;
  largestWin?: number;
  views?: number;
  joinDate?: string;
  /** 部分账户响应中含累计盈亏，与官网大数字一致（字段以实际 JSON 为准） */
  pnl?: number;
};

export type PolymarketOfficialPnlPoint = {
  /** Unix 时间戳（秒） */
  t: number;
  /** 该时点累计 PnL（官网曲线纵轴） */
  p: number;
};

/**
 * Tab → 与 polymarket.com 个人页一致的 query（抓包见 `docs/apii.md`）。
 * 注意：同一 `interval` 在不同场景下可能配不同 `fidelity`（如 1M 另有 `18h` 版本）；此处与 Tab 一一对应。
 */
export const OFFICIAL_PNL_RANGE_PARAMS: Record<
  "1d" | "1w" | "1m" | "all",
  { interval: string; fidelity: string }
> = {
  /** apii.md L40 */
  "1d": { interval: "1d", fidelity: "1h" },
  /** apii.md L56 — 非 1d */
  "1w": { interval: "1w", fidelity: "3h" },
  /** apii.md L22（另有 L73 `fidelity=18h` 为更粗粒度） */
  "1m": { interval: "1m", fidelity: "1d" },
  /** apii.md L90 — 非 max */
  all: { interval: "all", fidelity: "12h" },
};

function statsBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_POLYMARKET_USER_STATS_URL?.trim() ||
    "https://data-api.polymarket.com/v1/user-stats";
  return raw.replace(/\/$/, "");
}

function pnlBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_POLYMARKET_USER_PNL_URL?.trim() ||
    "https://user-pnl-api.polymarket.com/user-pnl";
  return raw.replace(/\/$/, "");
}

export async function fetchPolymarketOfficialUserStats(
  proxyAddress: string,
  opts?: { signal?: AbortSignal },
): Promise<PolymarketOfficialUserStats> {
  const addr = proxyAddress.trim().toLowerCase();
  const url = `${statsBaseUrl()}?proxyAddress=${encodeURIComponent(addr)}`;
  const res = await fetch(url, {
    signal: opts?.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`user-stats HTTP ${res.status}`);
  }
  const j = (await res.json()) as PolymarketOfficialUserStats;
  return j;
}

export async function fetchPolymarketOfficialUserPnlSeries(
  userAddress: string,
  range: keyof typeof OFFICIAL_PNL_RANGE_PARAMS,
  opts?: { signal?: AbortSignal },
): Promise<PolymarketOfficialPnlPoint[]> {
  const addr = userAddress.trim().toLowerCase();
  const { interval, fidelity } = OFFICIAL_PNL_RANGE_PARAMS[range];
  const params = new URLSearchParams({
    user_address: addr,
    interval,
    fidelity,
  });
  const url = `${pnlBaseUrl()}?${params.toString()}`;
  const res = await fetch(url, {
    signal: opts?.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`user-pnl HTTP ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("user-pnl: expected JSON array");
  }
  return data.map((row) => {
    const o = row as { t?: number; p?: number };
    if (typeof o.t !== "number" || typeof o.p !== "number") {
      throw new Error("user-pnl: invalid point shape");
    }
    return { t: o.t, p: o.p };
  });
}
