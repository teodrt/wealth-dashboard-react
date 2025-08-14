import { create } from 'zustand';
import { CategoryId } from '../config/categories';
import { useDataStore } from './dataStore';
import { selectAvailableSubs } from '../selectors/portfolio';

export type DateRange = { from?: string; to?: string };

export type FiltersState = {
	category?: CategoryId;
	sub?: string;
	dateRange?: DateRange;
	setCategory: (c?: CategoryId) => void;
	setSub: (s?: string) => void;
	setDateRange: (r?: DateRange) => void;
	reset: () => void;
};

const initialState: Omit<FiltersState, 'setCategory'|'setSub'|'setDateRange'|'reset'> = {
	category: undefined,
	sub: undefined,
	dateRange: undefined,
};

export const useFiltersStore = create<FiltersState>((set, get) => ({
	...initialState,
	setCategory: (category) => {
		const raw = useDataStore.getState().raw as any[];
		const avail = selectAvailableSubs(raw, category as any);
		const currentSub = get().sub;
		set({
			category,
			sub: currentSub && avail.includes(currentSub) ? currentSub : undefined,
		});
	},
	setSub: (sub) => set({ sub }),
	setDateRange: (dateRange) => set({ dateRange }),
	reset: () => set(initialState),
}));
