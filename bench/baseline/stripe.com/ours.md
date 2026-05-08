---
name: Stripe
description: "Design system extracted from a structural clone. Canvas #ffffff, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."
colors:
  canvas: "#ffffff"
  primary: "#643afd"
  ink: "#425466"
  ink-muted: "#7d8ba4"
  on-primary: "#ffffff"
  surface-1: "#f8fafd"
  surface-2: "#f6f9fc"
  surface-3: "#e5edf5"
  surface-4: "#e8e9ff"
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
  space-5: 16px
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
    padding: "{spacing.space-5}"
    height: 40px
---

# Stripe

## Overview

Design system extracted from a structural clone. Canvas #ffffff, primary accent #643afd, dominant typeface sohne-var. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources.

## Colors

- **canvas** `#ffffff`
- **primary** `#643afd`
- **ink** `#425466`
- **ink-muted** `#7d8ba4`
- **on-primary** `#ffffff`
- **surface-1** `#f8fafd`
- **surface-2** `#f6f9fc`
- **surface-3** `#e5edf5`
- **surface-4** `#e8e9ff`
- **hairline** `#b9b9f9`
- **hairline-strong** `#e2e4ff`
- **hairline-tertiary** `#e7ecf1`
- **ink-hover** `#4835db`
- **ink-focus** `#533afc`
- **surface-hover** `#e1e3ff`
- **ink-hover-2** `#8b86e6`
- **ink-focus-2** `#4c37e6`
- **ink-focus-3** `#a19eef`
- **ink-hover-3** `#25357a`

## Typography

- **button** — sohne-var 16px/400
- **button-5** — sohne-var 15px/400
- **subhead-6** — sohne-var 16px/300
- **body-lg** — sohne-var 20px/300
- **body-sm-3** — sohne-var 12px/500

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **2xl** `8px`
- **md** `5px`

## Components

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-focus**
- **button-tertiary-hover-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **button-secondary-hover-2**
- **button-secondary-focus-2**
- **hero-section**
- **hero-section-hover**
- **hero-section-focus**
- **feature-card**
- **cta-banner**
- **nav**
- **top-nav**
- **footer**
- **pricing-card**
- **status-badge**
- **testimonial-card**
- **text-input**
- **button-primary**

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

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Breakpoints

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

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled). See **Breakpoints** above for token-level deltas observed across the three sampled viewports.

## Iteration Guide

Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

