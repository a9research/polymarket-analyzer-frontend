"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  BrainCircuit,
  ChevronDown,
  Copy,
  Loader2,
  RefreshCw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  fetchAnalyzeCachedOnly,
  fetchAnalyzeReport,
} from "@/lib/api";
import { useStaggeredReveal } from "@/hooks/use-staggered-reveal";
import {
  mergeGammaProfileWithHint,
  type LeaderboardProfileHint,
} from "@/lib/merge-account-profile";
import { fetchPolymarketPublicProfile } from "@/lib/polymarket-public-profile";
import { useI18n, type Locale } from "@/lib/i18n-context";
import { useWatchlist } from "@/store/watchlist";
import { cn } from "@/lib/cn";
import {
  SkeletonHighlights,
  SkeletonKpiGrid,
  SkeletonPatterns,
  SkeletonStrategy,
  SkeletonTableBlock,
  SkeletonThreeCol,
} from "@/components/account-dashboard-skeletons";
import { OfficialPolymarketUserPanel } from "@/components/official-polymarket-user-panel";

function fmtUsd(n: number, opts?: { signed?: boolean }) {
  const sign =
    opts?.signed === true ? (n >= 0 ? "+" : "") : n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}K`;
  return `${sign}$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortAddr(a: string) {
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}...${a.slice(-4)}`;
}

function formatProfileJoinedAt(iso: string | null | undefined, loc: Locale) {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(loc === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(t));
}

/** Report cache / build timestamp for display (date + time, UTC). */
function formatReportUpdatedAt(iso: string | null | undefined, loc: Locale) {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(loc === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(new Date(t));
}

const LEDGER_UI_MAX = 400;

function fmtLedgerTs(tsMs: number, loc: Locale) {
  return new Intl.DateTimeFormat(loc === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(new Date(tsMs));
}

function fmtLedgerScalar(n: number, kind: "price" | "qty") {
  if (Math.abs(n) < 1e-12) return "—";
  const max = kind === "price" ? 4 : 2;
  return n.toLocaleString("en-US", {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
  });
}

function ledgerKindLabel(kind: string, t: (k: string) => string) {
  if (kind === "BUY") return t("account.ledgerKindBUY");
  if (kind === "SELL") return t("account.ledgerKindSELL");
  if (kind === "SETTLEMENT") return t("account.ledgerKindSETTLEMENT");
  return kind;
}

function hourEntries(map: Record<string, number>) {
  const out: { h: number; c: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const c = map[String(h)] ?? map[h as unknown as string] ?? 0;
    out.push({ h, c });
  }
  const max = Math.max(1, ...out.map((x) => x.c));
  return { out, max };
}

export function AccountDashboard({
  address,
  leaderboardProfileHint = null,
}: {
  address: string;
  /** 分析器侧栏点选行时传入，与 Gamma/报告合并，避免在 analyze 未完成前标题长期骨架 */
  leaderboardProfileHint?: LeaderboardProfileHint | null;
}) {
  const { t: tr, locale } = useI18n();
  const queryClient = useQueryClient();
  const wallet = address.toLowerCase();
  const { add, remove, has } = useWatchlist();
  const watching = has(wallet);
  const [manualRefreshBusy, setManualRefreshBusy] = useState(false);

  const publicProfileQ = useQuery({
    queryKey: ["public-profile", wallet],
    queryFn: ({ signal }) => fetchPolymarketPublicProfile(wallet, { signal }),
    staleTime: 5 * 60 * 1000,
  });

  /** Delivery: Postgres cache only (fast). */
  const analyzeCachedQ = useQuery({
    queryKey: ["analyze", wallet, "cached"],
    queryFn: ({ signal }) => fetchAnalyzeCachedOnly(wallet, { signal }),
    staleTime: 60 * 1000,
  });

  /** Full pipeline; runs in parallel — UI shows cached data first when available. */
  const analyzeFullQ = useQuery({
    queryKey: ["analyze", wallet],
    queryFn: ({ signal }) => fetchAnalyzeReport(wallet, { signal }),
    staleTime: 2 * 60 * 1000,
  });

  const data = analyzeFullQ.data ?? analyzeCachedQ.data ?? undefined;
  const gp = useMemo(
    () =>
      mergeGammaProfileWithHint(
        data,
        publicProfileQ.data,
        leaderboardProfileHint,
      ),
    [data, publicProfileQ.data, leaderboardProfileHint],
  );

  const heat = useMemo(() => {
    if (!data) return null;
    return hourEntries(
      data.time_analysis.active_hours_utc as Record<string, number>,
    );
  }, [data]);

  const bucketBars = useMemo(() => {
    if (!data?.price_buckets_chart?.length) return [];
    const max = Math.max(1, ...data.price_buckets_chart.map((b) => b.count));
    return data.price_buckets_chart.map((b) => ({
      ...b,
      pct: (b.count / max) * 100,
    }));
  }, [data]);

  const analyzeReady = Boolean(data);
  const analyzePending =
    !data && (analyzeCachedQ.isPending || analyzeFullQ.isPending);
  const analyzeBackgroundFetch =
    analyzeFullQ.isFetching && analyzeReady && !manualRefreshBusy;
  const analyzeError =
    analyzeFullQ.isError && !data
      ? analyzeFullQ.error
      : analyzeCachedQ.isError && !data
        ? analyzeCachedQ.error
        : null;

  const onManualRefreshAnalyze = useCallback(async () => {
    setManualRefreshBusy(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["analyze", wallet],
        queryFn: ({ signal }) =>
          fetchAnalyzeReport(wallet, { noCache: true, signal }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["analyze", wallet, "cached"],
      });
    } finally {
      setManualRefreshBusy(false);
    }
  }, [queryClient, wallet]);

  const staggerStep = useStaggeredReveal(analyzeReady, 6);
  const walletForCopy = data?.wallet ?? address;
  const joinedLabel = formatProfileJoinedAt(gp?.created_at ?? null, locale);
  const xHandle = gp?.x_username?.trim().replace(/^@/, "") ?? "";
  const fe = data?.frontend;
  const ledgerSlice = useMemo(() => {
    const raw = fe?.trade_ledger;
    if (!raw?.length) return null;
    const total = raw.length;
    const rows = raw.slice(-LEDGER_UI_MAX);
    return { total, rows };
  }, [fe?.trade_ledger]);
  const truncated = data?.data_fetch?.truncated;
  const titlePrimary =
    gp?.display_name || gp?.username || shortAddr(wallet);
  /** 仅等 Gamma public-profile，不把 analyze 挂起算进「标题加载」 */
  const showPublicProfileSpinner =
    publicProfileQ.isPending &&
    !gp?.display_name &&
    !gp?.username;

  return (
    <div className="space-y-10 pb-24">
      {truncated && analyzeReady && (
        <div className="flex items-center justify-center gap-3 border-b border-error/30 bg-error-container/20 py-2 px-4">
          <TriangleAlert className="h-4 w-4 shrink-0 text-error" />
          <p className="font-jetbrains text-xs uppercase tracking-wider text-error">
            {tr("account.samplingBanner")}
          </p>
        </div>
      )}

      {/* Profile */}
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
            {gp?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gp.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full border-2 border-primary/30 p-0.5 sm:h-16 sm:w-16"
              />
            ) : (
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-surface-container-highest font-headline text-xl text-primary sm:h-16 sm:w-16">
                {wallet.slice(2, 3).toUpperCase()}
                {publicProfileQ.isPending && !leaderboardProfileHint?.profileImage ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                    <Loader2
                      className="h-6 w-6 animate-spin text-primary"
                      aria-label={tr("account.loadingPublicProfile")}
                    />
                  </span>
                ) : null}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-secondary animate-pulse-live" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="flex flex-wrap items-center gap-2 font-headline text-2xl font-bold uppercase tracking-tight text-white sm:text-4xl">
                <span className="min-w-0 break-words">{titlePrimary}</span>
                {showPublicProfileSpinner ? (
                  <Loader2
                    className="h-6 w-6 shrink-0 animate-spin text-primary sm:h-7 sm:w-7"
                    aria-hidden
                  />
                ) : null}
              </h1>
              {gp?.verified_badge ? (
                <span
                  className="font-jetbrains text-sm text-primary"
                  title="verified"
                  aria-label="verified"
                >
                  ✓
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (watching) remove(wallet);
                  else {
                    add(wallet, {
                      userName:
                        (gp?.display_name || gp?.username)?.trim() || undefined,
                      profileImage: gp?.avatar_url ?? undefined,
                      verifiedBadge: gp?.verified_badge === true,
                    });
                    toast.success(tr("account.addedWatchlist"));
                  }
                }}
                className={cn(
                  "rounded p-1 transition-colors",
                  watching ? "text-secondary" : "text-zinc-500 hover:text-primary",
                )}
                aria-label="watchlist"
              >
                <Star className={cn("h-5 w-5", watching && "fill-secondary")} />
              </button>
              <button
                type="button"
                onClick={() => void onManualRefreshAnalyze()}
                disabled={manualRefreshBusy}
                className={cn(
                  "rounded p-1 transition-colors text-zinc-500 hover:text-primary",
                  manualRefreshBusy && "pointer-events-none opacity-50",
                )}
                title={tr("account.refreshAnalyzeTitle")}
                aria-label={tr("account.refreshAnalyzeTitle")}
              >
                <RefreshCw
                  className={cn("h-5 w-5", manualRefreshBusy && "animate-spin")}
                />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(walletForCopy);
                toast.success(tr("account.copiedAddr"));
              }}
              className="group flex items-center gap-2 font-jetbrains text-sm text-zinc-500"
            >
              {shortAddr(walletForCopy)}
              <Copy className="h-4 w-4 group-hover:text-primary" />
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-jetbrains text-[11px] text-zinc-500">
              {joinedLabel ? (
                <span>
                  {tr("account.joinedAt")} · {joinedLabel}
                </span>
              ) : null}
              {xHandle ? (
                <a
                  href={`https://x.com/${encodeURIComponent(xHandle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary transition-colors hover:underline"
                >
                  {tr("account.profileOnX")}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <details className="group w-full overflow-hidden rounded-lg border border-white/5 bg-surface-container-low md:max-w-md">
          <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-white/5">
            <span className="font-jetbrains text-xs text-zinc-400">
              {tr("account.dataSpec")}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="max-w-md p-4 pt-0 font-body text-xs leading-relaxed text-zinc-500">
            {data?.notes?.length
              ? data.notes.join(" ")
              : tr("account.dataNotesFallback")}
          </div>
        </details>
      </section>

      {gp?.bio?.trim() ? (
        <div className="rounded-xl border border-white/10 bg-surface-container-low/50 p-4 sm:p-5">
          <div className="mb-2 font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
            {tr("account.bio")}
          </div>
          <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-zinc-300">
            {gp.bio.trim()}
          </p>
        </div>
      ) : null}

      <OfficialPolymarketUserPanel wallet={wallet} />

      {analyzeReady && data ? (
        <p className="font-jetbrains text-[10px] tracking-wide text-zinc-500">
          <span className="text-zinc-600">{tr("account.reportUpdatedAt")}</span>{" "}
          {formatReportUpdatedAt(data.report_updated_at, locale) ?? "—"}
        </p>
      ) : null}

      {(analyzeBackgroundFetch || manualRefreshBusy) && analyzeReady && (
        <p className="font-jetbrains text-[10px] text-primary">
          {manualRefreshBusy
            ? tr("account.refreshAnalyzeBusy")
            : tr("account.refreshing")}
        </p>
      )}

      {analyzeError && (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center">
          <p className="font-jetbrains text-sm text-error">
            {(analyzeError as Error)?.message ?? tr("account.loadError")}
          </p>
          <button
            type="button"
            onClick={() => {
              void analyzeCachedQ.refetch();
              void analyzeFullQ.refetch();
            }}
            className="mt-4 rounded-sm bg-primary px-4 py-2 font-jetbrains text-xs font-bold text-on-primary"
          >
            {tr("account.retry")}
          </button>
        </div>
      )}

      {analyzePending && !analyzeError && (
        <div className="rounded-xl border border-primary/20 bg-surface-container-low/90 px-6 py-10 text-center sm:px-10">
          <Loader2
            className="mx-auto mb-5 h-11 w-11 animate-spin text-primary"
            aria-hidden
          />
          <h2 className="font-headline text-lg font-bold tracking-tight text-white sm:text-xl">
            {tr("account.firstAnalyzeTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-lg font-body text-sm leading-relaxed text-zinc-400">
            {tr("account.firstAnalyzeBody")}
          </p>
          <p className="mx-auto mt-5 max-w-md font-jetbrains text-[10px] leading-relaxed text-zinc-600">
            {tr("account.firstAnalyzeHint")}
          </p>
        </div>
      )}

      {analyzeReady && data && (
        <>
          {staggerStep >= 1 ? (
            <section className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  label={tr("account.kpiTrades")}
                  value={String(data.lifetime.total_trades)}
                  hint={(() => {
                    const fills = data.trades_fill_count ?? data.trades_count;
                    if (fills > data.lifetime.total_trades) {
                      return tr("account.kpiTradesFillsHint").replace(
                        "{n}",
                        String(fills),
                      );
                    }
                    return undefined;
                  })()}
                />
                <Kpi
                  label={tr("account.kpiVolume")}
                  value={fmtUsd(data.lifetime.total_volume)}
                />
                <Kpi
                  label={tr("account.kpiPnl")}
                  value={fmtUsd(data.lifetime.net_pnl, { signed: true })}
                  valueClass={
                    data.lifetime.net_pnl >= 0
                      ? "text-secondary"
                      : "text-tertiary"
                  }
                  hint={
                    data.lifetime.net_pnl_settlement != null &&
                    Math.abs(data.lifetime.net_pnl_settlement) > 1e-9
                      ? tr("account.kpiPnlSettlementHint").replace(
                          "{s}",
                          fmtUsd(data.lifetime.net_pnl_settlement, {
                            signed: true,
                          }),
                        )
                      : undefined
                  }
                />
                <Kpi
                  label={tr("account.kpiOpen")}
                  value={fmtUsd(data.lifetime.open_position_value)}
                  valueClass="text-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  label={tr("account.kpiMaxWin")}
                  value={fmtUsd(data.lifetime.max_single_win)}
                  valueClass="text-secondary"
                />
                <Kpi
                  label={tr("account.kpiMaxLoss")}
                  value={fmtUsd(data.lifetime.max_single_loss, { signed: true })}
                  valueClass="text-tertiary"
                />
                {data.lifetime.open_positions_count != null ? (
                  <Kpi
                    label={tr("account.kpiOpenCount")}
                    value={String(data.lifetime.open_positions_count)}
                  />
                ) : null}
              </div>
            </section>
          ) : (
            <SkeletonKpiGrid />
          )}

          {staggerStep >= 2 ? (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Panel title="Market Distribution" dot="bg-primary">
                <ul className="divide-y divide-white/5 font-jetbrains text-[11px]">
                  {data.market_distribution.slice(0, 6).map((m) => (
                    <li
                      key={m.market_type}
                      className="flex justify-between py-2 hover:bg-white/5"
                    >
                      <span className="text-zinc-400">{m.market_type}</span>
                      <span className="text-white">{fmtUsd(m.volume)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Entry Price Buckets" dot="bg-secondary">
                <div className="space-y-4">
                  {bucketBars.map((b) => (
                    <div key={b.label} className="group">
                      <div className="mb-1 flex justify-between font-jetbrains text-[10px] text-zinc-500">
                        <span>{b.label}</span>
                        <span>{b.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Time Analysis (UTC)" dot="bg-tertiary">
                {heat && (
                  <>
                    <div className="mb-6 grid grid-cols-6 gap-1">
                      {heat.out.map(({ h, c }) => (
                        <div
                          key={h}
                          title={`${h}:00 — ${c}`}
                          className="aspect-square rounded-sm bg-zinc-800"
                          style={{
                            opacity: 0.25 + (c / heat.max) * 0.75,
                            backgroundColor:
                              c > 0 ? "rgb(133, 173, 255)" : undefined,
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-2 font-jetbrains text-xs text-white">
                      <RowKV
                        k="Metadata missing"
                        v={`${(data.time_analysis.metadata_missing_ratio * 100).toFixed(0)}%`}
                      />
                      {data.time_analysis.entry_to_resolution_p90_sec !=
                        null && (
                        <RowKV
                          k="Entry→Res P90 (s)"
                          v={String(
                            Math.round(
                              data.time_analysis.entry_to_resolution_p90_sec,
                            ),
                          )}
                        />
                      )}
                    </div>
                  </>
                )}
              </Panel>
            </section>
          ) : (
            <SkeletonThreeCol />
          )}

          {staggerStep >= 3 ? (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-surface-container-low p-6">
                <span className="mb-4 block font-jetbrains text-[10px] uppercase text-zinc-500">
                  Overall Win Rate
                </span>
                <WinRing pct={data.trading_patterns.win_rate_overall} />
              </div>
              <div className="md:col-span-2 rounded-xl border border-white/5 bg-surface-container-low p-6">
                <div className="mb-6 flex justify-between font-jetbrains text-[10px] uppercase text-zinc-500">
                  <span>Win Rate by Market Type</span>
                  <span className="text-primary">SESSION</span>
                </div>
                <div className="space-y-5">
                  {data.trading_patterns.win_rate_by_market_type.map((x) => (
                    <div key={x.market_type} className="flex items-center gap-4">
                      <span className="w-24 shrink-0 font-jetbrains text-[10px] text-zinc-400">
                        {x.market_type}
                      </span>
                      <div className="flex h-3 flex-1 overflow-hidden rounded-sm bg-zinc-800">
                        <div
                          className="h-full bg-secondary"
                          style={{ width: `${Math.min(100, x.win_rate)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-jetbrains text-[10px] text-zinc-300">
                        {x.win_rate.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 font-jetbrains text-[10px] text-zinc-500">
                  <span>
                    BUY {data.trading_patterns.side_bias.buy_pct.toFixed(0)}%
                  </span>
                  <span>
                    SELL {data.trading_patterns.side_bias.sell_pct.toFixed(0)}%
                  </span>
                  <span>
                    YES {data.trading_patterns.side_bias.yes_pct.toFixed(0)}%
                  </span>
                  <span>
                    NO {data.trading_patterns.side_bias.no_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <SkeletonPatterns />
          )}

          {staggerStep >= 4 ? (
            <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-[#171717] to-[#0e0e0e] p-6 sm:p-8">
              <BrainCircuit className="pointer-events-none absolute right-4 top-4 h-24 w-24 text-primary/10 sm:h-32 sm:w-32" />
              <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-jetbrains text-[10px] uppercase tracking-tighter text-primary">
                      Strategy Inference
                    </span>
                    <span className="font-jetbrains text-[10px] text-zinc-500">
                      {data.schema_version}
                    </span>
                  </div>
                  <h2 className="mb-4 font-headline text-2xl font-bold sm:text-3xl">
                    {data.strategy_inference.primary_style}
                  </h2>
                  <div className="rounded border border-white/5 bg-black/40 p-4 font-jetbrains text-xs">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-zinc-300">
                      {JSON.stringify(data.strategy_inference.rule_json, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="font-jetbrains text-[10px] uppercase text-zinc-500">
                      Pseudocode
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          data.strategy_inference.pseudocode,
                        );
                        toast.success(tr("account.copiedPseudo"));
                      }}
                      className="flex items-center gap-1 font-jetbrains text-[10px] text-zinc-500 hover:text-white"
                    >
                      <Copy className="h-3 w-3" /> {tr("account.copyPseudo")}
                    </button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-white/5 bg-zinc-900/80 p-4 font-jetbrains text-[11px] text-primary/90">
                    {data.strategy_inference.pseudocode}
                  </pre>
                  {fe?.ai_copy_prompt && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(fe.ai_copy_prompt);
                        toast.success(tr("account.copiedPrompt"));
                      }}
                      className="mt-4 w-full rounded-sm border border-white/10 py-2 font-jetbrains text-[10px] text-zinc-400 hover:bg-white/5"
                    >
                      {tr("account.copyPrompt")}
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <SkeletonStrategy />
          )}

          {staggerStep >= 5 ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <HighlightTable
                title="Biggest Wins (pnl)"
                rows={fe?.biggest_wins}
                positive
              />
              <HighlightTable
                title="Biggest Losses (pnl)"
                rows={fe?.biggest_losses}
              />
            </div>
          ) : (
            <SkeletonHighlights />
          )}

          {staggerStep >= 6 ? (
            <>
              {fe?.current_positions && fe.current_positions.length > 0 && (
                <div className="space-y-2">
                  <p className="font-jetbrains text-[10px] uppercase tracking-widest text-zinc-600">
                    {tr("account.positionsSource")}
                  </p>
                  <DataTable
                    title={tr("account.positionsTitle")}
                    badge={`${fe.current_positions.length} ${tr("account.positionsBadgeActive")}`}
                    columns={[
                      tr("account.colMarket"),
                      tr("account.colOutcome"),
                      tr("account.colSize"),
                      tr("account.colAvg"),
                      tr("account.colValue"),
                    ]}
                    rows={fe.current_positions.map((p) => ({
                      cells: [
                        p.title || p.slug || "—",
                        p.outcome || "—",
                        p.size != null ? String(p.size) : "—",
                        p.avg_price != null ? String(p.avg_price) : "—",
                        p.current_value != null ? fmtUsd(p.current_value) : "—",
                      ],
                    }))}
                  />
                </div>
              )}

              {fe?.recent_trades && fe.recent_trades.length > 0 && (
                <div className="space-y-2">
                  <p className="font-jetbrains text-[10px] uppercase tracking-widest text-zinc-600">
                    {tr("account.tradesSource")}
                  </p>
                  <div className="rounded-xl border border-white/5 bg-surface-container-low">
                    <div className="border-b border-white/5 px-6 py-4 font-jetbrains text-xs uppercase tracking-widest">
                      {tr("account.recentTrades")}
                    </div>
                    <ul className="divide-y divide-white/5">
                      {fe.recent_trades.slice(0, 20).map((row, i) => (
                        <li
                          key={`${row.timestamp}-${i}`}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-jetbrains text-[11px] sm:px-6"
                        >
                          <span className="text-zinc-400">{row.side}</span>
                          <span className="min-w-0 flex-1 truncate text-white">
                            {row.title || row.slug}
                          </span>
                          <span
                            className={
                              row.pnl >= 0 ? "text-secondary" : "text-tertiary"
                            }
                          >
                            {fmtUsd(row.pnl, { signed: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {ledgerSlice && (
                <div className="space-y-2">
                  <p className="font-jetbrains text-[10px] uppercase tracking-widest text-zinc-600">
                    {tr("account.ledgerSource")}
                  </p>
                  <DataTable
                    title={tr("account.ledgerTitle")}
                    badge={
                      ledgerSlice.total > LEDGER_UI_MAX
                        ? tr("account.ledgerBadgeTruncated")
                            .replace("{shown}", String(LEDGER_UI_MAX))
                            .replace("{total}", String(ledgerSlice.total))
                        : `${ledgerSlice.total}`
                    }
                    columns={[
                      tr("account.colTime"),
                      tr("account.colSlug"),
                      tr("account.colKind"),
                      tr("account.colOutcome"),
                      tr("account.colBuyShares"),
                      tr("account.colBuyPrice"),
                      tr("account.colBuyTotal"),
                      tr("account.colSellPrice"),
                      tr("account.colSellTotal"),
                      tr("account.colPnl"),
                    ]}
                    rows={ledgerSlice.rows.map((row) => ({
                      cells: [
                        fmtLedgerTs(row.ts_ms, locale),
                        row.title || row.slug || "—",
                        ledgerKindLabel(row.row_kind, tr),
                        row.outcome?.trim() || "—",
                        fmtLedgerScalar(row.size, "qty"),
                        fmtLedgerScalar(row.buy_price, "price"),
                        row.buy_total !== 0
                          ? fmtUsd(row.buy_total)
                          : "—",
                        fmtLedgerScalar(row.sell_price, "price"),
                        row.sell_total !== 0
                          ? fmtUsd(row.sell_total)
                          : "—",
                        row.pnl !== 0
                          ? fmtUsd(row.pnl, { signed: true })
                          : "—",
                      ],
                    }))}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <SkeletonTableBlock />
              <SkeletonTableBlock />
            </>
          )}
        </>
      )}

      <p className="text-center font-jetbrains text-[10px] text-zinc-600">
        <Link href="/" className="hover:text-primary">
          {tr("account.backHome")}
        </Link>
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  /** Secondary line (e.g. fill count under market count). */
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-surface-container-low p-5 sm:p-6">
      <span className="mb-2 block font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <div
        className={cn(
          "font-headline text-2xl font-bold tracking-tight sm:text-3xl",
          valueClass ?? "text-white",
        )}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-2 font-jetbrains text-[10px] leading-snug text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  dot,
  children,
}: {
  title: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-container p-5 sm:p-6">
      <h3 className="mb-6 flex items-center gap-2 font-jetbrains text-xs uppercase tracking-widest text-zinc-400">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] uppercase text-zinc-500">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function WinRing({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct));
  const dash = `${p}, 100`;
  return (
    <div className="relative mx-auto w-32 h-32">
      <svg className="-rotate-90 h-full w-full" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#262626"
          strokeWidth="2.5"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#00fd87"
          strokeWidth="2.5"
          strokeDasharray={dash}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline text-2xl font-bold">{p.toFixed(0)}%</span>
        <span className="text-[8px] font-jetbrains text-zinc-500">WIN_RATE</span>
      </div>
    </div>
  );
}

function DataTable({
  title,
  badge,
  columns,
  rows,
}: {
  title: string;
  badge?: string;
  columns: string[];
  rows: { cells: string[] }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-low">
      <div className="flex justify-between border-b border-white/5 px-4 py-4 sm:px-6">
        <h3 className="font-jetbrains text-xs font-bold uppercase tracking-widest">
          {title}
        </h3>
        {badge && (
          <span className="font-jetbrains text-xs text-zinc-500">{badge}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-jetbrains text-xs">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-medium uppercase sm:px-6">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-white/5">
                {r.cells.map((c, j) => (
                  <td key={j} className="px-4 py-3 text-white sm:px-6">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HighlightTable({
  title,
  rows,
  positive,
}: {
  title: string;
  rows?: Array<{
    slug: string;
    title?: string | null;
    pnl: number;
    price: number;
    size: number;
  }>;
  positive?: boolean;
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-white/5 bg-surface-container-low p-6 font-jetbrains text-xs text-zinc-500">
        {title} — NO_DATA
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-low">
      <div className="border-b border-white/5 px-6 py-4 font-jetbrains text-xs uppercase tracking-widest">
        {title}
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <li
            key={`${r.slug}-${i}`}
            className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6"
          >
            <span className="min-w-0 truncate font-jetbrains text-xs text-white">
              {r.title || r.slug}
            </span>
            <span
              className={cn(
                "shrink-0 font-jetbrains text-xs font-bold",
                positive ? "text-secondary" : "text-tertiary",
              )}
            >
              {fmtUsd(r.pnl, { signed: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
