import React from 'react';
import { formatCurrencyEU, formatDelta } from '../lib/format';
import GlassCard from './ui/GlassCard';

interface CategoriesCardProps {
  categoryName?: string;
  value?: number;
  change?: number;
  changePercent?: number;
}

export default function CategoriesCard({
  categoryName = 'Real Estate',
  value = 0,
  change = 0,
  changePercent = 0
}: CategoriesCardProps) {
  const delta = formatDelta(change);
  
  return (
    <GlassCard className="categories-card">
      <div className="categories-header">
        <div className="category-info">
          <div className="category-icon">📚🏠</div>
          <div className="category-name">{categoryName}</div>
        </div>
        <div className="category-values">
          <div className="category-value">{formatCurrencyEU(value)}</div>
          <div className="category-change" style={{ color: delta.color }}>
            {delta.formatted}
          </div>
        </div>
      </div>
      
      <div className="categories-placeholder">
        <div className="placeholder-area">
          {/* Empty placeholder area with dashed border */}
        </div>
      </div>
      
      <div className="categories-pagination">
        <div className="pagination-dots">
          <div className="dot active"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </GlassCard>
  );
}
