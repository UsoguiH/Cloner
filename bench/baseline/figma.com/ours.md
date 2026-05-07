---
name: Figma
description: "Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#000000"
  primary: "#ffffff"
  ink: "#697485"
  on-primary: "#000000"
  surface-1: "#131313"
  surface-2: "#cb9fd2"
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
components:
  button-tertiary:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    padding: 32px 0px
  button-tertiary-hover:
    textColor: "{colors.canvas}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-hover}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-6}"
    rounded: "{rounded.lg}"
    height: 47px
  button-secondary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    borderColor: "{colors.canvas}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-6}"
    height: 24px
  button-primary-hover:
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
  nav:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.primary}"
    typography: "{typography.button-2}"
    height: 100px
  top-nav:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-6}"
    height: 81px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button-6}"
    padding: 120px 0px
  text-input:
    textColor: "{colors.primary}"
    typography: "{typography.headline}"
    padding: 0px 70px 0px 0px
    height: 54px
---

# Figma

## Overview

Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#000000`
- **primary** `#ffffff`
- **ink** `#697485`
- **on-primary** `#000000`
- **surface-1** `#131313`
- **surface-2** `#cb9fd2`
- **surface-hover** `#222222`

## Typography

- **button** — figmaSans 32px/400
- **button-6** — figmaSans 16px/400
- **button-2** — figmaSans 18px/300
- **headline** — figmaSans 46px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **lg** `80px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-hover-2**
- **button-secondary**
- **button-secondary-hover**
- **button-primary**
- **button-primary-hover**
- **nav**
- **top-nav**
- **footer**
- **text-input**

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

