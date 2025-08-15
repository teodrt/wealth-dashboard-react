import React from 'react';
import { tokens } from '../../ui/tokens';

// Section variants
export type SectionVariant = 'default' | 'glass' | 'card' | 'minimal';

// Section sizes
export type SectionSize = 'sm' | 'md' | 'lg' | 'xl';

// Section props interface
export interface SectionProps {
  variant?: SectionVariant;
  size?: SectionSize;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  noPadding?: boolean;
}

// Section component with consistent spacing and layout
const Section = React.memo(function Section({
  variant = 'default',
  size = 'md',
  title,
  subtitle,
  actions,
  children,
  className = '',
  fullWidth = false,
  noPadding = false,
}: SectionProps) {
  const baseClasses = [
    'ui-section',
    `ui-section--${variant}`,
    `ui-section--${size}`,
    fullWidth && 'ui-section--full-width',
    noPadding && 'ui-section--no-padding',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={baseClasses}>
      {(title || subtitle || actions) && (
        <div className="ui-section__header">
          <div className="ui-section__header-content">
            {title && (
              <h2 className="ui-section__title">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="ui-section__subtitle">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="ui-section__actions">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className="ui-section__content">
        {children}
      </div>
    </section>
  );
});

export default Section;

// Export section variants for convenience
export const SectionVariants = {
  Glass: (props: Omit<SectionProps, 'variant'>) => <Section variant="glass" {...props} />,
  Card: (props: Omit<SectionProps, 'variant'>) => <Section variant="card" {...props} />,
  Minimal: (props: Omit<SectionProps, 'variant'>) => <Section variant="minimal" {...props} />,
};
