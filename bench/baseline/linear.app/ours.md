---
name: Linear
description: Linear is a precision-grade development system that presents a dense, dark-mode native interface optimized for focus, speed, and high-fidelity software creation.
colors:
  canvas: "#08090a"
  primary: "#5e6ad2"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  on-primary: "#ffffff"
  surface-1: "#0f1011"
  surface-2: "#3b3b3b"
  surface-3: "#474747"
  hairline: "#23252a"
  hairline-strong: "#2f2f31"
  hairline-tertiary: "#5c5d5f"
  ink-hover: "#666a71"
  surface-hover: "#5e69c1"
  ink-hover-2: "#34343a"
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
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-focus:
    textColor: "{colors.ink-hover}"
    borderColor: "{colors.ink-hover}"
  button-tertiary-hover-2:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-subtle}"
    borderColor: "{colors.ink-subtle}"
  button-secondary:
    typography: "{typography.button-4}"
    rounded: "{rounded.full}"
    padding: 0px 18px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-secondary-focus:
    backgroundColor: "{colors.surface-hover}"
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
    borderColor: "{colors.ink-hover-2}"
  feature-card-focus:
    backgroundColor: "{colors.hairline}"
    borderColor: "{colors.ink-hover-2}"
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

The visual identity of Linear is indistinguishable from its application interface. It leverages a strict monochrome foundation, purposeful typographic contrast, and utilitarian components to build an environment tuned for high-velocity software development.

## Voice

- **Precise** — The interface relies on strict geometric alignments, one-pixel Primary Hairline borders, and dense informational hierarchies to project exactness.
- **Subdued** — By grounding the canvas in Deep Space Black and reserving Primary Button Fill for primary actions, the surface fades away to let the user's work stand out.
- **Builder-focused** — The integration of Berkeley Mono for technical data and dense tabular layouts signals a tool built exclusively for technical teams.
- **Uncompromising** — High-contrast typography using Primary Ink against Primary Surface backgrounds demands attention without relying on superfluous ornamentation.

## Colors

Linear uses a deliberately restrained dark palette anchored by Deep Space Black and Primary Surface to reduce eye strain during long sessions. Linear Violet acts as a sole programmatic accent, guiding the eye toward key interactive states without overwhelming the data.

- **Deep Space Black** `#08090a` (`canvas`) — This is the primary background color for the entire Linear marketing site, establishing the deep, focused canvas for all content.
- **Linear Violet** `#5e6ad2` (`primary`) — Linear Violet serves as the primary accent color for links, highlights, and key interactive elements, drawing user attention to important actions.
- **Primary Ink** `#f7f8f8` (`ink`) — Primary Ink is used for high-emphasis text, like headlines and main navigation, ensuring maximum readability against dark backgrounds on the Linear site.
- **Muted Prose** `#d0d6e0` (`ink-muted`) — Muted Prose provides the color for secondary body copy and descriptions, offering clear legibility without competing with primary headlines in the Linear interface.
- **Subtle Interface Text** `#8a8f98` (`ink-subtle`) — This subtle gray is used for standard interface text and metadata throughout the Linear product, maintaining a clean and focused user experience.
- **Tertiary Metadata** `#62666d` (`ink-tertiary`) — Tertiary Metadata is applied to the least prominent text elements, such as timestamps and secondary identifiers, ensuring they remain available but unobtrusive.
- **Primary Button Fill** `#ffffff` (`on-primary`) — This pure white is reserved for high-contrast fills, most notably on primary call-to-action buttons, making them stand out on the Linear homepage.
- **Primary Surface** `#0f1011` (`surface-1`) — Primary Surface provides the foundational background color for the main content areas and panels within the Linear application interface.
- **Subtle Component Surface** `#3b3b3b` (`surface-2`) — This subtle surface color is used for contained elements like code blocks or highlighted regions, providing slight separation from the primary background in Linear.
- **Popover Surface** `#474747` (`surface-3`) — This distinct surface color is used for elevated components like tooltips and popovers, visually lifting them from the main Linear application pane.
- **Primary Hairline** `#23252a` (`hairline`) — The Primary Hairline defines soft borders and dividers between major UI regions in the Linear application, creating structure without visual noise.
- **Strong Hairline** `#2f2f31` (`hairline-strong`) — This more prominent hairline is used to outline key containers, providing a clear visual boundary for the main application window within the Linear site.
- **Component Border** `#5c5d5f` (`hairline-tertiary`) — This visible border is applied to smaller, self-contained components like avatars or tags to give them definition against their background in the Linear UI.
- **Interface Hints** `#666a71` (`ink-hover`) — This subtle ink is used for placeholder text and contextual hints, guiding users without demanding attention in the Linear application.
- **Primary Accent Hover** `#5e69c1` (`surface-hover`) — Primary Accent Hover provides immediate visual feedback when a user interacts with key links or calls to action within the Linear brand experience.
- **Ink on Light** `#34343a` (`ink-hover-2`) — This dark ink is used for text on light-colored backgrounds, such as primary buttons, ensuring high contrast and legibility for key actions on the Linear site.

## Typography

The typographic system pairs the utilitarian legibility of Inter Variable with the mechanical precision of Berkeley Mono. Linear uses stark contrast, scaling from Primary Ink headlines down to Subtle Interface Text, to establish a strict reading hierarchy across dense application views.

- **button** — Inter Variable 14px/500
- **button-4** — Inter Variable 13px/500
- **mono** — Berkeley Mono 14px/400
- **body-2** — Inter Variable 16px/400
- **body-sm-2** — Inter Variable 12px/400

## Layout

Layout principles derived from observed component spacing and grid behavior. See spacing tokens below.

## Elevation & Depth

No `box-shadow` tokens harvested from probes on this site. If the brand uses elevation, it isn't reaching the elements we sample — re-harvest with extended probe selectors to surface it.

## Shapes

- **xl** `8px`
- **full** `9999px`
- **sm** `4px`
- **md** `5px`

## Components

Application components in Linear are designed to be tightly packed and functionally dense, separated only by subtle Primary Hairline borders. This approach favors raw utility, surfacing metadata and actions inline to keep users in a state of flow.

- **button-tertiary**
- **button-tertiary-hover**
- **button-tertiary-focus**
- **button-tertiary-hover-2**
- **button-secondary**
- **button-secondary-hover**
- **button-secondary-focus**
- **text-input**
- **top-nav**
- **nav**
- **footer**
- **feature-card**
- **feature-card-hover**
- **feature-card-focus**
- **hero-section**
- **cta-banner**
- **status-badge**
- **button-primary**

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

