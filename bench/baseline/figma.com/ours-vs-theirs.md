# Figma — head-to-head grading (ours vs getdesign.md)

**Graded:** 2026-05-07 (post Phase 6.4 + 6.7 AI enrichment, post canvas/boilerplate fixes)
**Their source:** `npx getdesign@latest add figma` (getdesign 0.6.16)
**Our source:** `bench/baseline/figma.com/ours.md` (Session H multi-page + canvas fix + role-naming + copy-generation)

## Score on the CLAUDE.md 6-axis rubric

| Axis | Theirs | Ours (pre-AI) | Ours (post-AI) | Δ vs theirs |
|---|---|---|---|---|
| Color names | 9/10 | 4/10 | 7/10 | -2 |
| Role descriptions | 10/10 | 1/10 | 8/10 | -2 |
| Color-block fidelity | 10/10 | 1/10 | 1/10 | -9 |
| Variant labels | 9/10 | 5/10 | 5/10 | -4 |
| Hero copy | 10/10 | 0/10 | 7/10 | -3 |
| Overall coherence | 9/10 | 4/10 | 7/10 | -2 |
| **Total** | **57/60** | **15/60** | **35/60** | **-22** |

**Verdict: gap closed from -47 → -22 in two moves.** First move: deterministic bug fixes (canvas inversion + frozen boilerplate) bought 5 points. Second move: AI enrichment via Gemini-3-pro-preview (role-naming + copy-generation, both wired in `run.js`) bought 20 more.

The remaining -22 gap splits cleanly:
- ~10 points: color-block fidelity (pastels harvested but mis-classified as `surface-1/2/3` instead of `block-lime/block-mint/block-lavender` — needs Phase 6.3 vision pipeline)
- ~4 points: variant labels (no pressed/selected/inverse axes — needs Phase 6.5)
- ~3 points: residual AI quality (low-confidence colors emit without brand label; some role-naming entries dropped at confidence < 0.7 gate)
- ~5 points: scattered (text-input role mis-classification — labeled with `headline` typo, primary still picking gray over black on figma)

## Per-axis evidence (post-AI)

### Color names — ours 7/10

**Theirs (20 named tokens):** `primary`, `on-primary`, `ink`, `canvas`, `inverse-canvas`, `inverse-ink`, `on-inverse-soft`, `hairline`, `hairline-soft`, `surface-soft`, `block-lime`, `block-lilac`, `block-cream`, `block-pink`, `block-mint`, `block-coral`, `block-navy`, `accent-magenta`, `semantic-success`, `overlay-scrim`

**Ours (9 tokens, 7 with brand-voice display names):**
- `canvas` `#ffffff` → "Core Canvas White"
- `primary` `#697485` → "Muted Interface Slate"
- `ink` `#000000` → "Stark Brand Black"
- `ink-muted` `#131313` → "Softened Carbon"
- `on-primary` `#ffffff` → "High-Contrast White"
- `surface-1` `#f3ffe3` → (low-confidence "Pale Mint Wash" dropped)
- `surface-2` `#c7f8fb` → (low-confidence "Cool Glacial Tint" dropped)
- `surface-3` `#e2e2e2` → "Structural Light Gray"
- `surface-hover` `#222222` → (low-confidence "Elevated Graphite" dropped)

The brand-voice naming is now real ("Stark Brand Black", "Core Canvas White") — but theirs still wins because they have *more* named tokens (20 vs 9), specifically the 7 `block-*` pastel tokens we lack entirely. Phase 6.3 (color-block discovery vision pipeline) is the only path to that gap.

### Role descriptions — ours 8/10

**Theirs:** every color has 1–3 sentences of usage prose.
> **Black** ({colors.primary}): The system primary. Every primary CTA, every headline, every body line, the marquee strip, the inverse canvas of dark sections.

**Ours:** every named color has one sentence of usage prose.
> **Stark Brand Black** `#000000` (`ink`) — Figma's uncompromising core black, anchoring our primary typographic hierarchy and boldest call-to-action buttons.

Quality is comparable; theirs is slightly longer/richer. The -2 is primarily the dropped low-confidence colors (3 of 9 emit hex-only because conf < 0.7). Tightening the confidence gate or adding a deterministic fallback name closes most of this.

### Color-block fidelity — ours 1/10

**Unchanged.** AI labels what's already there; it doesn't reclassify a color's *role*. The pastels (`#f3ffe3`, `#c7f8fb`, `#cb9fd2`) get extracted as `surface-*` tokens because the role-assignment heuristic doesn't recognize "section-bg pastel" as a distinct role. Phase 6.3 (vision-driven color-block discovery) is the unblock.

### Variant labels — ours 5/10

**Unchanged.** Variant naming is deterministic (component-classifier output), not AI-driven. Still hover-only (`button-tertiary-hover`, `button-secondary-hover-2`); missing pressed, selected, focus, inverse. Phase 6.5 (component-variant vision recognition) is the unblock.

### Hero copy — ours 7/10

**Pre-AI:** "Design system extracted from a structural clone. Canvas #000000, primary accent #ffffff…" (extractor meta-prose, 0/10)

**Post-AI:** "Figma frames the vibrant reality of the design process within a stark, high-contrast canvas that prioritizes the user's work over the platform's chrome." (brand-voice prose, 7/10)

Plus three Voice traits (Utilitarian, Playful, Confident — each with a one-sentence justification grounded in the screenshot) and section intros for Colors and Typography. Theirs wins because its hero copy is longer and rolls the entire system thesis (mono frame + pastel block-rhythm + figmaSans) into one paragraph; ours hits one beat per beat.

### Overall coherence — ours 7/10

The three coherence bugs from the pre-fix grading are gone:
1. ~~`## Known Gaps` says "Pseudo-states not yet captured" while components include `-hover` variants.~~ Fixed: Known Gaps is now content-aware.
2. ~~"Elevation harvest is deferred to Phase 5" — we're in 6.x.~~ Fixed: stale Phase 5 references stripped.
3. ~~Stale Iteration Guide CLI path.~~ Verified correct.

What's still missing vs theirs: cross-token narrative density. Theirs threads color references through the prose ("the marquee strip, the inverse canvas of dark sections"). Ours' Voice section does some of this ("relies heavily on Stark Brand Black and Core Canvas White") but less densely.

## What this means for the plan

**Pre-AI grading (manual, 731-line read):** 10/60 — losing badly. Self-grading bias from Session H exposed.
**Post-AI grading (this doc):** 35/60 — meaningful gap remaining but the floor is now respectable.

The AI stages are wired and producing brand-voice output that validates clean against the no-invention contract (`validateStageOutput` against allowlist of token paths and hex values from the harvest). Lint stays at E0/W5/I1 — same warnings the harvest produces deterministically.

**Next-phase priorities, in expected-points-recovered order:**

1. **Phase 6.3 — color-block discovery (vision):** ~10 points. Segment pastel section backgrounds in the screenshots, mint `block-{color}` tokens, reclassify the pastels currently labeled `surface-1/2/3`. This is the single largest gap.

2. **Phase 6.5 — component variant recognition:** ~4 points. Add pressed/selected/focus/inverse axes to component classifier output. Vision-driven probe-set expansion.

3. **Confidence-gate fallback for role-naming:** ~2-3 points. When AI confidence < 0.7, emit a deterministic descriptive label (e.g., "Light Gray Surface" for a high-luminance surface bg) instead of dropping the brand name entirely.

4. **Phase 6.10 — vision-judge harness:** doesn't itself close points but makes everything above measurable. Without it, the next "we improved X" claim is unverifiable.

5. **Upstream `primary` selection bug:** 1-2 points. Figma's button-primary backgrounds should pick #000 (the black CTAs), not #697485 (the secondary slate). Same fix-class as the canvas/primary inversion — the role-assignment heuristic isn't reading the right evidence for sites where the visual primary is also the ink color.

A realistic post-6.3-and-6.5 target: **35/60 → 50/60.** That's where "beat getdesign.md" becomes a defensible head-to-head claim — at least three axes ≥ theirs, one significant axis (color-block) finally in range.
