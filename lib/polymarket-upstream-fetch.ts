/**
 * 仅用于 **Next App Route（Node）** 请求 Polymarket 上游；勿在客户端组件中 import。
 *
 * - **IPv4 优先**：减轻部分环境下 IPv6 路径卡住/超时。
 * - **HTTPS_PROXY**：与 curl 类似，读取 `HTTPS_PROXY` / `https_proxy` / `HTTP_PROXY` / `http_proxy`，
 *   通过 `undici.ProxyAgent` 出站（本地 Clash / Sing-box 等需写在 **Next 进程** 可见的 env，如 `.env.local`）。
 */
import dns from "node:dns";
import {
  fetch as undiciFetch,
  ProxyAgent,
  type Response as UndiciResponse,
} from "undici";

dns.setDefaultResultOrder("ipv4first");

function proxyDispatcher(): import("undici").Dispatcher | undefined {
  const raw =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim();
  if (!raw) return undefined;
  try {
    return new ProxyAgent(raw);
  } catch {
    return undefined;
  }
}

export async function fetchPolymarketUpstream(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<UndiciResponse> {
  const timeoutMs = options.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = proxyDispatcher();
  try {
    return await undiciFetch(url, {
      headers: options.headers,
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });
  } finally {
    clearTimeout(t);
  }
}
