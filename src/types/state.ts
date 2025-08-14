// Domain types for wealth dashboard state management
export interface PortfolioPosition {
  date: string;
  account: string;
  category: string;
  assetClass: string;
  currency: string;
  value: number;
}

export interface PortfolioData {
  positions: PortfolioPosition[];
  totalValue: number;
  categories: string[];
  accounts: string[];
  lastUpdated: string;
}

export interface FilterState {
  query: string;
  categoryFilter: string;
  accountFilter: string;
}

export interface ChartData {
  month: string;
  value: number;
}

export interface AllocationData {
  name: string;
  value: number;
}

export interface MonthlyChange {
  total: number;
  change: number;
  changePercent: number;
}

export interface UploadState {
  loading: boolean;
  progress: number;
  error: string | null;
}

// STATE: Using string union for section to ensure type safety
export type DashboardSection = 'Summary' | 'Net Worth' | 'Allocation' | 'Accounts' | 'Categories';

// STATE: Pagination state for multi-page views
export interface PaginationState {
  currentPage: number;
  totalPages: number;
}
