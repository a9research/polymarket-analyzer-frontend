/**
 * Gamma `GET /public-profile`：默认经 **同源** Next **`/api/polymarket-public-profile`** 转发（gamma-api **不**对浏览器返回 CORS，直连会失败）。
 *
 * - `NEXT_PUBLIC_POLYMARKET_GAMMA_BROWSER_DIRECT=1`：强制浏览器直连 gamma（一般仅调试）
 * - 上游 URL 覆盖：服务端 **`POLYMARKET_GAMMA_ORIGIN`**（API Route）；展示用 **`NEXT_PUBLIC_POLYMARKET_GAMMA_ORIGIN`**
 *
 * 文档：https://docs.polymarket.com/api-reference/profiles/get-public-profile-by-wallet-address
 */

import { gammaPublicProfileFetchUrl } from "@/lib/polymarket-official-wallet-apis";

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
  return gammaPublicProfileFetchUrl(wallet);
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
