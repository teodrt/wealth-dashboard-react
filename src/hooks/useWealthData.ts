import { useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { PortfolioPosition } from '../types/state';

// STATE: Centralized data persistence hook to isolate localStorage side-effects
export const useWealthData = () => {
  const { raw: positions, setRaw } = useDataStore();
  
  // Load data from localStorage on mount
  useEffect(() => {
    const loadLegacyData = () => {
      try {
        const stored = localStorage.getItem("wd_rows_v21");
        if (!stored) return;
        
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return;
        
        // Convert legacy format to new format
        const converted: PortfolioPosition[] = parsed.map((row: any) => ({
          date: row.Date || row.date || new Date().toISOString(),
          account: row.Account || row.account || 'Unknown',
          category: row.Category || row.category || 'Other',
          assetClass: row.AssetClass || row.assetClass || 'Other',
          currency: row.Currency || row.currency || 'EUR',
          value: Number(row.Value || row.amount || 0),
        }));
        
        setRaw(converted);
      } catch (error) {
        console.error('Failed to load legacy data:', error);
      }
    };
    
    loadLegacyData();
  }, [setRaw]);
  
  // Save data to localStorage when positions change
  useEffect(() => {
    if (positions.length > 0) {
      try {
        localStorage.setItem("wd_rows_v21", JSON.stringify(positions));
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    }
  }, [positions]);
  
  return { positions, setRaw };
};
