/** 与 `GET /analyze/:wallet` 一致的 EVM 地址格式（0x + 40 hex）。 */
export const ANALYZE_WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidAnalyzeWallet(raw: string) {
  return ANALYZE_WALLET_RE.test(raw.trim());
}
