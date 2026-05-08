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
  surface-1: "#f9f9f8"
  surface-2: "#f2f9ff"
  surface-3: "#fef3f1"
  surface-4: "#e6f3fe"
  hairline: "#f6f5f4"
  hairline-strong: "#dddddd"
  surface-hover: "#fefefe"
  surface-hover-2: "#005bab"
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
components:
  button-tertiary:
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
  button-tertiary-hover:
    textColor: "{colors.ink-subtle}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-hover}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button-4}"
    rounded: "{rounded.sm}"
    padding: 4px 14px
    height: 36px
  button-secondary-hover-2:
    backgroundColor: "{colors.surface-hover-2}"
  button-secondary-focus-2:
    backgroundColor: "{colors.surface-hover-2}"
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
    backgroundColor: "{colors.hairline}"
    typography: "{typography.button-3}"
    padding: 80px 32px
  pricing-card:
    backgroundColor: "{colors.surface-2}"
    typography: "{typography.button-3}"
    rounded: "{rounded.lg}"
    padding: 32px
---

# Notion

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #191918, dominant typeface NotionInter. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#ffffff`
- **primary** `#191918`
- **ink** `#000000`
- **ink-muted** `#31302e`
- **ink-subtle** `#615d59`
- **on-primary** `#ffffff`
- **surface-1** `#f9f9f8`
- **surface-2** `#f2f9ff`
- **surface-3** `#fef3f1`
- **surface-4** `#e6f3fe`
- **hairline** `#f6f5f4`
- **hairline-strong** `#dddddd`
- **surface-hover** `#fefefe`
- **surface-hover-2** `#005bab`
- **ink-focus** `#494744`
- **ink-focus-2** `#dadcdd`

## Typography

- **button-3** — NotionInter 16px/400
- **button-4** — NotionInter 16px/500
- **headline** — NotionInter 42px/700

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **lg** `12px`
- **sm** `8px`
- **xs** `4px`

## Components

### Buttons

**`button-tertiary`**
- type `{typography.button-3}`, rounded `{rounded.lg}`.
  - **Hover**: background `{colors.surface-hover}`, text `{colors.ink-subtle}`.

**`button-secondary`**
- text `{colors.canvas}`, type `{typography.button-4}`, padding 4px 14px, rounded `{rounded.sm}`, height 36px.
  - **Hover**: background `{colors.surface-hover-2}`.
  - **Focus**: background `{colors.surface-hover-2}`.

**`button-primary`**
- background `{colors.primary}`, type `{typography.button-3}`, rounded `{rounded.sm}`, height 57px.
  - **Hover**: background `{colors.ink-muted}`.
  - **Focus**: background `{colors.ink-muted}`.

**`cta-banner`**
- background `{colors.hairline}`, type `{typography.button-3}`, padding 80px 32px.

### Inputs & Forms

**`text-input`**
- background `{colors.canvas}`, type `{typography.headline}`, padding 6px, rounded `{rounded.xs}`, height 62px.

### Cards & Containers

**`feature-card`**
- type `{typography.button-3}`, rounded `{rounded.lg}`.

**`pricing-card`**
- background `{colors.surface-2}`, type `{typography.button-3}`, padding 32px, rounded `{rounded.lg}`.

### Navigation

**`nav`**
- type `{typography.button-3}`, padding 80px 125px.

### Header

**`top-nav`**
- text `{colors.hairline}`, type `{typography.button-3}`, padding 80px 0px 0px 0px.

### Footer

**`footer`**
- background `{colors.canvas}`, type `{typography.button-3}`.

### Sections

**`hero-section`**
- text `{colors.hairline}`, type `{typography.button-3}`, padding 0px 0px 32px 0px.

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

## Do's and Don'ts

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Breakpoints

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

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled). See **Breakpoints** above for token-level deltas observed across the three sampled viewports.

## Iteration Guide

Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

