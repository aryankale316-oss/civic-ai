---
name: Civic AI Structural System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d4947'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#555f6f'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f3'
  on-secondary-container: '#596373'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#d9e3f6'
  secondary-fixed-dim: '#bdc7d9'
  on-secondary-fixed: '#121c2a'
  on-secondary-fixed-variant: '#3d4756'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is anchored in the concept of **Modern Governance**. It balances the authority of a public institution with the efficiency of modern technology. The personality is professional, dependable, and transparent—moving away from high-gloss consumer tech toward a utilitarian aesthetic that prioritizes clarity and accessibility for all citizens.

The visual style follows a **Modern Corporate** approach with elements of **Minimalism**. It utilizes a structured grid, generous whitespace to reduce cognitive load during grievance filing, and high-contrast typography to ensure information remains legible across varying device qualities. The emotional response should be one of "calm efficiency"—reassuring the user that their issue is being handled systematically.

## Colors

The palette is designed for high-contrast accessibility (WCAG AA). 

- **Primary (Civic Teal):** Used for primary actions, progress indicators, and branding elements. It evokes a sense of environmental and social responsibility.
- **Neutral (Charcoal & Gray):** Dark Charcoal is reserved for text to ensure maximum readability. Light Gray (#F9FAFB) is used for background layering to define content areas without using heavy borders.
- **Semantic Colors:** Amber and Red are used sparingly for status indicators (Pending, Critical) and alerts.
- **Dark Mode:** In dark mode, the background shifts to a deep navy-charcoal (#111827), using elevation-based lightening for cards and surfaces to maintain depth.

## Typography

This design system uses **Inter** for all roles due to its exceptional legibility on mobile screens and its neutral, systematic character.

- **Headlines:** Use tight letter-spacing and bold weights to establish a clear hierarchy.
- **Body Text:** Standard weight (400) with generous line-heights to aid readability for long-form descriptions in grievances.
- **Labels:** Used for status badges, table headers, and AI confidence indicators. These utilize a semi-bold weight (600) to distinguish them from body content.

## Layout & Spacing

The layout is based on an **8pt grid system** to ensure mathematical consistency. 

- **Grid Strategy:** A 12-column fluid grid is used for desktop (breakpoint 1280px+), transitioning to a 4-column layout for mobile. 
- **Admin Density:** For administrative dashboards, the vertical spacing (padding/margins) is reduced by 50% (Compact Mode) to allow for high data density in tables and lists.
- **Citizen Density:** For the public-facing grievance form, a single-column centered layout (max-width 720px) is preferred to maintain focus.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface 1 (Background):** #F9FAFB.
- **Surface 2 (Cards/Containers):** #FFFFFF with a 1px border (#E5E7EB).
- **Elevation - Low:** For interactive cards, a subtle 2px blur shadow with 5% opacity is used on hover to indicate tactility.
- **Elevation - High:** Reserved for modals and dropdown menus, using a 12px blur shadow at 10% opacity.
- **AI Surfaces:** Elements containing AI-generated data use a very subtle indigo-tinted background (#F5F3FF in light mode) to differentiate them from manual user inputs.

## Shapes

The design system adopts a **Soft** shape language. 

- **Standard Radius:** 6px (rounded-md) for buttons, inputs, and small cards.
- **Large Radius:** 8px (rounded-lg) for main content containers and dashboard widgets.
- **Pill:** Reserved exclusively for status badges and tags to distinguish them from interactive buttons.
- **Borders:** A consistent 1px stroke is used for all containers to maintain a structured, professional appearance.

## Components

### Buttons
- **Primary:** Solid Civic Teal (#0D9488) with White text. No gradients.
- **Secondary:** White background with 1px gray border and Charcoal text.
- **Ghost:** No background/border, used for "Cancel" or "Go Back" actions.

### AI Indicators
- **Confidence Tag:** A small badge containing a spark icon (Lucide) followed by a percentage (e.g., "AI 94%"). 
- **Theming:** Uses a soft violet/indigo border and text to separate machine intelligence from human-verified data.

### Inputs & Selects
- Inputs must have persistent labels (not just placeholders). 
- Active states use a 2px primary teal ring with a 1px offset for accessibility.

### Tables (Admin)
- **Header:** Sticky, using a light gray background (#F3F4F6) with uppercase label-sm typography.
- **Rows:** Alternating zebra-striping is prohibited; use 1px bottom borders for clarity instead.
- **Cells:** High density; 8px vertical padding in admin views.

### Status Badges
- **Critical:** Red background (10% opacity) with Red text.
- **Pending:** Amber background (10% opacity) with Amber text.
- **Resolved:** Teal background (10% opacity) with Teal text.

### Iconography
- Use **Lucide** icons.
- Stroke width: 2px for standard UI icons, 1.5px for large illustrative icons.
- Avoid multi-color icons; maintain a single-color (Charcoal or Primary) approach.