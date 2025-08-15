import React from 'react';
import { tokens } from '../../ui/tokens';

// Stat tile variants
export type StatTileVariant = 'default' | 'glass' | 'minimal' | 'highlight';

// Stat tile sizes
export type StatTileSize = 'sm' | 'md' | 'lg';

// Stat tile props interface
export interface StatTileProps {
  variant?: StatTileVariant;
  size?: StatTileSize;
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  onClick?: () => void;
}

// StatTile component for consistent metric display
const StatTile = React.memo(function StatTile({
  variant = 'default',
  size = 'md',
  title,
  value,
  subtitle,
  change,
  icon,
  trend,
  className = '',
  onClick,
}: StatTileProps) {
  const baseClasses = [
    'ui-stat-tile',
    `ui-stat-tile--${variant}`,
    `ui-stat-tile--${size}`,
    onClick && 'ui-stat-tile--clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon && (
        <div className="ui-stat-tile__icon">
          {icon}
        </div>
      )}
      
      <div className="ui-stat-tile__content">
        <div className="ui-stat-tile__header">
          <h3 className="ui-stat-tile__title">{title}</h3>
          {trend && (
            <span className={`ui-stat-tile__trend ui-stat-tile__trend--${trend}`}>
              {trend === 'up' && '↗'}
              {trend === 'down' && '↘'}
              {trend === 'neutral' && '→'}
            </span>
          )}
        </div>
        
        <div className="ui-stat-tile__value">{value}</div>
        
        {subtitle && (
          <p className="ui-stat-tile__subtitle">{subtitle}</p>
        )}
        
        {change && (
          <div className={`ui-stat-tile__change ui-stat-tile__change--${change.isPositive ? 'positive' : 'negative'}`}>
            <span className="ui-stat-tile__change-value">
              {change.isPositive ? '+' : ''}{change.value}
            </span>
            {change.label && (
              <span className="ui-stat-tile__change-label">{change.label}</span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button className={baseClasses} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
});

export default StatTile;

// Export stat tile variants for convenience
export const StatTileVariants = {
  Glass: (props: Omit<StatTileProps, 'variant'>) => <StatTile variant="glass" {...props} />,
  Minimal: (props: Omit<StatTileProps, 'variant'>) => <StatTile variant="minimal" {...props} />,
  Highlight: (props: Omit<StatTileProps, 'variant'>) => <StatTile variant="highlight" {...props} />,
};
