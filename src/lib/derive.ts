import { Txn } from '../store/dataStore';

export type AccountSummary = {
  name: string;
  total: number;
  count: number;
};

export type CategorySummary = {
  name: string;
  total: number;
  count: number;
};

export type SeriesPoint = {
  date: string;
  value: number;
};

export type DerivedData = {
  accounts: AccountSummary[];
  categories: CategorySummary[];
  series: SeriesPoint[];
  summary: {
    totalRows: number;
    totalValue: number;
    dateRange: { start: string; end: string };
  };
};

// Derive account summaries
export function deriveAccounts(rows: Txn[]): AccountSummary[] {
  const accountMap = new Map<string, { total: number; count: number }>();
  
  rows.forEach(row => {
    const existing = accountMap.get(row.account) || { total: 0, count: 0 };
    existing.total += row.amount;
    existing.count += 1;
    accountMap.set(row.account, existing);
  });
  
  return Array.from(accountMap.entries())
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
}

// Derive category summaries
export function deriveCategories(rows: Txn[]): CategorySummary[] {
  const categoryMap = new Map<string, { total: number; count: number }>();
  
  rows.forEach(row => {
    const existing = categoryMap.get(row.category) || { total: 0, count: 0 };
    existing.total += row.amount;
    existing.count += 1;
    categoryMap.set(row.category, existing);
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count
    }))
    .sort((a, b) => b.total - a.total);
}

// Derive time series data
export function deriveSeries(rows: Txn[]): SeriesPoint[] {
  if (rows.length === 0) return [];
  
  // Group by date and sum amounts
  const dateMap = new Map<string, number>();
  
  rows.forEach(row => {
    const existing = dateMap.get(row.date) || 0;
    dateMap.set(row.date, existing + row.amount);
  });
  
  // Convert to array and sort by date
  const series = Array.from(dateMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate running total
  let runningTotal = 0;
  return series.map(point => {
    runningTotal += point.value;
    return {
      date: point.date,
      value: runningTotal
    };
  });
}

// Derive all data
export function deriveAll(rows: Txn[]): DerivedData {
  console.info('[derive] Starting derivation', { rows: rows.length });
  
  const accounts = deriveAccounts(rows);
  const categories = deriveCategories(rows);
  const series = deriveSeries(rows);
  
  // Calculate summary
  const totalValue = rows.reduce((sum, row) => sum + row.amount, 0);
  const dates = rows.map(row => row.date).sort();
  const dateRange = {
    start: dates[0] || '',
    end: dates[dates.length - 1] || ''
  };
  
  const summary = {
    totalRows: rows.length,
    totalValue,
    dateRange
  };
  
  console.info('[derive] Derivation complete', {
    accounts: accounts.length,
    categories: categories.length,
    seriesPoints: series.length,
    summary
  });
  
  return {
    accounts,
    categories,
    series,
    summary
  };
}
