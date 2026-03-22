/**
 * Gamma `GET /public-profile`：默认经 **Analyzer 后端** `GET /gamma-public-profile/:wallet`
 *（与 `/analyze` 同源出网，无需浏览器 CORS、无需本机 VPN/HTTPS_PROXY）。
 *
 * - `NEXT_PUBLIC_POLYMARKET_GAMMA_USE_NEXT_PROXY=1`：改走 Next `/api/polymarket-public-profile`（仅特殊部署）
 * - `NEXT_PUBLIC_POLYMARKET_GAMMA_LEGACY_BROWSER_DIRECT=1`：浏览器直连 `gamma-api`（易 CORS 失败）
 *
 * 文档：https://docs.polymarket.com/api-reference/profiles/get-public-profile-by-wallet-address
 */

import { apiUrl } from "@/lib/api";

export type PolymarketPublicProfileParsed = {
  displayName: string | null;
  profileImage: string | null;
  verifiedBadge: boolean;
  /** ISO 8601 */
  createdAt?: string | null;
  bio?: string | null;
  /** 不含 @，用于 x.com 链接 */
  xUsernameRaw?: string | null;
  /** 与报告 `username` 对齐时的提示（pseudonym） */
  usernameHint?: string | null;
};

type GammaPublicProfileJson = {
  name?: string | null;
  pseudonym?: string | null;
  xUsername?: string | null;
  profileImage?: string | null;
  verifiedBadge?: boolean;
  createdAt?: string | null;
  bio?: string | null;
};

function truthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function parseGammaPublicProfile(
  j: GammaPublicProfileJson,
): PolymarketPublicProfileParsed {
  const xRaw =
    typeof j.xUsername === "string" && j.xUsername.trim()
      ? j.xUsername.trim().replace(/^@/, "")
      : null;
  const xDisplay =
    xRaw != null ? `@${xRaw}` : null;
  const displayName =
    (typeof j.name === "string" && j.name.trim()) ||
    (typeof j.pseudonym === "string" && j.pseudonym.trim()) ||
    xDisplay;
  const profileImage =
    typeof j.profileImage === "string" && j.profileImage.trim()
      ? j.profileImage.trim()
      : null;
  const pseudonym =
    typeof j.pseudonym === "string" && j.pseudonym.trim()
      ? j.pseudonym.trim()
      : null;

  return {
    displayName,
    profileImage,
    verifiedBadge: Boolean(j.verifiedBadge),
    createdAt:
      typeof j.createdAt === "string" && j.createdAt.trim()
        ? j.createdAt.trim()
        : null,
    bio: typeof j.bio === "string" && j.bio.trim() ? j.bio.trim() : null,
    xUsernameRaw: xRaw,
    usernameHint: pseudonym,
  };
}

function publicProfileRequestUrl(wallet: string): string {
  const w = wallet.trim().toLowerCase();
  const q = `address=${encodeURIComponent(w)}`;

  if (truthyEnv(process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_USE_NEXT_PROXY)) {
    return `/api/polymarket-public-profile?${q}`;
  }

  if (truthyEnv(process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_LEGACY_BROWSER_DIRECT)) {
    const origin = (
      process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_ORIGIN?.trim() ||
      "https://gamma-api.polymarket.com"
    ).replace(/\/$/, "");
    return `${origin}/public-profile?${q}`;
  }

  return apiUrl(`gamma-public-profile/${encodeURIComponent(w)}`);
}

export async function fetchPolymarketPublicProfile(
  address: string,
  opts?: { signal?: AbortSignal },
): Promise<PolymarketPublicProfileParsed | null> {
  const w = address.trim().toLowerCase();
  const res = await fetch(publicProfileRequestUrl(w), {
    signal: opts?.signal,
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        `public-profile ${res.status}`,
    );
  }
  const j = (await res.json()) as GammaPublicProfileJson;
  return parseGammaPublicProfile(j);
}
