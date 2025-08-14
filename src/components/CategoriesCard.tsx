import React from 'react';
// Category totals show the latest available month (not lifetime).
// See selectors/portfolio.ts for logic.
import { formatCurrencyEU } from '../lib/format';
import { CATEGORIES } from '../config/categories';
import { useDataStore } from '../store/dataStore';

export default function CategoriesCard() {
  const { latestTotals, latestNetWorth } = useDataStore();
  
  return (
    <div className="categories-grid">
      {CATEGORIES.map((category) => {
        const total = latestTotals?.[category.id] || 0;
        const percentage = latestNetWorth && latestNetWorth > 0 ? (total / latestNetWorth) * 100 : 0;
        
        return (
          <div key={category.id} className="category-card">
            <div className="category-header">
              <div className="category-icon">{category.emoji}</div>
              <div className="category-name">{category.label}</div>
            </div>
            <div className="category-value">{formatCurrencyEU(total)}</div>
            <div className="category-percentage">{percentage.toFixed(1)}%</div>
          </div>
        );
      })}
      
      
    </div>
  );
}
