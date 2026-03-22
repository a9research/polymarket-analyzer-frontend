/**
 * Polymarket **Gamma** `public-profile` 常未对浏览器返回 `Access-Control-Allow-Origin`，
 * 本地 `http://localhost:*` 直连会 CORS 失败。
 *
 * 在 **浏览器** 且 host 为 localhost / 127.0.0.1 / ::1 时，**Gamma 公开资料**默认改走 `/api/polymarket-public-profile`。
 *
 * **榜单**（`/v1/leaderboard`）不在此自动代理：浏览器直连通常可用；若强行走 Next 代理而 Node 出网失败会得到 **502**。
 * 设 `NEXT_PUBLIC_POLYMARKET_GAMMA_SERVER_PROXY=0` 可禁止 localhost 自动走 Gamma 代理。
 */
function truthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function falsyExplicit(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "0" || s === "false" || s === "no" || s === "off";
}

function isBrowserLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * @param envVar 对应各模块的 `NEXT_PUBLIC_POLYMARKET_*_SERVER_PROXY`
 */
export function shouldUsePolymarketServerProxyInBrowser(
  envVar: string | undefined,
): boolean {
  if (falsyExplicit(envVar)) return false;
  if (truthyEnv(envVar)) return true;
  return isBrowserLocalhost();
}
