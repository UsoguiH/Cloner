---
name: Linear
description: "Design system extracted from a structural clone. Canvas #08090a, primary accent #5e6ad2, dominant typeface Inter Variable. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#08090a"
  primary: "#5e6ad2"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  on-primary: "#ffffff"
  block-navy: "#0f1011"
  surface-1: "#3b3b3b"
  surface-2: "#474747"
  hairline: "#23252a"
  hairline-strong: "#2f2f31"
  hairline-tertiary: "#5c5d5f"
  surface-hover: "#5e69c1"
  surface-hover-2: "#eaeaeb"
  ink-hover: "#34343a"
typography:
  button:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.182px
  button-4:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 500
  mono:
    fontFamily: Berkeley Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.71
  body-2:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 400
  body-sm-2:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xl: 8px
  full: 9999px
  sm: 4px
  md: 5px
spacing:
  space-5: 16px
components:
  button-tertiary:
    textColor: "{colors.ink-subtle}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: 0px 5px 0px 2px
    height: 36px
  button-tertiary-hover:
    backgroundColor: "{colors.block-navy}"
    textColor: "{colors.ink-subtle}"
  button-tertiary-hover-2:
    textColor: "{colors.ink-muted}"
  button-secondary:
    typography: "{typography.button-4}"
    rounded: "{rounded.full}"
    padding: 0px 18px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-hover-2:
    backgroundColor: "{colors.surface-hover-2}"
  text-input:
    typography: "{typography.mono}"
    padding: 0px 32px 0px 56px
  top-nav:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    height: 73px
  nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  feature-card:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  feature-card-hover:
    backgroundColor: "{colors.hairline}"
  feature-card-focus:
    backgroundColor: "{colors.hairline}"
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
    padding: 0px 32px
  cta-banner:
    textColor: "{colors.ink}"
    typography: "{typography.body-2}"
  status-badge:
    textColor: "{colors.ink-subtle}"
    typography: "{typography.body-sm-2}"
    rounded: "{rounded.sm}"
    padding: 0px 6px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-5}"
    height: 40px
---

# Linear

## Overview

Design system extracted from a structural clone. Canvas #08090a, primary accent #5e6ad2, dominant typeface Inter Variable. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}`) `#5e6ad2` — System primary; default for primary CTAs and headline emphasis.
- **On Primary** (`{colors.on-primary}`) `#ffffff` — Foreground on primary surfaces.

### Surface

- **Canvas** (`{colors.canvas}`) `#08090a` — Default page background.
- **Block Navy** (`{colors.block-navy}`) `#0f1011` — Signature pastel section block; used for full-width brand-color story sections.
- **Surface 1** (`{colors.surface-1}`) `#3b3b3b` — Subtle elevated surface — first tier above canvas.
- **Surface 2** (`{colors.surface-2}`) `#474747` — Mid elevated surface — second tier above canvas.
- **Hairline** (`{colors.hairline}`) `#23252a` — 1px borders on inputs, cards, and table dividers.
- **Hairline Strong** (`{colors.hairline-strong}`) `#2f2f31` — 1px borders on inputs, cards, and table dividers (strong variant).
- **Hairline Tertiary** (`{colors.hairline-tertiary}`) `#5c5d5f` — 1px borders on inputs, cards, and table dividers (tertiary variant).
- **Surface Hover** (`{colors.surface-hover}`) `#5e69c1` — Hover-state surface for interactive controls.
- **Surface Hover 2** (`{colors.surface-hover-2}`) `#eaeaeb` — Hover-state surface for interactive controls (tier 2 variant).

### Text

- **Ink** (`{colors.ink}`) `#f7f8f8` — All headline, body, and caption type on light surfaces.
- **Ink Muted** (`{colors.ink-muted}`) `#d0d6e0` — De-emphasized ink — body sub-copy, captions, secondary metadata.
- **Ink Subtle** (`{colors.ink-subtle}`) `#8a8f98` — Most-de-emphasized ink — placeholder, helper, and disabled type.
- **Ink Tertiary** (`{colors.ink-tertiary}`) `#62666d` — All headline, body, and caption type on light surfaces (tertiary variant).
- **Ink Hover** (`{colors.ink-hover}`) `#34343a` — Hover-state ink for interactive text.

## Typography

### Font Family

- **Inter Variable** — weights 400, 500
- **Berkeley Mono** — weights 400

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.button}` | 14px | 500 | 1.5 | -0.182px | — |
| `{typography.button-4}` | 13px | 500 | — | 0 | — |
| `{typography.mono}` | 14px | 400 | 1.71 | 0 | — |
| `{typography.body-2}` | 16px | 400 | — | 0 | — |
| `{typography.body-sm-2}` | 12px | 400 | 1.4 | 0 | — |

### Principles

- Type scale spans **12px → 16px** across 5 roles.
- Tight line-heights on display (≈1.4), generous on body (≈1.71). The contrast reinforces that headlines are graphics and body copy is for reading.

## Layout

### Spacing System


| Token | Value | Wired to components |
|---|---|---|
| `{spacing.space-1}` | 1px | — |
| `{spacing.space-2}` | 4px | — |
| `{spacing.space-3}` | 8px | — |
| `{spacing.space-4}` | 12px | — |
| `{spacing.space-5}` | 16px | yes |
| `{spacing.space-6}` | 18px | — |
| `{spacing.space-7}` | 32px | — |
| `{spacing.space-8}` | 72px | — |

### Component Padding (observed)

- `{components.button-tertiary}` — 0px 5px 0px 2px.
- `{components.button-secondary}` — 0px 18px.
- `{components.text-input}` — 0px 32px 0px 56px.
- `{components.hero-section}` — 0px 32px.
- `{components.status-badge}` — 0px 6px.
- `{components.button-primary}` — {spacing.space-5}.

### Grid & Container

- Max content width sits around **1440px** at the desktop breakpoint — beyond which the layout stops growing and side gutters absorb extra width.
- Side gutters scale from desktop down to **390px** mobile; layout collapses to a single column at the smaller breakpoint.

### Whitespace Philosophy

White space is a primary structural lever — major sections separate by ~**72px** of breathing room, letting each block read as a deliberate poster rather than a wall of copy.

## Elevation & Depth

This brand expresses depth through **color blocks** rather than shadows. No `box-shadow` tokens were harvested — sections separate by transitioning between canvas and one of the `{colors.block-*}` tints.

### Decorative Depth

- **Color-block sections** are the primary depth device. The change from canvas to `{colors.block-navy}` is the section break.
- Elevation is **flat and saturated**, not soft and shadowed — typical card stacks read as collage rather than physical layering.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xl}` | 8px | Form inputs, list items, image frames. |
| `{rounded.full}` | 9999px | Circular icon buttons, avatar shapes. |
| `{rounded.sm}` | 4px | Small chips, sub-nav tabs. |
| `{rounded.md}` | 5px | Small chips, sub-nav tabs. |

### Photography & Illustration Geometry

- Image frames use `{rounded.xl}` (8px) — generous enough to feel friendly, conservative enough to read as editorial.
- Smaller decorative tiles preserve a `{rounded.sm}` corner for elements that should read as physical objects (badges, sticky notes).
- Circular icon containers use `{rounded.full}` — reserved for icon-button surfaces and status glyphs, not photographic frames.
- No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.

## Components

### Buttons

**`button-tertiary`**
- text `{colors.ink-subtle}`, type `{typography.button}`, padding 0px 5px 0px 2px, rounded `{rounded.xl}`, height 36px.
  - **Hover**: background `{colors.block-navy}`, text `{colors.ink-subtle}`.

**`button-secondary`**
- type `{typography.button-4}`, padding 0px 18px, rounded `{rounded.full}`, height 44px.
  - **Hover**: background `{colors.surface-hover}`.
  - **Focus**: background `{colors.surface-hover}`.

**`cta-banner`**
- text `{colors.ink}`, type `{typography.body-2}`.

**`button-primary`**
- background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding `{spacing.space-5}`, rounded `{rounded.md}`, height 40px.

### Inputs & Forms

**`text-input`**
- type `{typography.mono}`, padding 0px 32px 0px 56px.

### Cards & Containers

**`feature-card`**
- text `{colors.ink}`, type `{typography.body-2}`.
  - **Hover**: background `{colors.hairline}`.
  - **Focus**: background `{colors.hairline}`.

### Navigation

**`nav`**
- background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-2}`.

### Header

**`top-nav`**
- text `{colors.ink}`, type `{typography.body-2}`, height 73px.

### Footer

**`footer`**
- background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-2}`.

### Sections

**`hero-section`**
- text `{colors.ink}`, type `{typography.body-2}`, padding 0px 32px.

### Badges & Tags

**`status-badge`**
- text `{colors.ink-subtle}`, type `{typography.body-sm-2}`, padding 0px 6px, rounded `{rounded.sm}`.

## Motion

| Tier | Duration | Probes |
|---|---|---|
| `motion.fast` | 160ms | 73 |
| `motion.slow` | 1750ms | 1 |

### Easings

| Token | Curve | Probes |
|---|---|---|
| `motion.ease.ease` | `ease` | 86 |
| `motion.ease.custom-2` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 50 |
| `motion.ease.custom-3` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | 3 |
| `motion.ease.custom-4` | `cubic-bezier(0.66, 0, 0, 1)` | 1 |

Sample transitions observed: color + background at 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94); background at 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94); transform at 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94).

## Assets

### Logo

Saved at `assets/logo.svg` — 88×22.

### Favicon

Saved at `assets/favicon.png` (source: https://linear.app/static/apple-touch-icon.png?v=2).

### Fonts

Downloaded next to this file — drop the `assets/fonts/` directory into your project to use them directly.

| Family | Weight | Style | File | Source |
|---|---|---|---|---|
| Inter Variable | 100 900 | normal | `assets/fonts/8f9c25ec.woff2` | https://static.linear.app/fonts/InterVariable.woff2?v=4.1 |
| Inter Variable | 100 900 | italic | `assets/fonts/e6116d47.woff2` | https://static.linear.app/fonts/InterVariable-Italic.woff2?v=4.1 |
| Berkeley Mono | 100 900 | normal | `assets/fonts/ab475c71.woff2` | https://static.linear.app/fonts/Berkeley-Mono-Variable.woff2?v=3.2 |

## Brand principles

Quoted from the brand's own published design / principles / brand pages — not interpreted, not paraphrased.

### Naming

“Linear” is a single word, always spelled with a capital “L”. It is the brand name of both our company and our application (not “Linear app”). When referring to dedicated releases from Linear, we ask that you capitalize them as proper nouns (e.g. “Linear Method”).

_Source: https://linear.app/brand_

### Linear wordmark

The Linear wordmark should be used in all references to Linear as space allows. Monochrome usage is preferred with the brand colors below.

_Source: https://linear.app/brand_

### Linear logo

For tight layouts or logo-only grids, the Linear logomark is a concise way to refer to Linear. Use with good judgment for your audience, as the Linear wordmark has stronger brand recognition.

_Source: https://linear.app/brand_

### Linear icon

When referring to Linear as a company, such as on social media, or where a “chip” design is required, it is acceptable to use this stylized icon with an appropriate corner radius.

_Source: https://linear.app/brand_

### Colors

Comfortable against light and dark backgrounds, Linear’s primary brand color is a subtle desaturated blue. The following light and dark accents are preferred for monochrome wordmark usage, while the brand color is typically reserved for backgrounds.

_Source: https://linear.app/brand_

### Company

About Customers Careers Blog Method Quality Brand

_Source: https://linear.app/brand_

### Usage

Provide plenty of space around Linear assets. Make them big or make them small, but give them room to breathe. They shouldn’t feel cramped or cluttered.

_Source: https://linear.app/brand_

### Product

Intake Plan Build Diffs Monitor Pricing Security

_Source: https://linear.app/brand_

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don't use it as a decorative accent.
- When introducing a story section, choose **one** color block from the `{colors.block-*}` family (1 available) and let it span full content width with `{rounded.full}` corners.
- Keep type in `Inter Variable` at variable weights — pick from 400, 500 to express hierarchy.
- Compose every CTA as a pill (`{rounded.full}`) and every icon button as a circle (`{rounded.full}`).
- Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.

### Don't

- Don't add drop shadows to color-block sections — the color is the depth device.
- Don't introduce new accent colors outside the documented `{colors.block-*}` palette.
- Don't square off CTAs. Sharp-corner buttons read as a different brand.
- Don't hardcode hex values in product code — reference tokens via `{colors.*}` / `{typography.*}` so the system stays the single source of truth.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled).

### Breakpoints

Per-viewport probe metrics captured at mobile 390px / tablet 768px / desktop 1440px. Properties whose computed value differs across viewports surface here.

| Element | Property | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| `h2.sc-d5151d0-0.exSLMF.utils_inset__Xhl3T.utils_` | `fontSize` | 24px | 32px | 48px |
| `h2.sc-d5151d0-0.exSLMF.utils_inset__Xhl3T.utils_` | `paddingRight` | 8px | 8px | 32px |
| `h2.sc-d5151d0-0.exSLMF.utils_inset__Xhl3T.utils_` | `paddingLeft` | 8px | 8px | 32px |
| `h2.sc-d5151d0-0.exSLMF.utils_inset__Xhl3T.utils_` | `boundingWidth` | 359 | 714 | 1250 |
| `div.Hero_container__inGFW.utils_inset__Xhl3T` | `paddingRight` | 8px | 8px | 32px |
| `div.Hero_container__inGFW.utils_inset__Xhl3T` | `paddingLeft` | 8px | 8px | 32px |
| `div.Hero_container__inGFW.utils_inset__Xhl3T` | `boundingWidth` | 358 | 712 | 1344 |
| `div.Hero_descriptionContainer__PeKJU.Flex_root__` | `gap` | 20px | 20px | normal |
| `div.Hero_descriptionContainer__PeKJU.Flex_root__` | `flexDirection` | column | column | row |
| `div.Hero_descriptionContainer__PeKJU.Flex_root__` | `boundingWidth` | 342 | 696 | 1280 |
| `a.hide-mobile.Hero_newFeatureLink__PHt6b.Link_ro` | `display` | none | block | block |
| `a.hide-mobile.Hero_newFeatureLink__PHt6b.Link_ro` | `boundingWidth` | 0 | 313 | 313 |
| `h1.sc-d5151d0-0.bgDIHX.utils_insetLarge__6UCke.H` | `fontSize` | 38px | 56px | 64px |
| `h1.sc-d5151d0-0.bgDIHX.utils_insetLarge__6UCke.H` | `boundingWidth` | 343 | 698 | 1282 |
| `h2.sc-d5151d0-0.bHseLi` | `fontSize` | 24px | 40px | 48px |
| `h2.sc-d5151d0-0.bHseLi` | `boundingWidth` | 275 | 451 | 542 |
| `h2.sc-d5151d0-0.bHseLi` | `fontSize` | 24px | 40px | 48px |
| `h2.sc-d5151d0-0.bHseLi` | `boundingWidth` | 275 | 451 | 542 |
| `h2.sc-d5151d0-0.bHseLi` | `fontSize` | 24px | 40px | 48px |
| `h2.sc-d5151d0-0.bHseLi` | `boundingWidth` | 275 | 451 | 542 |

_82 additional probe(s) shift across viewports — see `output/screenshots/index.json` per-viewport metrics for the full set._

_Stats: 90/102 probes shift across viewports; 7 distinct properties affected._

### Touch Targets

- **Pill / pill-tab button** — `{components.button-secondary}` resting height **44px**, meets the 44px iOS / 48dp Android tap-target minimum.

### Collapsing Strategy

- Below ~390px, multi-item top-nav collapses to a hamburger / drawer pattern — the inline links don't fit alongside logo + CTAs at narrower widths.
- Multi-column grids (pricing tiers, feature cards, customer logos) step down through the **1440px → 768px → 390px** viewport set: 4-up at desktop typically becomes 2-up at tablet and 1-up (stacked) on mobile.
- Section padding (`{components.feature-card}`, `{components.feature-card-hover}`) shrinks proportionally below the tablet breakpoint — mobile uses tighter horizontal gutters so content edges don't dominate the viewport.
- Footer column groups stack vertically below ~390px; on wider viewports they sit side-by-side with consistent inter-group spacing.

## Iteration Guide

1. Focus on ONE component at a time and reference it by its `components:` token name (e.g., `{components.button-tertiary}`, `{components.button-tertiary-hover}`).
2. When introducing a new section, decide **first** which `{colors.block-*}` token it sits on; the surface choice is the most consequential decision.
3. Default body type to `{typography.body-2}`.
4. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
5. Add new variants as separate component entries (`-hover`, `-focus`, `-pressed`, `-selected`) — do not bury them in prose.
6. Keep `{colors.primary}` scarce. If two primary actions appear in the same viewport, the section is doing too much — neutralize one to a secondary variant.
7. Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

