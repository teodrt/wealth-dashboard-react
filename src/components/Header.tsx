import React from 'react';
import { formatCurrencyEU, formatDelta, formatInitials } from '../lib/format';
import GlassCard from './ui/GlassCard';

interface HeaderProps {
  userName?: string;
  userHandle?: string;
  balance?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  trboValue?: number;
  trboChangePercent?: number;
  blzValue?: number;
  blzChangePercent?: number;
}

export default function Header({
  userName = 'Teo D\'Ortenzio',
  userHandle = '@teodortenzio',
  balance = 655267,
  dailyChange = 7885,
  dailyChangePercent = 1.2,
  trboValue = 655267,
  trboChangePercent = 424,
  blzValue = 0,
  blzChangePercent = 0
}: HeaderProps) {
  const initials = formatInitials(userName);
  const delta = formatDelta(dailyChange);
  
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

      {/* Center: Main Balance */}
      <div className="main-balance">
        <h1 className="wealth-title">WEALTH</h1>
        <p className="welcome-text">Hi Teo, welcome back to your portfolio</p>
        <div className="balance-display">
          <div className="balance-amount">{formatCurrencyEU(balance)}</div>
          <div className="balance-change" style={{ color: delta.color }}>
            ↑ {delta.formatted} (+{dailyChangePercent}%)
          </div>
        </div>
      </div>

      {/* Right: Stat Chips */}
      <div className="stat-chips">
        <GlassCard variant="chip" className="stat-chip">
          <div className="stat-label">TRBO</div>
          <div className="stat-value">{formatCurrencyEU(trboValue)}</div>
          <div className="stat-change" style={{ color: 'var(--color-success-green)' }}>
            +{trboChangePercent}%
          </div>
        </GlassCard>
        
        <GlassCard variant="chip" className="stat-chip">
          <div className="stat-label">BLZ</div>
          <div className="stat-value">{formatCurrencyEU(blzValue)}</div>
          <div className="stat-change" style={{ color: 'var(--color-success-green)' }}>
            +{blzChangePercent}%
          </div>
        </GlassCard>
      </div>

      {/* Version Badge */}
      <div className="version-badge">
        <GlassCard variant="chip" className="version-chip">
          WD v2.52
        </GlassCard>
      </div>
    </div>
  );
}
