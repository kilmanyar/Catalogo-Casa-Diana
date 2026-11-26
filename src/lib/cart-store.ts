import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EMPTY_PROFILE, maxQty, orderCode, productById, type Profile } from "@/lib/catalog";

type CartState = {
  lines: Record<string, number>;
  favorites: Record<string, true>;
  profile: Profile;
  orderSeq: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleFavorite: (id: string) => void;
  setProfile: (patch: Partial<Profile>) => void;
  forgetProfile: () => void;
  takeOrderCode: () => string;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: {},
      favorites: {},
      profile: EMPTY_PROFILE,
      orderSeq: 1,
      add: (id, qty = 1) => {
        const product = productById(id);
        if (!product) return;
        const max = maxQty(product);
        if (max <= 0) return;
        set((s) => {
          const next = Math.min(max, (s.lines[id] ?? 0) + qty);
          if (next <= 0) return s;
          return { lines: { ...s.lines, [id]: next } };
        });
      },
      setQty: (id, qty) => {
        const product = productById(id);
        const max = product ? maxQty(product) : 0;
        set((s) => {
          const lines = { ...s.lines };
          if (!product || qty <= 0 || max <= 0) delete lines[id];
          else lines[id] = Math.min(max, qty);
          return { lines };
        });
      },
      remove: (id) =>
        set((s) => {
          const lines = { ...s.lines };
          delete lines[id];
          return { lines };
        }),
      clear: () => set({ lines: {} }),
      toggleFavorite: (id) =>
        set((s) => {
          const favorites = { ...s.favorites };
          if (favorites[id]) delete favorites[id];
          else favorites[id] = true;
          return { favorites };
        }),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      forgetProfile: () => set({ profile: EMPTY_PROFILE }),
      takeOrderCode: () => {
        const seq = get().orderSeq;
        set({ orderSeq: seq + 1 });
        return orderCode(seq);
      },
    }),
    { name: "casa-diana", skipHydration: true,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CartState>;
        return {
          ...current,
          ...saved,
          profile: { ...EMPTY_PROFILE, ...(saved.profile ?? {}) },
        };
      },
    },
  ),
);
