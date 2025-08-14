import React from 'react';
import { Filter, X, Search } from 'lucide-react';
import GlassCard from './GlassCard';

interface FiltersBarProps {
  query: string;
  setQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  accountFilter: string;
  setAccountFilter: (account: string) => void;
  categories: string[];
  accounts: string[];
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
  const handleCategoryReset = () => {
    setCategoryFilter('All');
  };

  const handleAccountReset = () => {
    setAccountFilter('All');
  };

  return (
    <GlassCard className="filters-card">
      <h3>
        <Filter size={16} /> Filters
      </h3>
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
        Category → Account
      </div>
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* Search Bar */}
        <div className="md:col-span-3 col-span-12">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3 col-span-12">
          <div className="flex gap-2 items-center">
            <select
              className="select min-w-0 flex-auto h-12"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {categoryFilter !== 'All' && (
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

        {/* Account Filter */}
        <div className="md:col-span-3 col-span-12">
          <div className="flex gap-2 items-center">
            <select
              className="select min-w-0 flex-auto h-12"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="All">All Accounts</option>
              {accounts.map(account => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
            {accountFilter !== 'All' && (
              <button
                className="reset-filter-btn"
                onClick={handleAccountReset}
                title="Reset account filter"
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

