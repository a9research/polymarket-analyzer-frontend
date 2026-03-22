import type { AnalyzeReport } from "@/lib/api";
import type { PolymarketPublicProfileParsed } from "@/lib/polymarket-public-profile";

export type MergedGammaProfile = NonNullable<AnalyzeReport["gamma_profile"]>;

/** 侧栏点选一行时带入的展示用资料（与报告 / Gamma 合并，不替代已存在的 API 字段）。 */
export type LeaderboardProfileHint = {
  displayName: string;
  profileImage?: string | null;
  verifiedBadge?: boolean;
};

/** 报告优先；缺省字段用 Gamma public-profile（同次浏览内尽早展示资料区）。 */
export function mergeGammaProfile(
  report: AnalyzeReport | undefined,
  pub: PolymarketPublicProfileParsed | null | undefined,
): MergedGammaProfile | undefined {
  const g = report?.gamma_profile;
  const p = pub;
  if (!g && !p) return undefined;

  const display_name = g?.display_name ?? p?.displayName ?? null;
  const username = g?.username ?? p?.usernameHint ?? p?.displayName ?? null;
  const avatar_url = g?.avatar_url ?? p?.profileImage ?? null;
  const created_at = g?.created_at ?? p?.createdAt ?? null;
  const bio = g?.bio ?? p?.bio ?? null;
  const verified_badge = g?.verified_badge ?? p?.verifiedBadge ?? null;
  const x_username = g?.x_username ?? p?.xUsernameRaw ?? null;
  const proxy_wallet = g?.proxy_wallet ?? null;

  if (
    display_name == null &&
    username == null &&
    avatar_url == null &&
    created_at == null &&
    bio == null &&
    verified_badge == null &&
    x_username == null &&
    proxy_wallet == null
  ) {
    return undefined;
  }

  return {
    display_name,
    username,
    avatar_url,
    created_at,
    bio,
    verified_badge,
    x_username,
    proxy_wallet,
  };
}

/**
 * 在 `mergeGammaProfile` 之上叠加榜单点选 hint（仅填空白字段；`display_name` / `avatar_url` 等仍以报告与 Gamma 为准）。
 */
export function mergeGammaProfileWithHint(
  report: AnalyzeReport | undefined,
  pub: PolymarketPublicProfileParsed | null | undefined,
  hint: LeaderboardProfileHint | null | undefined,
): MergedGammaProfile | undefined {
  const base = mergeGammaProfile(report, pub);
  const hName = hint?.displayName?.trim() || null;
  const hImg =
    typeof hint?.profileImage === "string" && hint.profileImage.trim()
      ? hint.profileImage.trim()
      : null;
  const hVerified = hint?.verifiedBadge === true;

  if (!base && !hName && !hImg && !hVerified) return undefined;

  if (!base) {
    return {
      display_name: hName,
      username: null,
      avatar_url: hImg,
      created_at: null,
      bio: null,
      verified_badge: hVerified ? true : null,
      x_username: null,
      proxy_wallet: null,
    };
  }

  return {
    display_name: base.display_name ?? hName,
    username: base.username,
    avatar_url: base.avatar_url ?? hImg,
    created_at: base.created_at,
    bio: base.bio,
    verified_badge:
      base.verified_badge === true ? true : hVerified ? true : base.verified_badge,
    x_username: base.x_username,
    proxy_wallet: base.proxy_wallet,
  };
}
