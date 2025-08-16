import React from 'react';
import { formatCurrencyEU, formatDelta, formatInitials } from '../lib/format';

interface HeaderProps {
  userName?: string;
  userHandle?: string;
  filteredData?: any[];
  categoryFilter?: string;
  accountFilter?: string;
  lastMonthData?: {
    total: number;
    change: number;
    changePercent: number;
  };
  netWorth?: number;
}

const Header = React.memo(function Header({
  userName = 'Teo D\'Ortenzio',
  userHandle = '@teodortenzio',
  filteredData = [],
  categoryFilter = 'All',
  accountFilter = 'All',
  lastMonthData = { total: 0, change: 0, changePercent: 0 },
  netWorth = 0
}: HeaderProps) {
  const initials = formatInitials(userName);
  
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
        <div className="pro-badge"><span className="pro-star">⭐</span> PRO</div>
        <div className="welcome-text">Hi Teo, welcome back to your portfolio</div>
        
        {/* Main Balance */}
        <div className="balance-display">
          <div className="balance-amount hero-value">{formatCurrencyEU(netWorth)}</div>
          <div className="hero-performance">
            <span className={`arrow ${delta.isPositive ? 'up' : 'down'}`}>{delta.isPositive ? '▲' : '▼'}</span>
            <span className="change-value">{formatCurrencyEU(Math.abs(delta.isPositive ? lastMonthData.change : lastMonthData.change))} ({delta.isPositive ? '+' : ''}{lastMonthData.changePercent.toFixed(1)}%)</span>
          </div>
        </div>
      </div>



      {/* Version badge removed */}
    </div>
  );
});

export default Header;

