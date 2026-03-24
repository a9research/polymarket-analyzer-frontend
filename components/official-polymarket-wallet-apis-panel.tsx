"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import { useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";
import {
  dataApiPositionsPageUrl,
  extractProxyWalletsFromPositionRows,
  fetchDataApiClosedPositionsAll,
  fetchDataApiPositionsAll,
  fetchGammaPublicProfileJsonFirstMatch,
  gammaPublicProfileBrowserDirectEnabled,
  gammaPublicProfileFetchUrl,
  gammaPublicProfileUpstreamUrl,
  OFFICIAL_POLYMARKET_DATA_ORIGIN,
  OFFICIAL_POLYMARKET_GAMMA_ORIGIN,
} from "@/lib/polymarket-official-wallet-apis";

const COL_PRIORITY = [
  "title",
  "slug",
  "outcome",
  "conditionId",
  "condition_id",
  "asset",
  "proxyWallet",
  "proxy_wallet",
  "size",
  "avgPrice",
  "avg_price",
  "curPrice",
  "cur_price",
  "currentValue",
  "current_value",
  "cashPnl",
  "cash_pnl",
  "realizedPnl",
  "realized_pnl",
  "percentPnl",
  "percent_pnl",
  "initialValue",
  "initial_value",
  "totalBought",
  "total_bought",
  "endDate",
  "end_date",
];

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number")
    return Number.isFinite(v) ? String(v) : "—";
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "—";
    return t.length > 120 ? `${t.slice(0, 120)}…` : t;
  }
  try {
    const s = JSON.stringify(v);
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return String(v);
  }
}

function collectColumnKeys(rows: Record<string, unknown>[]): string[] {
  const s = new Set<string>();
  const cap = Math.min(rows.length, 3000);
  for (let i = 0; i < cap; i++) {
    const r = rows[i];
    for (const k of Object.keys(r)) s.add(k);
  }
  const rest = Array.from(s)
    .filter((k) => !COL_PRIORITY.includes(k))
    .sort();
  const first = COL_PRIORITY.filter((k) => s.has(k));
  return [...first, ...rest];
}

function ProfileFields({
  body,
}: {
  body: Record<string, unknown>;
}) {
  const keys = useMemo(
    () => [...Object.keys(body)].sort((a, b) => a.localeCompare(b)),
    [body],
  );
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {keys.map((k) => (
        <div
          key={k}
          className="rounded border border-white/5 bg-black/20 px-3 py-2"
        >
          <dt className="font-jetbrains text-[10px] uppercase tracking-wider text-zinc-500">
            {k}
          </dt>
          <dd className="mt-1 break-words font-mono text-xs text-zinc-200">
            {formatCell(body[k])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DynamicRowsTable({
  rows,
  emptyLabel,
}: {
  rows: Record<string, unknown>[];
  emptyLabel: string;
}) {
  const keys = useMemo(() => collectColumnKeys(rows), [rows]);
  if (rows.length === 0) {
    return (
      <p className="font-jetbrains text-xs text-zinc-500">{emptyLabel}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-max min-w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="sticky left-0 z-[1] bg-zinc-900/95 px-2 py-2 font-jetbrains text-[10px] uppercase tracking-wider text-zinc-500">
              #
            </th>
            {keys.map((k) => (
              <th
                key={k}
                className="whitespace-nowrap px-2 py-2 font-jetbrains text-[10px] uppercase tracking-wider text-zinc-500"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.06] hover:bg-white/[0.02]"
            >
              <td className="sticky left-0 z-[1] bg-zinc-950/95 px-2 py-1.5 font-mono text-zinc-600">
                {i + 1}
              </td>
              {keys.map((k) => (
                <td
                  key={k}
                  className="max-w-[14rem] whitespace-pre-wrap break-words px-2 py-1.5 font-mono text-zinc-300"
                >
                  {formatCell(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OfficialPolymarketWalletApisPanel({
  wallet,
}: {
  wallet: string;
}) {
  const { t } = useI18n();

  const openQ = useQuery({
    queryKey: ["official-data-positions", wallet],
    queryFn: ({ signal }) => fetchDataApiPositionsAll(wallet, { signal }),
    staleTime: 2 * 60 * 1000,
  });

  const profileAddressKey = useMemo(() => {
    const proxies = openQ.data?.length
      ? extractProxyWalletsFromPositionRows(openQ.data, wallet)
      : [];
    return [wallet, ...proxies].join("|");
  }, [openQ.data, wallet]);

  const profileQueryFn = useCallback(
    ({ signal }: { signal?: AbortSignal }) => {
      const proxies = openQ.data?.length
        ? extractProxyWalletsFromPositionRows(openQ.data, wallet)
        : [];
      return fetchGammaPublicProfileJsonFirstMatch([wallet, ...proxies], {
        signal,
      });
    },
    [openQ.data, wallet],
  );

  const profileQ = useQuery({
    queryKey: ["official-gamma-public-profile", profileAddressKey],
    queryFn: profileQueryFn,
    staleTime: 5 * 60 * 1000,
  });

  const closedQ = useQuery({
    queryKey: ["official-data-closed-positions", wallet],
    queryFn: ({ signal }) => fetchDataApiClosedPositionsAll(wallet, { signal }),
    staleTime: 2 * 60 * 1000,
  });

  const samplePosUrl = dataApiPositionsPageUrl(wallet, 50, 0);

  return (
    <section className="space-y-8 rounded-xl border border-primary/20 bg-surface-container-low/40 p-4 sm:p-6">
      <header className="space-y-2 border-b border-white/10 pb-4">
        <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-white">
          {t("account.officialApisTitle")}
        </h2>
        <p className="font-body text-sm text-zinc-400">
          {t("account.officialApisSubtitle")}
        </p>
        <div className="space-y-1 font-jetbrains text-[10px] leading-relaxed text-zinc-600">
          <div>
            <span className="text-zinc-500">Gamma · </span>
            <code className="break-all text-zinc-500">
              {OFFICIAL_POLYMARKET_GAMMA_ORIGIN}/public-profile
            </code>
          </div>
          <div>
            <span className="text-zinc-500">Data API · </span>
            <code className="break-all text-zinc-500">
              {OFFICIAL_POLYMARKET_DATA_ORIGIN}/positions
            </code>
            <span className="text-zinc-600"> · </span>
            <code className="break-all text-zinc-500">
              {OFFICIAL_POLYMARKET_DATA_ORIGIN}/closed-positions
            </code>
          </div>
        </div>
      </header>

      <p className="font-jetbrains text-[10px] text-zinc-600">
        {t("account.officialApisRelativeNote")}
      </p>
      <p className="font-jetbrains text-[10px] text-zinc-600">
        {t("account.officialApisCorsHint")}
      </p>

      {/* Profile */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-jetbrains text-xs uppercase tracking-widest text-primary">
            {t("account.officialApisProfile")}
          </h3>
          {profileQ.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : null}
        </div>
        <div className="space-y-1 rounded bg-black/30 px-2 py-2 font-mono text-[10px] text-zinc-500">
          <div className="break-all">
            <span className="text-zinc-600">
              {t("account.officialApisFetchLabel")}{" "}
            </span>
            GET {gammaPublicProfileFetchUrl(wallet)}
          </div>
          {!gammaPublicProfileBrowserDirectEnabled() ? (
            <div className="break-all text-zinc-600">
              {t("account.officialApisUpstreamLabel")}{" "}
              GET {gammaPublicProfileUpstreamUrl(wallet)}
            </div>
          ) : null}
        </div>
        {profileQ.isError ? (
          <div className="flex gap-2 rounded border border-error/30 bg-error-container/10 p-3">
            <TriangleAlert className="h-4 w-4 shrink-0 text-error" />
            <p className="font-jetbrains text-xs text-error">
              {(profileQ.error as Error)?.message ?? t("account.loadError")}
            </p>
          </div>
        ) : profileQ.data?.status === 404 ||
          !profileQ.data?.body ||
          Object.keys(profileQ.data.body).length === 0 ? (
          <div className="space-y-2 font-jetbrains text-xs text-zinc-500">
            <p>
              {profileQ.data?.status === 404
                ? t("account.officialApisEmptyProfile404")
                : t("account.officialApisEmptyProfileBadJson").replace(
                    "{status}",
                    String(profileQ.data?.status ?? "—"),
                  )}
            </p>
            <p className="text-[10px] text-zinc-600">
              {t("account.officialApisEmptyProfileFootnote")}
            </p>
          </div>
        ) : (
          <>
            {profileQ.data.matchedAddress &&
            profileQ.data.matchedAddress !== wallet.trim().toLowerCase() ? (
              <p className="rounded border border-secondary/30 bg-secondary/10 px-3 py-2 font-jetbrains text-[11px] text-secondary">
                {t("account.officialApisProfileMatchedProxy").replace(
                  "{addr}",
                  profileQ.data.matchedAddress,
                )}
              </p>
            ) : null}
            <ProfileFields body={profileQ.data.body} />
            <details className="group rounded-lg border border-white/10 bg-black/20">
              <summary className="flex cursor-pointer items-center gap-2 p-3 font-jetbrains text-[10px] uppercase tracking-wider text-zinc-500 hover:bg-white/5">
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                {t("account.officialApisRawJson")}
              </summary>
              <pre className="max-h-80 overflow-auto p-3 pt-0 font-mono text-[10px] leading-relaxed text-zinc-400">
                {JSON.stringify(profileQ.data.body, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>

      {/* Open positions */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-jetbrains text-xs uppercase tracking-widest text-primary">
            {t("account.officialApisOpen")}
          </h3>
          {openQ.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : null}
        </div>
        <code className="block break-all rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-zinc-500">
          GET {samplePosUrl}
          {t("account.officialApisPaginationHint")}
        </code>
        {openQ.isError ? (
          <div className="flex gap-2 rounded border border-error/30 bg-error-container/10 p-3">
            <TriangleAlert className="h-4 w-4 shrink-0 text-error" />
            <p className="font-jetbrains text-xs text-error">
              {(openQ.error as Error)?.message ?? t("account.loadError")}
            </p>
          </div>
        ) : (
          <>
            <p className="font-jetbrains text-xs text-zinc-400">
              {t("account.officialApisRows").replace(
                "{n}",
                String(openQ.data?.length ?? 0),
              )}
            </p>
            <DynamicRowsTable
              rows={openQ.data ?? []}
              emptyLabel={t("account.officialApisNoRows")}
            />
          </>
        )}
      </div>

      {/* Closed positions */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-jetbrains text-xs uppercase tracking-widest text-primary">
            {t("account.officialApisClosed")}
          </h3>
          {closedQ.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : null}
        </div>
        {closedQ.isError ? (
          <div className="flex gap-2 rounded border border-error/30 bg-error-container/10 p-3">
            <TriangleAlert className="h-4 w-4 shrink-0 text-error" />
            <p className="font-jetbrains text-xs text-error">
              {(closedQ.error as Error)?.message ?? t("account.loadError")}
            </p>
          </div>
        ) : (
          <>
            <p className="font-jetbrains text-xs text-zinc-400">
              {t("account.officialApisRows").replace(
                "{n}",
                String(closedQ.data?.length ?? 0),
              )}
            </p>
            <DynamicRowsTable
              rows={closedQ.data ?? []}
              emptyLabel={t("account.officialApisNoRows")}
            />
          </>
        )}
      </div>
    </section>
  );
}
