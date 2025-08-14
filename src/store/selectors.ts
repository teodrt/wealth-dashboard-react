import { useMemo } from 'react';
import { useDataStore } from './dataStore';
import { useFilterStore } from './filterStore';
import { PortfolioPosition, ChartData, AllocationData, MonthlyChange } from '../types/state';

// STATE: Memoized selectors to prevent unnecessary re-renders
export const useFilteredPositions = () => {
  const { raw: positions } = useDataStore();
  const { query, categoryFilter, accountFilter } = useFilterStore();
  
  return useMemo(() => {
    if (!positions || positions.length === 0) return [];
    
    return positions.filter(position => {
      const matchesQuery = query ? 
        position.account.toLowerCase().includes(query.toLowerCase()) ||
        position.category.toLowerCase().includes(query.toLowerCase()) ||
        position.assetClass.toLowerCase().includes(query.toLowerCase())
        : true;
      
      const matchesCategory = categoryFilter === 'All' || position.category === categoryFilter;
      const matchesAccount = accountFilter === 'All' || position.account === accountFilter;
      
      return matchesQuery && matchesCategory && matchesAccount;
    });
  }, [positions, query, categoryFilter, accountFilter]);
};

export const useMonthlyData = () => {
  const filteredPositions = useFilteredPositions();
  
  return useMemo(() => {
    const monthMap = new Map<string, number>();
    
    filteredPositions.forEach(position => {
      const monthKey = new Date(position.date).toISOString().slice(0, 7); // YYYY-MM
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + position.value);
    });
    
    return Array.from(monthMap.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPositions]);
};

export const useLastMonthData = (): MonthlyChange => {
  const monthlyData = useMonthlyData();
  
  return useMemo(() => {
    if (monthlyData.length === 0) {
      return { total: 0, change: 0, changePercent: 0 };
    }
    
    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : lastMonth;
    
    const change = lastMonth.value - previousMonth.value;
    const changePercent = previousMonth.value > 0 ? (change / previousMonth.value) * 100 : 0;
    
    return {
      total: lastMonth.value,
      change,
      changePercent,
    };
  }, [monthlyData]);
};

export const useAllocationByCategory = (): AllocationData[] => {
  const filteredPositions = useFilteredPositions();
  const monthlyData = useMonthlyData();
  
  return useMemo(() => {
    if (monthlyData.length === 0) return [];
    
    const latestMonth = monthlyData[monthlyData.length - 1].month;
    const categoryTotals = new Map<string, number>();
    
    filteredPositions.forEach(position => {
      const positionMonth = new Date(position.date).toISOString().slice(0, 7);
      if (positionMonth === latestMonth) {
        categoryTotals.set(
          position.category, 
          (categoryTotals.get(position.category) || 0) + position.value
        );
      }
    });
    
    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPositions, monthlyData]);
};

export const useAllocationByAsset = (): AllocationData[] => {
  const filteredPositions = useFilteredPositions();
  const monthlyData = useMonthlyData();
  
  return useMemo(() => {
    if (monthlyData.length === 0) return [];
    
    const latestMonth = monthlyData[monthlyData.length - 1].month;
    const assetTotals = new Map<string, number>();
    
    filteredPositions.forEach(position => {
      const positionMonth = new Date(position.date).toISOString().slice(0, 7);
      if (positionMonth === latestMonth) {
        assetTotals.set(
          position.assetClass, 
          (assetTotals.get(position.assetClass) || 0) + position.value
        );
      }
    });
    
    return Array.from(assetTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPositions, monthlyData]);
};

export const useAvailableCategories = (): string[] => {
  const { raw: positions } = useDataStore();
  
  return useMemo(() => {
    if (!positions || positions.length === 0) return [];
    return Array.from(new Set(positions.map(p => p.category))).sort();
  }, [positions]);
};

export const useAvailableAccounts = (): string[] => {
  const { raw: positions } = useDataStore();
  const { categoryFilter } = useFilterStore();
  
  return useMemo(() => {
    if (!positions || positions.length === 0) return [];
    
    if (categoryFilter === 'All') {
      return Array.from(new Set(positions.map(p => p.account))).sort();
    }
    
    const categoryAccounts = new Set<string>();
    positions.forEach(position => {
      if (position.category === categoryFilter) {
        categoryAccounts.add(position.account);
      }
    });
    
    return Array.from(categoryAccounts).sort();
  }, [positions, categoryFilter]);
};
