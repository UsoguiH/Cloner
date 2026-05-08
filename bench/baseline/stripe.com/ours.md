---
name: Stripe
description: "Design system extracted from a structural clone. Canvas #f6f9fc, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#f6f9fc"
  primary: "#643afd"
  ink: "#425466"
  ink-muted: "#7d8ba4"
  on-primary: "#ffffff"
  block-periwinkle: "#e2e4ff"
  surface-1: "#f8fafd"
  surface-2: "#f4f8fa"
  surface-3: "#ffffff"
  surface-4: "#f0f0f0"
  hairline: "#e5edf5"
  hairline-strong: "#b9b9f9"
  hairline-tertiary: "#d6d9fc"
  ink-hover: "#323d96"
  ink-focus: "#5955ea"
  surface-hover: "#e1e3ff"
  ink-hover-2: "#543bfd"
  ink-hover-3: "#4b37e6"
  ink-hover-4: "#a09def"
  ink-hover-5: "#25357a"
  ink-focus-2: "#10294e"
typography:
  button:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 400
  button-6:
    fontFamily: Arial
    fontSize: 13px
    fontWeight: 400
  subhead-4:
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
  button-4:
    fontFamily: sohne-var
    fontSize: 15px
    fontWeight: 300
    lineHeight: 1.6
    letterSpacing: 0.2px
rounded:
  2xl: 8px
  sm: 4px
  md: 5px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-tertiary-hover:
    textColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-focus}"
  button-tertiary-hover-2:
    opacity: "0.91762"
  button-tertiary-focus-2:
    opacity: "0.976946"
  button-secondary:
    backgroundColor: "{colors.surface-4}"
    typography: "{typography.button-6}"
    padding: 1px 6px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink-hover-2}"
  button-secondary-hover-2:
    textColor: "{colors.ink-hover-3}"
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
  hero-section-hover:
    textColor: "{colors.ink-hover-5}"
  hero-section-focus:
    textColor: "{colors.ink-focus-2}"
  hero-section-hover-2:
    textColor: "{colors.ink-focus-2}"
  feature-card:
    backgroundColor: "{colors.on-primary}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
    rounded: "{rounded.2xl}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
  top-nav:
    typography: "{typography.button}"
  footer:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
  pricing-card:
    backgroundColor: "{colors.on-primary}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
    rounded: "{rounded.2xl}"
  status-badge:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
  testimonial-card:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-4}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 5px 12px 7px 12px
    height: 64px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
---

# Stripe

## Overview

Design system extracted from a structural clone. Canvas #f6f9fc, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}`) `#643afd` — System primary; default for primary CTAs and headline emphasis.
- **On Primary** (`{colors.on-primary}`) `#ffffff` — Foreground on primary surfaces.

### Surface

- **Canvas** (`{colors.canvas}`) `#f6f9fc` — Default page background.
- **Block Periwinkle** (`{colors.block-periwinkle}`) `#e2e4ff` — Signature pastel section block; used for full-width brand-color story sections.
- **Surface 1** (`{colors.surface-1}`) `#f8fafd` — Subtle elevated surface — first tier above canvas.
- **Surface 2** (`{colors.surface-2}`) `#f4f8fa` — Mid elevated surface — second tier above canvas.
- **Surface 3** (`{colors.surface-3}`) `#ffffff` — Highest elevated surface — third tier above canvas.
- **Surface 4** (`{colors.surface-4}`) `#f0f0f0`
- **Hairline** (`{colors.hairline}`) `#e5edf5` — 1px borders on inputs, cards, and table dividers.
- **Hairline Strong** (`{colors.hairline-strong}`) `#b9b9f9` — 1px borders on inputs, cards, and table dividers (strong variant).
- **Hairline Tertiary** (`{colors.hairline-tertiary}`) `#d6d9fc` — 1px borders on inputs, cards, and table dividers (tertiary variant).
- **Surface Hover** (`{colors.surface-hover}`) `#e1e3ff` — Hover-state surface for interactive controls.

### Text

- **Ink** (`{colors.ink}`) `#425466` — All headline, body, and caption type on light surfaces.
- **Ink Muted** (`{colors.ink-muted}`) `#7d8ba4` — De-emphasized ink — body sub-copy, captions, secondary metadata.
- **Ink Hover** (`{colors.ink-hover}`) `#323d96` — Hover-state ink for interactive text.
- **Ink Focus** (`{colors.ink-focus}`) `#5955ea` — Focus-state ink for keyboard navigation.
- **Ink Hover 2** (`{colors.ink-hover-2}`) `#543bfd` — Hover-state ink for interactive text (tier 2 variant).
- **Ink Hover 3** (`{colors.ink-hover-3}`) `#4b37e6` — Hover-state ink for interactive text (tier 3 variant).
- **Ink Hover 4** (`{colors.ink-hover-4}`) `#a09def` — Hover-state ink for interactive text (tier 4 variant).
- **Ink Hover 5** (`{colors.ink-hover-5}`) `#25357a` — Hover-state ink for interactive text (tier 5 variant).
- **Ink Focus 2** (`{colors.ink-focus-2}`) `#10294e` — Focus-state ink for keyboard navigation (tier 2 variant).

## Typography

### Font Family

- **sohne-var** — weights 300, 400
- **Arial** — weights 400

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.button}` | 16px | 400 | — | 0 | — |
| `{typography.button-6}` | 13px | 400 | — | 0 | — |
| `{typography.subhead-4}` | 16px | 300 | 1.4 | 0 | — |
| `{typography.body-lg}` | 20px | 300 | 1.4 | -0.2px | — |
| `{typography.button-4}` | 15px | 300 | 1.6 | 0.2px | — |

### Principles

- Type scale spans **13px → 20px** across 5 roles.
- Tight line-heights on display (≈1.4), generous on body (≈1.6). The contrast reinforces that headlines are graphics and body copy is for reading.

### Note on Font Substitutes

If implementing without access to `sohne-var`, suitable open-source substitutes are **Inter** (or **Geist**) for the sans. Variable-weight subs match the fine-grained weight axis these brands use; expect to manually adjust line-heights by ±0.02 to compensate for x-height differences.

## Layout

### Spacing System


| Token | Value | Wired to components |
|---|---|---|
| `{spacing.space-1}` | 1px | — |
| `{spacing.space-2}` | 4px | — |
| `{spacing.space-3}` | 7px | — |
| `{spacing.space-4}` | 10px | — |
| `{spacing.space-5}` | 15px | — |
| `{spacing.space-6}` | 20px | — |
| `{spacing.space-7}` | 34px | — |
| `{spacing.space-8}` | 112px | — |

### Component Padding (observed)

- `{components.button-secondary}` — 1px 6px.
- `{components.text-input}` — 5px 12px 7px 12px.
- `{components.button-primary}` — 8px 16px.

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
| `{rounded.sm}` | 4px | Small chips, sub-nav tabs. |
| `{rounded.md}` | 5px | Small chips, sub-nav tabs. |

### Photography & Illustration Geometry

- Image frames use `{rounded.2xl}` (8px) — generous enough to feel friendly, conservative enough to read as editorial.
- Smaller decorative tiles preserve a `{rounded.sm}` corner for elements that should read as physical objects (badges, sticky notes).
- No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.

## Components

### Buttons

**`button-tertiary`**
- type `{typography.button}`.
  - **Hover**: text `{colors.ink-hover}`, opacity 0.91762.
  - **Focus**: text `{colors.ink-focus}`, opacity 0.976946.

**`button-secondary`**
- background `{colors.surface-4}`, type `{typography.button-6}`, padding 1px 6px, height 44px.
  - **Hover**: background `{colors.surface-hover}`, text `{colors.ink-hover-2}`.

**`cta-banner`**
- type `{typography.body-lg}`, height 56px.

**`button-primary`**
- background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding 8px 16px, rounded `{rounded.md}`, height 40px.

### Inputs & Forms

**`text-input`**
- background `{colors.canvas}`, type `{typography.button-4}`, padding 5px 12px 7px 12px, rounded `{rounded.sm}`, height 64px.

### Cards & Containers

**`feature-card`**
- background `{colors.on-primary}`, text `{colors.ink}`, type `{typography.subhead-4}`, rounded `{rounded.2xl}`.

**`pricing-card`**
- background `{colors.on-primary}`, text `{colors.ink}`, type `{typography.subhead-4}`, rounded `{rounded.2xl}`.

**`testimonial-card`**
- text `{colors.ink}`, type `{typography.subhead-4}`.

### Navigation

**`nav`**
- text `{colors.ink}`, type `{typography.subhead-4}`.

### Header

**`top-nav`**
- type `{typography.button}`.

### Footer

**`footer`**
- text `{colors.ink}`, type `{typography.subhead-4}`.

### Sections

**`hero-section`**
- text `{colors.ink}`, type `{typography.subhead-4}`.
  - **Hover**: text `{colors.ink-hover-5}`.
  - **Focus**: text `{colors.ink-focus-2}`.

### Badges & Tags

**`status-badge`**
- text `{colors.ink}`, type `{typography.subhead-4}`.

## Motion

| Tier | Duration | Probes |
|---|---|---|
| `motion.fast` | 150ms | 44 |
| `motion.medium` | 300ms | 85 |
| `motion.slow` | 800ms | 37 |

### Easings

| Token | Curve | Probes |
|---|---|---|
| `motion.ease.ease` | `ease` | 133 |
| `motion.ease.custom-2` | `cubic-bezier(0.25, 1, 0.5, 1)` | 47 |
| `motion.ease.custom-3` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | 36 |
| `motion.ease.custom-4` | `cubic-bezier(0.45, 0.05, 0.55, 0.95)` | 22 |

Sample transitions observed: color + background-color at 240ms cubic-bezier(0.45, 0.05, 0.55, 0.95); background-color at 300ms cubic-bezier(0.25, 1, 0.5, 1); background-color + color at 300ms cubic-bezier(0.25, 1, 0.5, 1).

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

## Voice

Deterministic analysis of 71 sentences harvested from page H1–H4 / paragraph / button text (no /design or /principles page was reachable for this brand). Numbers reflect the actual harvested corpus, not interpretation.

- Sentences average **8 words** — short and punchy — every line lands a single idea, ad-style.
- Second-person dominates ("you", "your" — **16** mentions vs **3** "we" mentions): the copy speaks **at the reader**, framing every claim around what they get.
- 11 of 71 sentences open with an imperative verb. Most beats are descriptive; commands appear sparingly for emphasis.
- Zero exclamation marks, zero questions across the corpus — the register is **measured and confident**, never breathless or interrogative.
- Lexicon hot-spots (used ≥ 2× in the home-page heading + paragraph corpus): **financial** (×7), **payments** (×6), **business** (×6), **businesses** (×6), **infrastructure** (×4). Re-use these words in adjacent product copy and the voice will read continuous with the published brand.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don't use it as a decorative accent.
- When introducing a story section, choose **one** color block from the `{colors.block-*}` family (1 available) and let it span full content width with `{rounded.2xl}` corners.
- Keep type in `sohne-var` at variable weights — pick from 300, 400 to express hierarchy.
- Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.

### Don't

- Don't add drop shadows to color-block sections — the color is the depth device.
- Don't introduce new accent colors outside the documented `{colors.block-*}` palette.
- Don't hardcode hex values in product code — reference tokens via `{colors.*}` / `{typography.*}` so the system stays the single source of truth.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled).

### Breakpoints

Per-viewport probe metrics captured at mobile 390px / tablet 768px / desktop 1440px. Properties whose computed value differs across viewports surface here.

| Element | Property | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| `h1.ContactSales__header` | `fontSize` | 18px | 18px | 14px |
| `h1.ContactSales__header` | `paddingTop` | 16px | 16px | 11.5px |
| `h1.ContactSales__header` | `paddingRight` | 0px | 0px | 20px |
| `h1.ContactSales__header` | `paddingBottom` | 16px | 16px | 14.5px |
| `h1.ContactSales__header` | `paddingLeft` | 0px | 0px | 20px |
| `h1.ContactSales__header` | `boundingWidth` | 0 | 0 | 137 |
| `h1.Copy__title` | `fontSize` | 18px | 18px | 14px |
| `h1.Copy__title` | `paddingTop` | 16px | 16px | 10.5px |
| `h1.Copy__title` | `paddingRight` | 0px | 0px | 20px |
| `h1.Copy__title` | `paddingBottom` | 16px | 16px | 13.5px |
| `h1.Copy__title` | `paddingLeft` | 0px | 0px | 20px |
| `h1.Copy__title` | `boundingWidth` | 0 | 0 | 84 |
| `span.AnimatedCardGraphic__name` | `paddingTop` | 12px | 12px | 10px |
| `span.AnimatedCardGraphic__name` | `paddingRight` | 12px | 24px | 16px |
| `span.AnimatedCardGraphic__name` | `paddingBottom` | 14px | 14px | 10px |
| `span.AnimatedCardGraphic__name` | `paddingLeft` | 16px | 32px | 16px |
| `span.AnimatedCardGraphic__name` | `gap` | 16px | 16px | 28px |
| `span.AnimatedCardGraphic__name` | `boundingWidth` | 390 | 768 | 1262 |
| `button.Button.Button__Link` | `fontSize` | 18px | 18px | 14px |
| `button.Button.Button__Link` | `paddingTop` | 16px | 16px | 12px |
| `button.Button.Button__Link` | `paddingBottom` | 16px | 16px | 12px |
| `button.Button.Button__Link` | `boundingWidth` | 0 | 0 | 78 |
| `button.Button.Button__Link.ContactSalesFormStep_` | `fontSize` | 18px | 18px | 14px |
| `button.Button.Button__Link.ContactSalesFormStep_` | `paddingTop` | 16px | 16px | 12px |
| `button.Button.Button__Link.ContactSalesFormStep_` | `paddingBottom` | 16px | 16px | 12px |
| `button.Button.Button__Link.ContactSalesFormStep_` | `boundingWidth` | 0 | 0 | 91 |
| `button.Button.ContactSalesFormStep__continueButt` | `fontSize` | 18px | 18px | 14px |
| `button.Button.ContactSalesFormStep__continueButt` | `paddingTop` | 16px | 16px | 12px |
| `button.Button.ContactSalesFormStep__continueButt` | `paddingBottom` | 16px | 16px | 12px |
| `button.Button.ContactSalesFormStep__continueButt` | `boundingWidth` | 0 | 0 | 77 |
| `h1.SiteVariantMinimalHeader__logo` | `fontSize` | 18px | 18px | 14px |
| `h1.SiteVariantMinimalHeader__logo` | `paddingTop` | 16px | 16px | 12px |
| `h1.SiteVariantMinimalHeader__logo` | `paddingBottom` | 16px | 16px | 12px |
| `h1.SiteVariantMinimalHeader__logo` | `boundingWidth` | 0 | 0 | 44 |
| `div.Card.Card--shadowLarge.TestimonialCard__card` | `fontSize` | 16px | 18px | 18px |
| `div.Card.Card--shadowLarge.TestimonialCard__card` | `paddingTop` | 0px | 0px | 5.5px |
| `div.Card.Card--shadowLarge.TestimonialCard__card` | `boundingWidth` | 358 | 608 | 504 |

_156 additional probe(s) shift across viewports — see `output/screenshots/index.json` per-viewport metrics for the full set._

_Stats: 164/192 probes shift across viewports; 8 distinct properties affected._

### Touch Targets

- **Pill / pill-tab button** — `{components.button-secondary}` resting height **44px**, meets the 44px iOS / 48dp Android tap-target minimum.
- **Form input** — `{components.text-input}` resting height **64px**, meets the 44px iOS / 48dp Android tap-target minimum.

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

