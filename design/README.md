# Design System - Wealth Dashboard v2.52

This document describes the visual design system restored from reference screenshots.

## Color Palette

### Brand Colors
- **Red**: `#FF6B6B` - Warm red from top-left of background gradient
- **Purple**: `#8B5CF6` - Deep purple from center of background gradient  
- **Blue**: `#3B82F6` - Cool blue from bottom-right of background gradient

### Glass Elements
- **Background**: `rgba(255, 255, 255, 0.1)` - Translucent white for glass cards
- **Border**: `rgba(255, 255, 255, 0.2)` - Faint border for glass elements
- **Shadow**: `rgba(0, 0, 0, 0.1)` - Soft shadow for depth

### Text Colors
- **Primary**: `#FFFFFF` - Main white text
- **Muted**: `rgba(255, 255, 255, 0.7)` - Secondary text
- **Dark**: `#1F2937` - Dark text on light surfaces

### Status Colors
- **Success Green**: `#10B981` - Vivid green for gains and positive values

## Gradients

### Background Gradient
```css
background: radial-gradient(ellipse at top left, #FF6B6B 0%, #8B5CF6 50%, #3B82F6 100%);
```

### Glass Gradient
```css
background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
```

## Border Radius

- **Card**: `24px` - Main content cards
- **Pill**: `999px` - Navigation tabs and chips
- **Button**: `8px` - Standard buttons

## Shadows

- **Glass**: `0 8px 32px rgba(0, 0, 0, 0.1)` - Main glass card shadow
- **Soft**: `0 4px 16px rgba(0, 0, 0, 0.05)` - Subtle shadow

## Typography Scale

- **Display XL**: `3rem/700` - Main balance numbers
- **Title**: `1.5rem/600` - Section titles (uppercase with tracking)
- **Label**: `1rem/500` - Labels and headings
- **Body**: `0.875rem/400` - Body text
- **Small**: `0.75rem/400` - Captions and metadata

## Components

### GlassCard
- Translucent background with backdrop blur
- Subtle border and shadow
- Inner gradient sheen effect
- 24px border radius

### Navigation Tabs
- Pill-shaped with translucent background
- Active state: white background with dark text
- Inactive state: translucent with muted text

### Stat Chips
- Compact pill design
- Currency value + percentage change
- Green color for positive values

## Layout

### Header Section
- 3-column grid: User Profile | Main Balance | Stat Chips
- Version badge in top-right corner
- Responsive: stacks on mobile

### Main Content
- Glass cards with consistent padding
- Chart cards with white grid lines and axes
- Empty states when no data available

## Responsive Design

- Desktop: Full layout with side-by-side columns
- Mobile (≤768px): Stacked layout, maintained readability
- Pills and chips remain touch-friendly

## How to Tweak

1. **Colors**: Update CSS variables in `src/styles.css`
2. **Typography**: Modify font sizes/weights in component styles
3. **Spacing**: Adjust padding/margins in component classes
4. **Effects**: Modify backdrop-filter and shadow values

## Reference Screenshots

- `design/reference/wealth-home.png` - Main dashboard view
- `design/reference/categories-card.png` - Categories tab view
