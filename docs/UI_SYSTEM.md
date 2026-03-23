# UI System

This document defines the current Slotly 1.0 visual and UX direction. Read it when you design or revise screens, shared components, copy patterns, spacing, or interaction behavior. It is not a component inventory, but a stable style guide for product-facing UI work.

Contents:
- Design principles
- Visual system
- Typography and spacing
- Interaction patterns
- Screen and component conventions

## Design Principles

- clarity over decoration
- function over show effects
- calm, bright surfaces with strong readability
- mobile-first layouts that are understandable without explanation
- consistent spacing and hierarchy across screens
- read-only content must not look interactive

## Visual Direction

The current UI direction is a restrained light interface with dark graphite accents.

Characteristics:

- calm, professional, and modern
- minimal rather than playful
- soft panels on light backgrounds
- subtle borders and restrained shadows
- rounded corners without a soft toy-like appearance

## Color Roles

Colors are defined by roles instead of one-off values so the theme can evolve without breaking UI consistency.

Primary roles:

- `background`
- `surface`
- `surfaceSoft`
- `border`
- `textPrimary`
- `textSecondary`
- `accent`
- `accentSoft`
- `shadow`

Guidelines:

- keep most surfaces bright and quiet
- use accent color functionally, not decoratively
- prefer contrast, tone, and text over a large status color palette

## Typography

Typography should stay practical and highly legible.

Guidelines:

- use system or native platform fonts
- keep headings clear and compact
- avoid decorative type treatment
- make body text readable on small mobile screens without zoom

Recommended hierarchy:

- `title`: 28-32 px
- `sectionTitle`: 18-20 px
- `body`: 15-16 px
- `meta`: 12-13 px

## Radius, Borders, And Shadows

Recommended radius scale:

- `radiusLarge`: 20
- `radiusMedium`: 16
- `radiusSmall`: 12

Guidelines:

- borders are the primary structure tool
- shadows are optional and always subordinate
- combine border and shadow only when the border remains visually dominant

## Spacing System

Preferred spacing scale:

- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`

Guidelines:

- use `16` as the default panel interior spacing
- use `24` or `32` between major screen sections
- avoid arbitrary one-off spacing values when a system step fits

## Interaction Patterns

- links must clearly read as navigation or actions
- buttons must look like buttons
- accent color should indicate interaction or active state, not decoration
- avoid noisy animation and visual jumping
- prefer subtle contrast or surface changes over loud motion

## Screen Conventions

### Panels And Cards

- `surface` background
- clear title area
- compact, readable content
- no decorative overload

### Calendar And Timeline Surfaces

- compact and legible time presentation
- quiet surfaces with clear status differences
- available, booked, and inactive states should be understandable without becoming visually loud

### Settings And Forms

- group related controls in calm containers
- use clear section titles
- keep helper text secondary but readable
- preserve obvious affordances for toggles, links, and actions

## Future Theme Work

The design system should remain compatible with:

- dark mode
- configurable accent colors

New UI work should use semantic roles so future theming does not require a structural restyle.
