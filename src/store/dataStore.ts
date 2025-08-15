import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CategoryId } from '../config/categories';
import { PortfolioPosition } from '../types/state';
import { CATEGORY_IDS } from '../config/categories';
import type { ParsedRow } from '../lib/parseExcel';
import { getLatestYearMonth, aggregateTotalsByMonth, sumNetWorth } from '../selectors/portfolio';

export type Txn = PortfolioPosition; // Alias for backward compatibility

export type DataState = {
  raw: PortfolioPosition[];
  totals: Record<CategoryId, number>;
  netWorth: number;
  subs: string[];
  years: number[];
  latestYm?: { year: number; month: number };
  latestTotals?: Record<CategoryId, number>;
  latestNetWorth?: number;
  setRaw: (rows: PortfolioPosition[]) => void;
  clear: () => void;
  getCount: () => number;
  getTotals: () => Record<CategoryId, number>;
  getNetWorth: () => number;
  getSubs: () => string[];
  getYears: () => number[];
};

const VERSION = 3;
const STORAGE_KEY = 'wd_rows_v3';

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      raw: [],
      totals: {} as Record<CategoryId, number>,
      netWorth: 0,
      subs: [],
      years: [],
      latestYm: undefined,
      latestTotals: undefined,
      latestNetWorth: undefined,
      setRaw: (rows: PortfolioPosition[]) => {
        console.info('[store] setRaw', { rows: rows.length });
        // STATE: Calculate derived values from raw data
        const totals = Object.fromEntries(CATEGORY_IDS.map(id => [id, 0])) as Record<CategoryId, number>;
        const subs = Array.from(new Set(rows.map(r => r.account)));
        const years = Array.from(new Set(rows.map(r => new Date(r.date).getFullYear())));
        // Net worth = latest month sum across rows
        let netWorth = 0;
        if (rows.length > 0) {
          const latestMonth = rows
            .map(r => r.date.slice(0,7))
            .sort((a,b) => a.localeCompare(b))
            .pop() as string;
          netWorth = rows.filter(r => r.date.slice(0,7) === latestMonth).reduce((s, r) => s + (r.value || 0), 0);
        }

        // Totals by category
        for (const r of rows) {
          const cat = (r.category as CategoryId) || 'alternatives';
          totals[cat] = (totals[cat] || 0) + (r.value || 0);
        }
        
        // Compute latest month aggregates using ParsedRow shape derived from PortfolioPosition
        const parsedRows: ParsedRow[] = rows.map(r => ({
          year: new Date(r.date).getFullYear(),
          month: new Date(r.date).getMonth() + 1,
          master: r.category as CategoryId,
          sub: r.account,
          amount: r.value,
        }));
        const latestYm = getLatestYearMonth(parsedRows);
        const latestTotals = latestYm ? aggregateTotalsByMonth(parsedRows, latestYm) : undefined;
        const latestNetWorth = latestTotals ? sumNetWorth(latestTotals) : undefined;

        set({ raw: rows, totals, netWorth, subs, years, latestYm, latestTotals, latestNetWorth });
      },
      clear: () => {
        console.info('[store] clear');
        set({ raw: [], totals: {} as Record<CategoryId, number>, netWorth: 0, subs: [], years: [], latestYm: undefined, latestTotals: undefined, latestNetWorth: undefined });
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      },
      getCount: () => get().raw.length,
      getTotals: () => get().totals,
      getNetWorth: () => get().netWorth,
      getSubs: () => get().subs,
      getYears: () => get().years,
    }),
    {
      name: STORAGE_KEY,
      version: VERSION,
      storage: createJSONStorage(() => localStorage),
      // Persist only raw data; derived slices are recomputed on rehydrate
      partialize: (state) => ({ raw: state.raw }),
      merge: (persistedState, currentState) => {
        try {
          const persisted = persistedState as any;
          let rows: PortfolioPosition[] = Array.isArray(persisted?.raw) ? (persisted.raw as PortfolioPosition[]) : [];
          // If nothing persisted yet, try legacy migration from wd_rows_v21
          if (rows.length === 0) {
            try {
              const legacy = localStorage.getItem('wd_rows_v21');
              if (legacy) {
                const parsed = JSON.parse(legacy);
                if (Array.isArray(parsed)) {
                  rows = parsed.map((row: any) => ({
                    date: row.date || row.Date || new Date().toISOString(),
                    account: row.account || row.Account || 'Unknown',
                    category: row.category || row.Category || 'Other',
                    assetClass: row.assetClass || row.AssetClass || 'Other',
                    currency: row.currency || row.Currency || 'EUR',
                    value: Number(row.value ?? row.Value ?? row.amount ?? 0),
                  }));
                  try { localStorage.removeItem('wd_rows_v21'); } catch {}
                }
              }
            } catch {}
          }

          if (rows.length === 0) return { ...currentState } as any;

          const totals = Object.fromEntries(CATEGORY_IDS.map(id => [id, 0])) as Record<CategoryId, number>;
          const subs = Array.from(new Set(rows.map(r => r.account)));
          const years = Array.from(new Set(rows.map(r => new Date(r.date).getFullYear())));
          let netWorth = 0;
          if (rows.length > 0) {
            const latestMonth = rows
              .map(r => r.date.slice(0,7))
              .sort((a,b) => a.localeCompare(b))
              .pop() as string;
            netWorth = rows.filter(r => r.date.slice(0,7) === latestMonth).reduce((s, r) => s + (r.value || 0), 0);
          }
          for (const r of rows) {
            const cat = (r.category as CategoryId) || 'alternatives';
            totals[cat] = (totals[cat] || 0) + (r.value || 0);
          }
          const parsedRows: ParsedRow[] = rows.map(r => ({
            year: new Date(r.date).getFullYear(),
            month: new Date(r.date).getMonth() + 1,
            master: r.category as CategoryId,
            sub: r.account,
            amount: r.value,
          }));
          const latestYm = getLatestYearMonth(parsedRows);
          const latestTotals = latestYm ? aggregateTotalsByMonth(parsedRows, latestYm) : undefined;
          const latestNetWorth = latestTotals ? sumNetWorth(latestTotals) : undefined;
          return {
            ...currentState,
            raw: rows,
            totals,
            netWorth,
            subs,
            years,
            latestYm,
            latestTotals,
            latestNetWorth,
          } as any;
        } catch {
          return currentState as any;
        }
      },
    }
  )
);
