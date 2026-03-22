"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { polygon } from "wagmi/chains";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/cn";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ConnectWallet({ className }: { className?: string }) {
  const { t } = useI18n();
  const chainId = useChainId();
  const { address, isConnected, status } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const wrongNet = isConnected && chainId !== polygon.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongNet && (
          <span className="hidden font-jetbrains text-[10px] text-tertiary sm:inline">
            {t("wallet.wrongNetwork")}
          </span>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className={cn(
            "shrink-0 rounded-sm border border-white/15 bg-surface-container-highest px-3 py-2 font-jetbrains text-xs font-bold text-white transition-colors hover:border-primary/50 hover:text-primary sm:px-4",
            className,
          )}
          title={address}
        >
          {shortAddr(address)}
          <span className="ml-2 text-zinc-500">{t("wallet.disconnect")}</span>
        </button>
      </div>
    );
  }

  const first = connectors[0];

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending || !first || status === "connecting"}
        onClick={() => first && connect({ connector: first })}
        className={cn(
          "shrink-0 rounded-sm bg-primary px-3 py-2 font-jetbrains text-xs font-bold text-on-primary transition-all hover:bg-primary-fixed active:scale-95 sm:px-5",
          className,
        )}
      >
        {isPending || status === "connecting" ? "…" : t("wallet.connect")}
      </button>
      {error && (
        <span className="max-w-[12rem] text-right font-jetbrains text-[10px] text-error">
          {error.message}
        </span>
      )}
    </div>
  );
}
