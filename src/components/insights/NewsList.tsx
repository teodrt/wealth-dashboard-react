import React from 'react';
import NewsCard from './NewsCard';

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet?: string;
};

type NewsListProps = {
  articles: Article[];
  limit?: number; // default 8
};

export default function NewsList({ articles, limit = 8 }: NewsListProps) {
  const items = articles.slice(0, limit);
  if (!items.length) {
    return <div className="news-empty">No market news available</div>;
  }
  return (
    <div className="news-grid">
      {items.map(a => (
        <NewsCard
          key={a.id || a.url}
          title={a.title}
          url={a.url}
          source={a.source}
          publishedAt={a.publishedAt}
          snippet={a.snippet}
        />
      ))}
    </div>
  );
}


