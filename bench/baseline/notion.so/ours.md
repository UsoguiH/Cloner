---
name: Notion
description: Notion presents as a highly structured, utilitarian workspace, anchoring its complex document and project capabilities in a stark canvas that is intentionally softened by playful, hand-drawn brand illustrations.
colors:
  canvas: "#ffffff"
  hairline: "#f6f5f4"
  surface-1: "#02093a"
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
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 6px 15px
    height: 38px
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-3}"
    rounded: "{rounded.sm}"
    height: 57px
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
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 0px 0px 32px 0px
  cta-banner:
    typography: "{typography.button-3}"
    height: 24px
---

# Notion

## Overview

Notion balances strict utility with approachable warmth. The design system contrasts heavily structured, monochromatic application surfaces against bold, illustrative marketing moments set in Midnight Navy.

## Voice

- **Utilitarian** — The interface relies heavily on Canvas White backgrounds and Notion Core Black typography to prioritize content organization and structural clarity over decorative flair.
- **Approachable** — Sketchy, hand-drawn vector loops and floating icons in the Midnight Navy hero sections inject warmth and humanity into an otherwise rigid, tool-centric system.
- **Modular** — The layout leans on tight bento-box grids and distinct card components set against Structure Mist to compartmentalize dense feature lists and use cases.
- **Confident** — Heavy 700-weight NotionInter headlines are used to make stark, declarative statements that command attention without relying on loud accent colors.

## Colors

The palette is intentionally restrained to prioritize the user's content. Canvas White and Structure Mist build the foundational workspace, while Secondary Ink and Absolute Black handle typographic hierarchy. Midnight Navy is reserved strictly for high-impact hero sections, acting as a clear boundary between the marketing narrative and the product experience.

- **Canvas White** `#ffffff` (`canvas`) — Serves as the primary structural background for the Notion editor and document pages, creating a clean environment for focused work.
- **Structure Mist** `#f6f5f4` (`hairline`) — Defines subtle boundaries and secondary structural surfaces like the app sidebar and promotional banners without overpowering the main canvas.
- **Midnight Navy** `#02093a` (`surface-1`) — Drives the bold aesthetic of Notion's marketing hero sections and anchors the visual narrative for overarching brand moments.

## Typography

Driven entirely by the NotionInter family, the typographic system is pragmatic and highly legible. It relies on stark weight contrasts—from 400-weight interactive buttons to 700-weight headlines—to organize dense information and establish clear reading patterns without introducing structural clutter.

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

The brand relies on prominent card structures and dense bento grids to organize features, integrations, and calculators. Often set against Structure Mist backgrounds, these modules use sharp internal boundaries to maintain a rigid, predictable rhythm as users scroll.

- **button-tertiary**
- **button-secondary**
- **button-primary**
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

