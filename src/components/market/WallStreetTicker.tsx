import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface WallStreetTickerProps {
  symbols?: string[];
  provider?: string;
}

export default function WallStreetTicker({ 
  symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'],
  provider = 'mock'
}: WallStreetTickerProps) {
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mock data for now - in real implementation this would call the API
        const mockData: TickerData[] = symbols.map(symbol => ({
          symbol,
          price: Math.random() * 1000 + 100,
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 5
        }));
        
        setTickerData(mockData);
      } catch (err) {
        setError('Failed to fetch ticker data');
        console.error('Ticker error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickerData();
    
    // Update every 30 seconds
    const interval = setInterval(fetchTickerData, 30000);
    return () => clearInterval(interval);
  }, [symbols, provider]);

  if (loading) {
    return (
      <div className="ticker-container loading">
        <div className="ticker-loading">Loading ticker...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticker-container error">
        <div className="ticker-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="ticker-container">
      <div className="ticker-scroll">
        {tickerData.map((item, index) => (
          <div key={item.symbol} className="ticker-item">
            <span className="ticker-symbol">{item.symbol}</span>
            <span className="ticker-price">${item.price.toFixed(2)}</span>
            <span className={`ticker-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
              {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(item.change).toFixed(2)} ({Math.abs(item.changePercent).toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

