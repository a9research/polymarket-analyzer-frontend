/** Polymarket Data API — GET /v1/leaderboard（与 docs.polymarket.com OpenAPI 一致） */

export type PolymarketTimePeriod = "DAY" | "WEEK" | "MONTH" | "ALL";

/** 与 OpenAPI `GET /v1/leaderboard` 的 `category` 枚举一致 */
export type PolymarketLeaderboardCategory =
  | "OVERALL"
  | "POLITICS"
  | "SPORTS"
  | "CRYPTO"
  | "CULTURE"
  | "MENTIONS"
  | "WEATHER"
  | "ECONOMICS"
  | "TECH"
  | "FINANCE";

export const POLYMARKET_LEADERBOARD_CATEGORY_ORDER: PolymarketLeaderboardCategory[] =
  [
    "OVERALL",
    "POLITICS",
    "SPORTS",
    "CRYPTO",
    "FINANCE",
    "CULTURE",
    "MENTIONS",
    "WEATHER",
    "ECONOMICS",
    "TECH",
  ];

export type PolymarketLeaderboardEntry = {
  rank?: string;
  proxyWallet: string;
  userName?: string;
  vol?: number;
  pnl?: number;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
};

export type LeaderboardSourceMode = "official" | "analyzer";

export function analyzerPeriodToPolymarket(
  p: "today" | "week" | "month" | "all",
): PolymarketTimePeriod {
  switch (p) {
    case "today":
      return "DAY";
    case "week":
      return "WEEK";
    case "month":
      return "MONTH";
    default:
      return "ALL";
  }
}

const DEFAULT_LEADERBOARD_BASE =
  "https://data-api.polymarket.com/v1/leaderboard";

function truthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/**
 * 默认**浏览器直连** Data API `GET /v1/leaderboard`（官方域名，需对方 CORS 允许）。
 *
 * - `NEXT_PUBLIC_POLYMARKET_LEADERBOARD_URL`：可选，覆盖完整 base（默认即官方 URL）
 * - `NEXT_PUBLIC_POLYMARKET_LEADERBOARD_SERVER_PROXY=1`：强制走本站 `/api/polymarket-leaderboard`（Node 代拉，适用于浏览器被 CORS 拦截或仅需服务端出网时）
 */
export async function fetchPolymarketLeaderboard(
  opts: {
    timePeriod: PolymarketTimePeriod;
    category?: PolymarketLeaderboardCategory;
    limit?: number;
    orderBy?: "PNL" | "VOL";
    signal?: AbortSignal;
  },
): Promise<PolymarketLeaderboardEntry[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 30));
  const params = new URLSearchParams({
    timePeriod: opts.timePeriod,
    orderBy: opts.orderBy ?? "PNL",
    limit: String(limit),
    category: opts.category ?? "OVERALL",
  });

  const useProxy = truthyEnv(
    process.env.NEXT_PUBLIC_POLYMARKET_LEADERBOARD_SERVER_PROXY,
  );
  const base = (
    process.env.NEXT_PUBLIC_POLYMARKET_LEADERBOARD_URL?.trim() ||
    DEFAULT_LEADERBOARD_BASE
  ).replace(/\/$/, "");
  const url = useProxy
    ? `/api/polymarket-leaderboard?${params.toString()}`
    : `${base}?${params.toString()}`;

  const res = await fetch(url, {
    signal: opts.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "";
    let hint = "";
    try {
      const j = JSON.parse(text) as { error?: string; hint?: string };
      msg = j.error ?? "";
      hint = j.hint ?? "";
    } catch {
      /* plain text body */
    }
    throw new Error(
      [msg || text.slice(0, 240) || `HTTP ${res.status}`, hint]
        .filter(Boolean)
        .join(" — "),
    );
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("polymarket leaderboard: invalid response");
  }
  return data as PolymarketLeaderboardEntry[];
}
