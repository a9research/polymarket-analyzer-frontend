/**
 * 仅用于 **Next App Route（Node）** 请求 Polymarket 上游；勿在客户端组件中 import。
 *
 * - **IPv4 优先**：减轻部分环境下 IPv6 路径卡住/超时。
 * - **HTTPS_PROXY** / **HTTP_PROXY**：通过 `undici.ProxyAgent` 出站（写在 `.env.local`，**重启** `next dev`）。
 * - **连接超时**：无 `dispatcher` 时 undici 默认 connect ~10s；直连统一用 `Agent` + env `POLYMARKET_UPSTREAM_CONNECT_TIMEOUT_MS`（默认 45s）及总 abort。
 */
import dns from "node:dns";
import {
  Agent,
  fetch as undiciFetch,
  ProxyAgent,
  type Dispatcher,
  type Response as UndiciResponse,
} from "undici";

dns.setDefaultResultOrder("ipv4first");

function parseTimeoutMs(envKey: string, defaultMs: number): number {
  const v = process.env[envKey]?.trim();
  if (!v) return defaultMs;
  const n = Number(v);
  return Number.isFinite(n) && n >= 1_000 ? n : defaultMs;
}

/** undici `Agent` 连接/读头/读体超时（与 env 一致）；避免使用默认栈时 connect 仅 ~10s 在跨境链路易失败 */
function agentConnectionOpts() {
  return {
    connectTimeout: parseTimeoutMs(
      "POLYMARKET_UPSTREAM_CONNECT_TIMEOUT_MS",
      45_000,
    ),
    headersTimeout: parseTimeoutMs(
      "POLYMARKET_UPSTREAM_HEADERS_TIMEOUT_MS",
      60_000,
    ),
    bodyTimeout: parseTimeoutMs(
      "POLYMARKET_UPSTREAM_BODY_TIMEOUT_MS",
      60_000,
    ),
  };
}

/** 无代理时的直连 `Agent`（单例）；与 `upstreamDispatcher()` 在 `__direct__` 时一致 */
let directUndiciAgentSingleton: Agent | null = null;
function getDirectUndiciAgent(): Agent {
  if (!directUndiciAgentSingleton) {
    directUndiciAgentSingleton = new Agent(agentConnectionOpts());
  }
  return directUndiciAgentSingleton;
}

/** 与当前代理配置匹配的 dispatcher（env 不变时复用，避免每请求 new Agent） */
let cachedDispatcher: { proxyKey: string; d: Dispatcher } | null = null;

function upstreamDispatcher(): Dispatcher {
  const opts = agentConnectionOpts();

  const proxyRaw =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    "";
  const proxyKey = proxyRaw || "__direct__";

  if (cachedDispatcher?.proxyKey === proxyKey) {
    return cachedDispatcher.d;
  }

  let d: Dispatcher;
  if (proxyRaw) {
    try {
      d = new ProxyAgent({ uri: proxyRaw, ...opts });
    } catch {
      d = getDirectUndiciAgent();
    }
  } else {
    d = getDirectUndiciAgent();
  }
  cachedDispatcher = { proxyKey, d };
  return d;
}

export async function fetchPolymarketUpstream(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<UndiciResponse> {
  const timeoutMs =
    options.timeoutMs ??
    parseTimeoutMs("POLYMARKET_UPSTREAM_FETCH_TIMEOUT_MS", 90_000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = upstreamDispatcher();
  try {
    return await undiciFetch(url, {
      headers: options.headers,
      signal: controller.signal,
      dispatcher,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * **仅直连**（`getDirectUndiciAgent`，无 `ProxyAgent`），超时与 {@link fetchPolymarketUpstream} 在无代理时相同。
 * 不传 `dispatcher` 时 undici 默认 connect ~**10s**，慢链路会先超时再被重试误判为「bare 失败」——故此处必须挂显式长超时 `Agent`。
 * Gamma `public-profile` 路由优先走此路径，失败再回退 {@link fetchPolymarketUpstream}（可走 `HTTPS_PROXY`）。
 */
export async function fetchPolymarketUpstreamBare(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<UndiciResponse> {
  const timeoutMs =
    options.timeoutMs ??
    parseTimeoutMs("POLYMARKET_UPSTREAM_FETCH_TIMEOUT_MS", 90_000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await undiciFetch(url, {
      headers: options.headers,
      signal: controller.signal,
      dispatcher: getDirectUndiciAgent(),
    });
  } finally {
    clearTimeout(t);
  }
}
