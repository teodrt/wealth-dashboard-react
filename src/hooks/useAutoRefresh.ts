import { useEffect, useRef, useCallback } from 'react';

// STATE: Timer management hook to isolate setInterval side-effects
export const useAutoRefresh = (enabled: boolean, onTick: () => void, interval: number = 60) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(onTick, interval);
  }, [onTick, interval]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    if (enabled) {
      startTimer();
    } else {
      stopTimer();
    }
    
    return stopTimer;
  }, [enabled, startTimer, stopTimer]);
  
  return { startTimer, stopTimer };
};
