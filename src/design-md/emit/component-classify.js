import { normalizeColor } from '../extract/var-trace.js';
import { contrastRatio } from './contrast.js';

// Conservative probe → component classifier. Returns one of a small set of
// canonical names, or null if confidence is low.

function classNameLower(probe) {
  return (probe.className || '').toLowerCase();
}

function bg(probe) {
  return normalizeColor(probe.properties['background-color']?.value);
}

function color(probe) {
  return normalizeColor(probe.properties['color']?.value);
}

function isTransparent(hex) {
  return !hex || hex === 'transparent';
}

export function classifyProbe(probe, roles) {
  const cls = classNameLower(probe);
  const bgHex = bg(probe);
  const tag = probe.tagName;
  const primary = roles.primary?.hex || null;
  const surface = roles['surface-1']?.hex || null;

  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    return 'text-input';
  }
  if (tag === 'NAV' && cls.includes('header') || cls === 'top-nav' || cls.includes('nav-bar') || cls.includes('navbar')) {
    return 'top-nav';
  }
  if (tag === 'NAV') return 'nav';
  if (tag === 'HEADER') return 'top-nav';
  if (tag === 'FOOTER') return 'footer';

  // Buttons
  const isButtonLike = tag === 'BUTTON'
    || (tag === 'A' && (cls.includes('btn') || cls.includes('button') || cls.includes('cta')));
  if (isButtonLike) {
    if (primary && bgHex === primary) return 'button-primary';
    if (isTransparent(bgHex)) return 'button-tertiary';
    if (bgHex && bgHex !== primary) return 'button-secondary';
    return null;
  }

  // Cards
  if (cls.includes('card') || cls.includes('tile') || cls.includes('panel')) {
    if (cls.includes('pricing')) return 'pricing-card';
    if (cls.includes('testimonial')) return 'testimonial-card';
    if (cls.includes('feature')) return 'feature-card';
    return 'feature-card';
  }

  // Hero
  if (cls.includes('hero')) return 'hero-section';

  // CTA banner
  if (cls.includes('cta') || cls.includes('callout')) return 'cta-banner';

  // Status / badge
  if (cls.includes('badge') || cls.includes('pill') || cls.includes('chip') || cls.includes('tag')) {
    return 'status-badge';
  }

  return null;
}

// Group probes by classified name; pick the most representative probe per name
// (largest weighted area).
export function groupComponents(computed, roles) {
  const groups = new Map(); // name -> probe[]
  for (const probe of computed.probes) {
    const name = classifyProbe(probe, roles);
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(probe);
  }
  const reps = {};
  for (const [name, probes] of groups.entries()) {
    probes.sort((a, b) => {
      const aArea = (a.rect?.width || 0) * (a.rect?.height || 0);
      const bArea = (b.rect?.width || 0) * (b.rect?.height || 0);
      return bArea - aArea;
    });
    // The base block (bg, fg, padding, height) comes from the largest probe
    // — visually representative. The pseudo-state probe may be a different,
    // smaller probe; downstream code searches `allProbes` for one with
    // pseudoStates. We expose both so the caller can compose hover/focus
    // blocks even when the rep itself was captured before forcePseudoState
    // had a hit on it.
    // Pick the richest pseudo-state diff (most properties changed) so the
    // emitted hover/focus block is the most informative variant the group
    // can produce. Ties go to largest area.
    const pseudoCandidates = probes
      .filter((p) => p.pseudoStates && (p.pseudoStates.hover || p.pseudoStates.focus))
      .map((p) => {
        const h = Object.keys(p.pseudoStates.hover || {}).length;
        const f = Object.keys(p.pseudoStates.focus || {}).length;
        const area = (p.rect?.width || 0) * (p.rect?.height || 0);
        return { p, score: h + f, area };
      })
      .sort((a, b) => b.score - a.score || b.area - a.area);
    const pseudoProbe = pseudoCandidates[0]?.p || null;
    reps[name] = { probe: probes[0], pseudoProbe, allProbes: probes };
  }
  return reps;
}
