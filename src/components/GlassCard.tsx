import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const GlassCard = React.memo(function GlassCard({ children, className = '', onClick, style }: GlassCardProps) {
  return (
    <div
      className={`glass-card ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
});

export default GlassCard;

