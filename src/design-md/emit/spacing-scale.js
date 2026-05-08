// Build a spacing scale from observed padding values across probes.
// We collect every nonzero padding-* value, dedup, snap to a base-4 grid for
// scale cleanliness, then name by ordinal.

function parsePx(value) {
  if (!value) return null;
  const m = /^([-\d.]+)px/.exec(String(value));
  if (!m) return null;
  return parseFloat(m[1]);
}

function snap(px) {
  if (px == null) return null;
  if (px <= 0) return 0;
  // Round to nearest int — we don't try to force base-4 because real sites
  // use 12, 14, 18 etc. and forcing breaks fidelity.
  return Math.round(px);
}

const PROPS = [
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
];

export function buildSpacingScale(computed) {
  const counts = new Map(); // px -> count
  for (const probe of computed.probes) {
    for (const p of PROPS) {
      const v = parsePx(probe.properties[p]?.value);
      if (v == null || v === 0) continue;
      const sx = snap(v);
      counts.set(sx, (counts.get(sx) || 0) + 1);
    }
  }
  // Filter to common values (count >= 2) to avoid one-off noise, drop the
  // > 200px tail that's almost always section-width margins rather than a
  // spacing-token candidate, then sort ascending.
  const filtered = [...counts.entries()]
    .filter(([px, c]) => c >= 2 && px <= 200)
    .map(([px, count]) => ({ px, count }))
    .sort((a, b) => a.px - b.px);

  // Cap to a sensible scale length; pick a representative subset spread across the range
  const target = Math.min(8, filtered.length);
  const picked = [];
  if (filtered.length <= target) {
    picked.push(...filtered);
  } else {
    for (let i = 0; i < target; i += 1) {
      const idx = Math.round((i / (target - 1)) * (filtered.length - 1));
      const e = filtered[idx];
      if (!picked.find((x) => x.px === e.px)) picked.push(e);
    }
  }

  const labels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const named = {};
  picked.forEach((e, i) => {
    const name = `space-${labels[i] || i + 1}`;
    named[name] = { px: e.px, value: `${e.px}px`, count: e.count };
  });
  return named;
}
