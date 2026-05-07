---
name: Figma
description: Figma frames the vibrant reality of the design process within a stark, high-contrast canvas that prioritizes the user's work over the platform's chrome.
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

Figma operates as a gallery wall for the creative process. By employing a brutally simple structural aesthetic, the brand allows the vibrant, messy reality of product design to command focus.

## Voice

- **Utilitarian** — The interface relies heavily on Stark Brand Black and Core Canvas White, stripping away unnecessary chrome to elevate the actual work being done.
- **Playful** — Scattered, overlapping project cards and brightly colored floating UI elements juxtapose against the platform's otherwise severe structural grid.
- **Confident** — Massive structural statements set in unadorned figmaSans command attention without relying on heavy decorative marketing embellishments.

## Colors

The Figma palette is intentionally quiet. Core Canvas White and Stark Brand Black provide an uncompromising frame, while delicate background tints like Pale Mint Wash are used sparingly to anchor complex feature sections.

- **Core Canvas White** `#ffffff` (`canvas`) — The foundational pure white that serves as the infinite canvas for Figma's vibrant marketing content.
- **Muted Interface Slate** `#697485` (`primary`) — A supportive slate gray applied to secondary navigation labels and subtle interface iconography across Figma properties.
- **Stark Brand Black** `#000000` (`ink`) — Figma's uncompromising core black, anchoring our primary typographic hierarchy and boldest call-to-action buttons.
- **Softened Carbon** `#131313` (`ink-muted`) — A deeply saturated charcoal providing a slightly softer read for extended text or heavy structural elements within the Figma experience.
- **High-Contrast White** `#ffffff` (`on-primary`) — A stark white employed strictly for text and icons resting atop Figma's darkest or most vibrant interactive components.
- **surface-1** `#f3ffe3`
- **surface-2** `#c7f8fb`
- **Structural Light Gray** `#e2e2e2` (`surface-3`) — A functional, neutral light gray grounding secondary interactive elements like Figma's carousel controls and subtle borders.
- **surface-hover** `#222222`

## Typography

Set entirely in figmaSans, the typographic system relies on scale over weight to establish clear hierarchy. Headlines up to 46px cut through the layout in clean formats, mirroring the straightforward utility of a text editor.

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

