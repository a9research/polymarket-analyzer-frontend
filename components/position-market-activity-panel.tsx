"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchPositionActivity,
  type PositionActivityResponse,
  type PositionMarketPick,
} from "@/lib/api";

function groupByConditionId(
  markets: PositionMarketPick[],
): [string, PositionMarketPick[]][] {
  const m = new Map<string, PositionMarketPick[]>();
  for (const x of markets) {
    const arr = m.get(x.condition_id) ?? [];
    arr.push(x);
    m.set(x.condition_id, arr);
  }
  return Array.from(m.entries());
}

export function PositionMarketActivityPanel({
  wallet,
  markets,
  tr,
}: {
  wallet: string;
  markets: PositionMarketPick[];
  tr: (k: string) => string;
}) {
  const [selectedCid, setSelectedCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<PositionActivityResponse | null>(null);

  const grouped = useMemo(() => groupByConditionId(markets), [markets]);

  if (!grouped.length) return null;

  const load = async () => {
    if (!selectedCid.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const j = await fetchPositionActivity(wallet, selectedCid);
      setPayload(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-surface-container-low p-4 sm:p-5">
      <div>
        <h3 className="mb-1 font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
          {tr("account.marketActivityTitle")}
        </h3>
        <p className="m-0 font-body text-xs leading-relaxed text-zinc-500">
          {tr("account.marketActivitySubtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="font-jetbrains text-[10px] text-zinc-500">
            {tr("account.marketActivityPick")}
          </span>
          <select
            className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-primary/50"
            value={selectedCid}
            onChange={(e) => {
              setSelectedCid(e.target.value);
              setPayload(null);
              setErr(null);
            }}
          >
            <option value="">{tr("account.marketActivityPlaceholder")}</option>
            {grouped.map(([cid, rows]) => {
              const openN = rows.filter(
                (r: PositionMarketPick) => r.status === "open",
              ).length;
              const closedN = rows.filter(
                (r: PositionMarketPick) => r.status === "closed",
              ).length;
              const label0 =
                rows[0]?.title?.trim() ||
                rows[0]?.slug?.trim() ||
                `${cid.slice(0, 10)}…${cid.slice(-6)}`;
              const parts: string[] = [];
              if (openN) parts.push(`${tr("account.marketStatusOpen")} ${openN}`);
              if (closedN)
                parts.push(`${tr("account.marketStatusClosed")} ${closedN}`);
              const suffix = parts.length ? ` (${parts.join(", ")})` : "";
              return (
                <option key={cid} value={cid}>
                  {label0.slice(0, 72)}
                  {suffix}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          disabled={!selectedCid || loading}
          onClick={() => void load()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 font-jetbrains text-xs font-bold text-on-primary disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {tr("account.marketActivityLoad")}
        </button>
      </div>
      {err ? (
        <p className="m-0 font-jetbrains text-sm text-error">{err}</p>
      ) : null}
      {payload ? (
        <div className="space-y-2">
          <p className="m-0 font-jetbrains text-[10px] text-zinc-500">
            {tr("account.marketActivityResultMeta")
              .replace("{n}", String(payload.activity_count))
              .replace("{m}", payload.market)}
          </p>
          <pre className="max-h-[28rem] overflow-auto rounded-lg border border-white/5 bg-black/45 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
