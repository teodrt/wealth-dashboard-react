import { create } from 'zustand';
import { ParsedRow, aggregateTotals, netWorthTotal, getUniqueSubs, getUniqueYears } from '../lib/parseExcel';
import { CategoryId } from '../config/categories';

export type Txn = ParsedRow; // Alias for backward compatibility

export type DataState = {
  raw: ParsedRow[];
  totals: Record<CategoryId, number>;
  netWorth: number;
  subs: string[];
  years: number[];
  setRaw: (rows: ParsedRow[]) => void;
  clear: () => void;
  getCount: () => number;
  getTotals: () => Record<CategoryId, number>;
  getNetWorth: () => number;
  getSubs: () => string[];
  getYears: () => number[];
};

export const useDataStore = create<DataState>((set, get) => ({
  raw: [],
  totals: {} as Record<CategoryId, number>,
  netWorth: 0,
  subs: [],
  years: [],
  setRaw: (rows: ParsedRow[]) => {
    console.info('[store] setRaw', { rows: rows.length });
    const totals = aggregateTotals(rows);
    const netWorth = netWorthTotal(totals);
    const subs = getUniqueSubs(rows);
    const years = getUniqueYears(rows);
    set({ raw: rows, totals, netWorth, subs, years });
  },
  clear: () => {
    console.info('[store] clear');
    set({ raw: [], totals: {} as Record<CategoryId, number>, netWorth: 0, subs: [], years: [] });
  },
  getCount: () => get().raw.length,
  getTotals: () => get().totals,
  getNetWorth: () => get().netWorth,
  getSubs: () => get().subs,
  getYears: () => get().years,
}));
