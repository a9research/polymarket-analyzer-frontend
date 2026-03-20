import { create } from "zustand";
import { persist } from "zustand/middleware";

type WatchlistState = {
  addresses: string[];
  add: (address: string) => void;
  remove: (address: string) => void;
  has: (address: string) => boolean;
};

function norm(a: string) {
  return a.trim().toLowerCase();
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      addresses: [],
      add: (address) => {
        const w = norm(address);
        if (!w.startsWith("0x") || w.length < 6) return;
        if (get().addresses.includes(w)) return;
        set({ addresses: [...get().addresses, w] });
      },
      remove: (address) => {
        const w = norm(address);
        set({ addresses: get().addresses.filter((x) => x !== w) });
      },
      has: (address) => get().addresses.includes(norm(address)),
    }),
    { name: "polymarket-analyzer-watchlist" },
  ),
);
