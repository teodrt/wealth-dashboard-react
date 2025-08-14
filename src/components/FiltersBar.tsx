import React from 'react';
import { Filter, X, Search } from 'lucide-react';
import GlassCard from './GlassCard';
import { useFiltersStore } from '../store/filters';
import { CATEGORIES } from '../config/categories';
import { useDataStore } from '../store/dataStore';
import { selectAvailableSubs } from '../selectors/portfolio';

interface FiltersBarProps {
	query?: string;
	setQuery?: (query: string) => void;
	categoryFilter?: string;
	setCategoryFilter?: (category: string) => void;
	accountFilter?: string;
	setAccountFilter?: (account: string) => void;
	categories?: string[];
	accounts?: string[];
	onResetData: () => void;
}

export default function FiltersBar({
	query,
	setQuery,
	categoryFilter,
	setCategoryFilter,
	accountFilter,
	setAccountFilter,
	categories,
	accounts,
	onResetData
}: FiltersBarProps) {
	// Prefer store if props not provided
	const {
		category,
		sub,
		setCategory,
		setSub,
		reset
	} = useFiltersStore();

	const raw = useDataStore().raw as any[];
	const effectiveCategory = categoryFilter ?? category ?? 'All';
	const effectiveSub = accountFilter ?? sub ?? 'All';
	const effectiveCategories = categories ?? CATEGORIES.map(c => c.id);
	const effectiveAccounts = accounts ?? selectAvailableSubs(
		raw,
		effectiveCategory === 'All' ? undefined : (effectiveCategory as any)
	);

	const handleCategoryReset = () => {
		if (setCategoryFilter) setCategoryFilter('All');
		else setCategory(undefined);
	};

	const handleAccountReset = () => {
		if (setAccountFilter) setAccountFilter('All');
		else setSub(undefined);
	};

	return (
		<GlassCard className="filters-card">
			<h3>
				<Filter size={16} /> Filters
			</h3>
			<div style={{ marginBottom: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
				Category → Subcategory
			</div>
			<div className="grid grid-cols-12 gap-3 items-end">
				{/* Search Bar */}
				<div className="md:col-span-3 col-span-12">
					<div className="search-container">
						<Search size={16} className="search-icon" />
						<input
							type="text"
							placeholder="Search..."
							value={query ?? ''}
							onChange={(e) => setQuery?.(e.target.value)}
							className="search-input"
						/>
					</div>
				</div>

				{/* Category Filter */}
				<div className="md:col-span-3 col-span-12">
					<div className="flex gap-2 items-center">
						<select
							className="select min-w-0 flex-auto h-12"
							value={effectiveCategory}
							onChange={(e) => {
								const val = e.target.value;
								if (setCategoryFilter) setCategoryFilter(val);
								else setCategory(val === 'All' ? undefined : (val as any));
							}}
						>
							<option value="All">All Categories</option>
							{effectiveCategories.map(category => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
						{effectiveCategory !== 'All' && (
							<button
								className="reset-filter-btn"
								onClick={handleCategoryReset}
								title="Reset category filter"
							>
								<X size={14} />
							</button>
						)}
					</div>
				</div>

				{/* Sub Filter */}
				<div className="md:col-span-3 col-span-12">
					<div className="flex gap-2 items-center">
						<select
							className="select min-w-0 flex-auto h-12"
							value={effectiveSub}
							onChange={(e) => {
								const val = e.target.value;
								if (setAccountFilter) setAccountFilter(val);
								else setSub(val === 'All' ? undefined : val);
							}}
							disabled={effectiveAccounts.length === 0}
						>
							<option value="All">All Subs</option>
							{effectiveAccounts.map(acc => (
								<option key={acc} value={acc}>
									{acc}
								</option>
							))}
						</select>
						{effectiveSub !== 'All' && (
							<button
								className="reset-filter-btn"
								onClick={handleAccountReset}
								title="Reset sub filter"
							>
								<X size={14} />
							</button>
						)}
					</div>
				</div>

				{/* Reset Data Button */}
				<div className="md:col-span-3 col-span-12">
					<button
						className="btn btn-secondary w-full h-12"
						onClick={onResetData}
					>
						Reset Data
					</button>
				</div>
			</div>
		</GlassCard>
	);
}

