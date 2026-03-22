/**
 * 仅用于 **Next App Route（Node）** 请求 Polymarket 上游；勿在客户端组件中 import。
 *
 * - **IPv4 优先**：减轻部分环境下 IPv6 路径卡住/超时。
 * - **HTTPS_PROXY** / **HTTP_PROXY**：通过 `undici.ProxyAgent` 出站（写在 `.env.local`，**重启** `next dev`）。
 * - **连接超时**：undici 默认 connect ~10s，易在跨境链路上失败；此处显式拉长 `connectTimeout` / 总 abort。
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

/** 与当前代理配置匹配的 dispatcher（env 不变时复用，避免每请求 new Agent） */
let cachedDispatcher: { proxyKey: string; d: Dispatcher } | null = null;

function upstreamDispatcher(): Dispatcher {
  const connectTimeout = parseTimeoutMs(
    "POLYMARKET_UPSTREAM_CONNECT_TIMEOUT_MS",
    45_000,
  );
  const headersTimeout = parseTimeoutMs(
    "POLYMARKET_UPSTREAM_HEADERS_TIMEOUT_MS",
    60_000,
  );
  const bodyTimeout = parseTimeoutMs(
    "POLYMARKET_UPSTREAM_BODY_TIMEOUT_MS",
    60_000,
  );
  const opts = {
    connectTimeout,
    headersTimeout,
    bodyTimeout,
  };

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
      d = new Agent(opts);
    }
  } else {
    d = new Agent(opts);
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
