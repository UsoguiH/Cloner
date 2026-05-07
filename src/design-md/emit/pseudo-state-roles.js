// Phase 6.5 — pseudo-state role minting.
//
// CDP forcePseudoState gives us computed values for `:hover` / `:focus`, but
// design-system aware tools (us, getdesign.md) need to surface those changes
// as *named tokens*, not raw rgba blobs. Two problems we solve here:
//
//   1. **Translucent overlays.** Most hover backgrounds are rgba(255,255,255,
//      0.05) or similar — the visual pixel is the composite over whatever the
//      element's resting background actually is. We composite once so the
//      hover bg becomes an opaque hex that can bind to a real role.
//
//   2. **Role minting.** A composited hover hex is rarely identical to an
//      existing role; #0f1011 (surface-1) and #0d0e0f (canvas + 2% white)
//      differ by a hair. When the composite lands within a tight luminance
//      tolerance of an existing role we reuse it; otherwise we mint a new
//      role (`surface-hover`, `surface-pressed`, etc.) so the variant has
//      somewhere to point. The minted hex came from harvest+composite —
//      deterministic — so this still satisfies CLAUDE.md hard rule #1
//      ("no invented tokens": values must come from the harvest, names can
//      be derived).

import { normalizeColor } from '../extract/var-trace.js';

function parseHex(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return null;
  const h = hex.slice(1).toLowerCase();
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16) / 255,
    ];
  }
  return null;
}

function toHex6(r, g, b) {
  const p = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + p(r) + p(g) + p(b);
}

function srgbToLin(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
}

// Composite top (possibly translucent 8-digit hex) over an opaque base.
// Returns a 6-digit opaque hex, or null if either input is unparseable.
// If top is already opaque, returns top unchanged (sans alpha channel).
export function compositeOver(topHex, baseHex) {
  const top = parseHex(topHex);
  if (!top) return null;
  if (top[3] >= 0.999) return toHex6(top[0], top[1], top[2]);
  const base = parseHex(baseHex);
  if (!base) return null;
  const a = top[3];
  return toHex6(
    top[0] * a + base[0] * (1 - a),
    top[1] * a + base[1] * (1 - a),
    top[2] * a + base[2] * (1 - a),
  );
}

// Resolve the effective base background for a probe. If its own bg is
// transparent (very common — buttons with hover overlays sit on a parent
// surface) we walk up to canvas as the safe default. Future enhancement:
// thread the parent chain through computed.json so we composite against the
// *actual* parent bg instead of canvas.
export function resolveProbeBaseBg(probe, canvasHex) {
  const bg = normalizeColor(probe?.properties?.['background-color']?.value);
  if (bg && bg !== 'transparent' && /^#[0-9a-f]{6}$/i.test(bg)) return bg;
  return canvasHex;
}

function findExistingRole(roles, hex, lumTolerance = 0.003) {
  for (const [name, info] of Object.entries(roles)) {
    if (info.hex === hex) return name;
  }
  const targetLum = luminance(hex);
  let best = null;
  let bestDelta = Infinity;
  for (const [name, info] of Object.entries(roles)) {
    if (!info.hex || !/^#[0-9a-f]{6}$/i.test(info.hex)) continue;
    const d = Math.abs(luminance(info.hex) - targetLum);
    if (d < bestDelta) {
      bestDelta = d;
      best = name;
    }
  }
  return bestDelta <= lumTolerance ? best : null;
}

// Pick a name for a newly-minted variant role. Prefers semantic names rooted
// in the *family* the composite belongs to (surface-* for low-saturation
// near-canvas hexes, primary-* for accent-tinted ones). Suffix encodes the
// pseudo-state so the name is self-describing.
function mintRoleName(roles, family, state, hex) {
  const base = `${family}-${state}`;
  if (!roles[base]) return base;
  // Numeric suffix for additional tiers within the same family/state.
  for (let i = 2; i <= 6; i++) {
    const candidate = `${family}-${state}-${i}`;
    if (!roles[candidate]) return candidate;
  }
  return `${family}-${state}-${hex.slice(1)}`;
}

// Classify a hex into a role family by relative luminance vs canvas+ink.
// Cheap heuristic that's good enough for naming new variant roles —
// the AI rename stage gets to upgrade this later.
function familyFor(hex, canvasHex, inkHex) {
  const lum = luminance(hex);
  const cLum = canvasHex ? luminance(canvasHex) : 0;
  const iLum = inkHex ? luminance(inkHex) : 1;
  // Whichever side it's closer to.
  if (Math.abs(lum - cLum) <= Math.abs(lum - iLum)) return 'surface';
  return 'ink';
}

// Bind a pseudo-state hex (already composited if it was translucent) to a
// role name. Reuses an existing role when within luminance tolerance,
// otherwise mints a new one and writes it back into `roles` (mutating).
//
// `intent` is the variant kind: 'hover' | 'focus' | 'pressed' — used for
// naming. `kind` is 'bg' | 'fg' | 'border' — used to bias the family
// heuristic (foreground variants get ink-* names, etc.).
//
// Returns the role name, or null if hex is unbindable (transparent etc.).
export function bindOrMintRole(roles, hex, { intent, kind, canvasHex, inkHex }) {
  if (!hex || hex === 'transparent') return null;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;

  const existing = findExistingRole(roles, hex);
  if (existing) return existing;

  let family = familyFor(hex, canvasHex, inkHex);
  if (kind === 'fg' || kind === 'border') family = 'ink';
  else if (kind === 'bg') family = family === 'ink' ? 'surface' : family; // bg can't be ink-family
  const name = mintRoleName(roles, family, intent, hex);
  roles[name] = {
    hex,
    sources: [{ kind: 'pseudo-state-composite', intent, fromHex: hex }],
  };
  return name;
}
