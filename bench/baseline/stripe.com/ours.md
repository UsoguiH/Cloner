---
name: Stripe
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#643afd"
  ink: "#425466"
  ink-muted: "#7d8ba4"
  on-primary: "#ffffff"
  block-periwinkle: "#e5edf5"
  surface-1: "#f8fafd"
  surface-2: "#f6f9fc"
  surface-3: "#e6ebf1"
  hairline: "#b9b9f9"
  hairline-strong: "#e2e4ff"
  hairline-tertiary: "#e7ecf1"
  ink-hover: "#4835db"
  ink-focus: "#533afc"
  surface-hover: "#e1e3ff"
  ink-hover-2: "#8b86e6"
  ink-focus-2: "#4c37e6"
  ink-focus-3: "#a19eef"
  ink-hover-3: "#25357a"
typography:
  button:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 400
  button-5:
    fontFamily: sohne-var
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  subhead-6:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 300
    lineHeight: 1.4
  body-lg:
    fontFamily: sohne-var
    fontSize: 20px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.2px
  body-sm-3:
    fontFamily: sohne-var
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.25
rounded:
  2xl: 8px
  md: 5px
spacing:
  space-3: 8px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-tertiary-hover:
    textColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-focus}"
  button-tertiary-hover-2:
    textColor: "{colors.ink-focus}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-5}"
    padding: 17px 32px 19px 16px
    height: 60px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink-focus}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink-focus}"
  button-secondary-hover-2:
    textColor: "{colors.ink}"
  button-secondary-focus-2:
    textColor: "{colors.ink-focus-2}"
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
  hero-section-hover:
    textColor: "{colors.ink-hover-3}"
  hero-section-focus:
    textColor: "{colors.ink-hover-3}"
  feature-card:
    typography: "{typography.button}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    typography: "{typography.subhead-6}"
  top-nav:
    typography: "{typography.button}"
  footer:
    typography: "{typography.subhead-6}"
  pricing-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
    rounded: "{rounded.2xl}"
  status-badge:
    typography: "{typography.body-sm-3}"
    padding: 4px 10px
    height: 24px
  testimonial-card:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.subhead-6}"
    padding: 11px 17px
    height: 68px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-3}"
    height: 40px
---

# Stripe

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}`) `#643afd` — System primary; default for primary CTAs and headline emphasis.
- **On Primary** (`{colors.on-primary}`) `#ffffff` — Foreground on primary surfaces.

### Surface

- **Canvas** (`{colors.canvas}`) `#ffffff` — Default page background.
- **Block Periwinkle** (`{colors.block-periwinkle}`) `#e5edf5` — Signature pastel section block; used for full-width brand-color story sections.
- **Surface 1** (`{colors.surface-1}`) `#f8fafd` — Subtle elevated surface — first tier above canvas.
- **Surface 2** (`{colors.surface-2}`) `#f6f9fc` — Mid elevated surface — second tier above canvas.
- **Surface 3** (`{colors.surface-3}`) `#e6ebf1` — Highest elevated surface — third tier above canvas.
- **Hairline** (`{colors.hairline}`) `#b9b9f9` — 1px borders on inputs, cards, and table dividers.
- **Hairline Strong** (`{colors.hairline-strong}`) `#e2e4ff` — 1px borders on inputs, cards, and table dividers (strong variant).
- **Hairline Tertiary** (`{colors.hairline-tertiary}`) `#e7ecf1` — 1px borders on inputs, cards, and table dividers (tertiary variant).
- **Surface Hover** (`{colors.surface-hover}`) `#e1e3ff` — Hover-state surface for interactive controls.

### Text

- **Ink** (`{colors.ink}`) `#425466` — All headline, body, and caption type on light surfaces.
- **Ink Muted** (`{colors.ink-muted}`) `#7d8ba4` — De-emphasized ink — body sub-copy, captions, secondary metadata.
- **Ink Hover** (`{colors.ink-hover}`) `#4835db` — Hover-state ink for interactive text.
- **Ink Focus** (`{colors.ink-focus}`) `#533afc` — Focus-state ink for keyboard navigation.
- **Ink Hover 2** (`{colors.ink-hover-2}`) `#8b86e6` — Hover-state ink for interactive text (tier 2 variant).
- **Ink Focus 2** (`{colors.ink-focus-2}`) `#4c37e6` — Focus-state ink for keyboard navigation (tier 2 variant).
- **Ink Focus 3** (`{colors.ink-focus-3}`) `#a19eef` — Focus-state ink for keyboard navigation (tier 3 variant).
- **Ink Hover 3** (`{colors.ink-hover-3}`) `#25357a` — Hover-state ink for interactive text (tier 3 variant).

## Typography

### Font Family

- **sohne-var** — weights 300, 400, 500

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.button}` | 16px | 400 | — | 0 | — |
| `{typography.button-5}` | 15px | 400 | 1.6 | 0 | — |
| `{typography.subhead-6}` | 16px | 300 | 1.4 | 0 | — |
| `{typography.body-lg}` | 20px | 300 | 1.4 | -0.2px | — |
| `{typography.body-sm-3}` | 12px | 500 | 1.25 | 0 | — |

### Principles

- Type scale spans **12px → 20px** across 5 roles.
- Weight axis exercised at **300, 400, 500** — modulating weight is a primary lever for hierarchy.
- Tight line-heights on display (≈1.25), generous on body (≈1.6). The contrast reinforces that headlines are graphics and body copy is for reading.

### Note on Font Substitutes

If implementing without access to `sohne-var`, suitable open-source substitutes are **Inter** (or **Geist**) for the sans. Variable-weight subs match the fine-grained weight axis these brands use; expect to manually adjust line-heights by ±0.02 to compensate for x-height differences.

## Layout

### Spacing System


| Token | Value | Wired to components |
|---|---|---|
| `{spacing.space-1}` | 1px | — |
| `{spacing.space-2}` | 4px | — |
| `{spacing.space-3}` | 8px | yes |
| `{spacing.space-4}` | 11px | — |
| `{spacing.space-5}` | 15px | — |
| `{spacing.space-6}` | 19px | — |
| `{spacing.space-7}` | 32px | — |
| `{spacing.space-8}` | 112px | — |

### Component Padding (observed)

- `{components.button-secondary}` — 17px 32px 19px 16px.
- `{components.status-badge}` — 4px 10px.
- `{components.text-input}` — 11px 17px.
- `{components.button-primary}` — {spacing.space-3}.

### Grid & Container

- Max content width sits around **1440px** at the desktop breakpoint — beyond which the layout stops growing and side gutters absorb extra width.
- Side gutters scale from desktop down to **390px** mobile; layout collapses to a single column at the smaller breakpoint.

### Whitespace Philosophy

White space is a primary structural lever — major sections separate by ~**112px** of breathing room, letting each block read as a deliberate poster rather than a wall of copy.

## Elevation & Depth

This brand expresses depth through **color blocks** rather than shadows. No `box-shadow` tokens were harvested — sections separate by transitioning between canvas and one of the `{colors.block-*}` tints.

### Decorative Depth

- **Color-block sections** are the primary depth device. The change from canvas to `{colors.block-periwinkle}` is the section break.
- Elevation is **flat and saturated**, not soft and shadowed — typical card stacks read as collage rather than physical layering.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.2xl}` | 8px | Form inputs, list items, image frames. |
| `{rounded.md}` | 5px | Small chips, sub-nav tabs. |

### Photography & Illustration Geometry

- Image frames use `{rounded.2xl}` (8px) — generous enough to feel friendly, conservative enough to read as editorial.
- Smaller decorative tiles preserve a `{rounded.md}` corner for elements that should read as physical objects (badges, sticky notes).
- No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.

## Components

### Buttons

**`button-tertiary`**
- type `{typography.button}`.
  - **Hover**: text `{colors.ink-hover}`.
  - **Focus**: text `{colors.ink-focus}`.

**`button-secondary`**
- background `{colors.canvas}`, type `{typography.button-5}`, padding 17px 32px 19px 16px, height 60px.
  - **Hover**: background `{colors.surface-hover}`, text `{colors.ink-focus}`.
  - **Focus**: background `{colors.surface-hover}`, text `{colors.ink-focus}`.

**`cta-banner`**
- type `{typography.body-lg}`, height 56px.

**`button-primary`**
- background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding `{spacing.space-3}`, rounded `{rounded.md}`, height 40px.

### Inputs & Forms

**`text-input`**
- background `{colors.canvas}`, type `{typography.subhead-6}`, padding 11px 17px, height 68px.

### Cards & Containers

**`feature-card`**
- type `{typography.button}`.

**`pricing-card`**
- background `{colors.canvas}`, text `{colors.ink}`, type `{typography.subhead-6}`, rounded `{rounded.2xl}`.

**`testimonial-card`**
- text `{colors.ink}`, type `{typography.subhead-6}`.

### Navigation

**`nav`**
- type `{typography.subhead-6}`.

### Header

**`top-nav`**
- type `{typography.button}`.

### Footer

**`footer`**
- type `{typography.subhead-6}`.

### Sections

**`hero-section`**
- text `{colors.ink}`, type `{typography.subhead-6}`.
  - **Hover**: text `{colors.ink-hover-3}`.
  - **Focus**: text `{colors.ink-hover-3}`.

### Badges & Tags

**`status-badge`**
- type `{typography.body-sm-3}`, padding 4px 10px, height 24px.

## Motion

| Tier | Duration | Probes |
|---|---|---|
| `motion.fast` | 150ms | 41 |
| `motion.medium` | 300ms | 99 |
| `motion.slow` | 600ms | 50 |

### Easings

| Token | Curve | Probes |
|---|---|---|
| `motion.ease.ease` | `ease` | 154 |
| `motion.ease.custom-2` | `cubic-bezier(0.25, 1, 0.5, 1)` | 47 |
| `motion.ease.custom-3` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | 32 |
| `motion.ease.custom-4` | `cubic-bezier(0.45, 0.05, 0.55, 0.95)` | 31 |

Sample transitions observed: color + background-color at 240ms cubic-bezier(0.45, 0.05, 0.55, 0.95); z-index at 100ms steps(1); background-color at 300ms cubic-bezier(0.25, 1, 0.5, 1).

## Assets

### Logo

Saved at `assets/logo.svg` — 60×25.

### Fonts

Downloaded next to this file — drop the `assets/fonts/` directory into your project to use them directly.

| Family | Weight | Style | File | Source |
|---|---|---|---|---|
| sohne-var | 1 1000 | normal | `assets/fonts/0ab0832c.woff2` | https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/media/Sohne.cb178166.woff2 |
| SourceCodePro | 500 | normal | `assets/fonts/ec203ee5.woff2` | https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/media/SourceCodePro-Medium.f5ba3e6a.woff2 |
| sohne-var | 1 1000 | normal | `assets/fonts/f5772cea.woff2` | https://b.stripecdn.com/mkt-statics-srv/assets/v1/f965fdf4.woff2 |
| SourceCodePro | 500 | normal | `assets/fonts/8d8b18c4.woff2` | https://b.stripecdn.com/mkt-statics-srv/assets/v1/1a930247.woff2 |

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don't use it as a decorative accent.
- When introducing a story section, choose **one** color block from the `{colors.block-*}` family (1 available) and let it span full content width with `{rounded.2xl}` corners.
- Keep type in `sohne-var` at variable weights — pick from 300, 400, 500 to express hierarchy.
- Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.

### Don't

- Don't reach for opacity to soften body type — the documented muted ink token plus weight modulation already covers de-emphasis.
- Don't add drop shadows to color-block sections — the color is the depth device.
- Don't introduce new accent colors outside the documented `{colors.block-*}` palette.
- Don't hardcode hex values in product code — reference tokens via `{colors.*}` / `{typography.*}` so the system stays the single source of truth.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled).

### Breakpoints

Per-viewport probe metrics captured at mobile 390px / tablet 768px / desktop 1440px. Properties whose computed value differs across viewports surface here.

| Element | Property | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `fontSize` | 18px | 18px | 14px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingTop` | 16px | 16px | 10.5px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingRight` | 0px | 0px | 20px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingBottom` | 16px | 16px | 13.5px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingLeft` | 0px | 0px | 20px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `boundingWidth` | 0 | 0 | 84 |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `fontSize` | 18px | 18px | 14px |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `paddingTop` | 16px | 16px | 11.5px |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `paddingRight` | 0px | 0px | 20px |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `paddingBottom` | 16px | 16px | 14.5px |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `paddingLeft` | 0px | 0px | 20px |
| `h2.CopyTitle.CopyTitle--variantDetail.BlogIndexP` | `boundingWidth` | 0 | 0 | 137 |
| `span.AnimatedCardGraphic__name` | `paddingTop` | 12px | 12px | 10px |
| `span.AnimatedCardGraphic__name` | `paddingRight` | 12px | 24px | 16px |
| `span.AnimatedCardGraphic__name` | `paddingBottom` | 14px | 14px | 10px |
| `span.AnimatedCardGraphic__name` | `paddingLeft` | 16px | 32px | 16px |
| `span.AnimatedCardGraphic__name` | `gap` | 16px | 16px | 28px |
| `span.AnimatedCardGraphic__name` | `boundingWidth` | 390 | 768 | 1262 |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `fontSize` | 18px | 18px | 14px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingTop` | 16px | 16px | 12px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingBottom` | 16px | 16px | 12px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `display` | inline-flex | inline-flex | flex |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `boundingWidth` | 0 | 0 | 60 |
| `button.hds-button.personalize-page__retry-button` | `fontSize` | 18px | 18px | 14px |
| `button.hds-button.personalize-page__retry-button` | `paddingTop` | 16px | 16px | 12px |
| `button.hds-button.personalize-page__retry-button` | `paddingBottom` | 16px | 16px | 12px |
| `button.hds-button.personalize-page__retry-button` | `boundingWidth` | 0 | 0 | 91 |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `fontSize` | 18px | 18px | 14px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `paddingTop` | 16px | 16px | 12px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `paddingBottom` | 16px | 16px | 12px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `boundingWidth` | 0 | 0 | 77 |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `fontSize` | 18px | 18px | 14px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `paddingTop` | 16px | 16px | 12px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `paddingBottom` | 16px | 16px | 12px |
| `button.SiteHeaderNavItem__link.SiteHeaderNavItem` | `boundingWidth` | 0 | 0 | 78 |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `fontSize` | 18px | 18px | 14px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingTop` | 16px | 16px | 12px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `paddingBottom` | 16px | 16px | 12px |
| `h1.CopyTitle.CopyTitle--variant.CopyTitle--inlin` | `boundingWidth` | 0 | 0 | 44 |

_158 additional probe(s) shift across viewports — see `output/screenshots/index.json` per-viewport metrics for the full set._

_Stats: 166/193 probes shift across viewports; 8 distinct properties affected._

### Touch Targets

- **Pill / pill-tab button** — `{components.button-secondary}` resting height **60px**, meets the 44px iOS / 48dp Android tap-target minimum.
- **Form input** — `{components.text-input}` resting height **68px**, meets the 44px iOS / 48dp Android tap-target minimum.

### Collapsing Strategy

- Below ~390px, multi-item top-nav collapses to a hamburger / drawer pattern — the inline links don't fit alongside logo + CTAs at narrower widths.
- Multi-column grids (pricing tiers, feature cards, customer logos) step down through the **1440px → 768px → 390px** viewport set: 4-up at desktop typically becomes 2-up at tablet and 1-up (stacked) on mobile.
- Section padding (`{components.hero-section}`, `{components.hero-section-hover}`) shrinks proportionally below the tablet breakpoint — mobile uses tighter horizontal gutters so content edges don't dominate the viewport.
- Footer column groups stack vertically below ~390px; on wider viewports they sit side-by-side with consistent inter-group spacing.

### Image Behavior

- **Logo** ships as SVG (`assets/logo.svg`, 60×25) — scales lossless across every breakpoint, no @1x/@2x asset swaps required.
- Illustration-bearing surfaces (`{components.hero-section}`, `{components.hero-section-hover}`, `{components.hero-section-focus}`) inherit container width — supply art that crops gracefully from desktop down to mobile rather than depending on fixed pixel dimensions.

## Iteration Guide

1. Focus on ONE component at a time and reference it by its `components:` token name (e.g., `{components.button-tertiary}`, `{components.button-tertiary-hover}`).
2. When introducing a new section, decide **first** which `{colors.block-*}` token it sits on; the surface choice is the most consequential decision.
3. Default body type to `{typography.body-lg}`.
4. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
5. Add new variants as separate component entries (`-hover`, `-focus`, `-pressed`, `-selected`) — do not bury them in prose.
6. Keep `{colors.primary}` scarce. If two primary actions appear in the same viewport, the section is doing too much — neutralize one to a secondary variant.
7. Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

