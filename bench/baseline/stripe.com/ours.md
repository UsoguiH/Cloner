---
name: Stripe
description: "Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#000000"
  primary: "#ffffff"
  ink: "#425466"
  ink-muted: "#95a4ba"
  on-primary: "#000000"
  hairline: "#64748d"
  hairline-strong: "#adbdcc"
  ink-hover: "#4835db"
  ink-focus: "#5039f5"
  ink-hover-2: "#2e2b8c"
  ink-hover-3: "#3b43a9"
  ink-focus-2: "#142b55"
typography:
  button:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 400
  subhead-6:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 300
    lineHeight: 1.4
  button-5:
    fontFamily: sohne-var
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: sohne-var
    fontSize: 20px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.2px
  body-sm-3:
    fontFamily: sohne-var
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: 4px
  2xl: 8px
components:
  button-tertiary:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
  button-tertiary-hover:
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-focus}"
    borderColor: "{colors.ink-focus}"
  button-secondary:
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 16px 24px 17px 24px
    height: 48px
  button-secondary-hover:
    textColor: "{colors.ink-hover-2}"
    borderColor: "{colors.ink-hover-2}"
  button-secondary-hover-2:
    opacity: 0.878295
  button-secondary-focus-2:
    opacity: 0.878295
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
  hero-section-hover:
    textColor: "{colors.ink-hover-3}"
    borderColor: "{colors.ink-hover-3}"
  hero-section-focus:
    textColor: "{colors.ink-focus-2}"
    borderColor: "{colors.ink-focus-2}"
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-5}"
    padding: 17px 32px 19px 16px
    height: 60px
  feature-card:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    typography: "{typography.subhead-6}"
  top-nav:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
  footer:
    typography: "{typography.subhead-6}"
  pricing-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
    rounded: "{rounded.2xl}"
  status-badge:
    typography: "{typography.body-sm-3}"
    padding: 4px 10px
    height: 24px
  testimonial-card:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
  text-input:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.subhead-6}"
    padding: 11px 17px
    height: 68px
---

# Stripe

## Overview

Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#000000`
- **primary** `#ffffff`
- **ink** `#425466`
- **ink-muted** `#95a4ba`
- **on-primary** `#000000`
- **hairline** `#64748d`
- **hairline-strong** `#adbdcc`
- **ink-hover** `#4835db`
- **ink-focus** `#5039f5`
- **ink-hover-2** `#2e2b8c`
- **ink-hover-3** `#3b43a9`
- **ink-focus-2** `#142b55`

## Typography

- **button** — sohne-var 16px/400
- **subhead-6** — sohne-var 16px/300
- **button-5** — sohne-var 15px/400
- **body-lg** — sohne-var 20px/300
- **body-sm-3** — sohne-var 12px/500

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **sm** `4px`
- **2xl** `8px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-focus**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-hover-2**
- **button-secondary-focus-2**
- **hero-section**
- **hero-section-hover**
- **hero-section-focus**
- **button-primary**
- **feature-card**
- **cta-banner**
- **nav**
- **top-nav**
- **footer**
- **pricing-card**
- **status-badge**
- **testimonial-card**
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

