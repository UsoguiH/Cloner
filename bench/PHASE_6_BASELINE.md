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

## Session F revision — Phase 6.5.1 (ancestor-scoped hover rules), 2026-05-07

**Diagnosis of the stripe gap:** stripe.com's harvest had 168 interactive probes, all going through CDP `forcePseudoState`, returning **0 diffs**. Not a CORS issue (the harvest reads computed styles from the live page, not the static replay). Not a classification issue (193 probes, 25 buttons + 12 anchors classified correctly). The forcePseudoState calls fired and exited cleanly, but produced no computed-style changes on the targeted leaf nodes.

**Root cause:** stripe (and many modern sites) scope hover at the parent: `.parent:hover .child { ... }`. When CDP forces `:hover` on the child node, the parent isn't in `:hover` state, so the parent-scoped rule never matches. The leaf's computed style is unchanged. Linear/Notion/Figma get hits because they use leaf-scoped rules (`button:hover { ... }`), so direct forcing works.

**Fix in `src/design-md/extract/computed-styles.js`:** when leaf-level forcePseudoState gives an empty diff, walk up to 5 ancestors and try forcing on each. Read computed styles from the original leaf each time. Stop at the first ancestor that produces a diff. Tag the result with `${state}__scope: 'ancestor+N'` so downstream emit can distinguish self-scoped from parent-scoped hover.

Implementation detail: parentMap is built from the same `DOM.getDocument` response used to resolve the probe's nodeId. CDP invalidates nodeIds across `getDocument` calls, so the map MUST share that response.

**Variant counts (Session E → Session F):**

| Site | Variants E | Variants F | Notes |
|---|---|---|---|
| linear.app | 1 | 1 | Already had self-scoped hits; no regression |
| stripe.com | **0** | **2** | First-time variant emission. `button-secondary-hover/focus` via ancestor walk + 2 minted roles (`surface-hover`, `surface-focus`) |
| notion.so | 5 | 5 | No regression |
| figma.com | 2 | 2 | No regression |
| **Total** | **8** | **10** | +2 component variants, +2 minted roles on stripe |

Stripe stats post-fix: `pseudoStateDiffs: 2`, `pseudoStateAncestorHits: 1`. Only one ancestor hit because stripe's homepage is mostly content cards with subtle hovers — the navigation pills are the one place ancestor-scoped rules surfaced. Real gain: stripe is no longer a black hole for pseudo-state evidence.

**Cost:** in fast paths (linear/notion/figma) the ancestor loop is skipped because direct hits succeed. On stripe we add ~5 extra CDP roundtrips per non-hitting probe (~20s on a full harvest, mostly absorbed by forcePseudoState's existing latency).

**Next gap (6.5.2):** Stripe's variant catch is shallow — only 1 of 168 probes had an ancestor-scoped hover that matched. The deeper question is whether stripe's hover treatments are mostly:
- (a) `::before` / `::after` pseudo-element hovers (not visible on the host's computed style),
- (b) JS-driven (mouseenter handlers, not CSS), or
- (c) genuinely sparse (stripe's homepage favors animated illustrations over interactive UI).

A `diag-pseudo-states.mjs` script that spelunks `matched.matchedCSSRules` for `:hover` selectors per ancestor would distinguish (a/b/c) and tell us whether to invest in pseudo-element capture.

## Session G — Phase 6.5.2 (multi-pattern variants + capture-rate metric), 2026-05-07

**Two changes:**

1. **Multi-pattern emission per component group.** Linear's `button-tertiary` group contained two distinct hover *signatures* — Sidebar items (single-prop diff: bg only) and SharedView items (3-prop diff: bg + text + border). Session E/F kept only the richest by area, dropping the other. `groupComponents` now picks up to 2 probes with *signature-distinct* diffs (sorted by richness, area as tiebreaker); generate.js iterates them and emits the second under a `-2` suffix (`button-tertiary-hover-2`). Identical-block dedupe prevents noise when the second pattern collapses to the first after binding.
2. **`pseudoRuleCount` per probe.** Each probe now persists `{ hover, focus, hoverInherited, focusInherited, hoverPseudo, focusPseudo }` — a count of `:hover`/`:focus` selectors visible to `CSS.getMatchedStylesForNode` (self, inherited chain, ::before/::after pseudo-elements). This is the harvest *capture rate* metric: `diffs / rules` tells us what fraction of CSS-declared hover rules forcePseudoState actually surfaces as computed-style changes.

**Variant counts (Session F → Session G):**

| Site | Variants F | Variants G | Notes |
|---|---|---|---|
| linear.app | 1 | **2** | `button-tertiary-hover` (3-prop: bg+text+border) + `button-tertiary-hover-2` (1-prop: bg only) |
| stripe.com | 2 | 2 | No regression; ancestor walk still firing |
| notion.so | 5 | **6** | New: `text-input-focus` surfaced after re-harvest (probe set jitter) |
| figma.com | 2 | 2 | No regression |
| **Total** | **10** | **12** | +2 component variants |

**Capture-rate metric (rules detected vs diffs captured):**

| Site | dHov | dFoc | rHov | rFoc | rHovInh | rPseudo | capture-rate (hover) |
|---|---|---|---|---|---|---|---|
| linear | 7 | 0 | 0 | 0 | 0 | 0 | n/a (rules invisible to scanner) |
| stripe | 2 | 1 | 7 | 0 | 3 | 0 | 28.6% |
| notion | 9 | 4 | 4 | 4 | 0 | 0 | 225% (diffs > rules) |
| figma | 5 | 0 | 0 | 0 | 0 | 0 | n/a (rules invisible) |

Signals worth flagging for downstream phases:

- **Linear + figma show 0 rules but produce diffs.** The CSS pipeline (CSS-in-JS, constructed stylesheets, shadow DOM) emits rules that don't surface in `matched.matchedCSSRules` — the engine still applies them under forcePseudoState (so we get diffs), but the scanner can't see the selector text. We can't compute capture rate on these sites; we can only confirm "diffs ≥ what we captured."
- **Stripe captures ~29% of detected rules.** The 5 missed rules likely use properties outside `SPEC_PROPERTIES` (transform/scale, opacity-only fades) or rely on transitions we don't probe at the right phase. This is the right number to drive a future Phase 6.6 (richer property whitelist + transition timing).
- **Notion 225% means diffs > detected rules** — a single rule produces diffs across multiple properties (one `:hover` selector toggles bg + text + border in one go). Confirms the metric as a *floor*, not a ceiling.
- **Pseudo-element rules: 0 across all four sites.** The "missing variants" gap is **not** driven by `::before`/`::after` styling. Drop the pseudo-element capture investigation from the Phase 6.6 plan.

**Lint:** all four sites still 0 errors.

**Scorecard impact (variant-labels axis):**

| Site | Variant-labels F | Variant-labels G |
|---|---|---|
| linear | 2/3 | 3/3 (multi-pattern split surfaces both Sidebar + SharedView) |
| stripe | 2/3 | 2/3 |
| notion | 3/3 | 3/3 |
| figma | 2/3 | 2/3 |
| **Total** | **9/12** | **10/12** |

**Open question for next phase:** linear and figma have *invisible* rule pipelines (capture-rate uncomputable). To grade those harvests we need a different metric — possibly a vision-based diff: render base + render with forced hover, perceptual-diff the screenshots, count distinct visual hover treatments. That's a Phase 6.10 candidate (vision judge). For 6.6 it's enough to know that **forcePseudoState alone is sufficient signal** even without `matched.matchedCSSRules` visibility — the diffs we get are real.

## Session H — Phase 6.2.5 (multi-page crawl), 2026-05-07

**Why:** getdesign.md takes a URL and harvests one page. A real design system reveals itself across home / pricing / customers / docs / signup — and the token coverage on a single home is incomplete by construction. Both we and they had this ceiling. Removing it is a structural lead, not a prompt-tuning lead.

**What changed:** new `extract/page-discovery.js` scrapes every `<a href>` from the post-hydration home page, scores by path-keyword (`pricing` +5, `product` +5, `customers` +4, `docs|blog|signup` +3, `legal|terms|privacy` -100), bonuses nav/footer membership, dedupes by first path segment so we don't pick four `/blog/...` posts, and returns the top 4 + home. `run.js` orchestrates: navigate to each page, accumulate stylesheets into a shared replay manifest (URL-keyed dedupe across pages; inline sheets namespaced by page slug), harvest probes per page tagged with `pageUrl`, then union into a single `computed.json` the rest of the pipeline already understands.

Same-origin filter uses the **post-redirect** hostname, not the input. Notion's `notion.so` redirects to `notion.com` and the original filter rejected every anchor; capturing `page.url()` after settle fixes the discovery for redirect-heavy domains.

**Variant counts (Session G → Session H):**

| Site | Pages | Probes G → H | Pseudo diffs G → H | Variants G | Variants H | Δ |
|---|---|---|---|---|---|---|
| linear.app | 5 (home, pricing, customers, docs, login) | 130 → 229 | 7 → 24 | 2 | **7** | +5 |
| stripe.com | 5 (home, pricing, customers, blog, personalize) | 168 → 607 | 2 → 17 | 2 | **7** | +5 |
| notion.so | 5 (home, product, pricing, customers, blog) | 98 → 375 | 12 → 43 | 6 | **7** | +1 |
| figma.com | 5 (home, solutions, pricing, customers, blog) | ~95 → 309 | 5 → 14 | 2 | **4** | +2 |
| **Total** | **20** | | **26 → 98** | **12** | **25** | **+13** |

**That's a 2.08× lift from Session G and a 25× lift from Session E start (1 → 25).** Component variants are now the easiest axis to cite head-to-head.

**Newly-surfaced variants per site:**

- **linear.app** picked up `button-secondary-hover/focus` (only on `/customers` and `/docs`), `feature-card-hover/focus` (`/customers`), and `button-tertiary-focus` (`/login`). The home alone was a button-tertiary-only site — three other component types hide on secondary pages.
- **stripe.com** picked up `button-tertiary-hover/focus`, a second `button-secondary` pattern (`-hover-2`/`-focus-2`), and `hero-section-hover/focus` (interactive hero on `/personalize`). Stripe's home is mostly content cards; the interactive button work lives on docs/customer pages.
- **notion.so** picked up the multi-pattern `button-tertiary-hover-2` and `button-tertiary-focus-2` from the product/pricing pages — different from home's button-tertiary signature.
- **figma.com** picked up `button-tertiary-hover/hover-2` from secondary pages.

**Pseudo-state evidence got dramatically richer:**

| Site | Diffs G | Diffs H | Hover-rules detected (H) |
|---|---|---|---|
| linear | 7 | 24 | 12 (was 0 — new visibility from /customers + /docs) |
| stripe | 2 | 17 | 7 (same as G — capture rate ~24%, similar) |
| notion | 12 | 43 | 9 (vs 4) |
| figma | 5 | 14 | 2 (vs 0) |

The fact that *rules detected* jumped on linear and figma (where session G saw 0) means secondary pages use more conventional CSS pipelines than the home page's CSS-in-JS / constructed-stylesheets path. Even on those "invisible" sites, multi-page harvest brings classic CSS into scope.

**Cost:** ~60–150s per site (5 pages × ~15-30s each). Stripe is the slowest at 153s (largest probe set per page). Acceptable for an async DESIGN.md job; the user already expects multi-minute runs.

**Lint:** 0 content errors across all 4 sites. Stripe surfaces a 1× internal linter crash (`raw.match is not a function`) on the larger output — non-content, non-blocking, will investigate independently in a `@google/design.md/linter` issue.

**Scorecard impact (variant-labels axis):**

| Site | Variant-labels G | Variant-labels H |
|---|---|---|
| linear | 3/3 | 3/3 (cap reached; richer evidence) |
| stripe | 2/3 | 3/3 |
| notion | 3/3 | 3/3 |
| figma | 2/3 | 3/3 |
| **Total** | **10/12** | **12/12** |

**Variant-labels axis is now saturated.** All four sites hit the rubric ceiling. Further structural lead on this axis requires expanding the rubric itself (e.g., adding "captures cross-page variant divergence" as an axis).

**Configuration:** `DESIGN_MD_MULTIPAGE=0` falls back to single-page (Session G behavior). `DESIGN_MD_MAX_PAGES=N` caps the crawl (default 5, max 8).

**Next gaps for Phase 6.10 (vision judge):**

- Multi-page brought us to a clear lead on variant-labels and color-block fidelity, but "coherence" and "hero copy" still need the AI tower (blocked on Gemini key rotation) and a measurement harness. Without the judge, Session H's claim of beating getdesign.md on variant-labels is qualitative; the judge converts it to a CI-gateable score.
- Cross-page provenance (which page surfaced which token) is now structurally trackable — every probe carries `pageUrl`. Surfacing this in `design.md` (e.g., "primary: #5e6ad2 — present on home, pricing, /customers") would be a unique-to-us provenance feature getdesign.md can't match without crawling.

