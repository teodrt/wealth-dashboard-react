import React from 'react';

export type NewsCardProps = {
  title: string;
  snippet?: string;
  source: string;
  publishedAt?: string;
  url: string;
};

// small helper (no moment/luxon)
const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export default function NewsCard({ title, snippet, source, publishedAt, url }: NewsCardProps) {
  const host = (() => {
    try { return new URL(url).host.replace(/^www\./,''); } catch { return ''; }
  })();

  return (
    <a
      className="news-card"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title} — ${source}`}
    >
      <div className="news-card__header">
        <div className="news-card__badge">
          <span className="news-card__favicon" aria-hidden>📰</span>
          <span className="news-card__source">{source}</span>
          {host && <span className="news-card__dot">•</span>}
          {host && <span className="news-card__host">{host}</span>}
        </div>
        {publishedAt && <span className="news-card__time">{timeAgo(publishedAt)}</span>}
      </div>

      <h4 className="news-card__title">{title}</h4>

      {snippet && <p className="news-card__snippet">{snippet}</p>}

      <div className="news-card__footer">
        <span className="news-card__cta">Read</span>
        <span className="news-card__ext" aria-hidden>↗</span>
      </div>
    </a>
  );
}


