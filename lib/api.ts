const DEFAULT_DEV_API = "http://127.0.0.1:3000";

/** 使用同源代理时设为 `/api/backend`（见 README）；此时需配置服务端 ANALYZER_BACKEND_URL */
const PROXY_SENTINELS = new Set(["/api/backend", "proxy", "PROXY"]);

/**
 * 返回 API 根：完整 URL（直连）或空字符串表示走 `/api/backend/*` 代理。
 */
export function getApiBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (v && PROXY_SENTINELS.has(v.replace(/\/$/, ""))) {
    return "";
  }
  if (v) return v.replace(/\/$/, "");
  return DEFAULT_DEV_API;
}

/** 构建请求 URL：直连 `https://host/analyze/...` 或代理 `/api/backend/analyze/...` */
export function apiUrl(pathWithQuery: string): string {
  const clean = pathWithQuery.replace(/^\//, "");
  const base = getApiBaseUrl();
  if (base === "") {
    return `/api/backend/${clean}`;
  }
  return `${base}/${clean}`;
}

export type LeaderboardItem = {
  wallet: string;
  net_pnl: number;
  total_volume: number;
  trades_count: number;
  updated_at: string;
};

export type LeaderboardResponse = {
  items: LeaderboardItem[];
};

/** 与后端 `TradeLedgerRow` 一致 */
export type TradeLedgerRow = {
  ts_ms: number;
  slug: string;
  condition_id: string;
  outcome?: string | null;
  row_kind: string;
  size: number;
  buy_price: number;
  buy_total: number;
  sell_price: number;
  sell_total: number;
  pnl: number;
  title?: string | null;
};

/** 2.5.4+：证明 paired 视图 = 全表去掉 BUY，Σpnl 一致 */
/** 与后端 `PositionMarketPick` 一致 — 用于按市场拉 `/position-activity` */
export type PositionMarketPick = {
  condition_id: string;
  slug?: string | null;
  title?: string | null;
  outcome?: string | null;
  status: string;
  size?: number | null;
  avg_price?: number | null;
  cash_pnl?: number | null;
  realized_pnl?: number | null;
  current_value?: number | null;
};

export type PositionActivityResponse = {
  wallet: string;
  market: string;
  activity_count: number;
  max_timestamp_sec: number;
  incremental_from_cache: boolean;
  no_cache: boolean;
  postgres: boolean;
  activities: unknown[];
};

export type TradeLedgerIntegrity = {
  full_row_count: number;
  buy_row_count: number;
  sell_row_count: number;
  settlement_row_count: number;
  paired_row_count: number;
  sum_pnl_full: number;
  sum_pnl_paired: number;
  integrity_ok: boolean;
};

export type LeaderboardPeriod = "all" | "today" | "week" | "month";

export async function fetchLeaderboard(
  limit = 30,
  opts?: { signal?: AbortSignal; period?: LeaderboardPeriod },
): Promise<LeaderboardItem[]> {
  const period = opts?.period ?? "all";
  const params = new URLSearchParams({ limit: String(limit) });
  if (period !== "all") params.set("period", period);
  const res = await fetch(apiUrl(`leaderboard?${params.toString()}`), {
    signal: opts?.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `leaderboard ${res.status}`,
    );
  }
  const data = (await res.json()) as LeaderboardResponse;
  return data.items ?? [];
}

/** 与后端 `DataLineage` 对齐（账户管线常见 `analytics_primary_source: data_api_positions`） */
export type DataLineage = {
  analytics_primary_source: string;
  canonical_merge_applied?: boolean;
  markets_dim_enriched?: boolean;
};

// Minimal report typing — 与后端 AnalyzeReport 对齐时可逐步扩充
export type AnalyzeReport = {
  schema_version: string;
  /** `account` = 持仓 + 已平仓 + Gamma，无 analyze 内全量 /trades */
  analysis_pipeline?: string | null;
  wallet: string;
  /** Distinct slugs (Polymarket user-stats.trades style); 2.4+ */
  trades_count: number;
  /** Raw /trades row count; 2.4+ */
  trades_fill_count?: number;
  total_volume: number;
  data_fetch?: { truncated?: boolean; max_offset_allowed?: number | null };
  lifetime: {
    total_trades: number;
    total_volume: number;
    net_pnl: number;
    /** 2.5+ Gamma 已结算市场、未卖出份额的结算盈亏分项 */
    net_pnl_settlement?: number;
    open_position_value: number;
    max_single_win: number;
    max_single_loss: number;
    closed_realized_pnl_sum?: number | null;
    open_positions_count?: number | null;
  };
  market_distribution: Array<{
    market_type: string;
    trades: number;
    volume: number;
    pnl: number;
    trades_pct: number;
    volume_pct: number;
  }>;
  price_buckets_chart?: Array<{
    label: string;
    range_low: number;
    range_high: number;
    count: number;
  }>;
  time_analysis: {
    active_hours_utc: Record<string, number>;
    metadata_missing_ratio: number;
    entry_to_resolution_p50_sec?: number | null;
    entry_to_resolution_p90_sec?: number | null;
  };
  trading_patterns: {
    win_rate_overall: number;
    win_rate_by_market_type: Array<{ market_type: string; win_rate: number }>;
    side_bias: {
      buy_pct: number;
      sell_pct: number;
      yes_pct: number;
      no_pct: number;
    };
    grid_like_market_ratio?: number | null;
  };
  strategy_inference: {
    primary_style: string;
    rule_json: Record<string, unknown>;
    pseudocode: string;
  };
  frontend?: {
    biggest_wins: Array<{
      slug: string;
      side: string;
      price: number;
      size: number;
      pnl: number;
      cash_flow: number;
      timestamp: number;
      title?: string | null;
    }>;
    biggest_losses: Array<{
      slug: string;
      side: string;
      price: number;
      size: number;
      pnl: number;
      cash_flow: number;
      timestamp: number;
      title?: string | null;
    }>;
    recent_trades: Array<{
      slug: string;
      side: string;
      price: number;
      size: number;
      pnl: number;
      cash_flow: number;
      timestamp: number;
      title?: string | null;
    }>;
    /** Chronological BUY / SELL (per Data API fill) + SETTLEMENT synthetic rows. */
    trade_ledger?: TradeLedgerRow[];
    /** 2.5.3+：仅 SELL + SETTLEMENT，每行均有已实现 pnl（均价法退出侧）。 */
    trade_ledger_paired?: TradeLedgerRow[];
    trade_ledger_integrity?: TradeLedgerIntegrity | null;
    current_positions: Array<{
      slug?: string | null;
      title?: string | null;
      outcome?: string | null;
      size?: number | null;
      avg_price?: number | null;
      cur_price?: number | null;
      cash_pnl?: number | null;
      current_value?: number | null;
      condition_id?: string | null;
    }>;
    /** 去重后的市场列表（open + closed），供选择 condition id */
    position_markets?: PositionMarketPick[];
    ai_copy_prompt: string;
  };
  /** RFC3339 UTC — server sets on build; from PG `updated_at` when served from cache */
  report_updated_at?: string | null;
  data_lineage?: DataLineage | null;
  gamma_profile?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    /** ISO 8601，Gamma `createdAt` */
    created_at?: string | null;
    bio?: string | null;
    verified_badge?: boolean | null;
    proxy_wallet?: string | null;
    x_username?: string | null;
  };
  notes: string[];
};

export async function fetchAnalyzeReport(
  wallet: string,
  opts?: { noCache?: boolean; noGamma?: boolean; signal?: AbortSignal },
): Promise<AnalyzeReport> {
  const params = new URLSearchParams();
  if (opts?.noCache) params.set("no_cache", "true");
  if (opts?.noGamma) params.set("no_gamma", "true");
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    apiUrl(`analyze/${encodeURIComponent(wallet)}${q}`),
    {
      signal: opts?.signal,
      cache: opts?.noCache ? "no-store" : "default",
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `analyze ${res.status}`);
  }
  return res.json() as Promise<AnalyzeReport>;
}

/**
 * Fast path: Postgres cached report only (`GET ?cached_only=true`).
 * Axum/serde expects boolean as `true`/`false`, not `1`.
 * Returns `null` on cache miss (204 No Content；旧后端可能仍返回 404)。
 */
export async function fetchAnalyzeCachedOnly(
  wallet: string,
  opts?: { signal?: AbortSignal; noGamma?: boolean },
): Promise<AnalyzeReport | null> {
  const params = new URLSearchParams({ cached_only: "true" });
  if (opts?.noGamma) params.set("no_gamma", "true");
  const res = await fetch(
    apiUrl(
      `analyze/${encodeURIComponent(wallet)}?${params.toString()}`,
    ),
    {
      signal: opts?.signal,
      cache: "no-store",
    },
  );
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `analyze cached ${res.status}`);
  }
  return res.json() as Promise<AnalyzeReport>;
}

/** `GET /position-activity/:wallet?market=<condition_id>` */
export async function fetchPositionActivity(
  wallet: string,
  marketConditionId: string,
  opts?: { signal?: AbortSignal; noCache?: boolean },
): Promise<PositionActivityResponse> {
  const params = new URLSearchParams({
    market: marketConditionId.trim(),
  });
  if (opts?.noCache) params.set("no_cache", "true");
  const res = await fetch(
    apiUrl(
      `position-activity/${encodeURIComponent(wallet)}?${params.toString()}`,
    ),
    {
      signal: opts?.signal,
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `position-activity ${res.status}`,
    );
  }
  return res.json() as Promise<PositionActivityResponse>;
}
