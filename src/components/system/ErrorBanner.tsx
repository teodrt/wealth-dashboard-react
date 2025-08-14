import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import GlassCard from '../GlassCard';

interface ErrorBannerProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, details, onDismiss }: ErrorBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!message) return null;

  return (
    <div className="error-banner-container">
      <GlassCard className="error-banner">
        <div className="error-content">
          <div className="error-icon">
            <AlertCircle size={16} />
          </div>
          <div className="error-text">
            <div className="error-message">{message}</div>
            {details && (
              <button
                className="error-details-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
            )}
            {isExpanded && details && (
              <pre className="error-details">{details}</pre>
            )}
          </div>
          {onDismiss && (
            <button className="error-dismiss" onClick={onDismiss}>
              <X size={16} />
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
