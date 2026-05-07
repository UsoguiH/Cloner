---
name: Linear
description: Linear is a high-performance product development system that presents itself through a distinctly dark, austere, and deeply utilitarian interface designed to minimize visual friction.
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
  hairline: "#23252a"
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
  button-tertiary-hover:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-subtle}"
    borderColor: "{colors.ink-subtle}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-1}"
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
    textColor: "{colors.ink-subtle}"
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

Linear employs a stark, utility-first design system built around high-contrast typography and deeply atmospheric backgrounds. By stripping away extraneous visual noise, the interface focuses the user's attention entirely on the work and data at hand.

## Voice

- **Precision-driven** — The interface relies heavily on strict geometric alignment and structural borders using the Sharp Hairline Divider token to organize dense information.
- **Developer-centric** — Widespread application of Berkeley Mono for issue identifiers, metadata, and code blocks establishes a visual language native to software engineering.
- **Unobtrusive** — The atmospheric Linear Deep Canvas background combined with Crisp Primary Ink typography creates a stark reading environment devoid of decorative clutter.

## Colors

The Linear palette is anchored by deep background tones like Linear Deep Canvas and Elevated Surface Dark. Color is treated as a scarce utility, reserving the Linear Brand Accent exclusively for active states, focus rings, and essential badges.

- **Linear Deep Canvas** `#08090a` (`canvas`) — Sets the foundational atmospheric background for the Linear experience, providing deep contrast for elevated app surfaces.
- **Linear Brand Accent** `#5e6ad2` (`primary`) — Highlights key interactions and brand moments across the Linear interface, such as focus states and promotional badges.
- **Crisp Primary Ink** `#f7f8f8` (`ink`) — Drives stark legibility for primary typography across Linear, including bold hero headlines and essential interface labels.
- **Muted Secondary Ink** `#d0d6e0` (`ink-muted`) — Softens secondary typographic elements like top navigation links and standard text to establish visual hierarchy in Linear.
- **Subtle Tertiary Ink** `#8a8f98` (`ink-subtle`) — Provides low-contrast text for Linear metadata, timestamps, and subtle interface descriptors without competing for attention.
- **Deep Quaternary Ink** `#62666d` (`ink-tertiary`) — Styles the quietest typographic elements and inactive icons within the Linear workspace for minimal distraction.
- **Absolute Pure White** `#ffffff` (`on-primary`) — Ensures maximum contrast and readability for text placed within primary buttons or high-emphasis Linear components.
- **Elevated Surface Dark** `#0f1011` (`surface-1`) — Forms the primary background for elevated application panels, distinguishing the active Linear workspace from the deep canvas.
- **Interactive Dark Surface** `#3b3b3b` (`surface-2`) — Defines hover states, selected list items, and secondary floating panels within the structural Linear application interface.
- **Sharp Hairline Divider** `#23252a` (`hairline`) — Creates crisp, subtle structural borders between panes and components to organize the Linear layout without visual noise.

## Typography

Inter Variable acts as the primary interface workhorse across Linear, scaling down cleanly to 12px for subtle labels. It is deliberately paired with Berkeley Mono to systematically separate technical data and system outputs from conversational prose.

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

Linear builds its interface components with severe, rectangular geometry floating cleanly above the background canvas. Interactive elements frequently rely on Interactive Dark Surface to indicate hover states without breaking the dark atmospheric aesthetic.

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-hover-2**
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

