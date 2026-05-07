---
name: Linear
description: Linear is a precision-focused tool for product teams that presents its interface as a deep, low-noise environment, elevating issue tracking and development workflows through stark contrasts and uncompromising typographic rigor.
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

Linear's visual language is built around focus and speed. By stripping away extraneous ornament and relying on a deep, dark canvas, the interface directs total attention to the tasks, code, and project metadata that matter most to product teams.

## Voice

- **Precision-engineered** — The interface relies on crisp Structural Divider lines and exact alignment, framing complex data views with mechanical rigor.
- **Quietly confident** — By utilizing a Deep Canvas background rather than bright colors, Linear lets the actual work and wireframe-like diagrams speak for themselves.
- **Developer-native** — The inclusion of Berkeley Mono for code snippets and inline chips reflects a direct nod to the primary tools and environments of software engineers.
- **High-contrast** — Luminous Ink typography cuts sharply against the dark surfaces, ensuring readability is paramount even in dense, data-heavy views.

## Colors

The palette is intentionally constrained, anchored by a Deep Canvas background and layered Elevated Surfaces. Accent Indigo acts as a sparse, deliberate signal to draw the eye toward active states and critical metadata without overwhelming the dark environment.

- **Deep Canvas** `#08090a` (`canvas`) — Sets the foundation for the Linear interface, providing an infinite, deep backdrop for product and marketing experiences.
- **Accent Indigo** `#5e6ad2` (`primary`) — Acts as a focused accent color across the Linear brand, drawing attention to status indicators and key interactive elements.
- **Luminous Ink** `#f7f8f8` (`ink`) — Provides stark, crisp contrast for primary typography and essential headings against Linear's deep canvas.
- **Muted Silver** `#d0d6e0` (`ink-muted`) — Supports secondary typographic hierarchy across the Linear interface, ensuring readability while gracefully receding from the primary focus.
- **Subtle Slate** `#8a8f98` (`ink-subtle`) — Guides the user's eye through Linear metadata, supplementary descriptions, and interface labels without competing with core content.
- **Deep Slate** `#62666d` (`ink-tertiary`) — Grounds the deepest levels of the Linear typographic hierarchy, reserved for minor timestamps, inactive states, and quiet details.
- **Absolute White** `#ffffff` (`on-primary`) — Delivers absolute contrast for critical interaction points and high-emphasis components within the Linear product ecosystem.
- **Elevated Surface** `#0f1011` (`surface-1`) — Defines the primary layer of elevation for Linear application panels, sidebars, and structured containers above the core canvas.
- **Tactile Surface** `#3b3b3b` (`surface-2`) — Distinguishes active surfaces, inline code chips, and elevated hover states to create tactile depth within the Linear application hierarchy.
- **Structural Divider** `#23252a` (`hairline`) — Organizes the application layout with crisp, subtle borders that delineate panes and sections without introducing visual noise to the Linear app.

## Typography

Inter Variable handles the structural hierarchy of the interface, providing geometric legibility from small metadata labels up to striking Luminous Ink headers. Berkeley Mono supports this foundation by signaling technical data and code-level precision.

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

UI elements within Linear favor stark utility over decorative depth. Tactile Surface chips, sparse buttons, and tightly constructed data tables integrate seamlessly into the background, revealing complexity only when interacted with.

- **button-tertiary**
- **button-tertiary-hover**
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

