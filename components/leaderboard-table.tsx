"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Star } from "lucide-react";
import type { LeaderboardPeriod } from "@/lib/api";
import {
  analyzerPeriodToPolymarket,
  fetchPolymarketLeaderboard,
  POLYMARKET_LEADERBOARD_CATEGORY_ORDER,
  type PolymarketLeaderboardCategory,
  type PolymarketLeaderboardEntry,
} from "@/lib/polymarket-leaderboard";
import toast from "react-hot-toast";
import { useI18n, useNumberLocale } from "@/lib/i18n-context";
import { cn } from "@/lib/cn";
import { fetchPolymarketPublicProfile } from "@/lib/polymarket-public-profile";
import type { LeaderboardProfileHint } from "@/lib/merge-account-profile";
import { useWatchlist } from "@/store/watchlist";

function shortAddr(a: string) {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

const PERIODS: { id: LeaderboardPeriod; labelKey: string }[] = [
  { id: "today", labelKey: "leaderboard.periodToday" },
  { id: "week", labelKey: "leaderboard.periodWeek" },
  { id: "month", labelKey: "leaderboard.periodMonth" },
  { id: "all", labelKey: "leaderboard.periodAll" },
];

type MainTab = "favorites" | LeaderboardPeriod;

const MAIN_TABS: { id: MainTab; labelKey: string }[] = [
  { id: "favorites", labelKey: "leaderboard.tabFavorites" },
  ...PERIODS.map((p) => ({ id: p.id, labelKey: p.labelKey })),
];

function defaultWalletHref(w: string) {
  return `/account/${encodeURIComponent(w)}`;
}

function OfficialRow({
  entry,
  rank,
  numLocale,
  t,
  onSelectWallet,
  isSelected,
}: {
  entry: PolymarketLeaderboardEntry;
  rank: number;
  numLocale: string;
  t: (k: string) => string;
  onSelectWallet: (wallet: string, pick?: LeaderboardProfileHint) => void;
  isSelected: boolean;
}) {
  const w = entry.proxyWallet?.toLowerCase() ?? "";
  const inList = useWatchlist((s) => s.addresses.includes(w));
  const add = useWatchlist((s) => s.add);
  const remove = useWatchlist((s) => s.remove);
  const pnl = entry.pnl ?? 0;
  const formatMoney = (n: number) => {
    const sign = n >= 0 ? "+" : "";
    return `${sign}$${Math.abs(n).toLocaleString(numLocale, { maximumFractionDigits: 0 })}`;
  };

  const copy = () => {
    if (!w) return;
    void navigator.clipboard.writeText(w);
    toast.success(t("common.copied"));
  };

  const name =
    entry.userName?.trim() ||
    (w ? shortAddr(w) : "—");

  const pnlClass =
    pnl >= 0 ? "text-secondary" : "text-tertiary";

  return (
    <tr
      className={cn(
        "group border-t border-white/5 transition-colors",
        w &&
          "cursor-pointer hover:bg-surface-container-highest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        w && isSelected && "bg-primary/10 hover:bg-primary/[0.14]",
      )}
      tabIndex={w ? 0 : undefined}
      aria-selected={w ? isSelected : undefined}
      onClick={() =>
        w &&
        onSelectWallet(w, {
          displayName: name,
          profileImage: entry.profileImage ?? null,
          verifiedBadge: Boolean(entry.verifiedBadge),
        })
      }
      onKeyDown={(e) => {
        if (!w) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectWallet(w, {
            displayName: name,
            profileImage: entry.profileImage ?? null,
            verifiedBadge: Boolean(entry.verifiedBadge),
          });
        }
      }}
    >
      <td className="w-10 px-1 py-4 align-middle sm:w-11 sm:px-2 sm:py-5">
        {w ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (inList) {
                remove(w);
                toast.success(t("leaderboard.toastStarRemoved"));
              } else {
                add(w, {
                  userName: entry.userName?.trim() || undefined,
                  profileImage: entry.profileImage,
                  verifiedBadge: entry.verifiedBadge,
                });
                toast.success(t("leaderboard.toastStarAdded"));
              }
            }}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-primary"
            aria-label={
              inList
                ? t("leaderboard.starRemoveAria")
                : t("leaderboard.starAddAria")
            }
            aria-pressed={inList}
          >
            <Star
              className={cn(
                "h-4 w-4",
                inList
                  ? "fill-primary text-primary"
                  : "fill-none text-zinc-500",
              )}
              strokeWidth={1.75}
            />
          </button>
        ) : null}
      </td>
      <td className="w-12 px-2 py-4 align-middle sm:w-14 sm:px-3 sm:py-5">
        <span className="font-bold text-white opacity-30 transition-opacity group-hover:opacity-100">
          #{String(rank).padStart(2, "0")}
        </span>
      </td>
      <td className="max-w-0 min-w-0 px-2 py-4 sm:px-6 sm:py-5">
        {w ? (
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {entry.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.profileImage}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                  {(name[0] ?? "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="min-w-0 truncate font-jetbrains text-sm font-medium text-white"
                    title={name}
                  >
                    {name}
                  </span>
                  {entry.verifiedBadge && (
                    <span
                      className="shrink-0 text-[10px] text-primary"
                      title="verified"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-zinc-500">
                  <span className="min-w-0 truncate font-jetbrains" title={w}>
                    {shortAddr(w)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copy();
                    }}
                    className="shrink-0 text-zinc-500 hover:text-white"
                    aria-label={t("leaderboard.copyAria")}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 text-right font-jetbrains text-xs font-bold tabular-nums tracking-tight sm:text-sm",
                pnlClass,
              )}
            >
              {formatMoney(pnl)}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
              ?
            </div>
            <span className="min-w-0 flex-1 truncate font-jetbrains text-sm text-zinc-500">
              —
            </span>
            <span
              className={cn(
                "shrink-0 font-jetbrains text-xs font-bold tabular-nums sm:text-sm",
                pnlClass,
              )}
            >
              {formatMoney(pnl)}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * 主行：持久化 meta（榜单/账户页加入时写入）或 Gamma public-profile 回填；次行短地址 + 复制。
 */
function FavoriteRow({
  wallet,
  rank,
  t,
  onSelectWallet,
  isSelected,
}: {
  wallet: string;
  rank: number;
  t: (k: string) => string;
  onSelectWallet: (wallet: string, pick?: LeaderboardProfileHint) => void;
  isSelected: boolean;
}) {
  const w = wallet.toLowerCase();
  const remove = useWatchlist((s) => s.remove);
  const meta = useWatchlist((s) => s.metaByWallet[w]);
  const patchWalletMeta = useWatchlist((s) => s.patchWalletMeta);
  const hasStoredName = Boolean(meta?.userName?.trim());

  const profileQ = useQuery({
    queryKey: ["public-profile", w],
    queryFn: ({ signal }) => fetchPolymarketPublicProfile(w, { signal }),
    enabled: Boolean(w) && !hasStoredName,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  useEffect(() => {
    const d = profileQ.data;
    if (!d) return;
    const name = d.displayName?.trim();
    const img = d.profileImage?.trim();
    if (!name && !img && d.verifiedBadge !== true) return;
    patchWalletMeta(w, {
      ...(name ? { userName: name } : {}),
      ...(img ? { profileImage: img } : {}),
      ...(d.verifiedBadge === true ? { verifiedBadge: true } : {}),
    });
  }, [profileQ.data, w, patchWalletMeta]);

  const copy = () => {
    void navigator.clipboard.writeText(w);
    toast.success(t("common.copied"));
  };

  const primaryName =
    meta?.userName?.trim() ||
    profileQ.data?.displayName?.trim() ||
    (w ? shortAddr(w) : "—");
  const profileImage = meta?.profileImage || profileQ.data?.profileImage || null;
  const verified = meta?.verifiedBadge || profileQ.data?.verifiedBadge;

  return (
    <tr
      className={cn(
        "group cursor-pointer border-t border-white/5 transition-colors hover:bg-surface-container-highest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        isSelected && "bg-primary/10 hover:bg-primary/[0.14]",
      )}
      tabIndex={0}
      aria-selected={isSelected}
      onClick={() =>
        onSelectWallet(w, {
          displayName: primaryName,
          profileImage: profileImage ?? null,
          verifiedBadge: Boolean(verified),
        })
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectWallet(w, {
            displayName: primaryName,
            profileImage: profileImage ?? null,
            verifiedBadge: Boolean(verified),
          });
        }
      }}
    >
      <td className="w-10 px-1 py-4 align-middle sm:w-11 sm:px-2 sm:py-5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            remove(w);
            toast.success(t("leaderboard.toastStarRemoved"));
          }}
          className="rounded p-1 text-primary transition-colors hover:bg-white/5"
          aria-label={t("leaderboard.starRemoveAria")}
          aria-pressed
        >
          <Star className="h-4 w-4 fill-primary text-primary" strokeWidth={1.75} />
        </button>
      </td>
      <td className="w-12 px-2 py-4 align-middle sm:w-14 sm:px-3 sm:py-5">
        <span className="font-bold text-white opacity-30 transition-opacity group-hover:opacity-100">
          #{String(rank).padStart(2, "0")}
        </span>
      </td>
      <td className="max-w-0 min-w-0 px-2 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImage}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                {(primaryName[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="min-w-0 truncate font-jetbrains text-sm font-medium text-white"
                  title={w || primaryName}
                >
                  {primaryName}
                </span>
                {verified ? (
                  <span
                    className="shrink-0 text-[10px] text-primary"
                    title="verified"
                  >
                    ✓
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-zinc-500">
                <span className="min-w-0 truncate font-jetbrains" title={w}>
                  {w ? shortAddr(w) : "—"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copy();
                  }}
                  className="shrink-0 text-zinc-500 hover:text-white"
                  aria-label={t("leaderboard.copyAria")}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <span className="shrink-0 text-right font-jetbrains text-xs font-bold tabular-nums tracking-tight text-zinc-500 sm:text-sm">
            —
          </span>
        </div>
      </td>
    </tr>
  );
}

export type LeaderboardTableProps = {
  /** 与当前展示的分析地址匹配时高亮该行（小写 0x…） */
  selectedWallet?: string | null;
  /** 点击行时导航目标；默认 `/account/[wallet]` */
  walletHref?: (normalizedWallet: string) => string;
  /** 在 `router.push` 之前调用，把行内资料传入右侧 `AccountDashboard` */
  onBeforeWalletNavigate?: (
    wallet: string,
    pick: LeaderboardProfileHint,
  ) => void;
};

export function LeaderboardTable({
  selectedWallet = null,
  walletHref = defaultWalletHref,
  onBeforeWalletNavigate,
}: LeaderboardTableProps = {}) {
  const router = useRouter();
  const { t } = useI18n();
  const numLocale = useNumberLocale();
  const [mainTab, setMainTab] = useState<MainTab>("month");
  const [category, setCategory] =
    useState<PolymarketLeaderboardCategory>("OVERALL");
  const { addresses } = useWatchlist();

  const period: LeaderboardPeriod =
    mainTab === "favorites" ? "month" : mainTab;

  const tp = analyzerPeriodToPolymarket(period);

  const officialQ = useQuery({
    queryKey: ["polymarket-leaderboard", tp, category, 30],
    queryFn: ({ signal }) =>
      fetchPolymarketLeaderboard({
        timePeriod: tp,
        category,
        limit: 30,
        signal,
      }),
    enabled: mainTab !== "favorites",
  });

  const isFavorites = mainTab === "favorites";
  const data = isFavorites ? undefined : officialQ.data;
  const isLoading = !isFavorites && officialQ.isLoading;
  const isError = !isFavorites && officialQ.isError;
  const error = officialQ.error;

  const mainTabs = useMemo(
    () => MAIN_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
    [t],
  );

  const goToWallet = (address: string, pick?: LeaderboardProfileHint) => {
    const w = address.toLowerCase();
    if (pick) onBeforeWalletNavigate?.(w, pick);
    router.push(walletHref(w));
  };

  const categorySelect = !isFavorites && (
    <div className="relative shrink-0 min-w-[10rem] max-w-full sm:max-w-[18rem]">
      <select
        value={category}
        onChange={(e) =>
          setCategory(e.target.value as PolymarketLeaderboardCategory)
        }
        aria-label={t("leaderboard.categoryLabel")}
        className="h-9 w-full min-w-[10rem] cursor-pointer appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-3 pr-9 font-jetbrains text-xs text-white outline-none transition-colors hover:border-white/20 focus:border-primary sm:min-w-[11rem]"
      >
        {POLYMARKET_LEADERBOARD_CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {t(`leaderboard.category${c}`)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        aria-hidden
      />
    </div>
  );

  const theadSticky =
    "sticky top-0 z-[1] border-b border-white/5 bg-surface-container-low font-normal shadow-[0_1px_0_0_rgba(0,0,0,0.4)]";

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-surface-container-low shadow-2xl lg:min-h-0 lg:flex-1">
      <div className="shrink-0 border-b border-white/5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 gap-y-2">
          <h2 className="min-w-0 font-headline text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("home.title")}
          </h2>
          {categorySelect}
        </div>
        <div className="mt-4 max-w-full overflow-x-auto">
          <div
            className="inline-flex shrink-0 overflow-hidden rounded-lg border border-white/10"
            role="tablist"
            aria-label={t("leaderboard.tablistAria")}
          >
            {mainTabs.map((tab, i) => {
              const selected = mainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMainTab(tab.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap border-white/10 px-3 py-2 font-jetbrains text-xs transition-colors sm:px-3.5",
                    i > 0 && "border-l",
                    selected
                      ? "bg-white/10 font-bold text-white"
                      : "bg-transparent font-normal text-zinc-500 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain lg:min-h-0">
        {isFavorites && addresses.length === 0 && (
          <div className="p-12 text-center font-jetbrains text-sm text-zinc-500">
            {t("watchlist.empty")}
          </div>
        )}

        {isFavorites && addresses.length > 0 && (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="text-left font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
                <th
                  scope="col"
                  className={cn(
                    "w-10 px-1 py-3 sm:w-11 sm:px-2 sm:py-4",
                    theadSticky,
                  )}
                >
                  <span className="sr-only">{t("leaderboard.starColAria")}</span>
                </th>
                <th
                  className={cn(
                    "w-12 px-2 py-3 sm:w-14 sm:px-3 sm:py-4",
                    theadSticky,
                  )}
                >
                  {t("leaderboard.colRank")}
                </th>
                <th className={cn("px-2 py-3 sm:px-6 sm:py-4", theadSticky)}>
                  {t("leaderboard.colTrader")}
                </th>
              </tr>
            </thead>
            <tbody className="font-jetbrains text-sm">
              {addresses.map((w, i) => (
                <FavoriteRow
                  key={w}
                  wallet={w}
                  rank={i + 1}
                  t={t}
                  onSelectWallet={goToWallet}
                  isSelected={w.toLowerCase() === selectedWallet}
                />
              ))}
            </tbody>
          </table>
        )}

        {!isFavorites && isLoading && (
          <div className="p-12 text-center font-jetbrains text-sm text-zinc-500">
            {t("leaderboard.loading")}
          </div>
        )}

        {!isFavorites && isError && (
          <div className="p-12 text-center font-jetbrains text-sm text-error">
            {(error as Error).message}
            <p className="mt-2 text-xs text-zinc-500">
              {t("leaderboard.errorHintOfficial")}
            </p>
          </div>
        )}

        {!isFavorites &&
          !isLoading &&
          !isError &&
          Array.isArray(data) &&
          data.length === 0 && (
            <div className="p-12 text-center font-jetbrains text-sm text-zinc-500">
              {t("leaderboard.emptyOfficial")}
            </div>
          )}

        {!isFavorites &&
          !isLoading &&
          !isError &&
          Array.isArray(data) &&
          data.length > 0 && (
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="text-left font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
                  <th
                    scope="col"
                    className={cn(
                      "w-10 px-1 py-3 sm:w-11 sm:px-2 sm:py-4",
                      theadSticky,
                    )}
                  >
                    <span className="sr-only">
                      {t("leaderboard.starColAria")}
                    </span>
                  </th>
                  <th
                    className={cn(
                      "w-12 px-2 py-3 sm:w-14 sm:px-3 sm:py-4",
                      theadSticky,
                    )}
                  >
                    {t("leaderboard.colRank")}
                  </th>
                  <th className={cn("px-2 py-3 sm:px-6 sm:py-4", theadSticky)}>
                    {t("leaderboard.colTrader")}
                  </th>
                </tr>
              </thead>
              <tbody className="font-jetbrains text-sm">
                {(data as PolymarketLeaderboardEntry[]).map((entry, i) => {
                  const r = parseInt(String(entry.rank ?? ""), 10);
                  const rank = Number.isFinite(r) && r > 0 ? r : i + 1;
                  const rowW = entry.proxyWallet?.toLowerCase() ?? "";
                  return (
                    <OfficialRow
                      key={`${entry.proxyWallet}-${i}`}
                      entry={entry}
                      rank={rank}
                      numLocale={numLocale}
                      t={t}
                      onSelectWallet={goToWallet}
                      isSelected={!!rowW && rowW === selectedWallet}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </section>
  );
}
