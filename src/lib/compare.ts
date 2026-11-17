"use client";
/* "Compare" list shared by every deal card on the page (up to 3 products), shown by components/CompareBar.tsx. */
import { useSyncExternalStore } from "react";
import type { Specs } from "./specs";
import { track } from "./track";

export type CompareItem = {
  asin: string; title: string; brand: string; image: string; url: string; category: string;
  price: number | null; was: number | null; off: number | null; specs: Specs;
  bestFor?: string; strengths?: string[]; limitations?: string[];
};

export const COMPARE_MAX = 3;
let items: CompareItem[] = [];
const listeners = new Set<() => void>();
const EMPTY: CompareItem[] = [];
const emit = () => listeners.forEach((l) => l());

export const compare = {
  get: () => items,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  has: (asin: string) => items.some((x) => x.asin === asin),
  /* adds or removes; when 3 are already chosen, the oldest makes room */
  toggle(x: CompareItem) {
    if (items.some((i) => i.asin === x.asin)) items = items.filter((i) => i.asin !== x.asin);
    else { items = [...items, x].slice(-COMPARE_MAX); track("compare_add", { item_id: x.asin, category: x.category, count: items.length }); }
    emit();
  },
  remove(asin: string) { items = items.filter((i) => i.asin !== asin); emit(); },
  clear() { items = []; emit(); },
};

export const useCompare = () => useSyncExternalStore(compare.subscribe, compare.get, () => EMPTY);
