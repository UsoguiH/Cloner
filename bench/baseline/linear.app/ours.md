---
name: Linear
description: Linear is an issue tracking and product development system that presents a meticulously engineered, dark-themed interface optimized for deep focus and high-velocity work.
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

Linear’s design system is a study in purposeful constraint, built entirely around high-contrast legibility and developer-focused utility. By relying on a stark dark canvas and rigid typographic hierarchy, Linear establishes an environment that feels less like a traditional web app and more like a native, professional IDE.

## Voice

- **Highly Engineered** — The interface relies on precise geometric layouts, rigid alignment, and razor-thin Crisp Hairline borders to create a workspace that feels like a professional-grade instrument.
- **Focused** — A pervasive Linear Deep Canvas background forces the High Contrast Ink typography to the forefront, removing extraneous visual noise to center attention on the work.
- **Technical** — The integration of Berkeley Mono for code snippets alongside system-level data points reinforces a surface built specifically for developers and technical operators.
- **Confident** — Large, unadorned Inter Variable headlines command attention through stark contrast without relying on decorative illustration or vibrant marketing colors.

## Colors

The palette is decisively dark, anchored by a Linear Deep Canvas that stretches across the entire viewport. Hierarchy is established through subtle elevation using Base Interface Surface and Elevated Popover Surface layers, while a singular Linear Indigo accent is reserved strictly for interactive highlights and crucial states.

- **Linear Deep Canvas** `#08090a` (`canvas`) — Provides the infinite dark foundation for the Linear experience, establishing our signature high-contrast aesthetic.
- **Linear Indigo** `#5e6ad2` (`primary`) — Acts as our primary accent color, drawing attention to critical interactive elements and branded moments across the interface.
- **High Contrast Ink** `#f7f8f8` (`ink`) — Drives maximum legibility for primary headlines and active interface elements against our dark canvas.
- **Muted Interface Ink** `#d0d6e0` (`ink-muted`) — Softens secondary typographic elements like navigation links and list items to establish clear visual hierarchy.
- **Subtle Metadata Ink** `#8a8f98` (`ink-subtle`) — Recedes into the background for tertiary information, supporting body copy and inactive states without demanding focus.
- **Deep Recessed Ink** `#62666d` (`ink-tertiary`) — Provides the lowest level of typographic contrast for subtle timestamps and deeply nested metadata within the Linear workspace.
- **Absolute White** `#ffffff` (`on-primary`) — Ensures perfect crispness and absolute clarity for text or icons placed directly on top of our primary indigo accents.
- **Base Interface Surface** `#0f1011` (`surface-1`) — Defines the primary elevated layers of the application, such as sidebars and main content panels, subtly lifting them from the canvas.
- **Elevated Popover Surface** `#3b3b3b` (`surface-2`) — Highlights floating interface elements like context menus, modals, and tooltips by bringing them physically closer to the user.
- **Crisp Hairline** `#23252a` (`hairline`) — Creates razor-thin structural boundaries between distinct application panes, ensuring crisp organization without visual noise.

## Typography

Inter Variable drives the entire narrative of the application, scaling effortlessly from commanding headlines to dense 12px interface labels. To support its technical audience, Linear thoughtfully integrates Berkeley Mono, creating distinct visual boundaries between conversational prose and raw code elements.

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

Linear constructs its interface components with severe precision, using Crisp Hairline borders to delineate dense tables, floating menus, and layered panes. These surfaces rely on stark contrast and rigorous padding rather than heavy shadows to maintain a feeling of high-performance utility.

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

