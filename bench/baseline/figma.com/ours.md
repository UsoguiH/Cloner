---
name: Figma
description: Figma presents a highly functional, unopinionated structural canvas that allows vibrant user-generated design artifacts to command absolute focus.
colors:
  canvas: "#000000"
  primary: "#ffffff"
  on-primary: "#000000"
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
  button-secondary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    borderColor: "{colors.canvas}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    rounded: "{rounded.xs}"
    padding: 8px 18px 10px 18px
    height: 43px
  button-primary-hover:
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
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

Figma presents a highly functional, unopinionated structural canvas that allows vibrant user-generated design artifacts to command absolute focus.

## Voice

- **Unopinionated Canvas** — Figma relies on Core Surface White and High Contrast Ink to build a neutral interface that frames user work rather than competing with it.
- **Typographically Driven** — The brand leverages scale and weight variations within figmaSans to establish clear informational hierarchy across dense product displays.
- **Tool-Centric** — Visuals consistently showcase the product interface itself, using annotated screenshots and inline components to demonstrate concrete capability.

## Colors

The Figma palette is deliberately restrained, using Core Surface White for primary layouts and anchoring the page with Figma True Black. This stark, high-contrast foundation ensures that essential navigational elements remain distinct while allowing vibrant user-created assets to draw the eye.

- **Figma True Black** `#000000` (`canvas`) — Figma relies on this absolute black to anchor our highest-contrast UI elements, including primary conversion buttons and bold structural foundations.
- **Core Surface White** `#ffffff` (`primary`) — This crisp white serves as the foundational light surface across the Figma experience, establishing necessary breathing room for vibrant user-generated content.
- **High Contrast Ink** `#000000` (`on-primary`) — Applied directly over our primary light surfaces, this striking black guarantees maximum legibility for Figma interface typography and essential navigation.

## Typography

Figma leans heavily on the figmaSans family to structure its marketing and product surfaces. By deploying specific weight variations like 300 and 500 at larger 18px scales, the brand maintains a crisp, legible hierarchy even when overlaid across dynamic, colorful backgrounds.

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
- **button-secondary-hover**
- **button-primary**
- **button-primary-hover**
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

