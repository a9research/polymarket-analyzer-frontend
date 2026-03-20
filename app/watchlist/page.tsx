"use client";

import Link from "next/link";
import { useWatchlist } from "@/store/watchlist";

export default function WatchlistPage() {
  const { addresses, remove } = useWatchlist();

  return (
    <main className="mx-auto max-w-[960px] px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-headline text-3xl font-bold tracking-tight text-white">
        Watchlist
      </h1>
      {addresses.length === 0 ? (
        <p className="font-jetbrains text-sm text-zinc-500">
          暂无追踪。在账户页点击星标添加。
        </p>
      ) : (
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li
              key={a}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-container-low px-4 py-3"
            >
              <Link
                href={`/account/${encodeURIComponent(a)}`}
                className="font-jetbrains text-sm text-primary hover:underline"
              >
                {a}
              </Link>
              <button
                type="button"
                onClick={() => remove(a)}
                className="font-jetbrains text-[10px] text-zinc-500 hover:text-tertiary"
              >
                REMOVE
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10">
        <Link href="/" className="font-jetbrains text-xs text-zinc-500 hover:text-primary">
          ← TERMINAL
        </Link>
      </p>
    </main>
  );
}
