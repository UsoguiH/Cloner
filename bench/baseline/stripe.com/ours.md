---
name: Stripe
description: Stripe presents its global financial infrastructure through a meticulously engineered interface that balances fluid, high-fidelity gradients against stark, grid-aligned typography.
colors:
  ink-muted: "#000000"
  primary: "#533afd"
  canvas: "#ffffff"
  hairline: "#50617a"
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
    textColor: "{colors.ink-muted}"
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
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
  cta-banner:
    textColor: "{colors.hairline}"
    typography: "{typography.body-lg}"
    height: 56px
  nav:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 64px
  top-nav:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
  footer:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    padding: 0px 16px
---

# Stripe

## Overview

Stripe’s design system defines a visual language where technical rigor meets sophisticated energy. The interface relies on a strict underlying grid to organize complex financial tooling, while expansive, atmospheric color meshes provide unmistakable brand distinctiveness.

## Voice

- **Engineered** — The reliance on a precise typographic scale, driven entirely by the geometric sohne-var family, communicates rigorous technical precision.
- **Vibrant** — Sweeping multi-color gradients contrast dramatically against the Pristine White Canvas to inject energy into a historically rigid financial domain.
- **Authoritative** — Primary messaging is set in Deep Midnight Ink, anchoring the fluid visual elements with confident, highly legible typographic weight.
- **Action-oriented** — Interactive elements are sharply signaled by Stripe Blurple, pulling focus immediately to crucial conversion points like onboarding buttons.

## Colors

Stripe juxtaposes a clinical Pristine White Canvas with the vivid energy of Stripe Blurple to guide user attention. Deep Midnight Ink and Steel Slate handle the complex hierarchy of financial data, ensuring that text remains the grounding element against the brand's signature gradient washes.

- **Absolute Black** `#000000` (`ink-muted`) — Used sparingly for maximum contrast, this unyielding black anchors specific typographic details and high-fidelity interface elements across the Stripe ecosystem.
- **Stripe Blurple** `#533afd` (`primary`) — Serving as Stripe's signature interactive hue, this vibrant indigo drives user action across primary buttons like our sales and onboarding calls to action.
- **Pristine White Canvas** `#ffffff` (`canvas`) — This pure white provides the foundational background across Stripe's interfaces, ensuring our vibrant gradients and interactive components command attention.
- **Steel Slate** `#50617a` (`hairline`) — This balanced slate supports Stripe's typographic hierarchy by carrying secondary prose, technical metadata, and supporting subheadline typography.

## Typography

The typographic system for Stripe is built entirely on sohne-var, utilizing slight weight shifts to establish hierarchy without clutter. Generous sizing, like the 48px display typography, allows feature statements to command the page before stepping down to a legible 20px body size for supporting prose.

- **button** — sohne-var 16px/400
- **display-2** — sohne-var 48px/300
- **body-lg** — sohne-var 20px/300

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

Elevation harvest is deferred to Phase 5 (no shadow tokens emitted yet).

## Shapes

- **xs** `4px`
- **md** `6px`

## Components

Interactive components in Stripe are highly contained and intentional, often utilizing Crisp Action White text against Stripe Blurple to maximize contrast. Feature cards and bento-box grids use a subtle Cool Interface Wash to separate distinct product offerings cleanly without competing with the main canvas.

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

