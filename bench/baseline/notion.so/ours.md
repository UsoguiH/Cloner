---
name: Notion
description: Notion pairs a stark, unopinionated document canvas with playful, humanistic illustrations to create a workspace that feels both rigorously structured and distinctly personal.
colors:
  canvas: "#ffffff"
  primary: "#191918"
  ink: "#000000"
  ink-muted: "#615d59"
  on-primary: "#ffffff"
  hairline: "#f6f5f4"
  hairline-strong: "#dddddd"
  surface-hover: "#31302e"
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
  md: 12px
  sm: 8px
  xs: 4px
components:
  button-tertiary:
    typography: "{typography.button-3}"
    rounded: "{rounded.md}"
  button-tertiary-hover:
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.ink-muted}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 6px 15px
    height: 38px
  button-secondary-hover:
    backgroundColor: "{colors.hairline}"
  button-secondary-focus:
    backgroundColor: "{colors.hairline}"
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-3}"
    rounded: "{rounded.sm}"
    height: 57px
  button-primary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-primary-focus:
    backgroundColor: "{colors.surface-hover}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.headline}"
    rounded: "{rounded.xs}"
    padding: 6px
    height: 62px
  feature-card:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-3}"
    rounded: "{rounded.md}"
    padding: 24px
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
    typography: "{typography.button-3}"
    height: 24px
---

# Notion

## Overview

Notion balances a highly utilitarian document editor with approachable warmth. The visual system leans heavily on stark monochrome foundations, injecting personality exclusively through user content and sparse, whimsical illustrations.

## Voice

- **Structured** — Crisp lines rendered in Structural Border create distinct functional boundaries across a quiet, grid-based layout.
- **Playful** — Hand-drawn illustrations and vibrant emoji accents break the rigid interface, bringing a human touch to the utilitarian software.
- **Crisp** — Typography using Pure Ink and Notion Charcoal starkly contrasts against the Workspace White canvas to guarantee maximum legibility.
- **Restrained** — The interface heavily relies on subtle foundational shades like Sidebar Wash, allowing the content itself to command primary attention.

## Colors

The Notion color palette is intentionally quiet. It anchors on Workspace White and Notion Charcoal to establish a neutral canvas, utilizing Sidebar Wash and Structural Border to map functional regions without distracting from the core document.

- **Workspace White** `#ffffff` (`canvas`) — Serves as the fundamental blank canvas for all primary document surfaces and writing spaces across Notion.
- **Notion Charcoal** `#191918` (`primary`) — Anchors the Notion interface as our primary text and deep structural color to ensure crisp legibility.
- **Pure Ink** `#000000` (`ink`) — Delivers maximum typographic contrast for critical headings and stark structural elements within the Notion app.
- **Muted Slate** `#615d59` (`ink-muted`) — Softens secondary navigation items and metadata to keep users focused on their core Notion document content.
- **Primary Knockout** `#ffffff` (`on-primary`) — Guarantees high-contrast readability for text and icons layered over deeply saturated elements in the Notion interface.
- **Sidebar Wash** `#f6f5f4` (`hairline`) — Establishes a subtle visual foundation for secondary regions like the Notion sidebar without distracting from the main canvas.
- **Structural Border** `#dddddd` (`hairline-strong`) — Creates distinct boundaries and structural dividers across the Notion interface for clear separation of functional zones.
- **surface-hover** `#31302e`
- **ink-focus** `#494744`

## Typography

Notion relies on the custom NotionInter family to establish its clean, functional aesthetic. Ranging from 16px utility text up to 42px headlines, the type system prioritizes raw legibility and a crisp hierarchy above all else.

- **button-3** — NotionInter 16px/400
- **button-4** — NotionInter 16px/500
- **headline** — NotionInter 42px/700

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **md** `12px`
- **sm** `8px`
- **xs** `4px`

## Components

Interface components in Notion operate as modular, high-contrast blocks. Cards and feature containers frequently sit on a Sidebar Wash background and utilize Structural Border outlines to define interactive boundaries clearly.

- **button-tertiary**
- **button-tertiary-hover**
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

