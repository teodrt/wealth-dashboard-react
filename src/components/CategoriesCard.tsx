import React from 'react';
import { formatCurrencyEU, formatDelta } from '../lib/format';
import GlassCard from './ui/GlassCard';
import { CATEGORIES } from '../config/categories';
import { useDataStore } from '../store/dataStore';



export default function CategoriesCard() {
  const { totals, netWorth } = useDataStore();
  
  return (
    <div className="categories-grid">
      {CATEGORIES.map((category) => {
        const total = totals[category.id] || 0;
        const percentage = netWorth > 0 ? (total / netWorth) * 100 : 0;
        
        return (
          <GlassCard key={category.id} className="category-card">
            <div className="category-header">
              <div className="category-icon">{category.emoji}</div>
              <div className="category-name">{category.label}</div>
            </div>
            <div className="category-value">{formatCurrencyEU(total)}</div>
            <div className="category-percentage">{percentage.toFixed(1)}%</div>
          </GlassCard>
        );
      })}
    </div>
  );
}
