/**
 * Polymarket 官方 HTTP（与自建 Analyzer 无关）：
 * - Gamma `public-profile`：**默认**经 Next 同源 `/api/polymarket-public-profile` 转发（gamma-api **无**浏览器 CORS）
 * - Data API `GET /positions`、`GET /closed-positions`（浏览器直连，一般带 CORS）
 *
 * 环境变量：
 * - `NEXT_PUBLIC_POLYMARKET_GAMMA_BROWSER_DIRECT=1`：强制浏览器直连 gamma（多数环境会 CORS 失败）
 * - `NEXT_PUBLIC_POLYMARKET_GAMMA_ORIGIN` / `POLYMARKET_GAMMA_ORIGIN`：上游 Gamma（后者仅 API Route）
 * - `NEXT_PUBLIC_POLYMARKET_DATA_API_ORIGIN`
 */

function truthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** 为 true 时浏览器直连 gamma（默认 false：走 Next API 避免 CORS） */
export function gammaPublicProfileBrowserDirectEnabled(): boolean {
  return truthyEnv(process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_BROWSER_DIRECT);
}

export const OFFICIAL_POLYMARKET_GAMMA_ORIGIN = (
  process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_ORIGIN?.trim() ||
  "https://gamma-api.polymarket.com"
).replace(/\/$/, "");

export const OFFICIAL_POLYMARKET_DATA_ORIGIN = (
  process.env.NEXT_PUBLIC_POLYMARKET_DATA_API_ORIGIN?.trim() ||
  "https://data-api.polymarket.com"
).replace(/\/$/, "");

/** 上游 Gamma URL（展示用；实际 fetch 见 `gammaPublicProfileFetchUrl`） */
export function gammaPublicProfileUpstreamUrl(wallet: string): string {
  const w = wallet.trim().toLowerCase();
  return `${OFFICIAL_POLYMARKET_GAMMA_ORIGIN}/public-profile?address=${encodeURIComponent(w)}`;
}

/**
 * 浏览器内 `fetch` 使用的 URL：默认同源 `/api/polymarket-public-profile`。
 */
export function gammaPublicProfileFetchUrl(wallet: string): string {
  if (gammaPublicProfileBrowserDirectEnabled()) {
    return gammaPublicProfileUpstreamUrl(wallet);
  }
  const w = wallet.trim().toLowerCase();
  return `/api/polymarket-public-profile?address=${encodeURIComponent(w)}`;
}

/** @deprecated 使用 `gammaPublicProfileUpstreamUrl` */
export function gammaPublicProfileUrl(wallet: string): string {
  return gammaPublicProfileUpstreamUrl(wallet);
}

export function dataApiPositionsPageUrl(
  wallet: string,
  limit: number,
  offset: number,
): string {
  const w = wallet.trim().toLowerCase();
  const u = new URL(`${OFFICIAL_POLYMARKET_DATA_ORIGIN}/positions`);
  u.searchParams.set("user", w);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("offset", String(offset));
  return u.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type GammaPublicProfileFetchResult = {
  status: number;
  /** 解析后的 JSON；404 或无 body 时为 null */
  body: Record<string, unknown> | null;
  /** 最终命中的 `address` 查询参数（可能与页面钱包不同，例如 proxyWallet） */
  matchedAddress?: string | null;
};

function normalizeEvmAddress(s: string): string | null {
  const w = s.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(w) ? w : null;
}

/**
 * 从 Data API `/positions` 行中提取 `proxyWallet`（与 `user` 主地址不同时可用于 Gamma 档案查询）。
 */
export function extractProxyWalletsFromPositionRows(
  rows: Record<string, unknown>[],
  excludeLower: string,
): string[] {
  const ex = excludeLower.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const raw = r.proxyWallet ?? r.proxy_wallet;
    if (typeof raw !== "string") continue;
    const a = normalizeEvmAddress(raw);
    if (!a || a === ex || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}

/**
 * Gamma 公开资料。404 → `{ status: 404, body: null }`，不抛错。
 */
export async function fetchGammaPublicProfileJson(
  wallet: string,
  opts?: { signal?: AbortSignal },
): Promise<GammaPublicProfileFetchResult> {
  const url = gammaPublicProfileFetchUrl(wallet);
  const res = await fetch(url, { signal: opts?.signal, cache: "no-store" });
  if (res.status === 404) {
    return { status: 404, body: null, matchedAddress: null };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Gamma public-profile ${res.status}: ${text.slice(0, 240)}`,
    );
  }
  let j: unknown;
  try {
    j = await res.json();
  } catch {
    return { status: res.status, body: null, matchedAddress: null };
  }
  if (j && typeof j === "object" && !Array.isArray(j)) {
    const body = j as Record<string, unknown>;
    const w = normalizeEvmAddress(wallet);
    return {
      status: res.status,
      body,
      matchedAddress: w,
    };
  }
  return { status: res.status, body: null, matchedAddress: null };
}

/**
 * 按顺序尝试多个地址（主钱包 + `proxyWallet` 等），返回首个含非空字段的 JSON 对象。
 */
export async function fetchGammaPublicProfileJsonFirstMatch(
  addresses: string[],
  opts?: { signal?: AbortSignal },
): Promise<GammaPublicProfileFetchResult> {
  const tried = new Set<string>();
  let last: GammaPublicProfileFetchResult = {
    status: 404,
    body: null,
    matchedAddress: null,
  };
  for (const raw of addresses) {
    const n = normalizeEvmAddress(raw);
    if (!n || tried.has(n)) continue;
    tried.add(n);
    opts?.signal?.throwIfAborted();
    const r = await fetchGammaPublicProfileJson(n, opts);
    last = r;
    if (r.body && Object.keys(r.body).length > 0) {
      return { ...r, matchedAddress: n };
    }
  }
  return last;
}

async function paginateUserPositionArray(
  path: "/positions" | "/closed-positions",
  wallet: string,
  opts?: {
    signal?: AbortSignal;
    pageSize?: number;
    pageDelayMs?: number;
  },
): Promise<Record<string, unknown>[]> {
  const w = wallet.trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.pageSize ?? 500, 1), 10_000);
  const delay = Math.max(0, opts?.pageDelayMs ?? 120);
  let offset = 0;
  const out: Record<string, unknown>[] = [];

  while (true) {
    opts?.signal?.throwIfAborted();
    const u = new URL(`${OFFICIAL_POLYMARKET_DATA_ORIGIN}${path}`);
    u.searchParams.set("user", w);
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("offset", String(offset));

    const res = await fetch(u.toString(), {
      signal: opts?.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Data API ${path} ${res.status}: ${text.slice(0, 240)}`,
      );
    }

    const page = (await res.json()) as unknown;
    if (!Array.isArray(page)) {
      throw new Error(`Data API ${path}: expected JSON array`);
    }
    if (page.length === 0) break;

    for (const row of page) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        out.push(row as Record<string, unknown>);
      }
    }

    if (page.length < limit) break;
    offset += limit;
    if (delay > 0) await sleep(delay);
  }

  return out;
}

export function fetchDataApiPositionsAll(
  wallet: string,
  opts?: { signal?: AbortSignal; pageSize?: number; pageDelayMs?: number },
): Promise<Record<string, unknown>[]> {
  return paginateUserPositionArray("/positions", wallet, opts);
}

export function fetchDataApiClosedPositionsAll(
  wallet: string,
  opts?: { signal?: AbortSignal; pageSize?: number; pageDelayMs?: number },
): Promise<Record<string, unknown>[]> {
  return paginateUserPositionArray("/closed-positions", wallet, opts);
}
