import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  variant?: 'default' | 'pill' | 'chip';
}

export default function GlassCard({ 
  children, 
  className = '', 
  onClick, 
  style,
  variant = 'default'
}: GlassCardProps) {
  const baseClasses = 'glass-card';
  const variantClasses = {
    default: 'glass-card-default',
    pill: 'glass-card-pill',
    chip: 'glass-card-chip'
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
