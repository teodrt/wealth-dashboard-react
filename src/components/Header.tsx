import React, { useMemo } from 'react';
import { formatCurrencyEU, formatDelta, formatInitials } from '../lib/format';
import { APP_VERSION } from '../constants/version';
import { useDataStore } from '../store/dataStore';

interface HeaderProps {
  userName?: string;
  userHandle?: string;
  filteredData?: any[];
  categoryFilter?: string;
  accountFilter?: string;
}

export default function Header({
  userName = 'Teo D\'Ortenzio',
  userHandle = '@teodortenzio',
  filteredData = [],
  categoryFilter = 'All',
  accountFilter = 'All'
}: HeaderProps) {
  const initials = formatInitials(userName);
  
  const { netWorth, raw } = useDataStore();
  
  // Calculate last month's total and change with filters applied
  const lastMonthData = useMemo(() => {
    // Always use raw data for the main balance display
    if (!raw || raw.length === 0) return { total: 0, change: 0, changePercent: 0 };
    
    // Get unique years and months
    const years = [...new Set(raw.map(r => r.year))].sort();
    const months = [...new Set(raw.map(r => r.month))].sort();
    
    if (years.length === 0 || months.length === 0) return { total: 0, change: 0, changePercent: 0 };
    
    const lastYear = years[years.length - 1];
    const lastMonth = months[months.length - 1];
    
    // Get last month total
    const lastMonthTotal = raw
      .filter(r => r.year === lastYear && r.month === lastMonth)
      .reduce((sum, r) => sum + r.amount, 0);
    
    // Get previous month total
    let previousMonthTotal = 0;
    if (months.length > 1) {
      const previousMonth = months[months.length - 2];
      previousMonthTotal = raw
        .filter(r => r.year === lastYear && r.month === previousMonth)
        .reduce((sum, r) => sum + r.amount, 0);
    }
    
    const change = lastMonthTotal - previousMonthTotal;
    const changePercent = previousMonthTotal > 0 ? (change / previousMonthTotal) * 100 : 0;
    
    return {
      total: lastMonthTotal,
      change,
      changePercent
    };
  }, [raw]);
  
  const delta = formatDelta(lastMonthData.change);
  
  return (
    <div className="header-section">
      {/* Left: User Profile */}
      <div className="user-profile">
        <div className="user-avatar">
          <span className="user-initials">{initials}</span>
        </div>
        <div className="user-info">
          <div className="user-name">{userName}</div>
          <div className="user-handle">{userHandle}</div>
        </div>
      </div>

      {/* Center: App Title & Balance */}
      <div className="app-title">
        <div className="app-name">WEALTH DASHBOARD</div>
        <div className="pro-badge">PRO</div>
        <div className="welcome-text">Hi Teo, welcome back to your portfolio</div>
        
        {/* Main Balance */}
        <div className="balance-display">
          <div className="balance-amount">{formatCurrencyEU(lastMonthData.total)}</div>
          <div className="balance-change" style={{ color: delta.color }}>
            {delta.isPositive ? '↑' : '↓'} {delta.formatted} ({delta.isPositive ? '+' : ''}{lastMonthData.changePercent.toFixed(1)}%)
          </div>
        </div>
      </div>



      {/* Version Badge */}
      <div className="version-badge">
        <div className="version-chip">
          WD v{APP_VERSION}
        </div>
      </div>
    </div>
  );
}

