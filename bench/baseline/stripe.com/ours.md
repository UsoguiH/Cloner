---
name: Stripe
description: Stripe pairs a highly technical, grid-driven architecture with sweeping gradients and oversized typography to communicate scale and modern financial infrastructure.
colors:
  canvas: "#ffffff"
  primary: "#635bff"
  ink: "#425466"
  on-primary: "#ffffff"
  surface-1: "#f8fafd"
  surface-2: "#f6f9fc"
  surface-3: "#e5edf5"
  surface-4: "#e8e9ff"
  hairline: "#b9b9f9"
  hairline-strong: "#e2e4ff"
  hairline-tertiary: "#e7ecf1"
  ink-hover: "#4835db"
  ink-focus: "#5039f5"
  ink-hover-2: "#2e2b8c"
  ink-hover-3: "#3b43a9"
  ink-focus-2: "#142b55"
  surface-hover: "#484bc5"
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
  xl-7: 17px
  2xl: 8px
components:
  button-tertiary:
    typography: "{typography.button}"
  button-tertiary-hover:
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-focus}"
    borderColor: "{colors.ink-focus}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    typography: "{typography.button-5}"
    padding: 17px 32px 19px 16px
    height: 60px
  button-secondary-hover:
    textColor: "{colors.ink-hover-2}"
    borderColor: "{colors.ink-hover-2}"
  button-secondary-hover-2:
    opacity: 0.878295
  button-secondary-focus-2:
    opacity: 0.878295
  hero-section:
    textColor: "{colors.ink}"
    typography: "{typography.subhead-6}"
  hero-section-hover:
    textColor: "{colors.ink-hover-3}"
    borderColor: "{colors.ink-hover-3}"
  hero-section-focus:
    textColor: "{colors.ink-focus-2}"
    borderColor: "{colors.ink-focus-2}"
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
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-5}"
    rounded: "{rounded.xl-7}"
    padding: 3px 12px 6px 16px
    height: 33px
  button-primary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-primary-focus:
    backgroundColor: "{colors.surface-hover}"
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
---

# Stripe

## Overview

Stripe balances strict utility with visual drama. The system leans heavily on precise architectural layouts punctuated by energetic background meshes and massive, confident typography.

## Voice

- **Architectural** — Faint grid lines rendered in Ghost Wireframe and stacked backgrounds like Cloud Surface create a highly structured, layered canvas.
- **Vibrant** — Sweeping, high-energy background gradients and sharp Stripe Blurple buttons contrast aggressively against the stark Canvas White base.
- **Precise** — Crisp sohne-var typography and exactingly placed Soft Lavender Line borders partition complex product details into strict bento layouts.

## Colors

The foundation relies on a clean Canvas White ground layered with cool, subtle tones like Mist Gray and Cloud Surface. Vibrant interactive touches are strictly reserved for core actions, driven entirely by Stripe Blurple and Active Surface Blurple.

- **Canvas White** `#ffffff` (`canvas`) — Forms the foundational background for Stripe, providing a clean expanse that allows dynamic typography and vibrant gradients to stand out.
- **Stripe Blurple** `#635bff` (`primary`) — Serves as the signature accent across the Stripe experience, driving primary calls to action and highlighting key marketing typography.
- **Slate Ink** `#425466` (`ink`) — Acts as the primary workhorse for typography, delivering crisp legibility and a professional tone for paragraphs and secondary headers.
- **Knockout White** `#ffffff` (`on-primary`) — Ensures strict accessibility and high contrast when rendering text or icons inside primary branded buttons and active components.
- **Cloud Surface** `#f8fafd` (`surface-1`) — Provides a barely-there blue tint for alternating layout sections, creating subtle pacing in Stripe product layouts.
- **Mist Gray** `#f6f9fc` (`surface-2`) — Establishes hierarchy for secondary background panels and subdued structural areas without overwhelming the core content.
- **Dusk Surface** `#e5edf5` (`surface-3`) — Defines deeper elevated layers or muted component backgrounds to establish a clear architectural hierarchy.
- **Soft Lavender Surface** `#e8e9ff` (`surface-4`) — Introduces a faint branded purple hue for secondary interactive components and emphasized background callouts.
- **Vibrant Divider** `#b9b9f9` (`hairline`) — Draws precise, colorful boundaries and borders for interactive components like secondary buttons and focused input fields.
- **Soft Lavender Line** `#e2e4ff` (`hairline-strong`) — Details fine structural borders and subtle dividers that partition content with a hint of the signature Stripe brand identity.
- **Ghost Wireframe** `#e7ecf1` (`hairline-tertiary`) — Renders the faintest architectural grid lines across the Stripe canvas, establishing a highly technical and precise aesthetic.
- **Deep Blurple Hover** `#4835db` (`ink-hover`) — Signals interactivity by deepening the primary brand color when a user hovers over key links and active typography.
- **Vibrant Ink Focus** `#5039f5` (`ink-focus`) — Catches the user's attention during keyboard navigation, ensuring focused text elements are accessible and distinctly highlighted.
- **Midnight Ink Hover** `#2e2b8c` (`ink-hover-2`) — Provides a darker, more dramatic hover state for secondary interactive text strings and nuanced navigational links.
- **ink-hover-3** `#3b43a9`
- **ink-focus-2** `#142b55`
- **Active Surface Blurple** `#484bc5` (`surface-hover`) — Elevates hovered container elements and secondary buttons with a distinct mid-tone wash of the core Stripe identity.

## Typography

Driven exclusively by sohne-var, the type system scales gracefully from lightweight, oversized hero statements to tightly tracked utility text. Slate Ink grounds paragraph legibility, while Knockout White ensures high contrast inside primary buttons.

- **button** — sohne-var 16px/400
- **button-5** — sohne-var 15px/400
- **subhead-6** — sohne-var 16px/300
- **body-lg** — sohne-var 20px/300
- **body-sm-3** — sohne-var 12px/500

## Layout

An architectural grid is made visible through fine Ghost Wireframe dividers. Generous padding creates distinct, breathable zones that separate complex technical diagrams from plainspoken marketing copy.

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **xl-7** `17px`
- **2xl** `8px`

## Components

Interactive surfaces are contained within tightly rounded cards, often framed by Soft Lavender Line borders. Buttons are compact and unadorned, relying purely on Stripe Blurple and crisp sohne-var text to signal action without unnecessary decoration.

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-focus**
- **button-secondary**
- **button-secondary-hover**
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
- **button-primary**
- **button-primary-hover**
- **button-primary-focus**
- **pricing-card**
- **status-badge**
- **testimonial-card**
- **text-input**

## Do's and Don'ts

- **Do** reference design tokens via `{colors.*}` / `{typography.*}` rather than raw hex.
- **Don't** introduce new color roles outside the documented palette without updating this file.

## Responsive Behavior

Harvest taken at 1440×900 (5 pages crawled). Per-breakpoint scales — phone/tablet/desktop variants — are not yet sampled; the next coverage phase will re-harvest at multiple viewport widths.

## Iteration Guide

Re-run the design-md job for a fresh extraction, or regenerate from an existing harvest with `node src/design-md/generate.mjs <jobId>`. Token roles are heuristic — review and rename before publishing.

## Known Gaps

- Elevation / box-shadow tokens not emitted (no shadow evidence on probed elements).
- Single-viewport snapshot — responsive scales pending.

