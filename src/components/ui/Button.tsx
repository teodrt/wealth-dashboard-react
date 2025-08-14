import React from 'react';
import { tokens } from '../../ui/tokens';

// Button variants
export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success';

// Button sizes
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

// Button props interface
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// Button component with consistent styling
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth && 'ui-button--full-width',
    loading && 'ui-button--loading',
    disabled && 'ui-button--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="ui-button__spinner" aria-hidden="true">
          <svg className="ui-button__spinner-icon" viewBox="0 0 24 24">
            <circle
              className="ui-button__spinner-track"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <circle
              className="ui-button__spinner-indicator"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
            />
          </svg>
        </span>
      )}
      
      {!loading && leftIcon && (
        <span className="ui-button__icon ui-button__icon--left">
          {leftIcon}
        </span>
      )}
      
      <span className="ui-button__content">{children}</span>
      
      {!loading && rightIcon && (
        <span className="ui-button__icon ui-button__icon--right">
          {rightIcon}
        </span>
      )}
    </button>
  );
}

// Export button variants for convenience
export const ButtonVariants = {
  Primary: (props: Omit<ButtonProps, 'variant'>) => <Button variant="primary" {...props} />,
  Secondary: (props: Omit<ButtonProps, 'variant'>) => <Button variant="secondary" {...props} />,
  Outline: (props: Omit<ButtonProps, 'variant'>) => <Button variant="outline" {...props} />,
  Ghost: (props: Omit<ButtonProps, 'variant'>) => <Button variant="ghost" {...props} />,
  Danger: (props: Omit<ButtonProps, 'variant'>) => <Button variant="danger" {...props} />,
  Success: (props: Omit<ButtonProps, 'variant'>) => <Button variant="success" {...props} />,
};
