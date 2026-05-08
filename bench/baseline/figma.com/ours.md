---
name: Figma
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #697485, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#697485"
  ink: "#000000"
  ink-muted: "#131313"
  on-primary: "#ffffff"
  block-mint-green: "#f3ffe3"
  block-sky: "#c7f8fb"
  surface-1: "#e2e2e2"
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
- **Block Mint Green** (`{colors.block-mint-green}`) `#f3ffe3` — Signature pastel section block; used for full-width brand-color story sections.
- **Block Sky** (`{colors.block-sky}`) `#c7f8fb` — Signature pastel section block; used for full-width brand-color story sections.
- **Surface 1** (`{colors.surface-1}`) `#e2e2e2` — Subtle elevated surface — first tier above canvas.
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

### Note on Font Substitutes

If implementing without access to `figmaSans`, suitable open-source substitutes are **Inter** (or **Geist**) for the sans. Variable-weight subs match the fine-grained weight axis these brands use; expect to manually adjust line-heights by ±0.02 to compensate for x-height differences.

## Layout

### Spacing System


| Token | Value | Wired to components |
|---|---|---|
| `{spacing.space-1}` | 4px | — |
| `{spacing.space-2}` | 8px | — |
| `{spacing.space-3}` | 10px | — |
| `{spacing.space-4}` | 16px | yes |
| `{spacing.space-5}` | 21px | — |
| `{spacing.space-6}` | 40px | — |
| `{spacing.space-7}` | 70px | — |
| `{spacing.space-8}` | 120px | — |

### Component Padding (observed)

- `{components.button-tertiary}` — 32px 0px.
- `{components.footer}` — 120px 0px.
- `{components.text-input}` — 0px 70px 0px 0px.
- `{components.button-primary}` — {spacing.space-4}.

### Grid & Container

- Max content width sits around **1440px** at the desktop breakpoint — beyond which the layout stops growing and side gutters absorb extra width.
- Side gutters scale from desktop down to **390px** mobile; layout collapses to a single column at the smaller breakpoint.

### Whitespace Philosophy

White space is a primary structural lever — major sections separate by ~**120px** of breathing room, letting each block read as a deliberate poster rather than a wall of copy.

## Elevation & Depth

This brand expresses depth through **color blocks** rather than shadows. No `box-shadow` tokens were harvested — sections separate by transitioning between canvas and one of the `{colors.block-*}` tints.

### Decorative Depth

- **Color-block sections** are the primary depth device. The change from canvas to `{colors.block-mint-green}` / `{colors.block-sky}` is the section break.
- Elevation is **flat and saturated**, not soft and shadowed — typical card stacks read as collage rather than physical layering.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.lg}` | 80px | Pricing cards, container sections, large image frames. |
| `{rounded.md}` | 50px | Form inputs, list items, image frames. |

### Photography & Illustration Geometry

- No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.

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

## Voice

Deterministic analysis of the brand's own published copy from the **Brand principles** sources above. Numbers reflect the actual harvested corpus, not interpretation.

- Sentences average **13 words** — medium-cadence — long enough to make an argument, short enough to read aloud without losing the reader.
- Second-person dominates ("you", "your" — **2** mentions vs **0** "we" mentions): the copy speaks **at the reader**, framing every claim around what they get.
- **3 of 10** sentences open with an imperative verb (Build, Bring, Create, Make…). The voice is **action-leading** — the reader is invited to do something on almost every beat.
- Zero exclamation marks, zero questions across the corpus — the register is **measured and confident**, never breathless or interrogative.
- Lexicon hot-spots (used ≥ 2× in the brand-principles corpus): **together** (×2), **multiplayer** (×2), **explore** (×2), **feedback** (×2). Re-use these words in adjacent product copy and the voice will read continuous with the published brand.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don't use it as a decorative accent.
- When introducing a story section, choose **one** color block from the `{colors.block-*}` family (2 available) and let it span full content width with `{rounded.lg}` corners.
- Keep type in `figmaSans` at variable weights — pick from 300, 400 to express hierarchy.
- Allow the page to **return to canvas** between every two color blocks so each block reads as deliberate.
- Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.

### Don't

- Don't add drop shadows to color-block sections — the color is the depth device.
- Don't introduce new accent colors outside the documented `{colors.block-*}` palette.
- Don't combine more than one color block visible inside a single viewport — let canvas separate them.
- Don't hardcode hex values in product code — reference tokens via `{colors.*}` / `{typography.*}` so the system stays the single source of truth.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled).

### Breakpoints

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

### Touch Targets

- **Pill / pill-tab button** — `{components.button-secondary}` resting height **47px**, meets the 44px iOS / 48dp Android tap-target minimum.
- **Form input** — `{components.text-input}` resting height **54px**, meets the 44px iOS / 48dp Android tap-target minimum.

### Collapsing Strategy

- Below ~390px, multi-item top-nav collapses to a hamburger / drawer pattern — the inline links don't fit alongside logo + CTAs at narrower widths.
- Multi-column grids (pricing tiers, feature cards, customer logos) step down through the **1440px → 768px → 390px** viewport set: 4-up at desktop typically becomes 2-up at tablet and 1-up (stacked) on mobile.
- Footer column groups stack vertically below ~390px; on wider viewports they sit side-by-side with consistent inter-group spacing.

### Image Behavior

- **Logo** ships as SVG (`assets/logo.svg`, 26×40) — scales lossless across every breakpoint, no @1x/@2x asset swaps required.
- **Favicon** is `PNG` (`assets/favicon.png`) — keep the on-page logo and the favicon visually anchored to the same wordmark so the browser-tab silhouette reads as the brand.

## Iteration Guide

1. Focus on ONE component at a time and reference it by its `components:` token name (e.g., `{components.button-tertiary}`, `{components.button-tertiary-hover}`).
2. When introducing a new section, decide **first** which `{colors.block-*}` token it sits on; the surface choice is the most consequential decision.
3. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
4. Add new variants as separate component entries (`-hover`, `-focus`, `-pressed`, `-selected`) — do not bury them in prose.
5. Keep `{colors.primary}` scarce. If two primary actions appear in the same viewport, the section is doing too much — neutralize one to a secondary variant.
6. Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

