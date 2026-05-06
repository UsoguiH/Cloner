---
name: Figma
description: Figma is a collaborative design platform that frames its users' vibrant creations within a stark, high-contrast, and deeply structural interface.
colors:
  canvas: "#000000"
  primary: "#ffffff"
typography:
  button:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.14px
  button-2:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.09px
  button-3:
    fontFamily: figmaSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
rounded:
  xs: 50px
components:
  button-tertiary:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    height: 65px
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    rounded: "{rounded.xs}"
    padding: 8px 18px 10px 18px
    height: 43px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    rounded: "{rounded.xs}"
    padding: 8px 18px 10px 18px
    height: 43px
  nav:
    textColor: "{colors.canvas}"
    typography: "{typography.button-3}"
    height: 41px
  top-nav:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-3}"
    height: 81px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button-3}"
    padding: 120px 0px
---

# Figma

## Overview

Figma is a collaborative design platform that frames its users' vibrant creations within a stark, high-contrast, and deeply structural interface.

## Voice

- **Structural** — Figma relies on Canvas White and Core Black to build a neutral, high-contrast scaffolding that allows colorful user-generated imagery to take center stage.
- **Confident** — The stark, oversized figmaSans typography makes declarative statements across wide margins without the need for excessive visual embellishment.
- **Unobtrusive** — By utilizing subtle background shifts like the application of Mint Surface for secondary sections, Figma organizes complex feature explanations without overwhelming the page.
- **Tool-centric** — The interface frequently embeds literal UI elements, collaborative cursors, and property panels into the layout to reinforce Figma's identity as an active workspace.

## Colors

Figma uses an intentionally restrained color palette to prioritize community content. The layout leans heavily on Canvas White and Core Black to establish its foundational structure, deploying soft tints like Mint Surface only to group thematic content without disrupting the overall neutral harmony.

- **Core Black** `#000000` (`canvas`) — This deep foundational black anchors Figma's interface, driving stark contrast for primary typography and high-emphasis interactive elements.
- **Canvas White** `#ffffff` (`primary`) — Acting as our definitive structural backdrop, this pristine white gives Figma's vibrant community assets the necessary breathing room.

## Typography

Set exclusively in figmaSans, Figma scales its typography dramatically to dictate page hierarchy. The system relies on Primary Ink to ensure crisp legibility, creating severe contrast between massive hero statements and the highly functional 16px and 18px weights used for interactive components.

- **button** — figmaSans 18px/300
- **button-2** — figmaSans 18px/500
- **button-3** — figmaSans 16px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `50px`

## Components

Interactive elements in Figma are strictly standardized and highly legible. Core actions are driven by pill-shaped and rounded-rectangle buttons using precise figmaSans text settings, offering bold, unmistakable targets against the clean backgrounds.

- **button-tertiary**
- **button-secondary**
- **button-primary**
- **nav**
- **top-nav**
- **footer**

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

