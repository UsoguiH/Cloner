---
name: Notion
description: Notion is a highly structured workspace platform that presents itself through a stark, document-driven canvas, utilizing sharp typography and modular interfaces to organize complex knowledge.
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
  ink-focus-2: "#dadcdd"
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
  text-input-focus:
    borderColor: "{colors.ink-focus-2}"
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

Notion’s visual identity balances the unopinionated nature of a blank document with the rigorous structure of a database. By relying on a stark, high-contrast palette and a strictly modular component architecture, the system effortlessly scales from simple text notes to complex, multi-view workflows.

## Voice

- **Document-first** — The interface prioritizes expansive Base White canvases and Notion Charcoal typography, echoing the familiar structure of a blank page waiting to be written on.
- **Character-driven** — Technical product capabilities are intentionally softened by whimsical, hand-drawn mascot illustrations that add an approachable, human layer to complex automated workflows.
- **Modular** — Information is consistently organized into rigid, standardized card containers defined by Soft Alabaster washes and Interface Divider borders to maintain layout discipline.

## Colors

The Notion palette is remarkably restrained, leaning heavily on Base White and Notion Charcoal to establish a reading-focused baseline. Subtle structural colors like Soft Alabaster and Interface Divider organize the workspace without competing with user-generated content.

- **Base White** `#ffffff` (`canvas`) — This provides the clean, uninterrupted foundation for Notion pages, giving content room to breathe.
- **Notion Charcoal** `#191918` (`primary`) — This grounds the Notion experience, acting as our dominant typographic color for main content and primary interface elements.
- **Absolute Black** `#000000` (`ink`) — Absolute black delivers uncompromising contrast for our most essential iconography and highest-hierarchy text elements within Notion.
- **Muted Slate** `#615d59` (`ink-muted`) — Serving as our secondary text color, this muted tone gracefully deprioritizes metadata and sidebar navigation in the Notion workspace.
- **Crisp Invert** `#ffffff` (`on-primary`) — This crisp white guarantees uncompromising legibility when placed over Notion's dark primary surfaces and hero sections.
- **Soft Alabaster** `#f6f5f4` (`hairline`) — We use this ultra-light wash to define secondary structural areas like the Notion sidebar without relying on heavy borders.
- **Interface Divider** `#dddddd` (`hairline-strong`) — This light gray provides structural definition, mapping out the borders and dividers within Notion's board and table views.
- **Elevated Dark** `#31302e` (`surface-hover`) — This subtle, elevated dark gray activates interactive surfaces and hover states across Notion's darker thematic components.
- **Focused Graphite** `#494744` (`ink-focus`) — Guiding the user's eye, this focused graphite tone highlights active selection states and deep interactive elements across the Notion app.
- **ink-focus-2** `#dadcdd`

## Typography

NotionInter drives the entire typographic hierarchy across the site, shifting smoothly from sturdy 42px headlines to legible, functional interface copy. The type relies on Absolute Black and Muted Slate to differentiate primary content from secondary metadata without requiring heavy structural borders.

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

Surfaces in Notion are deeply systematic, utilizing strict card containers with unified interaction patterns. This predictable containment model allows disparate features to coexist logically on the same canvas, unified by subtle states like Elevated Dark for hover activations.

- **button-tertiary**
- **button-tertiary-hover**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **button-primary**
- **button-primary-hover**
- **button-primary-focus**
- **text-input**
- **text-input-focus**
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

