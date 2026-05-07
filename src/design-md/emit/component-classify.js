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
    // Pseudo-state probes: pick up to two variants with *distinct* signatures
    // (the property-name set of the diff). Two probes are signature-distinct
    // iff their hover/focus diffs touch different property sets — e.g. one
    // pattern only changes `background-color` while another changes
    // `background-color + color + border-*-color`. Different patterns get
    // emitted as separate component blocks (`comp-hover` and `comp-hover-2`),
    // so a button group with both a quiet-wash hover and a bordered-icon
    // hover surfaces as two distinct variants in the design system. Sort by
    // diff richness (more props first) so the canonical variant takes the
    // unsuffixed name, secondary takes `-2`. Cap at 2 to control YAML noise.
    const pseudoCandidates = probes
      .filter((p) => p.pseudoStates && (p.pseudoStates.hover || p.pseudoStates.focus))
      .map((p) => {
        const hKeys = Object.keys(p.pseudoStates.hover || {}).filter((k) => !k.endsWith('__scope')).sort();
        const fKeys = Object.keys(p.pseudoStates.focus || {}).filter((k) => !k.endsWith('__scope')).sort();
        const sig = hKeys.join(',') + '|' + fKeys.join(',');
        const area = (p.rect?.width || 0) * (p.rect?.height || 0);
        return { p, sig, score: hKeys.length + fKeys.length, area };
      })
      .sort((a, b) => b.score - a.score || b.area - a.area);
    const pseudoProbes = [];
    const seenSigs = new Set();
    for (const c of pseudoCandidates) {
      if (seenSigs.has(c.sig)) continue;
      seenSigs.add(c.sig);
      pseudoProbes.push(c.p);
      if (pseudoProbes.length >= 2) break;
    }
    const pseudoProbe = pseudoProbes[0] || null;
    reps[name] = { probe: probes[0], pseudoProbe, pseudoProbes, allProbes: probes };
  }
  return reps;
}
