---
name: Notion
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #191918, dominant typeface NotionInter. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#191918"
  ink: "#000000"
  ink-muted: "#31302e"
  ink-subtle: "#615d59"
  on-primary: "#ffffff"
  surface-1: "#f9f9f8"
  surface-2: "#f2f9ff"
  surface-3: "#fef3f1"
  surface-4: "#e6f3fe"
  hairline: "#f6f5f4"
  hairline-strong: "#dddddd"
  surface-hover: "#005bab"
  ink-focus: "#494744"
typography:
  button-3:
    fontFamily: NotionInter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  button-4:
    fontFamily: NotionInter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  headline:
    fontFamily: NotionInter
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: -1.5px
rounded:
  lg: 12px
  sm: 8px
  xs: 4px
components:
  button-tertiary:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  button-tertiary-hover:
    textColor: "{colors.ink-subtle}"
    borderColor: "{colors.ink-subtle}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.canvas}"
  button-tertiary-focus-2:
    backgroundColor: "{colors.canvas}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 4px 14px
    height: 36px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-3}"
    rounded: "{rounded.sm}"
    height: 57px
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
  button-primary-focus:
    backgroundColor: "{colors.ink-muted}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.headline}"
    rounded: "{rounded.xs}"
    padding: 6px
    height: 62px
  feature-card:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  status-badge:
    typography: "{typography.button-3}"
    height: 55px
  nav:
    typography: "{typography.button-3}"
    padding: 80px 125px
  top-nav:
    textColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 80px 0px 0px 0px
  footer:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-3}"
  hero-section:
    textColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 0px 0px 32px 0px
  cta-banner:
    backgroundColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 80px 32px
  pricing-card:
    backgroundColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
    padding: 32px
---

# Notion

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #191918, dominant typeface NotionInter. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#ffffff`
- **primary** `#191918`
- **ink** `#000000`
- **ink-muted** `#31302e`
- **ink-subtle** `#615d59`
- **on-primary** `#ffffff`
- **surface-1** `#f9f9f8`
- **surface-2** `#f2f9ff`
- **surface-3** `#fef3f1`
- **surface-4** `#e6f3fe`
- **hairline** `#f6f5f4`
- **hairline-strong** `#dddddd`
- **surface-hover** `#005bab`
- **ink-focus** `#494744`

## Typography

- **button-3** — NotionInter 16px/400
- **button-4** — NotionInter 16px/500
- **headline** — NotionInter 42px/700

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **lg** `12px`
- **sm** `8px`
- **xs** `4px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-hover-2**
- **button-tertiary-focus-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **button-primary**
- **button-primary-hover**
- **button-primary-focus**
- **text-input**
- **feature-card**
- **status-badge**
- **nav**
- **top-nav**
- **footer**
- **hero-section**
- **cta-banner**
- **pricing-card**

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

