"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Copy } from "lucide-react";
import { fetchLeaderboard, type LeaderboardItem } from "@/lib/api";
import toast from "react-hot-toast";

function shortAddr(a: string) {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function formatMoney(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatVol(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function Row({ item, rank }: { item: LeaderboardItem; rank: number }) {
  const copy = () => {
    void navigator.clipboard.writeText(item.wallet);
    toast.success("已复制地址");
  };

  return (
    <tr className="group cursor-pointer border-t border-white/5 transition-colors hover:bg-surface-container-highest">
      <td className="px-4 py-4 sm:px-6 sm:py-5">
        <span className="font-bold text-white opacity-30 transition-opacity group-hover:opacity-100">
          #{String(rank).padStart(2, "0")}
        </span>
      </td>
      <td className="px-4 py-4 sm:px-6 sm:py-5">
        <Link href={`/account/${encodeURIComponent(item.wallet)}`} className="block">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/20 font-bold text-primary">
              W
            </div>
            <div className="min-w-0">
              <div className="truncate font-jetbrains text-sm font-medium text-white">
                Trader
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="font-jetbrains">{shortAddr(item.wallet)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    copy();
                  }}
                  className="text-zinc-500 hover:text-white"
                  aria-label="复制地址"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </Link>
      </td>
      <td className="hidden px-6 py-5 text-zinc-400 sm:table-cell font-jetbrains text-sm">
        {item.trades_count.toLocaleString()}
      </td>
      <td
        className={`px-4 py-4 text-right font-jetbrains text-sm font-bold sm:px-6 sm:py-5 ${
          item.net_pnl >= 0 ? "text-secondary" : "text-tertiary"
        }`}
      >
        {formatMoney(item.net_pnl)}
      </td>
      <td className="hidden px-6 py-5 text-right text-white sm:table-cell font-jetbrains text-sm">
        {formatVol(item.total_volume)}
      </td>
      <td className="px-4 py-4 text-right sm:px-6 sm:py-5">
        <Link href={`/account/${encodeURIComponent(item.wallet)}`}>
          <ArrowUpRight className="ml-auto h-5 w-5 text-zinc-600 transition-colors group-hover:text-primary" />
        </Link>
      </td>
    </tr>
  );
}

export function LeaderboardTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["leaderboard", 30],
    queryFn: ({ signal }) => fetchLeaderboard(30, signal),
  });

  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-surface-container-low shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h2 className="font-headline text-lg font-medium tracking-tight text-white sm:text-xl">
          Market Dominators
        </h2>
        <div className="flex gap-2">
          <span className="rounded bg-surface-container-highest px-3 py-1 font-jetbrains text-[10px] text-white">
            NET_PNL
          </span>
          <span className="rounded px-3 py-1 font-jetbrains text-[10px] text-zinc-500">
            FROM_CACHE
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center font-jetbrains text-sm text-zinc-500">
          LOADING // LEADERBOARD...
        </div>
      )}

      {isError && (
        <div className="p-12 text-center font-jetbrains text-sm text-error">
          {(error as Error).message}
          <p className="mt-2 text-xs text-zinc-500">
            确认后端已启用 DATABASE_URL 且 VPS 已配置 CORS（PAA_CORS_ORIGINS）。
          </p>
        </div>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <div className="p-12 text-center font-jetbrains text-sm text-zinc-500">
          暂无榜单数据 — 请先在分析服务上对若干钱包执行 analyze 并写入缓存。
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3 font-normal sm:px-6 sm:py-4">Rank</th>
                <th className="px-4 py-3 font-normal sm:px-6 sm:py-4">Entity</th>
                <th className="hidden px-6 py-4 font-normal sm:table-cell">Trades</th>
                <th className="px-4 py-3 text-right font-normal sm:px-6 sm:py-4">
                  Net PnL
                </th>
                <th className="hidden px-6 py-4 text-right font-normal sm:table-cell">
                  Volume
                </th>
                <th className="px-4 py-3 text-right font-normal sm:px-6 sm:py-4">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="font-jetbrains text-sm">
              {data.map((item, i) => (
                <Row key={item.wallet} item={item} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
