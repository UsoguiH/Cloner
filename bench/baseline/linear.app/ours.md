---
name: Linear
description: Linear is a highly structured product development system that presents a precision-driven, high-contrast dark interface designed for focus and speed.
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

Linear sets a standard for modern product tools by marrying developer-centric precision with uncompromising design. The interface strips away distraction, relying on a strict dark canvas and highly legible typography to keep teams focused.

## Voice

- **Precision-engineered** — The interface relies heavily on rigid Stark Hairline borders and Berkeley Mono typography to evoke the feeling of a code editor.
- **High-contrast** — Sharp punches of Electric Yellow and Crisp Ink cut through the deep Linear Obsidian canvas to ensure immediate visual hierarchy.
- **Purposeful** — Decorative elements are stripped away in favor of strict grid alignments and muted, structural wireframe illustrations.
- **Unapologetic** — Bold, high-impact Inter Variable typography dominates the layout, letting the core functionality and data speak for themselves.

## Colors

The Linear palette is anchored by a deep Linear Obsidian canvas, creating a focused, dark-mode-first environment. Sparse but intentional accents of Linear Indigo and Electric Yellow are deployed to guide attention to active states and primary actions.

- **Absolute White** `#ffffff` (`on-primary`) — Pure white guarantees ultimate clarity and contrast when rendered atop high-impact components or distinct brand elements.
- **Crisp Ink** `#f7f8f8` (`ink`) — Serving as our primary text color, this crisp off-white ensures maximum legibility for hero typography and core interface data.
- **Linear Obsidian** `#08090a` (`canvas`) — This deep, almost-black hue forms the foundational backdrop of the Linear interface, creating a focused and immersive environment.
- **Linear Indigo** `#5e6ad2` (`primary`) — A vibrant, signature indigo used to sparingly draw focus to interactive accents, select links, and specialized brand moments.

## Typography

Linear relies on the mechanical clarity of Inter Variable for interface copy, establishing a clean, pragmatic hierarchy. This is paired closely with Berkeley Mono for technical data and code snippets, reinforcing the brand's builder-first identity.

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

