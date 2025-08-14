import { create } from 'zustand';

export type Txn = {
  date: string;
  account: string;
  category: string;
  asset?: string;
  amount: number;
  currency?: string;
  note?: string;
};

export type DataState = {
  raw: Txn[];
  setRaw: (rows: Txn[]) => void;
  clear: () => void;
  getCount: () => number;
};

export const useDataStore = create<DataState>((set, get) => ({
  raw: [],
  setRaw: (rows: Txn[]) => {
    console.info('[store] setRaw', { rows: rows.length });
    set({ raw: rows });
  },
  clear: () => {
    console.info('[store] clear');
    set({ raw: [] });
  },
  getCount: () => get().raw.length,
}));
