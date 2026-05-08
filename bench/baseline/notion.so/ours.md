---
name: Notion
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #191918, dominant typeface NotionInter. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#191918"
  ink: "#000000"
  ink-muted: "#31302e"
  ink-subtle: "#615d59"
  on-primary: "#ffffff"
  block-periwinkle: "#e6f3fe"
  block-coral: "#fef3f1"
  surface-1: "#f9f9f8"
  surface-2: "#f6f5f4"
  hairline: "#dddddd"
  surface-hover: "#005bab"
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
  lg: 12px
  sm: 8px
  xs: 4px
  xl: 14px
spacing:
  space-8: 125px
components:
  button-tertiary:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  button-tertiary-hover:
    textColor: "{colors.ink-subtle}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 4px 14px
    height: 36px
  button-secondary-hover-2:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus-2:
    backgroundColor: "{colors.surface-hover}"
  button-primary:
    backgroundColor: "{colors.primary}"
    typography: "{typography.button-3}"
    rounded: "{rounded.sm}"
    height: 57px
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
  button-primary-focus:
    backgroundColor: "{colors.ink-muted}"
  text-input:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.headline}"
    rounded: "{rounded.xs}"
    padding: 6px
    height: 62px
  feature-card:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  status-badge:
    typography: "{typography.button-3}"
    height: 55px
  nav:
    typography: "{typography.button-3}"
    padding: 80px 125px
  top-nav:
    textColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    padding: 80px 0px 0px 0px
  footer:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-3}"
  hero-section:
    textColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    padding: 0px 0px 32px 0px
  cta-banner:
    backgroundColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    padding: 80px 32px
  pricing-card:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
    padding: 32px
  color-block-section-periwinkle:
    backgroundColor: "{colors.block-periwinkle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.space-8}"
  color-block-section-coral:
    backgroundColor: "{colors.block-coral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.space-8}"
---

# Notion

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #191918, dominant typeface NotionInter. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}`) `#191918` — System primary; default for primary CTAs and headline emphasis.
- **On Primary** (`{colors.on-primary}`) `#ffffff` — Foreground on primary surfaces.

### Surface

- **Canvas** (`{colors.canvas}`) `#ffffff` — Default page background.
- **Block Periwinkle** (`{colors.block-periwinkle}`) `#e6f3fe` — Signature pastel section block; used for full-width brand-color story sections.
- **Block Coral** (`{colors.block-coral}`) `#fef3f1` — Signature pastel section block; used for full-width brand-color story sections.
- **Surface 1** (`{colors.surface-1}`) `#f9f9f8` — Subtle elevated surface — first tier above canvas.
- **Surface 2** (`{colors.surface-2}`) `#f6f5f4` — Mid elevated surface — second tier above canvas.
- **Hairline** (`{colors.hairline}`) `#dddddd` — 1px borders on inputs, cards, and table dividers.
- **Surface Hover** (`{colors.surface-hover}`) `#005bab` — Hover-state surface for interactive controls.

### Text

- **Ink** (`{colors.ink}`) `#000000` — All headline, body, and caption type on light surfaces.
- **Ink Muted** (`{colors.ink-muted}`) `#31302e` — De-emphasized ink — body sub-copy, captions, secondary metadata.
- **Ink Subtle** (`{colors.ink-subtle}`) `#615d59` — Most-de-emphasized ink — placeholder, helper, and disabled type.
- **Ink Focus** (`{colors.ink-focus}`) `#494744` — Focus-state ink for keyboard navigation.
- **Ink Focus 2** (`{colors.ink-focus-2}`) `#dadcdd` — Focus-state ink for keyboard navigation (tier 2 variant).

## Typography

### Font Family

- **NotionInter** — weights 400, 500, 700

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.button-3}` | 16px | 400 | 1.5 | 0 | — |
| `{typography.button-4}` | 16px | 500 | 1.5 | 0 | — |
| `{typography.headline}` | 42px | 700 | 1.14 | -1.5px | — |

### Principles

- Type scale spans **16px → 42px** across 3 roles.
- Weight axis exercised at **400, 500, 700** — modulating weight is a primary lever for hierarchy.
- Tight line-heights on display (≈1.14), generous on body (≈1.5). The contrast reinforces that headlines are graphics and body copy is for reading.
- Negative letter-spacing scales with size — display tightens to **-1.5px**, body stays near zero. Editorial-feeling display type without sacrificing readability.

## Layout

### Spacing System


| Token | Value | Wired to components |
|---|---|---|
| `{spacing.space-1}` | 2px | — |
| `{spacing.space-2}` | 6px | — |
| `{spacing.space-3}` | 8px | — |
| `{spacing.space-4}` | 14px | — |
| `{spacing.space-5}` | 16px | — |
| `{spacing.space-6}` | 32px | — |
| `{spacing.space-7}` | 56px | — |
| `{spacing.space-8}` | 125px | yes |

### Component Padding (observed)

- `{components.button-secondary}` — 4px 14px.
- `{components.text-input}` — 6px.
- `{components.nav}` — 80px 125px.
- `{components.top-nav}` — 80px 0px 0px 0px.
- `{components.hero-section}` — 0px 0px 32px 0px.
- `{components.cta-banner}` — 80px 32px.

### Grid & Container

- Max content width sits around **1440px** at the desktop breakpoint — beyond which the layout stops growing and side gutters absorb extra width.
- Side gutters scale from desktop down to **390px** mobile; layout collapses to a single column at the smaller breakpoint.

### Whitespace Philosophy

White space is a primary structural lever — major sections separate by ~**125px** of breathing room, letting each block read as a deliberate poster rather than a wall of copy.

## Elevation & Depth

This brand expresses depth through **color blocks** rather than shadows. No `box-shadow` tokens were harvested — sections separate by transitioning between canvas and one of the `{colors.block-*}` tints.

### Decorative Depth

- **Color-block sections** are the primary depth device. The change from canvas to `{colors.block-periwinkle}` / `{colors.block-coral}` is the section break.
- Elevation is **flat and saturated**, not soft and shadowed — typical card stacks read as collage rather than physical layering.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.lg}` | 12px | Form inputs, list items, image frames. |
| `{rounded.sm}` | 8px | Small chips, sub-nav tabs. |
| `{rounded.xs}` | 4px | Anchor / link decoration corners. |
| `{rounded.xl}` | 14px | Form inputs, list items, image frames. |

### Photography & Illustration Geometry

- Image frames use `{rounded.lg}` (12px) — generous enough to feel friendly, conservative enough to read as editorial.
- Smaller decorative tiles preserve a `{rounded.xs}` corner for elements that should read as physical objects (badges, sticky notes).
- No avatar circles appear in marketing surfaces — the brand avoids personification on its public-facing pages.

## Components

### Buttons

**`button-tertiary`**
- type `{typography.button-3}`, rounded `{rounded.lg}`.
  - **Hover**: text `{colors.ink-subtle}`.

**`button-secondary`**
- text `{colors.canvas}`, type `{typography.button-4}`, padding 4px 14px, rounded `{rounded.sm}`, height 36px.
  - **Hover**: background `{colors.surface-hover}`.
  - **Focus**: background `{colors.surface-hover}`.

**`button-primary`**
- background `{colors.primary}`, type `{typography.button-3}`, rounded `{rounded.sm}`, height 57px.
  - **Hover**: background `{colors.ink-muted}`.
  - **Focus**: background `{colors.ink-muted}`.

**`cta-banner`**
- background `{colors.surface-2}`, type `{typography.button-3}`, padding 80px 32px.

### Inputs & Forms

**`text-input`**
- background `{colors.canvas}`, type `{typography.headline}`, padding 6px, rounded `{rounded.xs}`, height 62px.

### Cards & Containers

**`feature-card`**
- type `{typography.button-3}`, rounded `{rounded.lg}`.

**`pricing-card`**
- type `{typography.button-3}`, padding 32px, rounded `{rounded.lg}`.

### Navigation

**`nav`**
- type `{typography.button-3}`, padding 80px 125px.

### Header

**`top-nav`**
- text `{colors.surface-2}`, type `{typography.button-3}`, padding 80px 0px 0px 0px.

### Footer

**`footer`**
- background `{colors.canvas}`, type `{typography.button-3}`.

### Sections

**`hero-section`**
- text `{colors.surface-2}`, type `{typography.button-3}`, padding 0px 0px 32px 0px.

### Color-Block Sections

**`color-block-section-periwinkle`**
- background `{colors.block-periwinkle}`, text `{colors.ink}`, padding `{spacing.space-8}`, rounded `{rounded.xl}`.

**`color-block-section-coral`**
- background `{colors.block-coral}`, text `{colors.ink}`, padding `{spacing.space-8}`, rounded `{rounded.xl}`.

### Badges & Tags

**`status-badge`**
- type `{typography.button-3}`, height 55px.

## Motion

| Tier | Duration | Probes |
|---|---|---|
| `motion.fast` | 200ms | 75 |
| `motion.slow` | 600ms | 4 |

### Easings

| Token | Curve | Probes |
|---|---|---|
| `motion.ease.ease` | `ease` | 85 |
| `motion.ease.ease-in` | `ease-in` | 32 |
| `motion.ease.custom-3` | `cubic-bezier(0.45, 0, 0.55, 1)` | 18 |
| `motion.ease.linear` | `linear` | 5 |

Sample transitions observed: background-color at 150ms ease; color + background-color at 150ms cubic-bezier(0.45, 0, 0.55, 1).

## Assets

### Favicon

Saved at `assets/favicon.ico` (source: https://www.notion.com/front-static/favicon.ico).

### Fonts

Downloaded next to this file — drop the `assets/fonts/` directory into your project to use them directly.

| Family | Weight | Style | File | Source |
|---|---|---|---|---|
| NotionInter | 400 | normal | `assets/fonts/39bfede2.woff2` | https://www.notion.com/front-static/fonts/NotionInter-Regular.woff2 |
| NotionInter | 500 | normal | `assets/fonts/2f33bc8b.woff2` | https://www.notion.com/front-static/fonts/NotionInter-Medium.woff2 |
| NotionInter | 600 | normal | `assets/fonts/b32cb5a5.woff2` | https://www.notion.com/front-static/fonts/NotionInter-SemiBold.woff2 |
| NotionInter | 700 | normal | `assets/fonts/fd301286.woff2` | https://www.notion.com/front-static/fonts/NotionInter-Bold.woff2 |
| Noto Sans Arabic | 100 900 | normal | `assets/fonts/456911d8.woff2` | https://www.notion.com/front-static/fonts/noto-sans-arabic.woff2 |
| Noto Sans Hebrew | 100 900 | normal | `assets/fonts/c0752d42.woff2` | https://www.notion.com/front-static/fonts/noto-sans-hebrew.woff2 |
| NotionInter | 400 | italic | `assets/fonts/7ce7c5e8.woff2` | https://www.notion.com/_next/static/media/NotionInter-Italic.556b6a81.woff2 |
| NotionInter | 500 | italic | `assets/fonts/12a73c6b.woff2` | https://www.notion.com/_next/static/media/NotionInter-MediumItalic.bc4c8878.woff2 |
| NotionInter | 600 | italic | `assets/fonts/c49605ce.woff2` | https://www.notion.com/_next/static/media/NotionInter-SemiBoldItalic.cb46786e.woff2 |
| NotionInter | 700 | italic | `assets/fonts/066b80b1.woff2` | https://www.notion.com/_next/static/media/NotionInter-BoldItalic.e4b84cf2.woff2 |
| Lyon Text | 400 | normal | `assets/fonts/934cd70b.woff2` | https://www.notion.com/_next/static/media/LyonText-Regular-Web.d7bfb4be.woff2 |
| Lyon Text | 400 | italic | `assets/fonts/f24caa65.woff2` | https://www.notion.com/_next/static/media/LyonText-RegularItalic-Web.f823179b.woff2 |
| Lyon Text | 600 | normal | `assets/fonts/7cdf2551.woff2` | https://www.notion.com/_next/static/media/LyonText-Bold-Web.98529464.woff2 |
| Lyon Text | 600 | italic | `assets/fonts/bb4e3542.woff2` | https://www.notion.com/_next/static/media/LyonText-BoldItalic-Web.8907ab5f.woff2 |
| iA Writer Mono | 400 | normal | `assets/fonts/197b10a7.woff2` | https://www.notion.com/_next/static/media/iAWriterMonoS-Regular.bf09337b.woff2 |
| iA Writer Mono | 400 | italic | `assets/fonts/96695283.woff2` | https://www.notion.com/_next/static/media/iAWriterMonoS-Italic.176fc5a8.woff2 |

## Voice

Deterministic analysis of 78 sentences harvested from page H1–H4 / paragraph / button text (no /design or /principles page was reachable for this brand). Numbers reflect the actual harvested corpus, not interpretation.

- Sentences average **7 words** — short and punchy — every line lands a single idea, ad-style.
- Second-person dominates ("you", "your" — **23** mentions vs **7** "we" mentions): the copy speaks **at the reader**, framing every claim around what they get.
- 10 of 78 sentences open with an imperative verb. Most beats are descriptive; commands appear sparingly for emphasis.
- **0** exclamation mark(s), **4** question(s) — punctuation is measured; rhetorical questions invite the reader in.
- Lexicon hot-spots (used ≥ 2× in the home-page heading + paragraph corpus): **agents** (×8), **knowledge** (×6), **questions** (×5), **workspace** (×4), **features** (×3). Re-use these words in adjacent product copy and the voice will read continuous with the published brand.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for genuine primary CTAs and selected states. Don't use it as a decorative accent.
- When introducing a story section, choose **one** color block from the `{colors.block-*}` family (2 available) and let it span full content width with `{rounded.xl}` corners.
- Keep type in `NotionInter` at variable weights — pick from 400, 500, 700 to express hierarchy.
- Allow the page to **return to canvas** between every two color blocks so each block reads as deliberate.
- Pair `{components.button-primary}` and `{components.button-secondary}` whenever a section needs both a primary action and a secondary action — the contrast pair is the brand signature.

### Don't

- Don't reach for opacity to soften body type — the documented muted ink token plus weight modulation already covers de-emphasis.
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
| `button.HeroMedia_playPauseController__3hTu3` | `fontSize` | — | — | 16px |
| `button.HeroMedia_playPauseController__3hTu3` | `paddingTop` | — | — | 0px |
| `button.HeroMedia_playPauseController__3hTu3` | `paddingRight` | — | — | 0px |
| `button.HeroMedia_playPauseController__3hTu3` | `paddingBottom` | — | — | 0px |
| `button.HeroMedia_playPauseController__3hTu3` | `paddingLeft` | — | — | 0px |
| `button.HeroMedia_playPauseController__3hTu3` | `gap` | — | — | normal |
| `button.HeroMedia_playPauseController__3hTu3` | `display` | — | — | flex |
| `button.HeroMedia_playPauseController__3hTu3` | `flexDirection` | — | — | row |
| `button.HeroMedia_playPauseController__3hTu3` | `boundingWidth` | — | — | 32 |
| `span.HeroMedia_icon__wYd2f` | `fontSize` | — | — | 16px |
| `span.HeroMedia_icon__wYd2f` | `paddingTop` | — | — | 0px |
| `span.HeroMedia_icon__wYd2f` | `paddingRight` | — | — | 0px |
| `span.HeroMedia_icon__wYd2f` | `paddingBottom` | — | — | 0px |
| `span.HeroMedia_icon__wYd2f` | `paddingLeft` | — | — | 0px |
| `span.HeroMedia_icon__wYd2f` | `gap` | — | — | normal |
| `span.HeroMedia_icon__wYd2f` | `display` | — | — | flex |
| `span.HeroMedia_icon__wYd2f` | `flexDirection` | — | — | row |
| `span.HeroMedia_icon__wYd2f` | `boundingWidth` | — | — | 12 |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `fontSize` | — | — | 16px |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `paddingTop` | — | — | 0px |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `paddingRight` | — | — | 0px |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `paddingBottom` | — | — | 0px |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `paddingLeft` | — | — | 0px |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `gap` | — | — | normal |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `display` | — | — | block |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `flexDirection` | — | — | row |
| `span.HeroMedia_visuallyHidden__H3Ck3` | `boundingWidth` | — | — | 1 |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `fontSize` | — | — | 16px |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `paddingTop` | — | — | 0px |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `paddingRight` | — | — | 0px |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `paddingBottom` | — | — | 0px |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `paddingLeft` | — | — | 0px |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `gap` | — | — | normal |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `display` | — | — | block |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `flexDirection` | — | — | row |
| `video.Video_video__KYz0l.Video_videoAspectRatio_` | `boundingWidth` | — | — | 958 |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `paddingTop` | 40px | 80px | 80px |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `paddingRight` | 16px | 66px | 125px |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `paddingBottom` | 40px | 80px | 80px |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `paddingLeft` | 16px | 66px | 125px |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `gap` | 36px | 36px | 24px |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `flexDirection` | column | column | row |
| `div.card_cardMeta__IkqBQ.customers_mediaCardStat` | `boundingWidth` | 390 | 768 | 1440 |
| `div.customers_hero__yvH7V` | `paddingTop` | 16px | 24px | 24px |
| `div.customers_hero__yvH7V` | `paddingRight` | 16px | 24px | 24px |
| `div.customers_hero__yvH7V` | `paddingBottom` | 16px | 24px | 24px |
| `div.customers_hero__yvH7V` | `paddingLeft` | 16px | 24px | 24px |
| `div.customers_hero__yvH7V` | `boundingWidth` | 358 | 653 | 602 |
| `div.logoWallMarquee_logoWallMarquee__DBKiq.logoW` | `paddingTop` | 16px | 24px | 24px |
| `div.logoWallMarquee_logoWallMarquee__DBKiq.logoW` | `paddingRight` | 16px | 24px | 24px |
| `div.logoWallMarquee_logoWallMarquee__DBKiq.logoW` | `paddingBottom` | 16px | 24px | 24px |
| `div.logoWallMarquee_logoWallMarquee__DBKiq.logoW` | `paddingLeft` | 16px | 24px | 24px |
| `div.logoWallMarquee_logoWallMarquee__DBKiq.logoW` | `boundingWidth` | 358 | 653 | 239 |
| `h2.semanticTypography_semanticTypography__mWJkv.` | `paddingTop` | 16px | 24px | 24px |
| `h2.semanticTypography_semanticTypography__mWJkv.` | `paddingRight` | 16px | 24px | 24px |
| `h2.semanticTypography_semanticTypography__mWJkv.` | `paddingBottom` | 16px | 24px | 24px |
| `h2.semanticTypography_semanticTypography__mWJkv.` | `paddingLeft` | 16px | 24px | 24px |
| `h2.semanticTypography_semanticTypography__mWJkv.` | `boundingWidth` | 358 | 653 | 498 |

_66 additional probe(s) shift across viewports — see `output/screenshots/index.json` per-viewport metrics for the full set._

_Stats: 74/98 probes shift across viewports; 9 distinct properties affected._

### Touch Targets

- **Pill / pill-tab button** — `{components.button-primary}` resting height **57px**, meets the 44px iOS / 48dp Android tap-target minimum.
- **Form input** — `{components.text-input}` resting height **62px**, meets the 44px iOS / 48dp Android tap-target minimum.

### Collapsing Strategy

- Below ~390px, multi-item top-nav collapses to a hamburger / drawer pattern — the inline links don't fit alongside logo + CTAs at narrower widths.
- Multi-column grids (pricing tiers, feature cards, customer logos) step down through the **1440px → 768px → 390px** viewport set: 4-up at desktop typically becomes 2-up at tablet and 1-up (stacked) on mobile.
- Section padding (`{components.feature-card}`, `{components.hero-section}`) shrinks proportionally below the tablet breakpoint — mobile uses tighter horizontal gutters so content edges don't dominate the viewport.
- Footer column groups stack vertically below ~390px; on wider viewports they sit side-by-side with consistent inter-group spacing.

### Image Behavior

- **Favicon** is `ICO` (`assets/favicon.ico`) — keep the on-page logo and the favicon visually anchored to the same wordmark so the browser-tab silhouette reads as the brand.
- Illustration-bearing surfaces (`{components.hero-section}`) inherit container width — supply art that crops gracefully from desktop down to mobile rather than depending on fixed pixel dimensions.

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

