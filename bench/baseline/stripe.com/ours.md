---
name: Stripe
description: Stripe presents itself as an institutional yet cutting-edge financial infrastructure platform, balancing dense, high-utility componentry against fluid, hyper-vibrant mesh gradients and stark typographic contrast.
colors:
  canvas: "#ffffff"
  primary: "#533afd"
  ink: "#061b31"
  on-primary: "#ffffff"
  surface-1: "#f8fafd"
  surface-2: "#e5edf5"
  surface-3: "#e8e9ff"
  surface-4: "#e2e4ff"
  hairline: "#b9b9f9"
  hairline-strong: "#d6d9fc"
  surface-hover: "#e1e3ff"
typography:
  button:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 400
  display-2:
    fontFamily: sohne-var
    fontSize: 48px
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: -0.96px
  body-lg:
    fontFamily: sohne-var
    fontSize: 20px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.2px
rounded:
  xs: 4px
  md: 6px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-secondary:
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 15px 24px 16px 24px
    height: 48px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.primary}"
    borderColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.primary}"
    borderColor: "{colors.surface-hover}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 16px 24px 17px 24px
    height: 48px
  hero-section:
    typography: "{typography.display-2}"
  feature-card:
    typography: "{typography.button}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 64px
  top-nav:
    typography: "{typography.button}"
  footer:
    backgroundColor: "{colors.surface-1}"
    typography: "{typography.button}"
    padding: 0px 16px
---

# Stripe

## Overview

Stripe relies on a foundation of stark contrasts and rigorous structural grids to organize massive amounts of technical capability. The system balances this clinical precision with striking moments of color and fluid motion, framing complex infrastructure as both reliable and distinctly modern.

## Voice

- **Technical and Precise** — The interface relies on crisp borders, stark contrasts, and utilitarian sans-serif typography like sohne-var to communicate complex financial tooling with absolute clarity.
- **Vibrantly Expressive** — Sweeping mesh gradients and the distinctive Stripe Blurple primary color inject immense energy into an otherwise restrained and functional Pure Canvas background.
- **Architecturally Dense** — Data-heavy layouts use intricate grids and subtle surface shifts like Frost Surface and Mist Surface to organize vast amounts of information without feeling overwhelming.
- **Confident** — Expansive whitespace, massive sohne-var typography at 48px, and unadorned component structures project undeniable authority in the digital economy sector.

## Colors

The Stripe color system is defined by its tension between utility and expression. Deep Ink and Pure Canvas provide high-contrast readability for dense information, while vibrant gradients and the signature Stripe Blurple draw the eye to essential interactions and product features.

- **Pure Canvas** `#ffffff` (`canvas`) — This forms the fundamental white background across Stripe interfaces, creating a stark, clean canvas for our vibrant gradients and crisp typography.
- **Stripe Blurple** `#533afd` (`primary`) — Our signature vibrant blurple drives user action across Stripe, illuminating primary buttons, key text highlights, and essential interactive moments.
- **Deep Ink** `#061b31` (`ink`) — Anchoring our typographic hierarchy, this deep midnight navy ensures maximum legibility for core headings and body copy throughout the Stripe experience.
- **Primary Foreground** `#ffffff` (`on-primary`) — This pure white sits atop our vibrant primary actions, ensuring crisp contrast and immediate readability for crucial calls to action within Stripe.
- **Frost Surface** `#f8fafd` (`surface-1`) — A whisper of cool gray provides gentle structural separation for secondary sections and logo bands across the Stripe website without overwhelming the user.
- **Mist Surface** `#e5edf5` (`surface-2`) — This slightly deeper cool gray establishes clear hierarchy for nested interface elements and muted backgrounds within the broader Stripe ecosystem.
- **Soft Blurple** `#e8e9ff` (`surface-3`) — Infused with a hint of our primary brand hue, this delicate surface color gently highlights secondary interactive zones and subtle Stripe interface components.
- **Pale Lavender** `#e2e4ff` (`surface-4`) — Serving as an active background or prominent secondary surface, this muted purple ties interface components back to the core Stripe brand language.
- **Vivid Hairline** `#b9b9f9` (`hairline`) — This pigmented divider defines structural boundaries and sharp component outlines, adding a touch of Stripe character to otherwise purely functional borders.
- **Muted Hairline** `#d6d9fc` (`hairline-strong`) — We rely on this softer structural rule to separate content blocks and delineate subtle card edges without distracting from core Stripe messaging.
- **Interactive Lavender** `#e1e3ff` (`surface-hover`) — Responding to user intent, this interactive shade provides immediate, tactile feedback when hovering over secondary actions across the Stripe platform.

## Typography

Utilizing the sohne-var family across the board, Stripe establishes a typographic hierarchy that feels both editorial and sharply technical. From commanding 48px display headings to crisp 16px interactive elements, the type system prioritizes uncompromised legibility.

- **button** — sohne-var 16px/400
- **display-2** — sohne-var 48px/300
- **body-lg** — sohne-var 20px/300

## Layout

Generous framing acts as a critical structural tool across the Stripe platform. Wide padding around distinct interface modules ensures that densely packed feature sets, code snippets, and integration charts breathe comfortably within the layout.

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `4px`
- **md** `6px`

## Components

Interactive elements on Stripe are highly systematic, relying on precise spacing, subtle background shifts like Soft Blurple, and crisp borders delineated by Muted Hairline to define boundaries. Cards and interactive modules favor flat surfaces and sharp outlines over heavy shadows or excessive ornamentation.

- **button-tertiary**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **button-primary**
- **hero-section**
- **feature-card**
- **cta-banner**
- **nav**
- **top-nav**
- **footer**

## Do's and Don'ts

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Responsive Behavior

Single-viewport (1280×800) harvest. Per-breakpoint behavior is deferred to Phase 5.

## Iteration Guide

Regenerate from a fresh clone via `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Pseudo-states (`:hover`, `:focus`) not yet captured.
- Elevation/box-shadow tokens not emitted.
- Single-viewport snapshot — responsive scales pending.

