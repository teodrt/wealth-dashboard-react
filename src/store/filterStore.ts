import { create } from 'zustand';
import { FilterState } from '../types/state';

interface FilterStore extends FilterState {
  // Actions
  setQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setAccountFilter: (account: string) => void;
  resetFilters: () => void;
  // STATE: Computed values for derived state
  hasActiveFilters: boolean;
}

const initialState: FilterState = {
  query: '',
  categoryFilter: 'All',
  accountFilter: 'All',
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  
  setQuery: (query: string) => set({ query }),
  
  setCategoryFilter: (categoryFilter: string) => {
    set({ categoryFilter });
    // STATE: Auto-reset account filter when category changes
    if (categoryFilter !== 'All') {
      set({ accountFilter: 'All' });
    }
  },
  
  setAccountFilter: (accountFilter: string) => set({ accountFilter }),
  
  resetFilters: () => set(initialState),
  
  get hasActiveFilters() {
    const { query, categoryFilter, accountFilter } = get();
    return query !== '' || categoryFilter !== 'All' || accountFilter !== 'All';
  },
}));
