---
name: Notion
description: Notion presents a unified, document-centric workspace that pairs stark, utilitarian foundations with subtle moments of hand-drawn whimsy.
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

The Notion design system balances the quiet utility of a blank page with the structured rigidity of a database. By prioritizing stark contrasts, highly legible typography, and modular components, the interface provides an unopinionated foundation that adapts to any workflow.

## Voice

- **Utilitarian** — The interface relies on a stark pairing of Clean Canvas and Notion Charcoal, stripping away superficial styling to prioritize the user's raw information.
- **Whimsical** — Hand-drawn character illustrations and playful spot graphics inject a distinct, human warmth into an otherwise highly structural application.
- **Modular** — Distinct interface cards defined by Structured Border and Subtle Wash reinforce the underlying block-based architecture of the product.
- **Editorial** — The prominent use of classic serif typography for pull quotes creates an elevated, reading-focused environment reminiscent of printed media.

## Colors

Notion's palette acts as a quiet stage for user content. Relying heavily on a Clean Canvas and Notion Charcoal, the system deploys Absolute Black strictly for maximum contrast, while leaning on Subtle Wash to create gentle hierarchy without introducing visual noise.

- **Clean Canvas** `#ffffff` (`canvas`) — The pure white foundation that underpins Notion's signature document-centric interface, providing maximum clarity and focus.
- **Notion Charcoal** `#191918` (`primary`) — Our foundational dark charcoal anchors typography and core structural elements, ensuring readability without the harshness of pure black.
- **Absolute Black** `#000000` (`ink`) — Reserved for moments of absolute contrast, providing stark definition for key interface moments within the Notion ecosystem.
- **Muted Slate** `#615d59` (`ink-muted`) — A supportive slate tone used for metadata, secondary navigation, and subtle icons that shouldn't compete with primary user content.
- **Contrast White** `#ffffff` (`on-primary`) — The crisp, legible white engineered specifically to maintain perfect contrast when placed atop our darkest primary surfaces.
- **Subtle Wash** `#f6f5f4` (`hairline`) — A delicate, warm off-white that creates the softest structural dividers and subtle background washes within our editor.
- **Structured Border** `#dddddd` (`hairline-strong`) — Provides a definitive but unobtrusive boundary for distinct interface components like cards and stronger structural lines.
- **Elevated Charcoal** `#31302e` (`surface-hover`) — A lifted dark tone utilized for interactive hover states and secondary dark surfaces to create a subtle sense of depth.
- **Focused Slate** `#494744` (`ink-focus`) — A deliberate mid-tone gray deployed for focused interactive elements and tertiary typographic hierarchy across the application.

## Typography

Driven by the NotionInter family, the typographic system is engineered for dense information architecture and comfortable long-form reading. Ranging from precise 16px interactive elements to commanding 42px headlines, the type scale establishes immediate, clear structural hierarchy.

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

Components in Notion are treated as tactile, interlocking blocks. Encased in soft-cornered containers and defined by a Structured Border, interactive elements maintain definitive boundaries without feeling harsh or overly rigid against the primary canvas.

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

