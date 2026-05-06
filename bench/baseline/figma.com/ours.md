---
name: Figma
description: "Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#000000"
  primary: "#ffffff"
typography:
  button:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.14px
  button-2:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.09px
  button-3:
    fontFamily: figmaSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
rounded:
  xs: 50px
components:
  button-tertiary:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    height: 65px
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    rounded: "{rounded.xs}"
    padding: 8px 18px 10px 18px
    height: 43px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    rounded: "{rounded.xs}"
    padding: 8px 18px 10px 18px
    height: 43px
  button-primary-focus:
    rounded: "{rounded.xs}"
  nav:
    textColor: "{colors.canvas}"
    typography: "{typography.button-3}"
    height: 41px
  top-nav:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-3}"
    height: 81px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button-3}"
    padding: 120px 0px
---

# Figma

## Overview

Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#000000`
- **primary** `#ffffff`

## Typography

- **button** — figmaSans 18px/300
- **button-2** — figmaSans 18px/500
- **button-3** — figmaSans 16px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `50px`

## Components

- **button-tertiary**
- **button-secondary**
- **button-primary**
- **button-primary-focus**
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

