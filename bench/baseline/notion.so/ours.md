---
name: Notion
description: Notion is a connected workspace platform that pairs stark, high-contrast utility with playful, hand-drawn accents to humanize complex information architecture.
colors:
  canvas: "#ffffff"
  primary: "#191918"
  ink: "#000000"
  ink-muted: "#31302e"
  ink-subtle: "#615d59"
  on-primary: "#ffffff"
  surface-1: "#f9f9f8"
  surface-2: "#f2f9ff"
  surface-3: "#fef3f1"
  surface-4: "#e6f3fe"
  hairline: "#f6f5f4"
  hairline-strong: "#dddddd"
  surface-hover: "#005bab"
  ink-focus: "#494744"
typography:
  button-3:
    fontFamily: NotionInter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  button-4:
    fontFamily: NotionInter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  headline:
    fontFamily: NotionInter
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: -1.5px
rounded:
  lg: 12px
  sm: 8px
  xs: 4px
components:
  button-tertiary:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  button-tertiary-hover:
    textColor: "{colors.ink-subtle}"
    borderColor: "{colors.ink-subtle}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.canvas}"
  button-tertiary-focus-2:
    backgroundColor: "{colors.canvas}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 4px 14px
    height: 36px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-3}"
    rounded: "{rounded.sm}"
    height: 57px
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
  button-primary-focus:
    backgroundColor: "{colors.ink-muted}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.headline}"
    rounded: "{rounded.xs}"
    padding: 6px
    height: 62px
  feature-card:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  status-badge:
    typography: "{typography.button-3}"
    height: 55px
  nav:
    typography: "{typography.button-3}"
    padding: 80px 125px
  top-nav:
    textColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 80px 0px 0px 0px
  footer:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-3}"
  hero-section:
    textColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 0px 0px 32px 0px
  cta-banner:
    backgroundColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 80px 32px
  pricing-card:
    backgroundColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
    padding: 32px
---

# Notion

## Overview

Notion balances the stark utility of a text editor with the structured logic of a database. The brand's visual identity relies on high-contrast, black-and-white foundations punctuated by moments of hand-drawn whimsy, ensuring dense workspaces feel both powerful and approachable.

## Voice

- **Utilitarian** — The interface relies on stark Canvas White backgrounds and Notion Core Black typography to prioritize functional legibility over ornamental design.
- **Whimsical** — Hand-drawn, sketch-like spot illustrations float across the interface, injecting a distinct sense of humanity and playfulness into dense technical workspaces.
- **Modular** — Information is tightly contained within distinct cards and grid structures separated by clear Structured Border and Soft Hairline strokes.
- **Restrained** — The application maintains a disciplined hierarchy of Pure Ink and Muted Ink to ensure complex nested databases and sidebars remain visually digestible without color fatigue.

## Colors

The palette is intentionally subdued, treating Canvas White and Notion Core Black as the primary stage for user content. Subtle spatial shifts are achieved through Sidebar Alabaster and Soft Hairline boundaries, while interactive moments are selectively signaled by Action Blue.

- **Canvas White** `#ffffff` (`canvas`) — Serves as the foundational white canvas for Notion documents and primary application interfaces.
- **Notion Core Black** `#191918` (`primary`) — Drives our primary typography and essential UI elements, anchoring the Notion brand with sharp readability.
- **Pure Ink** `#000000` (`ink`) — Provides maximum contrast for critical elements and bold structural boundaries across the interface.
- **Muted Ink** `#31302e` (`ink-muted`) — Softens secondary text and sidebar typography, creating a balanced visual hierarchy within complex workspaces.
- **Subtle Ink** `#615d59` (`ink-subtle`) — Supports metadata, timestamps, and tertiary labels to ensure background information remains quiet but legible.
- **Primary Knockout** `#ffffff` (`on-primary`) — Ensures crisp, accessible text and iconography when overlaid on deep background colors or active states.
- **Sidebar Alabaster** `#f9f9f8` (`surface-1`) — Defines the distinct but gentle background of our navigational sidebars and elevated workspace surfaces.
- **Soft Blue Surface** `#f2f9ff` (`surface-2`) — Washes specific board columns and subtle interactive states with a cool, focused tint.
- **Warm Wash** `#fef3f1` (`surface-3`) — Highlights specific organizational elements or tags within databases with a delicate, inviting warmth.
- **Highlight Blue** `#e6f3fe` (`surface-4`) — Elevates active components, selected tags, and interactive surfaces with a clear, engaging blue.
- **Soft Hairline** `#f6f5f4` (`hairline`) — Draws the most delicate boundaries between structural sections without adding visual noise to the page.
- **Structured Border** `#dddddd` (`hairline-strong`) — Establishes clear, definitive separations around cards, modals, and distinct workspace modules.
- **Action Blue** `#005bab` (`surface-hover`) — Signals interactivity and dynamic hover states for primary navigational links and core application actions.
- **Focus Graphite** `#494744` (`ink-focus`) — Guides the user's attention during keyboard navigation and active input states across the platform.

## Typography

NotionInter anchors the typographic system, delivering crisp, geometric legibility across dense data views. Bold 42px headlines establish definitive page hierarchies, while 16px structural text maintains comfortable reading within nested sidebars and table cells.

- **button-3** — NotionInter 16px/400
- **button-4** — NotionInter 16px/500
- **headline** — NotionInter 42px/700

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **lg** `12px`
- **sm** `8px`
- **xs** `4px`

## Components

Surfaces and modules are treated as distinct, stackable blocks. Containers leverage Structured Border outlines and Sidebar Alabaster fills to establish clear boundaries for tasks, calendar events, and database entries, rendering every element as a movable, discrete unit of work.

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-hover-2**
- **button-tertiary-focus-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **button-primary**
- **button-primary-hover**
- **button-primary-focus**
- **text-input**
- **feature-card**
- **status-badge**
- **nav**
- **top-nav**
- **footer**
- **hero-section**
- **cta-banner**
- **pricing-card**

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

