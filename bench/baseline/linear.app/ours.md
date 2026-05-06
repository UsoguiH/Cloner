---
name: Linear
description: "Design system extracted from a structural clone. Canvas #08090a, primary accent #5e6ad2, dominant typeface Inter Variable. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  on-primary: "#ffffff"
  ink: "#f7f8f8"
  canvas: "#08090a"
  primary: "#5e6ad2"
typography:
  button:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 500
    lineHeight: 2.75
  mono:
    fontFamily: Berkeley Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.71
  body-2:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 400
  body-sm:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  full: 9999px
  sm: 4px
  md: 5px
spacing:
  space-5: 12px
components:
  button-tertiary:
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    height: 24px
  button-secondary:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: 0px 20px
    height: 44px
  text-input:
    typography: "{typography.mono}"
    padding: 0px 32px 0px 56px
  top-nav:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    height: 73px
  nav:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    padding: 8px 14px 14px 8px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  feature-card:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    padding: 12px 12px 0px 12px
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    padding: 0px 32px
  cta-banner:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  status-badge:
    typography: "{typography.body-sm}"
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

- **on-primary** `#ffffff`
- **ink** `#f7f8f8`
- **canvas** `#08090a`
- **primary** `#5e6ad2`

## Typography

- **button** — Inter Variable 13px/400
- **body** — Inter Variable 16px/500
- **mono** — Berkeley Mono 14px/400
- **body-2** — Inter Variable 16px/400
- **body-sm** — Inter Variable 12px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **full** `9999px`
- **sm** `4px`
- **md** `5px`

## Components

- **button-tertiary**
- **button-secondary**
- **text-input**
- **top-nav**
- **nav**
- **footer**
- **feature-card**
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

