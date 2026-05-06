---
name: Stripe
description: Stripe presents its financial infrastructure through an authoritative, high-contrast aesthetic that pairs austere, lightweight typography with intensely vibrant mesh gradients.
colors:
  canvas: "#ffffff"
  primary: "#533afd"
  ink: "#061b31"
  on-primary: "#ffffff"
  surface-1: "#f8fafd"
  surface-2: "#e5edf5"
  surface-3: "#e8e9ff"
  surface-4: "#e2e4ff"
  hairline: "#b9b9f9"
  hairline-strong: "#d6d9fc"
typography:
  button:
    fontFamily: sohne-var
    fontSize: 16px
    fontWeight: 400
  display-2:
    fontFamily: sohne-var
    fontSize: 48px
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: -0.96px
  body-lg:
    fontFamily: sohne-var
    fontSize: 20px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: -0.2px
rounded:
  xs: 4px
  md: 6px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-secondary:
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 15px 24px 16px 24px
    height: 48px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 16px 24px 17px 24px
    height: 48px
  hero-section:
    typography: "{typography.display-2}"
  feature-card:
    typography: "{typography.button}"
  cta-banner:
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 64px
  top-nav:
    typography: "{typography.button}"
  footer:
    backgroundColor: "{colors.surface-1}"
    typography: "{typography.button}"
    padding: 0px 16px
---

# Stripe

## Overview

Stripe relies on a pristine, architectural foundation to organize complex financial tools. The interface balances stark utility with highly expressive moments, leveraging precise grids and vibrant brand accents to guide the user naturally through dense information.

## Voice

- **Technical yet editorial** — The use of delicate, lightweight sohne-var at large display sizes brings a refined, magazine-like pacing to otherwise dense technical capabilities and API documentation.
- **Vibrantly constrained** — While the core layout relies on a stark Stripe Canvas and Deep Slate Ink text, the interface introduces explosive color exclusively through fluid mesh art and Vibrant Blurple action points.
- **Architectural** — A strict underlying grid system is made visible through delicate Subtle Blurple Rules that neatly box and separate complex product offerings without adding visual weight.
- **Confident** — The design system relies heavily on generous negative space and massive typographic scale rather than heavy UI ornamentation to communicate enterprise authority.

## Colors

Stripe anchors its interface in extreme contrast, setting Deep Slate Ink typography against a stark Stripe Canvas. It reserves its signature Vibrant Blurple for primary interactive elements, ensuring immediate wayfinding amidst the expansive, layered layouts.

- **Stripe Canvas** `#ffffff` (`canvas`) — Serves as the fundamental foundation for the Stripe interface, providing maximum contrast for typography and vibrant brand accents.
- **Vibrant Blurple** `#533afd` (`primary`) — Drives user action as the primary interactive color for key conversion points and bold calls to action across Stripe.
- **Deep Slate Ink** `#061b31` (`ink`) — Anchors our typography with a deep, authoritative tone that ensures maximum legibility across all Stripe touchpoints.
- **White Knockout** `#ffffff` (`on-primary`) — Provides stark, crisp contrast for text and icons set against our vibrant primary interactive elements on Stripe.
- **Frost Surface** `#f8fafd` (`surface-1`) — Defines soft foundational backgrounds for secondary Stripe page sections to gently pace the layout without distracting the eye.
- **Cool Mist Fill** `#e5edf5` (`surface-2`) — Introduces a slightly deeper neutral fill for layered components or secondary interactive states across the Stripe environment.
- **Soft Blurple Wash** `#e8e9ff` (`surface-3`) — Acts as a delicate, brand-aligned background wash for highlighted states or subtle interactive hints within the Stripe UI.
- **Active Blurple Wash** `#e2e4ff` (`surface-4`) — Provides a slightly stronger brand-tinted background for active component states and elevated selections on Stripe.
- **Blurple Rule** `#b9b9f9` (`hairline`) — Delineates components with a crisp, brand-tinted border that structures the Stripe page without adding unnecessary visual weight.
- **Subtle Blurple Rule** `#d6d9fc` (`hairline-strong`) — Establishes a highly subtle boundary for structural elements, keeping the Stripe interface organized and cleanly separated.

## Typography

The typographic system for Stripe leans entirely on sohne-var, utilizing surprisingly light weights like 300 for both 48px display headings and 20px body copy. This delicate approach prevents dense technical explanations from feeling heavy or overwhelming to the reader.

- **button** — sohne-var 16px/400
- **display-2** — sohne-var 48px/300
- **body-lg** — sohne-var 20px/300

## Layout

Stripe employs a highly visible grid system defined by crisp hairlines like the Blurple Rule to compartmentalize information. This architectural approach uses structural lines and massive padding to maintain rhythm across long, feature-dense product pages.

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `4px`
- **md** `6px`

## Components

- **button-tertiary**
- **button-secondary**
- **button-primary**
- **hero-section**
- **feature-card**
- **cta-banner**
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

