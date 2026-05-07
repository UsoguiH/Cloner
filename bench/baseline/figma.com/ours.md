---
name: Figma
description: Figma frames the vibrant, chaotic energy of creative work within a pristine, highly structured interface that prioritizes clarity and stark contrast.
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

Figma balances a stark, monochromatic architectural frame with the expressive chaos of user-generated content. The system uses aggressive contrast and sharp structural boundaries to maintain order amidst highly vibrant imagery.

## Voice

- **Utilitarian** — The interface relies on stark Figma Base White and Figma Core Black to create a highly legible, no-nonsense container for complex creative workflows.
- **Confident** — Massive figmaSans headlines and oversized structural elements demonstrate a self-assured posture that avoids unnecessary ornamentation.
- **Unobtrusive** — By relying heavily on monochromatic framing, the system steps back to let colorful, varied user-generated artwork act as the primary visual focus.
- **Tool-oriented** — Crisp boundaries, dense technical mockups, and compact pill-shaped navigational controls reinforce its identity as a precision instrument for builders.

## Colors

Figma's palette is aggressively restrained, leaning almost entirely on Figma Base White and Figma Ink to define its spatial relationships. True color is deliberately withheld from the interface, delegated instead to the product screenshots and vibrant hero collages.

- **Figma Ink** `#000000` (`canvas`) — This deep foundational black drives Figma's highest-contrast moments, defining solid primary buttons and stark interface outlines.
- **Figma Base White** `#ffffff` (`primary`) — Serving as the main architectural backdrop, this pure white provides a pristine environment that allows Figma's vibrant creative assets to take center stage.
- **Figma Core Black** `#000000` (`on-primary`) — Applied to bold headlines and core navigation links, this stark black ensures maximum legibility against Figma's bright white backgrounds.

## Typography

Set exclusively in figmaSans, the typographic system scales dramatically from tight, utilitarian navigation links to massive, self-assured section headers. The deployment of Figma Core Black across varying weights establishes an unmistakable reading hierarchy without needing color cues.

- **button** — figmaSans 18px/300
- **button-2** — figmaSans 18px/500
- **button-3** — figmaSans 16px/400

## Layout

Layouts rely on generous margins and vast expanses of Figma Base White to pace the user's descent down the page. Tight internal padding within structural grids keeps complex technical mockups organized and legible.

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

