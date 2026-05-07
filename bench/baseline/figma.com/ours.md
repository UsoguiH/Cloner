---
name: Figma
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #697485, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#697485"
  ink: "#000000"
  ink-muted: "#131313"
  on-primary: "#ffffff"
  surface-1: "#f3ffe3"
  surface-2: "#c7f8fb"
  surface-3: "#e2e2e2"
  surface-hover: "#222222"
typography:
  button:
    fontFamily: figmaSans
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.32px
  button-6:
    fontFamily: figmaSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
  button-2:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.14px
  headline:
    fontFamily: figmaSans
    fontSize: 46px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.69px
rounded:
  lg: 80px
  md: 50px
spacing:
  space-3: 12px
components:
  button-tertiary:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: 32px 0px
  button-tertiary-hover:
    textColor: "{colors.ink}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-hover}"
  button-secondary:
    textColor: "{colors.ink}"
    typography: "{typography.button-6}"
    rounded: "{rounded.lg}"
    height: 47px
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
  button-secondary-hover-2:
    textColor: "{colors.canvas}"
    borderColor: "{colors.canvas}"
  nav:
    backgroundColor: "{colors.ink-muted}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    height: 100px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-6}"
    height: 81px
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-6}"
    padding: 120px 0px
  text-input:
    textColor: "{colors.canvas}"
    typography: "{typography.headline}"
    padding: 0px 70px 0px 0px
    height: 54px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-3}"
    height: 40px
---

# Figma

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #697485, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#ffffff`
- **primary** `#697485`
- **ink** `#000000`
- **ink-muted** `#131313`
- **on-primary** `#ffffff`
- **surface-1** `#f3ffe3`
- **surface-2** `#c7f8fb`
- **surface-3** `#e2e2e2`
- **surface-hover** `#222222`

## Typography

- **button** — figmaSans 32px/400
- **button-6** — figmaSans 16px/400
- **button-2** — figmaSans 18px/300
- **headline** — figmaSans 46px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **lg** `80px`
- **md** `50px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-hover-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-hover-2**
- **nav**
- **top-nav**
- **footer**
- **text-input**
- **button-primary**

## Do's and Don'ts

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled). Per-breakpoint scales — phone/tablet/desktop variants — are not yet sampled; the next coverage phase will re-harvest at multiple viewport widths.

## Iteration Guide

Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

