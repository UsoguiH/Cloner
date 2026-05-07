---
name: Stripe
description: Stripe combines rigorous structural clarity with vibrant, expressive gradients to present its global financial infrastructure.
colors:
  canvas: "#ffffff"
  primary: "#643afd"
  ink: "#061b31"
  on-primary: "#ffffff"
  surface-1: "#f8fafd"
  surface-2: "#e5edf5"
  surface-3: "#e8e9ff"
  surface-4: "#e2e4ff"
  hairline: "#b9b9f9"
  hairline-strong: "#d6d9fc"
  surface-hover: "#e4e6fe"
  surface-focus: "#e7e8ff"
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
spacing:
  space-5: 16px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-secondary:
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.xs}"
    padding: 16px 24px 17px 24px
    height: 48px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-focus}"
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

Stripe balances structural rigor with sweeping visual expressiveness. The interface builds upon a foundation of Canvas White and Cloud Wash, organizing complex financial tools into clear, digestible bento surfaces punctuated by highly literal product mockups.

## Voice

- **Precise** — Subtle borders utilizing Blurple Hairline define strict structural boundaries across the intricate feature grids.
- **Expressive** — Sweeping, high-contrast background gradients inject energy behind the strictly composed layouts to create a distinctly modern aesthetic.
- **Confident** — Oversized sohne-var display typography is kept at a stark 300-weight, relying on scale rather than bulk to command attention.
- **Builder-first** — The recurring use of code snippet tabs, terminal-inspired sections, and deep technical UI mockups signals a platform crafted for developers.

## Colors

The palette relies on Deep Ink for stark typographic contrast and Canvas White for essential layout breathing room. Primary Blurple serves as the cornerstone for interaction across Stripe, driving the user's eye toward critical conversion points against softer Lavender Wash and Cool Slate backgrounds.

- **Stripe Canvas White** `#ffffff` (`canvas`) — Serves as the foundational base for the Stripe interface, creating a crisp, clean canvas for content to breathe.
- **Primary Blurple** `#643afd` (`primary`) — Drives core interactive moments across the Stripe ecosystem, distinguishing primary calls to action like the Get Started button.
- **Deep Ink** `#061b31` (`ink`) — Grounds our typographic hierarchy, delivering sharp legibility for primary headings and body copy against light canvases across Stripe.
- **Action White** `#ffffff` (`on-primary`) — Provides crisp, accessible contrast for typography and iconography set within Stripe's primary interactive components.
- **Cloud Wash** `#f8fafd` (`surface-1`) — Establishes subtle depth for secondary page sections across Stripe, gently separating content zones without introducing hard boundaries.
- **Cool Slate** `#e5edf5` (`surface-2`) — Creates grounded containment for nested UI surfaces, supporting elevated Stripe elements with a cool, recessive backdrop.
- **Lavender Wash** `#e8e9ff` (`surface-3`) — Introduces a subtle hint of Stripe's primary brand hue into background surfaces to create cohesive, branded component areas.
- **Muted Lavender Surface** `#e2e4ff` (`surface-4`) — Acts as a slightly deeper tinted canvas for specialized Stripe component backgrounds that require clear distinction from standard surfaces.
- **Blurple Hairline** `#b9b9f9` (`hairline`) — Defines crisp, structural borders for interactive elements like secondary buttons and input fields across the Stripe experience.
- **Subtle Divider** `#d6d9fc` (`hairline-strong`) — Provides delicate structural separation for layout grids and subtle component borders, maintaining order in the Stripe interface.
- **Interactive Hover Wash** `#e4e6fe` (`surface-hover`) — Signals interactivity on hover states for secondary Stripe actions, offering a clear, branded visual response to user intent.
- **Focus Wash** `#e7e8ff` (`surface-focus`) — Anchors accessible focus states across the Stripe UI, ensuring keyboard navigation feels both distinct and seamlessly integrated.

## Typography

Driven exclusively by sohne-var, Stripe utilizes dramatic scale shifts and restrained font weights to establish clear content hierarchies. High-level messaging is intentionally kept light at a 300 weight, creating an editorial yet highly technical typographic rhythm.

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

Interactive elements across Stripe are highly legible and structurally disciplined, utilizing solid Primary Blurple containers for major actions. Secondary UI panels rely on Cool Slate and Muted Lavender Surface to create subtle nested depth without relying on heavy shadows.

- **button-tertiary**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **hero-section**
- **feature-card**
- **cta-banner**
- **nav**
- **top-nav**
- **footer**
- **button-primary**

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

