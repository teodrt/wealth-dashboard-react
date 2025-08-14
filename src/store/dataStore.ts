import { create } from 'zustand';
import { ParsedRow, aggregateTotals, netWorthTotal } from '../lib/parseExcel';
import { CategoryId } from '../config/categories';

export type Txn = {
  date: string;
  account: string;
  category: CategoryId;
  asset?: string;
  amount: number;
  currency?: string;
  note?: string;
};

export type DataState = {
  raw: ParsedRow[];
  totals: Record<CategoryId, number>;
  netWorth: number;
  setRaw: (rows: ParsedRow[]) => void;
  clear: () => void;
  getCount: () => number;
  getTotals: () => Record<CategoryId, number>;
  getNetWorth: () => number;
};

export const useDataStore = create<DataState>((set, get) => ({
  raw: [],
  totals: {} as Record<CategoryId, number>,
  netWorth: 0,
  setRaw: (rows: ParsedRow[]) => {
    console.info('[store] setRaw', { rows: rows.length });
    const totals = aggregateTotals(rows);
    const netWorth = netWorthTotal(totals);
    set({ raw: rows, totals, netWorth });
  },
  clear: () => {
    console.info('[store] clear');
    set({ raw: [], totals: {} as Record<CategoryId, number>, netWorth: 0 });
  },
  getCount: () => get().raw.length,
  getTotals: () => get().totals,
  getNetWorth: () => get().netWorth,
}));
