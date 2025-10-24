em Implementation Instructions for Agent

Design System and Theming Instructions for Next.js Project

These instructions define a comprehensive design system for a Next.js 13+ application using Tailwind CSS, Shadcn UI, Radix UI, Lucide icons, and Storybook. The goal is uniformity and consistency across the entire app. Follow each section below carefully and do exactly as instructed.

Overview: Consistency Through a Design System

Establish a central design system early to ensure uniform branding and UX
dev.to
. All pages and components should look coherent and professional.

Use single source of truth variables (CSS variables and Tailwind config) for colors, typography, spacing, etc. This global control lets you update the theme in one place.

Do not introduce inline styles or one-off CSS rules. Instead, use Tailwind utility classes, custom components, or semantic class names (with @apply) consistently. This avoids duplication.

Use Shadcn UI components for common UI patterns and Radix UI primitives for accessibility. Style them with Tailwind classes
medium.com
. Use Lucide for icons (which inherit currentColor
lucide.dev
). Document all components in Storybook with the theme applied.

Color Palette & Theming

Brand Orange (Primary Color): Keep the brand orange exactly as given. Do not modify its hue or saturation
medium.com
medium.com
. This is a fixed brand token (e.g. define as --color-brand-orange). Always use it for primary actions (buttons, links, highlights).

Black and White: Use pure black (#000000) and pure white (#FFFFFF) as base colors. Light mode uses white backgrounds with black text; dark mode inverts to black backgrounds with white text. These should be the main contrast colors for body background and text.

Neutral Grays: Define a small set of neutral gray shades for borders, backgrounds, and disabled states. For example: very light gray (for subtle backgrounds, e.g. --gray-100: #f9f9f9) and very dark gray (e.g. --gray-900: #1f1f1f). Avoid medium-gray backgrounds as they can look “muddy”
medium.com
. Keep neutrals minimal (few light and few dark grays)
medium.com
.

Accents & Highlights: Besides brand orange, you may define at most a couple of complementary accent colors (e.g. a blue or teal for informational charts, a green for success). Use them sparingly to highlight secondary actions or multi-category data. For example: primary charts lines in orange, secondary in a muted blue. Ensure all accent colors are accessible against both black and white (check contrast).

CSS Variables: Define all above colors as CSS variables in the global stylesheet (:root). For example:

/* globals.css */
:root {
  --color-background: #ffffff;
  --color-foreground: #000000;
  --color-brand: /* brand orange code */;
  --gray-100: #f9f9f9;
  --gray-900: #1f1f1f;
  /* ... any accent colors ... */
}
.dark {
  --color-background: #000000;
  --color-foreground: #ffffff;
  /* In dark mode, brand orange remains unchanged by design */
  /* You may define alternative grays for dark mode if needed, or invert them */
  --gray-100: #1a1a1a;
  --gray-900: #e0e0e0;
}


Then extend Tailwind’s theme to use these variables:

// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' if preferred; using 'class' allows toggling
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        brand: 'var(--color-brand)',
        gray: {
          100: 'var(--gray-100)',
          900: 'var(--gray-900)',
        },
        // add any accent colors similarly
      },
    },
  },
  plugins: [],
}


By mapping Tailwind colors to CSS variables, changing themes (light/dark) happens via the .dark class
dev.to
medium.com
.

Typography & Font Sizing

Global Font: Choose a clean, professional font (e.g. Inter or a similar sans-serif). Set a CSS variable --font-family: 'Inter', sans-serif; in :root
medium.com
. Apply globally (e.g. in body { font-family: var(--font-family); }).

Font Scale: Define a typographic scale with semantic roles. For example:

--font-size-base: 16px (the default body size)
medium.com
.

Headings: Create classes or use Tailwind’s text sizes (e.g. text-4xl, text-3xl, text-2xl, etc) but ensure consistency. For instance:

H1: .heading-1 { @apply text-4xl font-bold leading-tight; }

H2: .heading-2 { @apply text-3xl font-semibold; }

H3: .heading-3 { @apply text-2xl font-medium; }

Body text: .text-body { @apply text-base leading-relaxed; }

Small text: .text-sm { @apply text-sm; }

Line-height & Spacing: Use consistent line-height (e.g. leading-relaxed for body, leading-snug for headings). Set global variables for spacing if needed (--spacing-sm, --spacing-md etc) to match Tailwind’s spacing scale.

Font Weights: Normalize font weights (e.g. normal = 400, semibold = 600, etc). Only use the few needed weights to keep uniform look.

Implementation Tip: You can define these text classes with Tailwind’s @apply inside a CSS file or via @layer components. This ensures no repeated inline utility classes. For example:

@layer components {
  .heading-1 { @apply text-4xl font-bold tracking-tight; }
  .heading-2 { @apply text-3xl font-semibold tracking-tight; }
  .text-body  { @apply text-base leading-relaxed; }
  .btn-primary { @apply bg-brand text-white font-semibold py-2 px-4 rounded; }
  /* Add more as needed */
}


This way, components can simply use className="heading-1" or className="btn-primary".

Layout, Spacing & Responsiveness

Uniform Spacing Scale: Use Tailwind’s default spacing scale (multiples of 4px) consistently. Define CSS variables if you need specific standard spacing (e.g. --spacing-4: 1rem). Avoid magic numbers.

Breakpoints: Keep default breakpoints (sm, md, lg, xl, 2xl) to adjust layouts. Design mobile-first: stack components on small screens and expand on larger ones.

Containers: Set a max-width container (e.g. Tailwind’s container mx-auto) for page content to limit line length.

Grid & Flex: Use Tailwind’s grid and flex utilities for layout. Ensure elements like cards and tables are responsive (e.g. wrapping or horizontal scroll).

Layout Shifts: Prevent cumulative layout shift by specifying width/height or aspect-w/h for images and components. Use Tailwind’s aspect-video or similar for media.

Visual Contrast: For important elements (CTA buttons, highlighted stats, active nav items), use the brand orange or dark/white contrasts. All text must meet contrast guidelines against its background. Use black on white or white on black for high-emphasis text.

Component Libraries (Shadcn UI, Radix UI, Lucide Icons)

Shadcn UI: Incorporate Shadcn’s React component library for common patterns (forms, buttons, cards). When initializing Shadcn (npx shadcn-ui@latest init), select “Yes” for CSS variables support
dev.to
. This setup creates index.css with default color variables and a .dark mode override
dev.to
. Continue using Shadcn components and theme them via the CSS variables defined.

Radix UI: For advanced interactive components (dialogs, popovers, dropdowns, tooltips, etc), use Radix primitives for accessibility. Style Radix components with Tailwind classes directly. For example:

<DropdownMenu.Trigger className="bg-brand hover:bg-brand-dark text-white font-bold py-2 px-4 rounded">
  Open Menu
</DropdownMenu.Trigger>


Tailwind classes can be applied on Radix’s Trigger, Content, Item, etc. This approach is explicitly recommended: “Tailwind CSS classes are directly applied to each component for styling” in Radix + Tailwind guides
medium.com
.

Lucide Icons: Import Lucide icons and include them inline or via a <Icon /> component. Lucide icons default to currentColor
lucide.dev
, so set the icon color with Tailwind text color classes on the icon or its container. For instance: <IconName className="text-2xl text-brand" /> makes the icon orange. Define default icon size (e.g. h-6 w-6) and stroke width via Tailwind if needed. Use consistent sizing: e.g. headings use larger icons, body text use small icons.

Storybook: Use Storybook to develop and preview UI in isolation. In .storybook/preview.js, import your main CSS (which includes Tailwind and your variables) so all stories render with the correct theme
storybook.js.org
. Also install @storybook/addon-themes to toggle themes in Storybook. Configure it with withThemeByClassName (or by data attribute) to switch between light and dark
storybook.js.org
. Example in preview:

import '../styles/globals.css'; // contains Tailwind imports
import { withThemeByClassName } from '@storybook/addon-themes';
export const decorators = [
  withThemeByClassName({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
];

Global Styles and Tailwind Configuration

Global CSS: In your global stylesheet (e.g. globals.css or styles/tailwind.css), include Tailwind’s base, components, and utilities (@tailwind base; @tailwind components; @tailwind utilities;). Then declare all CSS variables (colors, fonts, spacing) under :root and a .dark class as shown above
medium.com
medium.com
.

Tailwind Config:

Set darkMode: 'class' (so adding a dark class toggles dark mode)
dev.to
.

Extend the colors palette to reference your CSS variables (as shown earlier).

Extend fontFamily if using a custom font: e.g. fontFamily: { sans: ['Inter', 'system-ui'], ... }.

(Optional) Define custom spacing or border radius if needed: you can map spacing: { '4xl': '64rem', ... } or similar. Example from [5]: they set --radius-sm, --radius-md, --radius-lg
medium.com
 and could use these in Tailwind.

Use plugins if needed (e.g. @tailwindcss/forms for form resets, @tailwindcss/typography for prose styling).

Component Utilities: Use Tailwind’s @apply in a CSS file to define reusable utility classes (like buttons, headings) to avoid rewriting the same class sets. This keeps CSS DRY and optimizable.

Implementation Checklist

Set Up CSS Variables: In your global CSS (:root), define variables for background, foreground, brand, grays, font family, base size, radii, etc
medium.com
medium.com
. Under .dark (or [data-theme="dark"]), override them for dark mode.

Tailwind Configuration: Update tailwind.config.js as described: darkMode: 'class', extend colors using var(--*), set fonts if needed, import any required plugins. Ensure content paths include all component directories.

Global Base Styles: In CSS or via Tailwind plugins, set default styles on body, h1, p, a, button, etc. For example, apply the global font family and base size, and link colors (e.g. use text-brand for <a> by default if appropriate).

Typography Classes: Define heading and text classes using @apply in a CSS file (or via a CSS-in-JS theme) so that headings, paragraphs, buttons, etc. have uniform sizes and weights. Use semantic class names (e.g. .heading-1, .text-body) rather than arbitrary combinations.

Colors in Components: Whenever adding a component (card, button, stat, chart), apply the color classes or variables. Examples:

Buttons/CTAs: Use bg-brand text-white (light mode) or bg-white text-brand with a border in dark mode for primary buttons. Use Tailwind’s dark: variant to invert if needed.

Stats/Cards: A number or stat that needs emphasis could be text-brand or text-white on colored bg. Labels might use text-gray-500 or text-gray-900 for muted text.

Charts: For line/bar charts, use the brand orange for the primary series. For additional series, use a consistent accent (e.g. stroke-white or a gray). All text in charts should follow the theme (light or dark) for readability.

Icons: Apply text-<color> to set icon color. E.g., <Icon className="text-brand" /> or <Icon className="text-gray-500" />.

Storybook: Ensure your Storybook main configuration includes PostCSS and your Tailwind setup. Import your compiled CSS in preview.js
storybook.js.org
. Use the theme decorator to add a toolbar toggle between light/dark
storybook.js.org
. Write stories for all key components, showing variations of color and size.

Responsive Design: For each component and page, test at different screen sizes. Use Tailwind’s responsive prefixes (e.g. md:px-8, lg:flex-row) to adjust layouts. Ensure no content overflows or shifts improperly when switching breakpoints.

Testing & Review: Use Storybook and a tester to validate contrast. Check all text (especially stat numbers, CTAs) is at least AA compliant. Verify that brand orange is used only for accentuating, and never overridden or altered.

Do’s and Don’ts

Do rely on Tailwind’s utility classes and semantic component classes you create. Do not copy-paste style objects or inline styles.

Do use the global theme variables for colors and fonts everywhere. Do not hard-code hex values in components.

Do keep pages visually consistent: use the same header, footer, nav styling across pages. Common elements should reuse the same components and styles.

Do highlight important elements with high-contrast colors (brand orange or pure black/white) to draw attention.

Don’t introduce random colors or gradients. Stick to the defined palette.

Don’t modify brand orange’s hex or use it in a less accessible saturation
medium.com
medium.com
.

Don’t use medium-gray backgrounds or text; use either very light or very dark neutrals
medium.com
.

Don’t leave typography inconsistent: ensure every heading of the same level has the same class and style.

By following these instructions, the lower-level agent should be able to update the project code directly: defining global CSS variables, configuring Tailwind, creating component classes, and ensuring every page and component adheres to this unified theme. Use the references as guides (e.g. the Shadcn+Tailwind Storybook example
dev.to
storybook.js.org
 and the theming article
medium.com
medium.com
) to verify correct setup. Ensure no style deviates from this plan unless explicitly updated here.