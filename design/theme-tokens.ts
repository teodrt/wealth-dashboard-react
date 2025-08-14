// Theme tokens extracted from reference screenshots
// Based on wealth-home.png and categories-card.png

export const theme = {
  // Color palette sampled from screenshots
  colors: {
    // Background gradient colors
    brand: {
      red: '#FF6B6B',      // Warm red from top-left
      purple: '#8B5CF6',   // Deep purple from center
      blue: '#3B82F6',     // Cool blue from bottom-right
    },
    
    // Glass elements
    glass: {
      bg: 'rgba(255, 255, 255, 0.1)',      // Translucent white
      border: 'rgba(255, 255, 255, 0.2)',  // Faint border
      shadow: 'rgba(0, 0, 0, 0.1)',        // Soft shadow
    },
    
    // Text colors
    text: {
      primary: '#FFFFFF',           // Main white text
      muted: 'rgba(255, 255, 255, 0.7)',  // Secondary text
      dark: '#1F2937',              // Dark text on light surfaces
    },
    
    // Status colors
    success: {
      green: '#10B981',             // Vivid green for gains
    },
    
    // Background colors
    background: {
      gradient: {
        from: '#FF6B6B',    // Warm red
        via: '#8B5CF6',     // Purple
        to: '#3B82F6',      // Cool blue
      }
    }
  },
  
  // Gradients
  gradients: {
    background: 'radial-gradient(ellipse at top left, #FF6B6B 0%, #8B5CF6 50%, #3B82F6 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  },
  
  // Border radius
  radius: {
    card: '24px',
    pill: '999px',
    button: '8px',
  },
  
  // Shadows
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
    soft: '0 4px 16px rgba(0, 0, 0, 0.05)',
  },
  
  // Typography scale
  typography: {
    displayXL: {
      fontSize: '3rem',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '0.02em',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },
    label: {
      fontSize: '1rem',
      fontWeight: '500',
      lineHeight: '1.5',
    },
    body: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.6',
    },
    small: {
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  // Layout
  layout: {
    maxWidth: '1200px',
    containerPadding: '2rem',
  }
};

// CSS custom properties for use in stylesheets
export const cssVariables = {
  '--color-brand-red': theme.colors.brand.red,
  '--color-brand-purple': theme.colors.brand.purple,
  '--color-brand-blue': theme.colors.brand.blue,
  '--color-glass-bg': theme.colors.glass.bg,
  '--color-glass-border': theme.colors.glass.border,
  '--color-glass-shadow': theme.colors.glass.shadow,
  '--color-text-primary': theme.colors.text.primary,
  '--color-text-muted': theme.colors.text.muted,
  '--color-text-dark': theme.colors.text.dark,
  '--color-success-green': theme.colors.success.green,
  '--radius-card': theme.radius.card,
  '--radius-pill': theme.radius.pill,
  '--shadow-glass': theme.shadows.glass,
  '--shadow-soft': theme.shadows.soft,
};

export default theme;
