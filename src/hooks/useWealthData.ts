import { useDataStore } from '../store/dataStore';

// STATE: Expose data store without legacy localStorage side-effects
export const useWealthData = () => {
  const { raw: positions, setRaw } = useDataStore();
  return { positions, setRaw };
};
