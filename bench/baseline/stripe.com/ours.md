---
name: Stripe
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #533afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  ink-muted: "#000000"
  primary: "#533afd"
  canvas: "#ffffff"
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
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
  button-secondary:
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 15px 24px 16px 24px
    height: 48px
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
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 64px
  top-nav:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
  footer:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    padding: 0px 16px
---

# Stripe

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #533afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **ink-muted** `#000000`
- **primary** `#533afd`
- **canvas** `#ffffff`

## Typography

- **button** — sohne-var 16px/400
- **display-2** — sohne-var 48px/300
- **body-lg** — sohne-var 20px/300

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `4px`
- **md** `6px`

## Components

- **button-tertiary**
- **button-secondary**
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

