"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import {
  fetchPolymarketOfficialUserPnlSeries,
  fetchPolymarketOfficialUserStats,
  type PolymarketOfficialPnlPoint,
} from "@/lib/polymarket-official-user-api";
import { useI18n, type Locale } from "@/lib/i18n-context";

type PnlRange = "1d" | "1w" | "1m" | "all";

const RANGE_TABS: { id: PnlRange; labelKey: string }[] = [
  { id: "1d", labelKey: "account.officialPnl1d" },
  { id: "1w", labelKey: "account.officialPnl1w" },
  { id: "1m", labelKey: "account.officialPnl1m" },
  { id: "all", labelKey: "account.officialPnlAll" },
];

/**
 * 精确金额：`$` + 千分位 + 两位小数；不用 `Intl currency`，避免中文环境出现 `US$`。
 */
function fmtUsdPlain(n: number) {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  const body = v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${body}`;
}

function fmtCompactUsd(n: number, loc: Locale) {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}K`;
  return `${sign}$${v.toLocaleString(loc === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 0 })}`;
}

function formatJoin(iso: string | undefined, loc: Locale) {
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

function chartRows(points: PolymarketOfficialPnlPoint[], loc: Locale) {
  return points.map((x) => ({
    ts: x.t * 1000,
    pnl: x.p,
    label: new Date(x.t * 1000).toLocaleDateString(
      loc === "zh" ? "zh-CN" : "en-US",
      { month: "short", day: "numeric" },
    ),
  }));
}

/**
 * 官网逻辑：1D/1W/1M 大图数字 = 当前区间内累计曲线「末点 − 起点」（区间盈亏变化）；
 * ALL = 末点（历史累计）。若误用末点当 1M  headline 会与官网「过去一个月」约 $2.9M 对不上。
 */
function chartHeroValue(
  range: PnlRange,
  series: PolymarketOfficialPnlPoint[] | undefined,
): number | undefined {
  if (!series?.length) return undefined;
  const first = series[0]!.p;
  const last = series[series.length - 1]!.p;
  if (range === "all") return last;
  return last - first;
}

export function OfficialPolymarketUserPanel({ wallet }: { wallet: string }) {
  const { t, locale } = useI18n();
  const w = wallet.toLowerCase();
  const [pnlRange, setPnlRange] = useState<PnlRange>("1m");

  const statsQ = useQuery({
    queryKey: ["official-user-stats", w],
    queryFn: ({ signal }) => fetchPolymarketOfficialUserStats(w, { signal }),
    staleTime: 120_000,
    retry: 1,
  });

  /** 专供左侧「历史累计」：与官网 ALL 一致，用 `interval=all` 曲线末点 */
  const cumulativePnlQ = useQuery({
    queryKey: ["official-user-pnl", w, "all"],
    queryFn: ({ signal }) =>
      fetchPolymarketOfficialUserPnlSeries(w, "all", { signal }),
    staleTime: 60_000,
    retry: 1,
  });

  const pnlQ = useQuery({
    queryKey: ["official-user-pnl", w, pnlRange],
    queryFn: ({ signal }) =>
      fetchPolymarketOfficialUserPnlSeries(w, pnlRange, { signal }),
    staleTime: 60_000,
    retry: 1,
  });

  const chartData = useMemo(
    () => (pnlQ.data?.length ? chartRows(pnlQ.data, locale) : []),
    [pnlQ.data, locale],
  );

  const leftCumulativePnl = useMemo(() => {
    if (typeof statsQ.data?.pnl === "number" && Number.isFinite(statsQ.data.pnl)) {
      return statsQ.data.pnl;
    }
    const s = cumulativePnlQ.data;
    if (s?.length) return s[s.length - 1]!.p;
    return undefined;
  }, [statsQ.data?.pnl, cumulativePnlQ.data]);

  const heroValue = chartHeroValue(pnlRange, pnlQ.data);

  const subtitleKey =
    pnlRange === "all"
      ? "account.officialPnlSubtitleAll"
      : pnlRange === "1d"
        ? "account.officialPnlSubtitle1d"
        : pnlRange === "1w"
          ? "account.officialPnlSubtitle1w"
          : "account.officialPnlSubtitle1m";

  const headerBusy =
    statsQ.isFetching || pnlQ.isFetching || cumulativePnlQ.isFetching;

  return (
    <section className="rounded-xl border border-primary/20 bg-surface-container-low/60 p-4 sm:p-6">
      {headerBusy ? (
        <div className="mb-4 flex justify-end">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-4">
          {statsQ.isPending ? (
            <div className="flex min-h-[6rem] items-center justify-center rounded-lg border border-white/5 bg-black/20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : statsQ.isError ? (
            <p className="font-jetbrains text-xs text-error">
              {(statsQ.error as Error).message}
            </p>
          ) : (
            <>
              {cumulativePnlQ.isPending && leftCumulativePnl == null ? (
                <div className="flex min-h-[4rem] items-center justify-center rounded-lg border border-white/5 bg-black/10">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : leftCumulativePnl != null && Number.isFinite(leftCumulativePnl) ? (
                <div>
                  <p className="font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
                    {t("account.officialCumulativePnl")}
                  </p>
                  <p
                    className={cn(
                      "font-headline text-3xl font-bold tracking-tight sm:text-4xl",
                      leftCumulativePnl >= 0 ? "text-secondary" : "text-tertiary",
                    )}
                  >
                    {fmtCompactUsd(leftCumulativePnl, locale)}
                  </p>
                </div>
              ) : null}
              <dl className="grid grid-cols-2 gap-3 font-jetbrains text-xs sm:grid-cols-2">
                {statsQ.data?.trades != null ? (
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {t("account.officialTrades")}
                    </dt>
                    <dd className="mt-0.5 text-white">{statsQ.data.trades}</dd>
                  </div>
                ) : null}
                {statsQ.data?.views != null ? (
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {t("account.officialViews")}
                    </dt>
                    <dd className="mt-0.5 text-white">
                      {statsQ.data.views.toLocaleString(
                        locale === "zh" ? "zh-CN" : "en-US",
                      )}
                    </dd>
                  </div>
                ) : null}
                {statsQ.data?.largestWin != null ? (
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {t("account.officialLargestWin")}
                    </dt>
                    <dd className="mt-0.5 text-secondary">
                      {fmtCompactUsd(statsQ.data.largestWin, locale)}
                    </dd>
                  </div>
                ) : null}
                {formatJoin(statsQ.data?.joinDate, locale) ? (
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {t("account.officialJoinDate")}
                    </dt>
                    <dd className="mt-0.5 text-white">
                      {formatJoin(statsQ.data?.joinDate, locale)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </>
          )}
        </div>

        <div className="min-h-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {RANGE_TABS.map((tab) => {
                const on = pnlRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPnlRange(tab.id)}
                    className={cn(
                      "rounded px-2.5 py-1 font-jetbrains text-[10px] uppercase tracking-wider transition-colors",
                      on
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300",
                    )}
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 shrink-0 text-right sm:max-w-[min(100%,22rem)]">
              {pnlQ.isPending ? null : pnlQ.isError ? (
                <p className="text-right font-jetbrains text-[10px] text-error">
                  {(pnlQ.error as Error).message}
                </p>
              ) : heroValue != null && Number.isFinite(heroValue) ? (
                <>
                  <p className="font-jetbrains text-[10px] leading-snug text-zinc-500">
                    {t("account.officialChartPnlTitle")}-{t(subtitleKey)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-headline text-2xl font-bold tracking-tight sm:text-3xl",
                      heroValue >= 0 ? "text-secondary" : "text-tertiary",
                    )}
                  >
                    {fmtUsdPlain(heroValue)}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          {pnlQ.isPending ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-white/5 bg-black/20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : pnlQ.isError ? null : chartData.length === 0 ? (
            <p className="font-jetbrains text-xs text-zinc-500">
              {t("account.officialPnlEmpty")}
            </p>
          ) : (
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="officialPnlFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(133, 173, 255)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(133, 173, 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickFormatter={(v) => fmtCompactUsd(Number(v), locale)}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#171717",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value) =>
                      fmtCompactUsd(
                        value == null ? 0 : Number(value),
                        locale,
                      )
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke="rgb(133, 173, 255)"
                    strokeWidth={2}
                    fill="url(#officialPnlFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
