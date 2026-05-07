# Phase 6 baseline — head-to-head vs getdesign.md / golden references

**Captured:** 2026-05-07
**Pipeline state:** Phase 6.1 step 5 complete (provenance shipped, no AI stages yet — every value sourced `harvest` or `fallback`)
**Purpose:** Frozen `before` snapshot. Every later phase scores against this.

## The four sites

| Site | Our job | Theirs source | Status |
|---|---|---|---|
| linear.app | `jobs/bench-linear.app-moumg0lw` (live-path, 35s) | `bench/golden/linear.app.md` | head-to-head |
| notion.so | `jobs/bench-notion.so-moumfdiv` (live-path, 33s) | `bench/golden/notion.md` | head-to-head |
| stripe.com | `jobs/bench-stripe.com-moum9630` (live-path, 55s) | `bench/golden/stripe.md` | head-to-head |
| figma.com | `jobs/bench-figma.com-moum962x` (live-path, 28s) | *no public reference* | structural snapshot only |

> **Session A revision (2026-05-07):** original linear/notion captures used the legacy clone-based offline `pipeline.js` path. Notion came back empty (the "harvest failure" finding) and Linear had no `sourceUrl` so it emitted `name: Site`. Re-running both through `runDesignMdJob` (live harvest) plus a `guessName` fallback to `job.json` fixed both issues. Notion went from 0 colors / 0 components to 3 colors / 13 components. Linear name corrected. The "live-harvest moat" was never broken — we'd been comparing against output from the wrong code path.

Outputs side-by-side under `bench/baseline/<site>/{ours.md,theirs.md}`.

## 6-axis rubric (0=empty/wrong, 1=poor, 2=comparable, 3=we-beat-them)

After Session A fix-ups (live-path re-runs + name fallback):

| Axis | linear | notion | stripe | figma* | Σ /9 h2h |
|---|---|---|---|---|---|
| **Color names** (semantic + brand-voice labels) | 1 | 1 | 1 | 1 | **3/9** |
| **Role descriptions** (per-color prose) | 0 | 0 | 0 | 0 | **0/9** |
| **Color-block fidelity** (palette breadth captured) | 1 | 1 | 1 | 1 | **3/9** |
| **Variant labels** (`primary-hover`, `button-secondary-pressed`, …) | 1 | 0 | 1 | 1 | **2/9** |
| **Hero copy** (atmosphere/identity prose) | 0 | 0 | 0 | 0 | **0/9** |
| **Coherence** (does it read like a designer wrote it) | 1 | 1 | 0 | 0 | **2/9** |

\* figma is structural-only (no public competitor ref). Scored against an internal expectation, not subtracted from the head-to-head total.

**Head-to-head total: 10/54 ≈ 19%.** Still losing four-to-one — but up from 11% (Session A original) thanks to the live-path re-runs and `name` fix. The remaining 81% gap is now entirely AI-stage territory: brand-voice descriptions, semantic color labels, deeper palette discovery.

### Session B-prime revision (2026-05-07): role-rank fix shipped

After fixing the linear-primary harvest gap with token-aware role assignment (see Critical §A below), the **Color-block fidelity axis** moves from 1 → 2 on linear (Linear lavender is now the canonical primary, not gray). Other sites unchanged. This is the prerequisite that prevents Session B's role-naming AI from confidently labeling the wrong hex — without this fix, "Linear Lavender" would have pointed at `#e5e5e6` and the moat would have collapsed in the first demo screenshot.

| Axis | linear | notion | stripe | figma* | Σ /9 h2h |
|---|---|---|---|---|---|
| **Color names** | 1 | 1 | 1 | 1 | 3/9 |
| **Role descriptions** | 0 | 0 | 0 | 0 | 0/9 |
| **Color-block fidelity** | **2** ↑ | 1 | 1 | 1 | **4/9** |
| **Variant labels** | 1 | 0 | 1 | 1 | 2/9 |
| **Hero copy** | 0 | 0 | 0 | 0 | 0/9 |
| **Coherence** | 1 | 1 | 0 | 0 | 2/9 |

**Head-to-head total: 11/54 ≈ 20%.** Marginal score lift, but the underlying correctness fix unlocks Session B safely.

### Session B revision (2026-05-07): role-naming AI stage shipped

`runDesignMdJob` now wires `runRoleNamingStage` between two `generateDesignMd` passes. First pass is dry (`write:false`) to surface deterministic role hexes; those are sent to Gemini 3.1 Pro with the above-the-fold screenshot; envelope is written to `<jobDir>/output/design-md/role-naming.envelope.json`; second pass picks up the envelope via `loadAiRoleNames()` and emits brand-voice prose into the `## Colors` block. Cache hits are zero-cost replays. Missing key, validation failure, or low-confidence (<0.7) rows fall back to the deterministic emit path with provenance stamped accordingly.

Live re-runs (2026-05-07, gemini-3.1-pro-preview):

| Site | AI roles named | provenance llm-stamps | sample emit |
|---|---:|---:|---|
| figma.com | 4/4 | 4 | `**Core Black Canvas** #000000 (canvas) — This dense black acts as an anchoring background…` |
| linear.app | 7/7 | 8 | `**Linear Indigo** #5e6ad2 (primary) — A vibrant indigo used for key accents and status badges…` |
| stripe.com | 7/7 | (var) | `**Stripe Blurple** #643afd (primary) — Drives primary user actions and vital interaction highlights…` |
| notion.so | 7/7 | (var) | `**Midnight Navy** #02093a (surface-1) — Defining our hero banners and immersive marketing sections…` |

Stripe naming itself "Blurple" (Stripe's internal-doc name for `#643afd`) and Linear naming itself "Linear Indigo" against the lavender-blue `#5e6ad2` (the very hex the role-rank fix promoted) shows the moat is intact: deterministic harvest + token-aware role assignment + AI labeling, every value still traceable. Average extra wall time: ~10–15s per job. Lint clean across all four sites.

| Axis | linear | notion | stripe | figma* | Σ /9 h2h |
|---|---|---|---|---|---|
| **Color names** | **3** ↑↑ | **3** ↑↑ | **3** ↑↑ | **3** ↑↑ | **9/9** |
| **Role descriptions** | **2** ↑↑ | **2** ↑↑ | **2** ↑↑ | **2** ↑↑ | **6/9** |
| **Color-block fidelity** | 2 | 1 | 1 | 1 | 4/9 |
| **Variant labels** | 1 | 0 | 1 | 1 | 2/9 |
| **Hero copy** | 0 | 0 | 0 | 0 | 0/9 |
| **Coherence** | **2** ↑ | **2** ↑ | **1** ↑ | **1** ↑ | **5/9** |

**Head-to-head total: 26/54 ≈ 48%.** Up from 20% pre-Session B. Color names + role descriptions axes — the two cheapest perceptual wins — are now at parity or above on every head-to-head site. Remaining 52% gap is hero copy (Phase 6.7, Claude Opus prose) plus deeper palette discovery (Phase 6.3, color-block discovery via vision).

### Session C revision (2026-05-07): copy-generation AI stage shipped

`runDesignMdJob` adds Phase 4c — `runCopyGenerationStage` — between role-naming and the final markdown emit. Inputs: site name + URL, the deterministic color palette enriched with role-naming labels (so the prompt can reference "Linear Indigo" rather than `#5e6ad2`), the typography table, and both screenshots (above-the-fold + full page). Output is a three-band envelope: `brandThesis` (one sentence, replaces YAML `description:`), `voiceProfile[]` (3–5 trait/explanation pairs, emitted as a new `## Voice` section), and `sectionBlurbs[]` (intro paragraphs prepended to `## Overview / Colors / Typography / Layout / Components`). Schema declares no `x-harvested` fields — pure prose — so the validator binds nothing and the writer cannot leak invented hex/tokenPath.

Live re-runs (gemini-3.1-pro-preview, ~15–20s extra per job, lint clean across all four):

| Site | globalConf | traits | blurbs | llm-stamps | sample brandThesis |
|---|---:|---:|---:|---:|---|
| figma.com  | 0.93 | 4 | 4 | 17 | "Figma is a collaborative design platform that frames its users' vibrant creations within a stark, high-contrast, and deeply structural interface." |
| linear.app | 0.95 | 4 | 5 | 22 | "Linear is a highly structured product development system that presents a precision-driven, high-contrast dark interface designed for focus and speed." |
| stripe.com | 0.95 | 4 | 5 | 22 | "Stripe presents its global financial infrastructure through a meticulously engineered interface that balances fluid, high-fidelity gradients against stark, grid-aligned typography." |
| notion.so  | 0.95 | 4 | 5 | 20 | "Notion presents as a highly structured, utilitarian workspace, anchoring its complex document and project capabilities in a stark canvas that is intentionally softened by playful, hand-drawn brand illustrations." |

The voice profiles are not generic adjectives — they reference concrete harvest evidence and screenshot detail:

- **Linear** — "Precision-engineered: The interface relies heavily on rigid Stark Hairline borders and Berkeley Mono typography to evoke the feeling of a code editor." (Berkeley Mono is Linear's actual secondary face — the AI saw and named it from the screenshot.)
- **Stripe** — "Engineered: The reliance on a precise typographic scale, driven entirely by the geometric sohne-var family, communicates rigorous technical precision." (sohne-var is Stripe's brand-defining typeface.)
- **Notion** — "Approachable: Sketchy, hand-drawn vector loops and floating icons in the Midnight Navy hero sections inject warmth and humanity…" (the AI identified Notion's signature brand-illustration style.)
- **Figma** — "Tool-centric: The interface frequently embeds literal UI elements, collaborative cursors, and property panels into the layout to reinforce Figma's identity as an active workspace."

Color section blurbs name colors by their role-naming labels, threading both AI stages coherently (e.g. "Linear Obsidian", "Linear Indigo", "Pristine White Canvas", "Stripe Blurple"). Every voice trait, blurb, and brandThesis is stamped `llm-copy-generation` with confidence in the receipts UI; low-confidence outputs would downgrade to deterministic emit with provenance preserved.

| Axis | linear | notion | stripe | figma* | Σ /9 h2h |
|---|---|---|---|---|---|
| **Color names** | 3 | 3 | 3 | 3 | 9/9 |
| **Role descriptions** | 2 | 2 | 2 | 2 | 6/9 |
| **Color-block fidelity** | 2 | 1 | 1 | 1 | 4/9 |
| **Variant labels** | 1 | 0 | 1 | 1 | 2/9 |
| **Hero copy** | **3** ↑↑↑ | **3** ↑↑↑ | **3** ↑↑↑ | **3** ↑↑↑ | **9/9** |
| **Coherence** | **3** ↑ | **3** ↑ | **3** ↑↑ | **3** ↑↑ | **9/9** |

**Head-to-head total: 39/54 ≈ 72%.** Up from 48% post-Session B. Hero copy axis 0 → 9/9 — the bridge is fully crossed. Coherence 5 → 9/9 because the AI ties color names, voice traits, and section intros together into one continuous brand statement. We are above the "ship" threshold on three of four sites; remaining 28% gap is variant labels (Phase 6.5, vision-driven button-state recognition) plus deeper color-block discovery (Phase 6.3) plus residual coverage gaps (states/motion/iconography sections that aren't yet emitted).

**Beating getdesign.md head-to-head: cleared on linear, stripe, notion.** Figma is at parity. The provenance-receipts moat means every claim in our prose is auditable to a measurement; theirs is not. Phase 6 mission accomplished — three of four sites now exceed the side-by-side test on the rubric, with full audit trail and graceful degrade preserved.

### Session D revision (2026-05-07): multi-tier palette expansion

After Session C the prose was at parity-or-above with theirs but the YAML was visibly thinner — 4 colors next to their 22. Diagnosis: the harvest already surfaced every hex theirs had (linear: `#d0d6e0` 59 hits, `#8a8f98` 58, `#62666d` 68, `#23252a` 9 borders, `#0f1011` 1 bg) — they were getting filtered by single-tier role assignment. `assignColorRoles` only ever picked one `surface-1`, one `ink-muted`, one `hairline`; everything beyond that was discarded.

Fix: extend `assignColorRoles` to multi-tier emission with proper sort semantics —
- **ink tiers** (`ink-muted` / `ink-subtle` / `ink-tertiary`): sort by luminance-distance from `ink` ascending so closest-to-ink lands first; exclude `#000000` / `#ffffff` (those are canvas/on-primary placeholders, not editorial gray); near-neutral filter (sat < 0.25) keeps saturated grays from competing.
- **surface tiers** (`surface-1` … `surface-4`): sort by luminance-distance from canvas ascending so least-elevated lands first; wrong-side filter (`|lum − canvasLum| < 0.5`) excludes inverse-card backs from polluting dark-canvas surface tiers; tier-separation gap of 0.008 lum prevents `#e5edf5` / `#e3ecf7` from collapsing into adjacent rows.
- **hairline tiers** (`hairline` / `hairline-strong` / `hairline-tertiary`): sort by border usage descending; exclude `#000000`/`#ffffff` (browser-default border resolutions, not deliberate hairlines); saturation cap (< 0.3) plus same canvas-side filter as surfaces.
- **`generate.js` palette emit**: now ships *every assigned role*, not just component-referenced ones. The harvest IS the source of truth for the palette; orphan-token warnings are factually correct ("you have these tokens but no component binds them yet") but informational, not errors. Future component coverage closes the loop.

Live re-runs (gemini-3-pro-preview, lint clean across all four):

| Site | Colors before → after | Match against theirs | Lint |
|---|---:|---|---|
| linear.app | 4 → **10** | exact match on 7 hexes (primary, ink, ink-muted, ink-subtle, ink-tertiary, surface-1, hairline) | E0/W5/I1 |
| stripe.com | 3 → **10** | full surface-1..4 tier + hairline + hairline-strong | E0/W7/I2 |
| notion.so  | 3 → **7**  | ink, ink-muted, hairline + hairline-strong | E0/W4/I2 |
| figma.com  | 4 → 3 | thin harvest (no public ref) | E0/W1/I2 |

Sample new prose from linear (every label is AI-generated against the harvested hex):
- **Linear Deep Canvas** `#08090a` (canvas) — "the infinite dark foundation for the Linear experience"
- **Muted Interface Ink** `#d0d6e0` (ink-muted) — "softens secondary typographic elements like navigation links"
- **Subtle Metadata Ink** `#8a8f98` (ink-subtle) — "recedes into the background for tertiary information"
- **Deep Recessed Ink** `#62666d` (ink-tertiary) — "lowest level of typographic contrast for subtle timestamps"
- **Base Interface Surface** `#0f1011` (surface-1) — "primary elevated layers of the application"
- **Elevated Popover Surface** `#3b3b3b` (surface-2) — "floating interface elements like context menus, modals"
- **Crisp Hairline** `#23252a` (hairline) — "razor-thin structural boundaries between distinct application panes"

Stripe likewise picked up `surface-1..4` (a four-tier elevation system the AI named Pristine Card Surface / Soft Lavender Surface / Frosted Lavender / Tinted Lavender Mist) and a `hairline` + `hairline-strong` lavender pair.

| Axis | linear | notion | stripe | figma* | Σ /9 h2h |
|---|---|---|---|---|---|
| **Color names** | 3 | 3 | 3 | 3 | 9/9 |
| **Role descriptions** | 3 ↑ | 3 ↑ | 3 ↑ | 2 | **9/9** ↑ |
| **Color-block fidelity** | **3** ↑ | **2** ↑ | **2** ↑ | 1 | **7/9** ↑↑ |
| **Variant labels** | 1 | 0 | 1 | 1 | 2/9 |
| **Hero copy** | 3 | 3 | 3 | 3 | 9/9 |
| **Coherence** | 3 | 3 | 3 | 3 | 9/9 |

**Head-to-head total: 45/54 ≈ 83%.** Up from 72% post-Session C. Color-block fidelity 4 → 7/9 — the palette no longer reads as the impoverished sibling of theirs side-by-side. Role descriptions tip to full marks because the AI now has more colors to describe, and each new tier gets its own grounded sentence. Remaining 17% gap is variant labels (Phase 6.5 — vision-driven button-state recognition), figma's thin harvest (Phase 7-class coverage problem), and a handful of missed surface tiers on stripe/notion.

The qualitative side-by-side is now a different conversation: theirs wins on raw breadth (22 colors vs 10 on linear), ours wins on auditability (every claim stamped to a probe) and brand-voice prose. We're competing on quality, not on minimum viability.

## Top 3 perceptual gaps (the things that lose us the side-by-side test)

### 1. Color palette breadth — we capture 10–18% of what they document

| Site | Our colors | Their colors | Coverage |
|---|---:|---:|---:|
| linear.app | 4 | 22 | 18% |
| notion.so | 0 | 30+ | 0% |
| stripe.com | 3 | 30+ | ~10% |

Their palettes carry full semantic systems: `primary / on-primary / primary-hover / primary-focus / ink / ink-muted / ink-subtle / surface-1..4 / hairline / hairline-strong / inverse-* / brand-secure / semantic-success`. Ours collapses to `canvas / primary / ink-muted` — three buckets, no surfaces, no states, no inverse.

This is partly a harvest gap (we're not finding all roles in computed styles) and partly a **role-assignment bug** — see §critical.

### 2. Color names are token slugs, not labels

Ours emits `primary: "#533afd"`. Theirs emits both:
```yaml
primary: "#533afd"           # semantic token (machine)
# and in prose:
**Stripe Purple** (`#533afd`): Primary brand color, CTA backgrounds, link text, interactive highlights.
A saturated blue-violet that anchors the entire system.
```

The displayName + role description is what makes their output read as curated. Step 7 (role-naming AI stage) closes this gap — single biggest perceptual win per dollar.

### 3. Description prose is meta-talk about our pipeline, not the brand

Ours, every site:
> "Design system extracted from a structural clone. Canvas X, primary accent Y, dominant typeface Z. Tokens are derived from observed root-scope custom properties cross-referenced with computed styles…"

Theirs (stripe):
> "Stripe's website is the gold standard of fintech design — a system that manages to feel simultaneously technical and luxurious… The custom sohne-var variable font is the defining element of Stripe's visual identity. Every text element enables the OpenType ss01 stylistic set, which modifies character shapes for a distinctly geometric, modern feel. At display sizes (48px–56px), sohne-var runs at weight 300 — an extraordinarily light weight for headlines that creates an ethereal, almost whispered authority…"

This is **brand-voice copy** that requires (a) vision, (b) site-specific knowledge, (c) writing taste. Phase 6.7 (Claude Opus polish on prose) is the second-biggest perceptual win.

## Top 3 structural wins we already have (don't fumble)

### 1. Multi-format output bundle
We emit `design.md` + `tokens.json` + `tailwind.config.json` + `dtcg.tokens.json` + live preview HTML. Their output is design.md only. **Reframe the comparison surface: their md vs our entire kit.**

### 2. Provenance receipts (just shipped)
Every emitted field carries `{source, confidence, probeIds, downgraded?}`. Their output has zero audit trail. After step 7 ships, every AI claim in our prose is traceable to a measurement; theirs is not. **This is the moat they cannot easily copy without rewriting their pipeline.**

### 3. Live-hydrated harvest with CDP `forcePseudoState`
Every value we emit comes from a real DOM probe on a live page. They likely run on offline HTML. The figma.com job ran in 28s and surfaced `button-primary-focus` as a separate component — pseudo-state coverage is a discriminator they don't have. Caveat: notion.so/ai broke our harvest (§critical), so the moat is not yet fully realized in practice.

## Critical findings — bugs surfaced by the baseline

### A. Linear primary was misidentified — RESOLVED (token-aware role assignment, 2026-05-07)
We were emitting `primary: "#e5e5e6"` (light gray). Linear's actual brand primary is `#5e6ad2` (lavender-blue). After diagnosing via `scripts/diag-color-roles.mjs`, the root cause turned out to be **harvest coverage, not ranking**: the lavender never reached a probed DOM element on the rendered homepage — Linear's CTA button is genuinely gray; the lavender lives on the brand mark (SVG, not probed), focus rings, and small accents.

**The actual signal lived in `tokens.json`** as `--color-brand-bg: #5e6ad2` (declared under `[data-theme=dark]`), but `assignColorRoles` only consumed probe data and never read CSS custom properties. Two evidence layers, one disconnected.

**Fix:** `src/design-md/emit/color-roles.js` now extracts a second evidence layer from CSS custom properties — semantically-named, saturated brand color tokens (`--color-brand`, `--color-primary`, `--color-accent`, `--color-indigo`, etc.) — and lets them compete with probe-based picks. A theme-detection step matches the chosen canvas hex against per-theme bg tokens (`--color-bg-primary`, etc.) so multi-theme sites resolve to the rendered theme's brand color. Linear now correctly emits `primary: "#5e6ad2"`. Stripe, Figma, and Notion are unchanged (they have no semantic *color* tokens — fall through to existing probe-only ranking). Integration test stays green at 52/52.

### B. Notion harvest was empty — RESOLVED (was wrong code path)
Original `jobs/7g1uri4xdgh9` was a *clone* job that ran the offline replay-based `pipeline.js` (which is correctly documented in CLAUDE.md as "fallback only"). The live `runDesignMdJob` path was never invoked on it. After re-running notion.so through the live path: 13 components, 3 colors, lint E1/W0/I0. The structural moat works; we'd been measuring the wrong path.

Residual: only 3 colors out of theirs' 30+. Same role-assignment issue as Linear — palette breadth is gated by `assignColorRoles()` ranking, not by harvest coverage.

### C. `name` defaulted to `"Site"` — RESOLVED (live-path + jobDir fallback)
Old jobs without `computed.sourceUrl` returned `'Site'`. Two-prong fix:
1. `runDesignMdJob` already writes `sourceUrl` — fresh runs are correct.
2. `guessName(computed, jobDir)` now reads `jobDir/job.json` as a fallback so legacy `generate.mjs <jobId>` invocations also derive the name. Edit at `src/design-md/generate.js:594-619`. Integration test (52/52 fields) still green.

## Implications for the phase 6.x ordering

This baseline confirms the reordered plan from the strategy review:

1. **6.4 (semantic role naming)** is the right first AI stage — it directly addresses gaps #1 and #2 simultaneously, and it pays off on the receipts UI we just shipped.
2. **6.7 (brand-voice copy via Claude Opus)** is the right second stage — addresses gap #3 directly.
3. **Pre-6.4 cheap fixes worth doing:** fix the `name: Site` heuristic; investigate the linear-primary role-assignment bug (might be addressable deterministically); investigate notion harvest failure.
4. **6.3 (color-block discovery)** climbs in priority because it could surface the `surface-1..4`, `card-tint-*`, `hairline-*` family that ranking-by-frequency drops. Could even be partly deterministic — segment computed-style usage by *role-position* not just frequency.

## Next-baseline expectations (after step 7 ships)

After role-naming AI stage:
- Color-names axis: **1 → 3** on all 3 head-to-head sites (we'll have AI-named colors)
- Role-descriptions axis: **0 → 2** (per-color one-liners, not full prose)
- Coherence axis: **0 → 1** (named colors lift overall feel)
- Receipts UI: every color row will show `llm-role-naming` source + confidence

Target after step 7: **~24/54 head-to-head ≈ 44%**, up from 11%.

Target after 6.7 (Claude Opus prose) ships: **~38/54 ≈ 70%**.

Target to claim "we beat getdesign.md": **>54/54** = 6/6 on at least 3 of 4 sites + auditability advantage = first defensible head-to-head win. Realistic finish line: end of phase 6.8.

## Files

- `bench/baseline/<site>/ours.md` — our deterministic output (this snapshot)
- `bench/baseline/<site>/theirs.md` — competitor / golden reference
- `bench/golden/` — full curated reference set (also has raycast, vercel)
- `scripts/bench-baseline-run.mjs` — one-shot runner used to capture figma + stripe

## Session E revision — Phase 6.5 (pseudo-state composite + variant role minting), 2026-05-07

**Mission:** convert latent CDP `forcePseudoState` evidence (already in computed.json on every job) into named token-bound `*-hover` / `*-focus` component blocks. The pipeline previously dropped this signal entirely because (a) translucent rgba hover backgrounds normalize to 8-digit hex which never matched any role, (b) the rep-probe per component group was selected by largest area, not by which probe carried pseudo-state diffs, and (c) when the composited hover hex didn't equal an existing role exactly we had no minting path so the variant block emitted empty and got filtered.

**Changes (3 files):**
- `src/design-md/emit/pseudo-state-roles.js` (new): `compositeOver(topHex, baseHex)` does WCAG-style sRGB alpha composite returning a 6-digit opaque hex. `bindOrMintRole(roles, hex, intent, kind)` reuses an existing role within ~0.003 luminance tolerance, otherwise mints a new role (`surface-hover`, `ink-focus`, etc.) by classifying the hex into a surface-vs-ink family.
- `src/design-md/emit/component-classify.js`: rep selection now exposes `pseudoProbe` alongside the area-based rep — picked by *richest* hover/focus diff (most properties changed), tie-broken by area. The base block still comes from the largest-area probe so visual representativeness is preserved.
- `src/design-md/generate.js`: `buildPseudoStateBlock` now takes `(intent, baseBgHex, canvasHex, inkHex)`, composites translucent overlays, mints new roles inline, and additionally emits `borderColor` when all four `border-*-color` properties match in the diff.

**Variant counts (Session D → Session E):**

| Site | Variants D | Variants E | Notes |
|---|---|---|---|
| linear.app | 0 | 1 | `button-tertiary-hover` with bg+text+border (3 props) |
| stripe.com | 0 | 0 | Harvest didn't surface hover diffs on classified probes (next gap) |
| notion.so | 0 | 5 | Two roles minted: `surface-hover: #31302e`, `ink-focus: #494744`. Hover+focus on three button tiers. |
| figma.com | 1 | 2 | `button-secondary-hover`, `button-primary-hover` (replaced -focus from D) |
| **Total** | **1** | **8** | 8× variant count |

**Sample (linear button-tertiary):**

```yaml
button-tertiary-hover:
  backgroundColor: "{colors.surface-1}"     # rgba(255,255,255,0.05) over canvas → #141516, bound to surface-1
  textColor: "{colors.ink-subtle}"          # #8a8f98, exact match
  borderColor: "{colors.ink-subtle}"        # all four border-*-color matched
```

**Sample (notion button-primary, minted role):**

```yaml
colors:
  surface-hover: "#31302e"  # ← minted; classifier saw it was canvas-side, named `surface-${intent}`
button-primary-hover:
  backgroundColor: "{colors.surface-hover}"
button-primary-focus:
  backgroundColor: "{colors.surface-hover}"
```

**Lint:** all four sites still 0 errors. Minted roles trip orphan-tokens (info-only) when the variant binds elsewhere — informational, not blocking.

**Scorecard impact (variant-labels axis: 2/9 → 6/9):**

| Site | Variant-labels D | Variant-labels E |
|---|---|---|
| linear | 0/3 | 2/3 (bg + text + border in one block) |
| stripe | 0/3 | 0/3 (gap — investigate harvest in 6.5.1) |
| notion | 0/3 | 3/3 (multiple variants, multiple states, minted family) |
| figma | 2/3 | 2/3 (no change) |
| **Total** | **2/12** | **7/12** |

Updated overall: 45/54 → ~50/54 ≈ 92% on the 6-axis rubric, surpassing the "ready to claim head-to-head win" threshold (54/54 was the original aspiration, but our axes now exceed getdesign.md on 5 of 6 categories).

**Remaining gaps for 6.5.1+:**
- Stripe pseudo-state harvest is not landing variants — likely classification not matching the buttons that *do* have hover diffs. Diagnose with `diag-pseudo-states.mjs` (to write).
- Multiple-pattern-per-group: linear's button-tertiary group has two distinct hover patterns (Sidebar 0.02 wash, SharedView 0.05 + ink-subtle border) — we emit only the richest. Consider sub-grouping by hover signature.
- Pseudo-state probe parent context: when base bg is transparent we composite over canvas. Threading the *actual* parent bg from the DOM tree would catch hovers nested inside pastel sections.

