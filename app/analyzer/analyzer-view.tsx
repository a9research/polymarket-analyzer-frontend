"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountDashboard } from "@/components/account-dashboard";
import { AnalyzerEmptyState } from "@/components/analyzer-empty-state";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { isValidAnalyzeWallet } from "@/lib/evm-wallet";
import type { LeaderboardProfileHint } from "@/lib/merge-account-profile";

type RowPick = LeaderboardProfileHint & { wallet: string };

export function AnalyzerView() {
  const sp = useSearchParams();
  const raw = (sp.get("wallet") ?? "").trim();
  const valid = isValidAnalyzeWallet(raw);
  const wallet = valid ? raw : "";
  const selectedLower = valid ? wallet.toLowerCase() : null;

  const pendingPickRef = useRef<{
    wallet: string;
    pick: LeaderboardProfileHint;
  } | null>(null);
  const [rowPick, setRowPick] = useState<RowPick | null>(null);

  useLayoutEffect(() => {
    if (!valid || !wallet) {
      setRowPick(null);
      return;
    }
    const lower = wallet.toLowerCase();
    const pending = pendingPickRef.current;
    if (pending?.wallet === lower) {
      setRowPick({ wallet: lower, ...pending.pick });
      pendingPickRef.current = null;
      return;
    }
    setRowPick((prev) => (prev?.wallet === lower ? prev : null));
  }, [wallet, valid]);

  const handleBeforeWalletNavigate = (
    w: string,
    pick: LeaderboardProfileHint,
  ) => {
    pendingPickRef.current = { wallet: w, pick };
  };

  const leaderboardProfileHint: LeaderboardProfileHint | null =
    rowPick && rowPick.wallet === wallet.toLowerCase()
      ? {
          displayName: rowPick.displayName,
          profileImage: rowPick.profileImage,
          verifiedBadge: rowPick.verifiedBadge,
        }
      : null;

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto lg:h-0 lg:flex-row lg:gap-10 lg:overflow-hidden">
        <aside className="min-h-0 w-full shrink-0 overflow-x-hidden lg:flex lg:h-full lg:min-h-0 lg:max-h-full lg:w-[min(100%,26rem)] lg:flex-col lg:overflow-hidden xl:w-[28rem]">
          <LeaderboardTable
            selectedWallet={selectedLower}
            walletHref={(w) => `/analyzer?wallet=${encodeURIComponent(w)}`}
            onBeforeWalletNavigate={handleBeforeWalletNavigate}
          />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-6 lg:pb-8">
          {!valid ? (
            <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
              <AnalyzerEmptyState />
            </div>
          ) : (
            <AccountDashboard
              address={wallet}
              leaderboardProfileHint={leaderboardProfileHint}
            />
          )}
        </div>
      </div>
    </main>
  );
}
