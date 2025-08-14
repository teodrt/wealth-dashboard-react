import React from 'react';
import { formatCurrencyEU } from '../lib/format';
import { CATEGORIES } from '../config/categories';
import { useDataStore } from '../store/dataStore';



export default function CategoriesCard() {
  const { totals, netWorth, subs, years } = useDataStore();
  
  return (
    <div className="categories-grid">
      {CATEGORIES.map((category) => {
        const total = totals[category.id] || 0;
        const percentage = netWorth > 0 ? (total / netWorth) * 100 : 0;
        
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
      
      {subs.length > 0 && (
        <div className="data-info">
          <div className="info-item">
            <strong>Years:</strong> {years.join(', ')}
          </div>
          <div className="info-item">
            <strong>Sub-categories:</strong> {subs.slice(0, 5).join(', ')}{subs.length > 5 ? `... (+${subs.length - 5} more)` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
