# PayLog Design System & Styling Guide

## Overview

PayLog uses a comprehensive design token system built on Tailwind CSS, providing a consistent, maintainable, and accessible design language across the application. The design system supports full light and dark mode with automatic theme switching.

---

## Design Principles

1. **Consistency**: Single source of truth for all design tokens
2. **Accessibility**: WCAG AA compliant with proper contrast ratios
3. **Maintainability**: CSS variables for easy theme updates
4. **Scalability**: Semantic utility classes for rapid development
5. **Performance**: Optimized Tailwind output with PurgeCSS

---

## Color System

### Brand Colors

```css
--primary: 25 95% 53%  /* Brand Orange - used for primary actions */
```

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--foreground` | `222 47% 6%` | `0 0% 96%` | Primary text color |
| `--background` | `216 33% 97%` | `220 12% 6%` | Page background |
| `--muted-foreground` | `222 15% 42%` | `220 5% 70%` | Secondary text |
| `--border` | `220 18% 88%` | `220 7% 18%` | Borders and dividers |

### Status Colors

```tsx
// Success (green)
<div className="bg-success text-success-foreground">Success message</div>

// Warning (amber)
<div className="bg-warning text-warning-foreground">Warning message</div>

// Error (red)
<div className="bg-destructive text-destructive-foreground">Error message</div>

// Info (blue)
<div className="bg-info text-info-foreground">Info message</div>
```

---

## Typography

### Scale

| Token | Size | Usage |
|-------|------|-------|
| `--font-size-xs` | 0.75rem (12px) | Captions, helper text |
| `--font-size-sm` | 0.875rem (14px) | Labels, small body text |
| `--font-size-base` | 1rem (16px) | Body text (default) |
| `--font-size-lg` | 1.125rem (18px) | Large body text |
| `--font-size-xl` | 1.25rem (20px) | Small headings |
| `--font-size-2xl` | 1.5rem (24px) | Medium headings |
| `--font-size-3xl` | 1.875rem (30px) | Large headings |
| `--font-size-4xl` | 2.25rem (36px) | Hero headings |

### Heading Classes

Use semantic heading classes instead of raw Tailwind for consistency:

```tsx
// ✅ Good - semantic classes
<h1 className="heading-1">Page Title</h1>
<h2 className="heading-2">Section Title</h2>
<h3 className="heading-3">Subsection Title</h3>
<h4 className="heading-4">Card Title</h4>
<h5 className="heading-5">Small Heading</h5>
<h6 className="heading-6">Tiny Heading</h6>

// ❌ Avoid - raw Tailwind (inconsistent)
<h1 className="text-4xl font-bold">Page Title</h1>
```

### Text Styles

```tsx
// Body text
<p className="text-body">Standard paragraph text with relaxed line height</p>
<p className="text-body-sm">Small body text</p>
<p className="text-body-lg">Large body text</p>

// Labels and captions
<label className="text-label">Form Label</label>
<small className="text-caption">Helper text or footnote</small>

// Overline (all-caps labels)
<span className="text-overline">Section Label</span>
```

### Font Weights

```tsx
className="font-normal"     // 400 - body text
className="font-medium"     // 500 - labels, buttons
className="font-semibold"   // 600 - headings
className="font-bold"       // 700 - emphasis
```

---

## Shadows

Shadows automatically adapt to light/dark mode:

```tsx
// ✅ Good - use design tokens
<div className="shadow-sm">Subtle elevation</div>
<div className="shadow">Default card shadow</div>
<div className="shadow-md">Medium elevation</div>
<div className="shadow-lg">High elevation (modals)</div>
<div className="shadow-xl">Maximum elevation (overlays)</div>

// ❌ Avoid - hardcoded shadows
<div className="shadow-[0_8px_24px_rgba(0,0,0,0.35)]">Don't do this</div>
```

---

## Surface Components

```tsx
// Basic card surface
<div className="surface">Content with border</div>

// Elevated surface with shadow
<div className="surface-elevated">Card with elevation</div>

// Interactive surface (hover effects)
<div className="surface-interactive">Clickable card</div>
```

---

## Dark Mode

### Automatic Theme Switching

```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle';

<ThemeToggle />
```

### Writing Dark Mode Styles

```tsx
// ✅ Automatic (preferred)
<div className="bg-background text-foreground">Auto-adapts</div>

// ✅ Manual (when needed)
<div className="bg-white dark:bg-gray-900">Custom behavior</div>

// ❌ Avoid
<div className="bg-white text-black">Doesn't adapt</div>
```

---

## Best Practices

### ✅ DO

1. Use design tokens for all colors, typography, and spacing
2. Use semantic classes (`.heading-3`, `.text-body`) over raw Tailwind
3. Test in both light and dark themes
4. Follow WCAG AA contrast guidelines
5. Use the `cn()` utility to merge classNames

### ❌ DON'T

1. Don't hardcode colors - use CSS variables
2. Don't hardcode shadows - use shadow tokens
3. Don't hardcode font sizes - use typography scale
4. Don't use arbitrary values without justification
5. Don't skip accessibility

---

## Migration Guide

When updating existing components:

```tsx
// Before: Hardcoded shadow
className="shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"

// After: Design token
className="shadow-md"

// Before: Hardcoded typography
className="text-[13px] font-semibold uppercase tracking-[0.32em]"

// After: Semantic class
className="text-overline"

// Before: Hardcoded heading
<h2 className="text-2xl font-semibold text-foreground">Title</h2>

// After: Semantic class
<h2 className="heading-3">Title</h2>
```

---

## Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Last Updated**: October 25, 2025 (Sprint 10)
