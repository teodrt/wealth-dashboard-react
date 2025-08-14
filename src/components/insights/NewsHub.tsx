import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import GlassCard from '../GlassCard';

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
}

interface NewsHubProps {
  provider?: string;
  maxArticles?: number;
}

import { env } from '../../config/env';

export default function NewsHub({ 
  provider = env.newsProvider, 
  maxArticles = env.newsMaxArticles 
}: NewsHubProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mock news data - in real implementation this would call the API
        const mockArticles: NewsArticle[] = [
          {
            id: '1',
            title: 'Markets Rally on Fed Rate Decision',
            url: 'https://www.ft.com/content/12345678-1234-1234-1234-123456789012',
            source: 'Financial Times',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            description: 'Global markets surged after the Federal Reserve signaled a dovish stance on interest rates.'
          },
          {
            id: '2',
            title: 'Tech Stocks Lead Market Gains',
            url: 'https://www.bloomberg.com/news/articles/2025-08-14/tech-stocks-lead-market-gains',
            source: 'Bloomberg',
            publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            description: 'Technology companies drove market performance with strong earnings reports.'
          },
          {
            id: '3',
            title: 'European Markets Open Higher',
            url: 'https://www.reuters.com/markets/europe/european-markets-open-higher',
            source: 'Reuters',
            publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            description: 'European stock markets opened in positive territory following Asian gains.'
          },
          {
            id: '4',
            title: 'Cryptocurrency Volatility Continues',
            url: 'https://www.cnbc.com/2025/08/14/cryptocurrency-volatility-continues',
            source: 'CNBC',
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            description: 'Digital assets remain volatile as regulatory uncertainty persists.'
          },
          {
            id: '5',
            title: 'Bond Yields Decline Globally',
            url: 'https://www.wsj.com/articles/bond-yields-decline-globally',
            source: 'Wall Street Journal',
            publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            description: 'Government bond yields fell across major economies amid economic concerns.'
          },
          {
            id: '6',
            title: 'Oil Prices Stabilize',
            url: 'https://www.marketwatch.com/story/oil-prices-stabilize',
            source: 'MarketWatch',
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            description: 'Crude oil prices found stability after recent volatility.'
          }
        ];
        
        setArticles(mockArticles.slice(0, maxArticles));
      } catch (err) {
        setError('Failed to fetch news');
        console.error('News error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    
    // Refresh based on environment configuration
    const interval = setInterval(fetchNews, env.newsRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [provider, maxArticles]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <GlassCard className="news-hub-card">
        <h3>📰 News Hub</h3>
        <div className="news-loading">Loading news...</div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="news-hub-card">
        <h3>📰 News Hub</h3>
        <div className="news-error">
          <AlertCircle size={16} />
          {error}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="news-hub-card">
      <h3>📰 News Hub</h3>
      <div className="news-grid">
        {articles.map((article) => (
          <div key={article.id} className="news-article">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-link"
            >
              <h4 className="news-title">{article.title}</h4>
              <div className="news-meta">
                <span className="news-source">{article.source}</span>
                <span className="news-time">{formatRelativeTime(article.publishedAt)}</span>
              </div>
              {article.description && (
                <p className="news-description">{article.description}</p>
              )}
              <div className="news-external">
                <ExternalLink size={14} />
                Read more
              </div>
            </a>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

