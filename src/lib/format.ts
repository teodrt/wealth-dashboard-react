// Formatting helpers for consistent display
// Uses Italian locale for currency formatting

export function formatCurrencyEU(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDelta(value: number): {
  formatted: string;
  isPositive: boolean;
  color: string;
} {
  const isPositive = value > 0;
  const isZero = value === 0;
  
  const sign = isPositive ? '+' : '';
  const formatted = `${sign}${formatCurrencyEU(Math.abs(value))}`;
  
  let color = 'var(--color-text-muted)'; // Default muted
  if (isPositive) {
    color = 'var(--color-success-green)'; // Green for positive
  } else if (!isZero) {
    color = 'var(--color-text-muted)'; // Muted for negative
  }
  
  return {
    formatted,
    isPositive,
    color,
  };
}

export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDeltaWithPercentage(value: number, percentage: number): string {
  const delta = formatDelta(value);
  const pct = formatPercentage(percentage);
  return `${delta.formatted} (${pct})`;
}

// Format user initials from name
export function formatInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}
