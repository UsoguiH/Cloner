---
name: Figma
description: Figma is a collaborative design platform that frames its interface with a stark, high-contrast visual system, allowing vibrant user creations to take center stage.
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

Figma anchors its brand identity in restraint. By pairing an unyielding monochrome foundation with crisp figmaSans typography, the platform creates an environment that feels simultaneously authoritative and entirely out of the way.

## Voice

- **Utilitarian** — The interface relies on a rigorous application of figmaSans and stark Midnight Ink text to prioritize clarity over decoration.
- **Unobtrusive** — By grounding the layout in expansive Figma White backgrounds, the brand ensures that complex, colorful interface mockups naturally draw the eye.
- **Confident** — Figma uses uncompromising Solid Ink blocks for primary actions, projecting quiet authority through deliberate, high-contrast focal points.

## Colors

The Figma color system is fiercely monochromatic, designed to step back from the work it holds. Figma White provides an expansive backdrop, while Midnight Ink and Solid Ink deliver maximum contrast for typography and critical interface elements.

- **Solid Ink** `#000000` (`canvas`) — Solid Ink grounds Figma's high-contrast interface elements, appearing in stark primary buttons and defining architectural borders.
- **Figma White** `#ffffff` (`primary`) — Figma White serves as the expansive, neutral stage across our digital properties, allowing vibrant design artifacts to breathe.
- **Midnight Ink** `#000000` (`on-primary`) — This uncompromising black drives our primary typography, delivering maximum legibility and sharp contrast across the Figma brand.

## Typography

figmaSans drives the entire typographic hierarchy across the platform. Set predominantly in Midnight Ink, this single-family approach unifies everything from stark editorial headlines to precise, functional button labels.

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

Interface components emphasize sharp utility and rigid structure. Navigation items and core buttons, grounded in Solid Ink and figmaSans, maintain a functional profile while offering clear, predictable interaction patterns.

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

