// Design Tokens - Centralized design system values
export const tokens = {
  // Spacing Scale (4px base unit)
  spacing: {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },

  // Typography Scale
  typography: {
    // Font Sizes
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    
    // Font Weights
    weightNormal: '400',
    weightMedium: '500',
    weightSemibold: '600',
    weightBold: '700',
    weightExtrabold: '800',
    
    // Line Heights
    lineHeightTight: '1.25',
    lineHeightSnug: '1.375',
    lineHeightNormal: '1.5',
    lineHeightRelaxed: '1.625',
    lineHeightLoose: '2',
    
    // Letter Spacing
    letterSpacingTighter: '-0.05em',
    letterSpacingTight: '-0.025em',
    letterSpacingNormal: '0',
    letterSpacingWide: '0.025em',
    letterSpacingWider: '0.05em',
    letterSpacingWidest: '0.1em',
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '0.125rem',    // 2px
    base: '0.25rem',   // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
    slower: '500ms ease-in-out',
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

// Type exports for design tokens
export type Spacing = keyof typeof tokens.spacing;
export type TypographySize = keyof typeof tokens.typography;
export type Radius = keyof typeof tokens.radius;
export type Shadow = keyof typeof tokens.shadows;
export type Transition = keyof typeof tokens.transitions;
export type ZIndex = keyof typeof tokens.zIndex;

// Utility function to get token value
export function getToken<T extends keyof typeof tokens>(
  category: T,
  key: keyof typeof tokens[T]
): string {
  return tokens[category][key] as string;
}

// CSS Custom Properties for use in stylesheets
export const cssCustomProperties = Object.entries(tokens).reduce((acc, [category, values]) => {
  Object.entries(values).forEach(([key, value]) => {
    acc[`--${category}-${key}`] = value;
  });
  return acc;
}, {} as Record<string, string>);
