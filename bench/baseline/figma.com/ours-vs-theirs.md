# Figma — head-to-head grading (ours vs getdesign.md)

**Graded:** 2026-05-07 (post Session H multi-page crawl)
**Their source:** `npx getdesign@latest add figma` (getdesign 0.6.16)
**Our source:** `bench/baseline/figma.com/ours.md` (Session H multi-page run)

## Score on the CLAUDE.md 6-axis rubric

| Axis | Theirs | Ours | Δ |
|---|---|---|---|
| Color names | 9/10 | 3/10 | -6 |
| Role descriptions | 10/10 | 1/10 | -9 |
| Color-block fidelity | 10/10 | 0/10 | -10 |
| Variant labels | 9/10 | 5/10 | -4 |
| Hero copy | 10/10 | 0/10 | -10 |
| Overall coherence | 9/10 | 1/10 | -8 |
| **Total** | **57/60** | **10/60** | **-47** |

**Verdict: we are losing 10/60 vs 57/60 head-to-head on figma.com.** The Session H "variant-labels saturated 12/12" claim was scored against a self-made internal sub-rubric (presence of hover/focus/multi-pattern). On the actual CLAUDE.md rubric — which scores label *quality and brand fit*, not count — we lose this axis too.

## Per-axis evidence

### Color names — ours 3/10

**Theirs (20 named tokens):**
`primary`, `on-primary`, `ink`, `canvas`, `inverse-canvas`, `inverse-ink`, `on-inverse-soft`, `hairline`, `hairline-soft`, `surface-soft`, `block-lime`, `block-lilac`, `block-cream`, `block-pink`, `block-mint`, `block-coral`, `block-navy`, `accent-magenta`, `semantic-success`, `overlay-scrim`

**Ours (7 generic tokens):**
`canvas`, `primary`, `ink`, `on-primary`, `surface-1`, `surface-2`, `surface-hover`

Three concrete failures:

1. **Canvas/primary inverted.** Ours: `canvas: "#000000"`, `primary: "#ffffff"`. Figma's actual marketing canvas is **white**, ink is **black**. The role-assignment heuristic assigned the inverse. Likely caused by figma's heavy use of dark color blocks (navy, marquee strip) skewing the role classifier's "darkest = canvas" rule.
2. **`surface-2: "#cb9fd2"` is `block-lilac` mis-classified.** That hex is the lavender pastel block from `/design/`. Without color-block discovery (Phase 6.3), the deterministic extractor sees a non-canvas surface and reaches for `surface-2`.
3. **No brand-voice naming.** Their `accent-magenta`, `block-lime`, `block-navy` are descriptive; our `surface-2` is anonymous. The 6.4 role-naming AI stage is wired but blocked on the Gemini key.

### Role descriptions — ours 1/10

**Theirs:** every color has a 1–3 sentence usage prose:
> **Black** ({colors.primary}): The system primary. Every primary CTA, every headline, every body line, the marquee strip, the inverse canvas of dark sections.

**Ours:** flat bullet list with hex and nothing else. Generate.js doesn't emit role descriptions in deterministic mode; the 6.4 AI stage would supply them but isn't running (no key).

### Color-block fidelity — ours 0/10

**Theirs has 7 distinct `block-*` tokens** (lime, lilac, cream, mint, pink, coral, navy), each tied to a section ("recurs across home, pricing, contact"). This is the **defining feature of figma's marketing system** per their own description ("rigorously monochrome … interrupted by oversized, hand-cut pastel color blocks").

**Ours has 0 block tokens.** The lavender pastel did get extracted (as the misnamed `surface-2`) but we don't recognize it as a section-bg color, don't find the other 6 pastels, don't surface the page-rhythm pattern. Phase 6.3 (vision-driven color-block discovery) would fix this but isn't built.

### Variant labels — ours 5/10

**Theirs (component count: 19, with meaningful axes):**
`button-primary`, `button-primary-pressed`, `button-secondary`, `button-tertiary-text`, `button-icon-circular`, `button-icon-circular-inverse`, `button-magenta-promo`, `pricing-tab-default`, `pricing-tab-selected`, `text-input`, `text-input-focused`, `pricing-card`, `pricing-card-feature-row`, `color-block-section`, `color-block-section-lilac`, `color-block-section-navy`, `promo-banner-lilac`, `template-card`, `feature-illustration-tile`, `top-nav`, `marquee-strip`, `comparison-checkmark`, `footer`.

Variant axes encoded: state (pressed, selected, focused), surface inversion (icon-circular vs icon-circular-inverse), brand-axis (magenta-promo as a one-off), section-color (color-block-section-lilac/-navy).

**Ours (component count: 11, mostly hover):**
`button-tertiary`, `button-tertiary-hover`, `button-tertiary-hover-2`, `button-secondary`, `button-secondary-hover`, `button-primary`, `button-primary-hover`, `nav`, `top-nav`, `footer`, `text-input`.

Variant axis encoded: pseudo-state only (hover). We have richer hover *evidence* than they do (their `button-primary-pressed` has identical surface — they note "the live site relies on micro-scale rather than a darkened fill"; ours captures real overlay deltas). But we miss every other axis: no pressed (we don't probe), no selected (no classifier rule for tab-toggles), no focus (probe set didn't surface focusable inputs on figma), no inverse (no inversion classifier), no magenta-promo (no brand-color-binding heuristic).

### Hero copy — ours 0/10

**Theirs:**
> "A confident black-and-white editorial frame interrupted by oversized, hand-cut pastel color blocks. The marketing canvas is rigorously monochrome — figmaSans variable type, pure white surfaces, pure black ink, pill-shaped CTAs — while each story section drops the page into a saturated lime, lavender, cream, mint, or pink panel that reads like a sticky note placed on a clean desk. The result is a design system that feels both technical and joyful — a tool for serious work, made by people who like color."

**Ours:**
> "Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff, dominant typeface figmaSans. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles on representative DOM probes; component blocks reflect cascade-resolved values, not declared sources."

Ours is **meta-instrumentation prose** — describing the extractor's behavior, not the brand. Phase 6.7 (copy generation) is wired but blocked on the Gemini key.

### Overall coherence — ours 1/10

Three internal-consistency bugs in our output that getdesign.md doesn't have:

1. **`## Known Gaps` says "Pseudo-states (`:hover`, `:focus`) not yet captured"** while the components list right above it contains `button-tertiary-hover`, `button-secondary-hover`, `button-primary-hover`. **Self-contradiction.**
2. **"Elevation harvest is deferred to Phase 5"** — we're in Phase 6.x. Stale boilerplate.
3. **`## Iteration Guide`: "Regenerate from a fresh clone via `node src/design-md/generate.mjs <jobId>`"** — that path doesn't even match the actual CLI invocation in CLAUDE.md commands section.

Also missing entirely: cross-token references ("the selected tab feels like an active CTA because it shares `button-primary`'s surface"), page-rhythm callouts ("home rotates through the full color set"), brand-specific Don'ts ("Square buttons read as a different brand"). All boilerplate Do/Don't and Responsive sections in our output are frozen template text from an earlier phase.

## Where the gap lives, by cause

| Gap | Cause | Status | Phase fix |
|---|---|---|---|
| Generic color names (surface-2 vs block-lilac) | AI role-naming not running | Blocked on key | 6.4 (wired) |
| No role descriptions | AI not running, no deterministic prose | Blocked on key | 6.4 (wired) |
| No `block-*` discovery | Vision pipeline not built | Not started | 6.3 |
| Canvas/primary inverted | Role-assignment heuristic bug on dark-block-heavy sites | Real bug | independent fix |
| Missing pressed/selected/icon-inverse variants | No classifier rules + no probe sweeps for non-button toggles | Real gap | 6.5 follow-up |
| Boilerplate hero / meta-prose | Copy-gen AI not running | Blocked on key | 6.7 (wired) |
| "Pseudo-states not yet captured" contradiction | Frozen markdown template in generate.js | Real bug | independent fix (cheap) |
| Stale "Phase 5" / wrong CLI path | Frozen markdown template | Real bug | independent fix (cheap) |
| No cross-token coherence prose | No analyzer + AI not running | Blocked on key | 6.7 |

**Of the 47-point gap:** ~30 points are AI-blocked (color names + descriptions + hero copy + coherence prose), ~10 are vision-pipeline-blocked (color-block discovery), ~7 are real bugs we can fix without unblocking anything (template freeze, role inversion, missing pressed/selected classification).

## What this means for the plan

Session H's "12/12 variant-labels saturated" was scored against my own internal sub-rubric (does each site have hover, focus, multi-pattern variants). **That sub-rubric is not the CLAUDE.md rubric.** On the real rubric, variant-labels is 5/10 here because the axis isn't *count*, it's *brand-meaningful axes encoded*.

The honest read: **multi-page crawl moved variant count from 12 to 25 across 4 sites — that's a real win for raw evidence.** But it doesn't move us measurably on the head-to-head rubric vs getdesign.md, because the rubric scores quality and labeling, not raw count. Without 6.3 (color blocks) and 6.4 + 6.7 (AI naming + copy), the gap stays ~47 points wide on figma.

The Phase 6.10 vision-judge harness I proposed last turn would have caught this same conclusion automatically. The fact that I had to fetch and read 731 lines by hand to discover we lose 10/60 is itself an argument for building the judge before the next phase ships.

## Proposed next moves (after this bake)

1. **Cheap fixes, ship before next phase (~1 session):**
   - Strip the frozen boilerplate from generate.js (Known Gaps that contradicts components list, Phase-5 references, wrong CLI path).
   - Investigate the canvas/primary role-inversion bug on figma — likely a luminance-threshold or role-precedence issue when dark color-blocks dominate the probe set.

2. **6.10 vision judge** — build the harness so future grading is automated. This grading (figma) is the calibration set; theirs.md is the gold reference for the judge prompt.

3. **6.3 color-block discovery** — vision pipeline that takes the home + per-page screenshots, segments large pastel section backgrounds, mints `block-{color}` tokens. This single phase would close ~10 points of the gap on figma alone.

4. **Unblock 6.4 + 6.7** — the moment the Gemini key returns, ~30 points are recoverable on figma without any new code (the AI stages are wired in run.js).

A realistic pre-key-unblock target: **ours 10/60 → ours 25/60** via fixes (1) + (3). Post-key-unblock: **25/60 → 50/60** is plausible if 6.4/6.7 land cleanly. That's where "beat getdesign.md" becomes a defensible claim, not before.
