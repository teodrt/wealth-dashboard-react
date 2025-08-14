# UI Style Guide

This document outlines the standardized design system and UI components used throughout the Wealth Dashboard application.

## Design Tokens

### Spacing Scale
Our spacing system uses a 4px base unit for consistent rhythm:

```typescript
import { tokens } from '../ui/tokens';

// Usage examples
const spacing = tokens.spacing;
// spacing.1 = 0.25rem (4px)
// spacing.4 = 1rem (16px)
// spacing.8 = 2rem (32px)
```

| Token | Value | Use Case |
|-------|-------|----------|
| `spacing.1` | 4px | Micro spacing, borders |
| `spacing.2` | 8px | Small gaps, icon spacing |
| `spacing.4` | 16px | Standard padding, margins |
| `spacing.6` | 24px | Section spacing |
| `spacing.8` | 32px | Large spacing, card padding |
| `spacing.12` | 48px | Major section breaks |

### Typography Scale
Consistent font sizes and weights across the application:

```typescript
const typography = tokens.typography;

// Font sizes
typography.xs    // 12px - Captions, labels
typography.sm    // 14px - Small text
typography.base  // 16px - Body text
typography.lg    // 18px - Large body
typography.xl    // 20px - Subheadings
typography.2xl   // 24px - Section titles
typography.3xl   // 30px - Page titles
typography.4xl   // 36px - Hero titles
```

### Border Radius
Consistent corner rounding:

```typescript
const radius = tokens.radius;

radius.sm    // 2px - Small elements
radius.base  // 4px - Default
radius.lg    // 8px - Cards, buttons
radius.xl    // 12px - Large cards
radius.2xl   // 16px - Sections
radius.3xl   // 24px - Hero sections
```

### Shadows
Depth and elevation system:

```typescript
const shadows = tokens.shadows;

shadows.sm    // Subtle elevation
shadows.base  // Default shadow
shadows.md    // Medium elevation
shadows.lg    // High elevation
shadows.xl    // Maximum elevation
```

## UI Components

### Button Component

The Button component provides consistent styling and behavior across the application.

```tsx
import { Button, ButtonVariants } from '../ui';

// Basic usage
<Button variant="primary" size="md">
  Click me
</Button>

// With icons
<Button 
  variant="outline" 
  leftIcon={<UploadIcon />}
  rightIcon={<ArrowRightIcon />}
>
  Upload File
</Button>

// Loading state
<Button loading>Processing...</Button>

// Predefined variants
<ButtonVariants.Primary>Primary Action</ButtonVariants.Primary>
<ButtonVariants.Danger>Delete</ButtonVariants.Danger>
```

#### Button Variants
- **Primary**: Main actions, solid blue background
- **Secondary**: Secondary actions, gray background
- **Outline**: Bordered buttons, transparent background
- **Ghost**: Minimal styling, transparent background
- **Danger**: Destructive actions, red background
- **Success**: Positive actions, green background

#### Button Sizes
- **sm**: 32px height, compact
- **md**: 40px height, default
- **lg**: 48px height, prominent
- **xl**: 56px height, hero buttons

### Section Component

The Section component provides consistent layout and spacing for content areas.

```tsx
import { Section, SectionVariants } from '../ui';

// Basic section
<Section title="Portfolio Overview" subtitle="Your investment summary">
  <p>Content goes here...</p>
</Section>

// With actions
<Section 
  title="Data Management" 
  actions={<Button>Add Data</Button>}
>
  <p>Content...</p>
</Section>

// Glass variant
<SectionVariants.Glass title="Premium Features">
  <p>Glass effect content...</p>
</SectionVariants.Glass>
```

#### Section Variants
- **Default**: Standard white background
- **Glass**: Glassmorphism effect with backdrop blur
- **Card**: Card-like appearance with borders
- **Minimal**: No background or padding

#### Section Sizes
- **sm**: Compact spacing
- **md**: Default spacing
- **lg**: Generous spacing
- **xl**: Maximum spacing

### StatTile Component

The StatTile component displays metrics and statistics consistently.

```tsx
import { StatTile, StatTileVariants } from '../ui';

// Basic stat tile
<StatTile
  title="Total Assets"
  value="$125,000"
  subtitle="As of today"
/>

// With trend indicator
<StatTile
  title="Monthly Growth"
  value="+12.5%"
  trend="up"
  change={{ value: 12.5, isPositive: true, label: "vs last month" }}
/>

// With icon
<StatTile
  title="Portfolio Value"
  value="$89,420"
  icon={<TrendingUpIcon />}
  variant="highlight"
/>
```

#### StatTile Variants
- **Default**: Standard appearance
- **Glass**: Glassmorphism effect
- **Minimal**: Transparent background
- **Highlight**: Gradient background

#### StatTile Sizes
- **sm**: Compact display
- **md**: Default size
- **lg**: Large display

### GlassCard Component

The GlassCard component provides the signature glassmorphism effect.

```tsx
import { GlassCard } from '../ui';

<GlassCard className="custom-class">
  <h3>Glass Effect Card</h3>
  <p>Content with backdrop blur and transparency</p>
</GlassCard>
```

## Usage Guidelines

### Component Selection

1. **Buttons**: Use for all interactive actions
2. **Sections**: Use for content organization and layout
3. **StatTiles**: Use for displaying metrics and KPIs
4. **GlassCard**: Use for premium-feeling content areas

### Spacing Rules

- Use spacing tokens instead of arbitrary values
- Maintain consistent rhythm between related elements
- Use larger spacing for major content breaks
- Use smaller spacing for related elements

### Typography Rules

- Use appropriate font sizes for hierarchy
- Maintain consistent line heights for readability
- Use font weights to create emphasis
- Keep letter spacing consistent within categories

### Color Usage

- Use semantic colors (primary, success, danger)
- Maintain sufficient contrast for accessibility
- Use neutral colors for text and backgrounds
- Apply glass effects sparingly for premium feel

## Accessibility

### Focus States
All interactive components have visible focus states using CSS focus-visible.

### Color Contrast
Colors meet WCAG AA standards for sufficient contrast.

### Screen Reader Support
Components include proper ARIA labels and semantic HTML.

## Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
- Stack elements vertically on small screens
- Adjust spacing for touch interfaces
- Maintain readability on small devices

## Best Practices

1. **Consistency**: Always use the design tokens and components
2. **Accessibility**: Ensure proper contrast and focus states
3. **Performance**: Minimize custom CSS, prefer utility classes
4. **Maintainability**: Use semantic class names and avoid inline styles
5. **Responsiveness**: Test on multiple screen sizes

## Examples

### Dashboard Layout
```tsx
<Section title="Portfolio Overview" size="lg">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <StatTile
      title="Total Value"
      value="$125,000"
      trend="up"
      variant="glass"
    />
    <StatTile
      title="Monthly Change"
      value="+$2,500"
      change={{ value: 2500, isPositive: true }}
      variant="glass"
    />
    <StatTile
      title="Risk Score"
      value="7.2/10"
      trend="neutral"
      variant="glass"
    />
  </div>
</Section>
```

### Form Layout
```tsx
<Section title="Upload Data" variant="card">
  <div className="space-y-4">
    <input type="file" className="form-input" />
    <div className="flex gap-3">
      <Button variant="primary">Upload</Button>
      <Button variant="outline">Cancel</Button>
    </div>
  </div>
</Section>
```

This style guide ensures consistent, accessible, and maintainable UI across the Wealth Dashboard application.
