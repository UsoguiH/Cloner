---
name: Figma
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #697485, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#697485"
  ink: "#000000"
  ink-muted: "#131313"
  on-primary: "#ffffff"
  surface-1: "#f3ffe3"
  surface-2: "#c7f8fb"
  surface-3: "#e2e2e2"
  surface-hover: "#222222"
typography:
  button:
    fontFamily: figmaSans
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.32px
  button-6:
    fontFamily: figmaSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
  button-2:
    fontFamily: figmaSans
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.14px
  headline:
    fontFamily: figmaSans
    fontSize: 46px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.69px
rounded:
  lg: 80px
  md: 50px
spacing:
  space-4: 16px
components:
  button-tertiary:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: 32px 0px
  button-tertiary-hover:
    textColor: "{colors.ink}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-hover}"
  button-secondary:
    textColor: "{colors.ink}"
    typography: "{typography.button-6}"
    rounded: "{rounded.lg}"
    height: 47px
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  button-secondary-hover-2:
    textColor: "{colors.canvas}"
  nav:
    backgroundColor: "{colors.ink-muted}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-2}"
    height: 100px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-6}"
    height: 81px
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-6}"
    padding: 120px 0px
  text-input:
    textColor: "{colors.canvas}"
    typography: "{typography.headline}"
    padding: 0px 70px 0px 0px
    height: 54px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-4}"
    height: 40px
---

# Figma

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #697485, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}`) `#697485` — System primary; default for primary CTAs and headline emphasis.
- **On Primary** (`{colors.on-primary}`) `#ffffff` — Foreground on primary surfaces.

### Surface

- **Canvas** (`{colors.canvas}`) `#ffffff` — Default page background.
- **Surface 1** (`{colors.surface-1}`) `#f3ffe3` — Subtle elevated surface — first tier above canvas.
- **Surface 2** (`{colors.surface-2}`) `#c7f8fb` — Mid elevated surface — second tier above canvas.
- **Surface 3** (`{colors.surface-3}`) `#e2e2e2` — Highest elevated surface — third tier above canvas.
- **Surface Hover** (`{colors.surface-hover}`) `#222222` — Hover-state surface for interactive controls.

### Text

- **Ink** (`{colors.ink}`) `#000000` — All headline, body, and caption type on light surfaces.
- **Ink Muted** (`{colors.ink-muted}`) `#131313` — De-emphasized ink — body sub-copy, captions, secondary metadata.

## Typography

### Font Family

- **figmaSans** — weights 300, 400

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.button}` | 32px | 400 | 1.3 | -0.32px | — |
| `{typography.button-6}` | 16px | 400 | 1.45 | 0 | — |
| `{typography.button-2}` | 18px | 300 | 1.4 | -0.14px | — |
| `{typography.headline}` | 46px | 400 | 1.15 | -0.69px | — |

### Principles

- Type scale spans **16px → 46px** across 4 roles.
- Tight line-heights on display (≈1.15), generous on body (≈1.45). The contrast reinforces that headlines are graphics and body copy is for reading.
- Negative letter-spacing scales with size — display tightens to **-0.69px**, body stays near zero. Editorial-feeling display type without sacrificing readability.

## Layout

### Spacing System

- **Base unit**: 16px.
- **Tokens**: `{spacing.space-4}` 16px.

### Component Padding (observed)

- `{components.button-tertiary}` — 32px 0px.
- `{components.footer}` — 120px 0px.
- `{components.text-input}` — 0px 70px 0px 0px.
- `{components.button-primary}` — {spacing.space-4}.

### Whitespace Philosophy

Spacing rhythm derives from a small base unit; sections are distinguished by repeated multiples of the base rather than a single oversized rhythm constant.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.lg}` | 80px | Pricing cards, container sections, large image frames. |
| `{rounded.md}` | 50px | Form inputs, list items, image frames. |

## Components

### Buttons

**`button-tertiary`**
- text `{colors.ink}`, type `{typography.button}`, padding 32px 0px.
  - **Hover**: background `{colors.surface-hover}`, text `{colors.ink}`.

**`button-secondary`**
- text `{colors.ink}`, type `{typography.button-6}`, rounded `{rounded.lg}`, height 47px.
  - **Hover**: background `{colors.canvas}`, text `{colors.ink}`.

**`button-primary`**
- background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding `{spacing.space-4}`, rounded `{rounded.md}`, height 40px.

### Inputs & Forms

**`text-input`**
- text `{colors.canvas}`, type `{typography.headline}`, padding 0px 70px 0px 0px, height 54px.

### Navigation

**`nav`**
- background `{colors.ink-muted}`, text `{colors.canvas}`, type `{typography.button-2}`, height 100px.

### Header

**`top-nav`**
- background `{colors.canvas}`, text `{colors.ink}`, type `{typography.button-6}`, height 81px.

### Footer

**`footer`**
- background `{colors.ink}`, text `{colors.canvas}`, type `{typography.button-6}`, padding 120px 0px.

## Motion

| Tier | Duration | Probes |
|---|---|---|
| `motion.fast` | 160ms | 49 |
| `motion.medium` | 400ms | 15 |

### Easings

| Token | Curve | Probes |
|---|---|---|
| `motion.ease.ease` | `ease` | 61 |
| `motion.ease.ease-out` | `ease-out` | 48 |
| `motion.ease.custom-3` | `cubic-bezier(0.8, 0, 0.2, 1)` | 9 |

Sample transitions observed: background + border-radius at 160ms ease-out.

## Assets

### Logo

Saved at `assets/logo.svg` — 26×40.

### Favicon

Saved at `assets/favicon.png` (source: https://static.figma.com/app/icon/2/icon-256.png).

### Fonts

Downloaded next to this file — drop the `assets/fonts/` directory into your project to use them directly.

| Family | Weight | Style | File | Source |
|---|---|---|---|---|
| figmaSans | 320 | normal | `assets/fonts/2a781d23.woff2` | https://www.figma.com/_netlify/_next/static/media/7c42ed55a7834032-s.p.woff2 |
| ABCWhytePlusVariable | 400 | normal | `assets/fonts/4c63f5d7.woff2` | https://www.figma.com/_netlify/_next/static/media/17fffab3726b9623-s.p.woff2 |

## Brand principles

Quoted from the brand's own published design / principles / brand pages — not interpreted, not paraphrased.

### A faster, more efficient way of working

Figma brings together powerful design tools with multiplayer collaboration, allowing teams to explore ideas while capturing quality feedback in real time—or anytime.

_Source: https://www.figma.com/design_

### Branch off to iterate on design options

Use branching to freely explore possibilities, then bring those updates into your main design file with merging.

_Source: https://www.figma.com/design_

### Share libraries and design systems across teams.

Create reusable components, variables, and brand assets to keep your entire organization building with the same visual language.

_Source: https://www.figma.com/about_

### A creative canvas for all

Figma’s intuitive interface and features were built for the web, enabling industry experts and amateur designers alike to design with ease.

_Source: https://www.figma.com/design_

### Alignment made easy

Work together in a multiplayer, version-controlled design file, and get contextual feedback from stakeholders with commenting.

_Source: https://www.figma.com/design_

## Do's and Don'ts

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Breakpoints

Per-viewport probe metrics captured at mobile 390px / tablet 768px / desktop 1440px. Properties whose computed value differs across viewports surface here.

| Element | Property | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| `body` | `paddingTop` | 80px | 80px | 120px |
| `body` | `paddingBottom` | 80px | 80px | 120px |
| `body` | `boundingWidth` | 390 | 768 | 1440 |
| `button.fig-1ifzi4m` | `paddingRight` | 12px | 18px | 18px |
| `button.fig-1ifzi4m` | `paddingLeft` | 12px | 18px | 18px |
| `button.fig-1ifzi4m` | `boundingWidth` | 80 | 92 | 92 |
| `button.fig-1qyp2lk` | `paddingRight` | 12px | 18px | 18px |
| `button.fig-1qyp2lk` | `paddingLeft` | 12px | 18px | 18px |
| `button.fig-1qyp2lk` | `boundingWidth` | 84 | 96 | 96 |
| `button.fig-xhgx56` | `paddingRight` | 12px | 18px | 18px |
| `button.fig-xhgx56` | `paddingLeft` | 12px | 18px | 18px |
| `button.fig-xhgx56` | `boundingWidth` | 66 | 78 | 78 |
| `section.fig-11tqvy7` | `paddingTop` | 80px | 80px | 120px |
| `section.fig-11tqvy7` | `paddingBottom` | 80px | 80px | 120px |
| `section.fig-11tqvy7` | `boundingWidth` | 390 | 768 | 1440 |
| `section.fig-1hysvv2` | `paddingTop` | 80px | 80px | 120px |
| `section.fig-1hysvv2` | `paddingBottom` | 80px | 80px | 0px |
| `section.fig-1hysvv2` | `boundingWidth` | 390 | 768 | 1440 |
| `section.fig-1tdv684` | `paddingTop` | 80px | 80px | 120px |
| `section.fig-1tdv684` | `paddingBottom` | 80px | 80px | 120px |
| `section.fig-1tdv684` | `boundingWidth` | 390 | 768 | 1440 |
| `section.fig-1zs54z` | `paddingTop` | 80px | 80px | 120px |
| `section.fig-1zs54z` | `paddingBottom` | 48px | 48px | 120px |
| `section.fig-1zs54z` | `boundingWidth` | 390 | 768 | 1440 |

_57 additional probe(s) shift across viewports — see `output/screenshots/index.json` per-viewport metrics for the full set._

_Stats: 65/75 probes shift across viewports; 6 distinct properties affected._

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled). See **Breakpoints** above for token-level deltas observed across the three sampled viewports.

## Iteration Guide

Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

