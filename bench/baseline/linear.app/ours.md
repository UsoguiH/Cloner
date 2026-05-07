---
name: Linear
description: "Design system extracted from a structural clone. Canvas #08090a, primary accent #5e6ad2, dominant typeface Inter Variable. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#08090a"
  primary: "#5e6ad2"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  on-primary: "#ffffff"
  surface-1: "#0f1011"
  surface-2: "#3b3b3b"
  surface-3: "#474747"
  hairline: "#23252a"
  hairline-strong: "#2f2f31"
  hairline-tertiary: "#5c5d5f"
  ink-hover: "#666a71"
  surface-hover: "#5e69c1"
  ink-hover-2: "#34343a"
typography:
  button:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.182px
  button-4:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 500
  mono:
    fontFamily: Berkeley Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.71
  body-2:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 400
  body-sm-2:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xl: 8px
  full: 9999px
  sm: 4px
  md: 5px
spacing:
  space-5: 16px
components:
  button-tertiary:
    textColor: "{colors.ink-subtle}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 0px 5px 0px 2px
    height: 36px
  button-tertiary-hover:
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-subtle}"
    borderColor: "{colors.ink-subtle}"
  button-secondary:
    typography: "{typography.button-4}"
    rounded: "{rounded.full}"
    padding: 0px 18px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
  text-input:
    typography: "{typography.mono}"
    padding: 0px 32px 0px 56px
  top-nav:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    height: 73px
  nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  feature-card:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  feature-card-hover:
    backgroundColor: "{colors.hairline}"
    borderColor: "{colors.ink-hover-2}"
  feature-card-focus:
    backgroundColor: "{colors.hairline}"
    borderColor: "{colors.ink-hover-2}"
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    padding: 0px 32px
  cta-banner:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  status-badge:
    textColor: "{colors.ink-subtle}"
    typography: "{typography.body-sm-2}"
    rounded: "{rounded.sm}"
    padding: 0px 6px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-5}"
    height: 40px
---

# Linear

## Overview

Design system extracted from a structural clone. Canvas #08090a, primary accent #5e6ad2, dominant typeface Inter Variable. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#08090a`
- **primary** `#5e6ad2`
- **ink** `#f7f8f8`
- **ink-muted** `#d0d6e0`
- **ink-subtle** `#8a8f98`
- **ink-tertiary** `#62666d`
- **on-primary** `#ffffff`
- **surface-1** `#0f1011`
- **surface-2** `#3b3b3b`
- **surface-3** `#474747`
- **hairline** `#23252a`
- **hairline-strong** `#2f2f31`
- **hairline-tertiary** `#5c5d5f`
- **ink-hover** `#666a71`
- **surface-hover** `#5e69c1`
- **ink-hover-2** `#34343a`

## Typography

- **button** — Inter Variable 14px/500
- **button-4** — Inter Variable 13px/500
- **mono** — Berkeley Mono 14px/400
- **body-2** — Inter Variable 16px/400
- **body-sm-2** — Inter Variable 12px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xl** `8px`
- **full** `9999px`
- **sm** `4px`
- **md** `5px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-focus**
- **button-tertiary-hover-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **text-input**
- **top-nav**
- **nav**
- **footer**
- **feature-card**
- **feature-card-hover**
- **feature-card-focus**
- **hero-section**
- **cta-banner**
- **status-badge**
- **button-primary**

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

