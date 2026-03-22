import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 收藏夹内展示用（来自榜单 / 账户页 / Gamma public-profile） */
export type WatchlistWalletMeta = {
  userName?: string | null;
  profileImage?: string | null;
  verifiedBadge?: boolean;
};

type WatchlistPersistedV1 = {
  addresses: string[];
  metaByWallet: Record<string, WatchlistWalletMeta>;
};

type WatchlistState = WatchlistPersistedV1 & {
  add: (address: string, meta?: WatchlistWalletMeta) => void;
  remove: (address: string) => void;
  has: (address: string) => boolean;
  /** 合并写入（用于异步拉取到显示名后持久化） */
  patchWalletMeta: (address: string, partial: WatchlistWalletMeta) => void;
};

function norm(a: string) {
  return a.trim().toLowerCase();
}

function mergeMeta(
  base: WatchlistWalletMeta | undefined,
  patch: WatchlistWalletMeta,
): WatchlistWalletMeta {
  const out: WatchlistWalletMeta = { ...base };
  if (patch.userName != null) {
    const s = String(patch.userName).trim();
    if (s) out.userName = s;
  }
  if (patch.profileImage != null && String(patch.profileImage).trim() !== "") {
    out.profileImage = String(patch.profileImage).trim();
  }
  if (patch.verifiedBadge !== undefined) {
    out.verifiedBadge = patch.verifiedBadge;
  }
  return out;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      addresses: [],
      metaByWallet: {},
      add: (address, meta) => {
        const w = norm(address);
        if (!w.startsWith("0x") || w.length < 6) return;
        const state = get();
        if (state.addresses.includes(w)) {
          if (
            meta &&
            (meta.userName != null ||
              meta.profileImage != null ||
              meta.verifiedBadge !== undefined)
          ) {
            set({
              metaByWallet: {
                ...state.metaByWallet,
                [w]: mergeMeta(state.metaByWallet[w], meta),
              },
            });
          }
          return;
        }
        set({
          addresses: [...state.addresses, w],
          metaByWallet: meta
            ? { ...state.metaByWallet, [w]: mergeMeta(undefined, meta) }
            : state.metaByWallet,
        });
      },
      remove: (address) => {
        const w = norm(address);
        set((s) => {
          const { [w]: _removed, ...restMeta } = s.metaByWallet;
          return {
            addresses: s.addresses.filter((x) => x !== w),
            metaByWallet: restMeta,
          };
        });
      },
      has: (address) => get().addresses.includes(norm(address)),
      patchWalletMeta: (address, partial) => {
        const w = norm(address);
        if (!get().addresses.includes(w)) return;
        set((s) => ({
          metaByWallet: {
            ...s.metaByWallet,
            [w]: mergeMeta(s.metaByWallet[w], partial),
          },
        }));
      },
    }),
    {
      name: "polymarket-analyzer-watchlist",
      version: 2,
      partialize: (s) => ({
        addresses: s.addresses,
        metaByWallet: s.metaByWallet,
      }),
      migrate: (persisted: unknown, version: number): WatchlistPersistedV1 => {
        if (version >= 2 && persisted && typeof persisted === "object") {
          const p = persisted as WatchlistPersistedV1;
          return {
            addresses: p.addresses ?? [],
            metaByWallet: p.metaByWallet ?? {},
          };
        }
        const legacy = persisted as { addresses?: string[] } | null;
        return {
          addresses: legacy?.addresses ?? [],
          metaByWallet: {},
        };
      },
    },
  ),
);
