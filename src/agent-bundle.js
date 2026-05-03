/**
 * Agent-friendly component export.
 *
 * Takes a single picked component (the result of extractComponent) and
 * produces a small, structured bundle designed for ingestion by other
 * coding agents (LLMs):
 *
 *   <bundle>/
 *     component.html      pretty-printed subtree HTML
 *     component.css       minimal CSS (rootVars + fontFaces + keyframes
 *                          + matching rules + media-wrapped rules)
 *     metadata.json       structured component descriptor
 *     README.md           prose overview: source, selector, Tailwind
 *                          summary, DOM outline, full HTML inlined
 *     assets/<file>       locally copied fonts/images the component
 *                          references (looked up in replay manifest)
 *
 * Differs from the launcher ZIP (full replay bundle, requires start.bat)
 * and the per-component picker ZIP (full page + isolation overlays).
 * This bundle is meant to be READ by an agent, not run by a browser.
 */

import path from 'node:path';
import fs from 'node:fs';
import * as cheerio from 'cheerio';

const ASSET_EXT_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|ogg|mp3|wav|css)(?:[?#].*)?$/i;

export function buildAgentBundle({ extraction, sourceUrl, selector, jobDir }) {
  if (!extraction || extraction.error) {
    throw new Error(extraction?.error || 'no extraction provided');
  }

  // Walk the replay manifest so we can copy any asset the component refers to
  // (images / fonts / videos / linked CSS) directly into the bundle.
  const replayDir = path.join(jobDir, 'output', 'replay');
  const manifest = readManifest(replayDir);

  const assets = collectAssets({
    referencedUrls: extraction.referencedUrls || [],
    sourceUrl,
    manifest,
    replayDir,
  });

  // Apply rewrites to HTML + CSS so they reference assets/<file> instead of
  // the original remote URLs.
  const htmlRewritten = rewriteHtmlAssets(extraction.html, assets.urlMap);
  const cssRewritten = buildAndRewriteCss(extraction.css, assets.urlMap);

  const prettyHtml = formatHtml(htmlRewritten);
  const prettyCss = formatCss(cssRewritten);

  const tailwindClasses = collectTailwindClasses(htmlRewritten);
  const domOutline = buildDomOutline(htmlRewritten);

  // New: screenshot, pseudo-element content, per-element computed styles,
  // full-stylesheet fallback. Each is optional — older extractions or
  // failed captures simply omit them from the bundle.
  const screenshotBuf = extraction.screenshotBase64
    ? Buffer.from(extraction.screenshotBase64, 'base64')
    : null;
  const pseudoContent = Array.isArray(extraction.pseudoContent) ? extraction.pseudoContent : [];
  const elementComputedStyles = Array.isArray(extraction.elementComputedStyles)
    ? extraction.elementComputedStyles : [];
  const fullStylesRewritten = extraction.fullStyles
    ? (assets.urlMap.size > 0 ? rewriteCssUrls(extraction.fullStyles, assets.urlMap) : extraction.fullStyles)
    : '';

  const metadata = {
    sourceUrl,
    selector,
    elementCount: extraction.elementCount || 0,
    generatedAt: new Date().toISOString(),
    css: {
      rootVarRules: extraction.css?.rootVars?.length || 0,
      fontFaceRules: extraction.css?.fontFaces?.length || 0,
      keyframeRules: extraction.css?.keyframes?.length || 0,
      matchingRules: extraction.css?.rules?.length || 0,
      wrappedRules: extraction.css?.media?.length || 0,
    },
    assets: assets.list.map((a) => ({
      filename: a.filename,
      sourceUrl: a.url,
      bytes: a.bytes,
      mimeType: a.mimeType || '',
    })),
    tailwindClassCount: tailwindClasses.length,
    htmlBytes: prettyHtml.length,
    cssBytes: prettyCss.length,
    pseudoElementCount: pseudoContent.length,
    computedStyleElements: elementComputedStyles.length,
    fullCssBytes: fullStylesRewritten.length,
    hasScreenshot: !!screenshotBuf,
  };

  const readme = buildReadme({
    sourceUrl,
    selector,
    metadata,
    tailwindClasses,
    domOutline,
    htmlSnippet: prettyHtml,
    pseudoContent,
    hasScreenshot: !!screenshotBuf,
  });

  const files = [
    { name: 'README.md', body: readme },
    { name: 'component.html', body: prettyHtml },
    { name: 'component.css', body: prettyCss },
    { name: 'metadata.json', body: JSON.stringify(metadata, null, 2) },
  ];
  if (elementComputedStyles.length) {
    files.push({
      name: 'component.computed.json',
      body: JSON.stringify({
        note: 'Per-element computed styles captured from a live render. Use as ground truth when the matched CSS rules are insufficient or when computed values differ from authored ones (utility classes, JS-applied styles, animation midpoints).',
        elements: elementComputedStyles,
      }, null, 2),
    });
  }
  if (pseudoContent.length) {
    files.push({
      name: 'component.pseudo.json',
      body: JSON.stringify({
        note: 'CSS pseudo-element content (::before / ::after / ::marker). This text is VISIBLE on the page but does NOT appear in component.html — it is rendered by the browser from CSS `content:` declarations.',
        entries: pseudoContent,
      }, null, 2),
    });
  }
  if (fullStylesRewritten) {
    files.push({
      name: 'component.full.css',
      body: fullStylesRewritten,
    });
  }
  if (screenshotBuf) {
    files.push({ name: 'component.png', body: screenshotBuf });
  }

  return {
    files,
    assets: assets.list,
  };
}

function readManifest(replayDir) {
  try {
    const txt = fs.readFileSync(path.join(replayDir, 'manifest.json'), 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function collectAssets({ referencedUrls, sourceUrl, manifest, replayDir }) {
  const list = [];
  const urlMap = new Map(); // original ref URL (as-written) -> assets/<filename>
  const usedNames = new Set();

  if (!manifest || !manifest.entries) {
    return { list, urlMap };
  }

  const bodiesDir = path.join(replayDir, 'bodies');

  for (const ref of referencedUrls) {
    let abs;
    try { abs = new URL(ref, sourceUrl).toString(); } catch { continue; }
    const cleanAbs = abs.replace(/#.*$/, '');

    let entry = manifest.entries[cleanAbs] || manifest.entries[abs];
    // Fallback by pathname / basename — useful when the rendered DOM uses an
    // absolute path that differs slightly from the recorded URL (trailing
    // slash, query string, double-encoded chars).
    if (!entry) {
      try {
        const u = new URL(cleanAbs);
        if (manifest.byPath && manifest.byPath[u.pathname]) {
          entry = manifest.entries[manifest.byPath[u.pathname]];
        }
        if (!entry && manifest.byBasename) {
          const base = u.pathname.split('/').pop();
          if (base && manifest.byBasename[base]) {
            entry = manifest.entries[manifest.byBasename[base]];
          }
        }
      } catch {}
    }
    if (!entry) continue;

    const bodyPath = path.join(bodiesDir, entry.body);
    let buf;
    try { buf = fs.readFileSync(bodyPath); } catch { continue; }

    const filename = pickFilename(cleanAbs, entry.mimeType, usedNames);
    usedNames.add(filename);

    list.push({
      filename,
      url: cleanAbs,
      mimeType: entry.mimeType || '',
      bytes: buf.length,
      body: buf,
    });
    // Map both the as-written ref and the absolute resolved form so both
    // attribute and CSS rewrites hit.
    urlMap.set(ref, `assets/${filename}`);
    urlMap.set(cleanAbs, `assets/${filename}`);
  }

  return { list, urlMap };
}

function pickFilename(absUrl, mimeType, used) {
  let base;
  try {
    const u = new URL(absUrl);
    base = (u.pathname.split('/').pop() || '').replace(/[?#].*$/, '');
  } catch {
    base = '';
  }
  base = base.replace(/[^a-z0-9._-]/gi, '_');
  if (!base) {
    base = 'asset';
  }
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) {
    const ext = guessExt(mimeType);
    if (ext) base += ext;
  }
  if (!used.has(base)) return base;
  // De-dupe with a numeric suffix.
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

function guessExt(mimeType) {
  const t = (mimeType || '').toLowerCase().split(';')[0].trim();
  return ({
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'font/woff2': '.woff2',
    'font/woff': '.woff',
    'application/font-woff2': '.woff2',
    'application/font-woff': '.woff',
    'font/ttf': '.ttf',
    'font/otf': '.otf',
    'application/vnd.ms-fontobject': '.eot',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'text/css': '.css',
  })[t] || '';
}

function rewriteHtmlAssets(html, urlMap) {
  if (urlMap.size === 0) return html;

  const $ = cheerio.load(html, { decodeEntities: false });

  const ATTRS = ['src', 'href', 'data', 'poster', 'data-src', 'data-bg',
    'data-background', 'data-background-image', 'data-poster', 'data-lazy',
    'data-original', 'data-image', 'data-href'];

  $('*').each((_, el) => {
    const node = $(el);
    for (const a of ATTRS) {
      const v = node.attr(a);
      if (v && urlMap.has(v)) node.attr(a, urlMap.get(v));
    }
    for (const a of ['srcset', 'data-srcset', 'data-lazy-srcset']) {
      const v = node.attr(a);
      if (!v) continue;
      const rewritten = v.split(',').map((part) => {
        const trimmed = part.trim();
        if (!trimmed) return '';
        const space = trimmed.search(/\s/);
        const url = space === -1 ? trimmed : trimmed.slice(0, space);
        const desc = space === -1 ? '' : trimmed.slice(space);
        return (urlMap.get(url) || url) + desc;
      }).filter(Boolean).join(', ');
      node.attr(a, rewritten);
    }
    const inlineStyle = node.attr('style');
    if (inlineStyle) node.attr('style', rewriteCssUrls(inlineStyle, urlMap));
  });

  return $.html();
}

function rewriteCssUrls(css, urlMap) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, raw) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('data:')) return m;
    const mapped = urlMap.get(trimmed);
    return mapped ? `url(${q}${mapped}${q})` : m;
  });
}

function buildAndRewriteCss(css, urlMap) {
  if (!css) return '';
  const sections = [];
  const append = (label, items) => {
    if (!items || items.length === 0) return;
    const body = items.join('\n\n');
    const rewritten = urlMap.size > 0 ? rewriteCssUrls(body, urlMap) : body;
    sections.push(`/* ===== ${label} ===== */\n${rewritten}`);
  };
  append(':root variables', css.rootVars);
  append('@font-face', css.fontFaces);
  append('@keyframes', css.keyframes);
  append('matching style rules', css.rules);
  append('wrapped rules (@media, @supports, @layer, @container, @scope)', css.media);
  return sections.join('\n\n');
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);
const PRESERVE_TAGS = new Set(['pre', 'textarea', 'script', 'style']);

/**
 * Pretty-print HTML with simple recursive indentation. Good enough for agent
 * ingestion — preserves text inside <pre>/<textarea>/<script>/<style>, breaks
 * lines after open/close tags otherwise.
 */
function formatHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const out = [];
  const root = $.root().get(0);

  const writeAttrs = (attribs) => {
    if (!attribs) return '';
    const keys = Object.keys(attribs);
    if (keys.length === 0) return '';
    return keys.map((k) => {
      const v = attribs[k];
      if (v === '') return ` ${k}`;
      return ` ${k}="${String(v).replaceAll('"', '&quot;')}"`;
    }).join('');
  };

  const walk = (node, depth) => {
    const indent = '  '.repeat(depth);
    if (node.type === 'text') {
      const txt = node.data || '';
      if (!txt.trim()) return;
      // Collapse internal whitespace runs but keep the text on its own line.
      const collapsed = txt.replace(/\s+/g, ' ').trim();
      if (collapsed) out.push(`${indent}${collapsed}`);
      return;
    }
    if (node.type === 'comment') {
      out.push(`${indent}<!--${node.data}-->`);
      return;
    }
    if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return;

    const tag = node.name;
    const attrs = writeAttrs(node.attribs);

    if (VOID_TAGS.has(tag)) {
      out.push(`${indent}<${tag}${attrs}>`);
      return;
    }

    if (PRESERVE_TAGS.has(tag)) {
      // Keep contents verbatim — important for <script>, <pre>.
      const inner = $(node).html() || '';
      if (!inner.trim()) {
        out.push(`${indent}<${tag}${attrs}></${tag}>`);
      } else {
        out.push(`${indent}<${tag}${attrs}>${inner}</${tag}>`);
      }
      return;
    }

    const children = node.children || [];
    if (children.length === 0) {
      out.push(`${indent}<${tag}${attrs}></${tag}>`);
      return;
    }
    // Single text child? Inline it.
    if (children.length === 1 && children[0].type === 'text') {
      const txt = (children[0].data || '').replace(/\s+/g, ' ').trim();
      if (txt && txt.length < 80) {
        out.push(`${indent}<${tag}${attrs}>${txt}</${tag}>`);
        return;
      }
    }

    out.push(`${indent}<${tag}${attrs}>`);
    for (const c of children) walk(c, depth + 1);
    out.push(`${indent}</${tag}>`);
  };

  for (const c of root.children || []) walk(c, 0);
  return out.join('\n') + '\n';
}

/**
 * Pretty-print CSS — simple per-declaration indenting. Doesn't parse the
 * grammar (would need a real CSS parser), but produces readable output for
 * 99% of inputs.
 */
function formatCss(css) {
  if (!css) return '';
  // Step 1: normalize whitespace inside rules.
  let s = css.replace(/\r\n?/g, '\n');
  // Step 2: insert breaks around braces/semicolons.
  let out = '';
  let depth = 0;
  let i = 0;
  let inComment = false;
  while (i < s.length) {
    const ch = s[i];
    if (inComment) {
      out += ch;
      if (ch === '*' && s[i + 1] === '/') { out += '/'; i += 2; inComment = false; continue; }
      i++;
      continue;
    }
    if (ch === '/' && s[i + 1] === '*') {
      out += '/*';
      i += 2;
      inComment = true;
      continue;
    }
    if (ch === '{') {
      out = out.trimEnd() + ' {\n' + '  '.repeat(depth + 1);
      depth++;
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      out = out.trimEnd() + '\n' + '  '.repeat(depth) + '}\n';
      i++;
      while (i < s.length && /\s/.test(s[i]) && s[i] !== '\n') i++;
      if (depth > 0 && s[i] !== '}') out += '  '.repeat(depth);
      continue;
    }
    if (ch === ';') {
      out += ';\n' + '  '.repeat(depth);
      i++;
      while (i < s.length && /\s/.test(s[i]) && s[i] !== '\n') i++;
      continue;
    }
    if (ch === '\n') {
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function collectTailwindClasses(html) {
  const seen = new Set();
  const re = /\sclass=(["'])([^"']+)\1/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    for (const tok of m[2].split(/\s+/)) {
      const t = tok.trim();
      if (t) seen.add(t);
    }
  }
  return [...seen].sort();
}

function buildDomOutline(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const lines = [];
  const root = $.root().get(0);

  const walk = (node, depth) => {
    if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return;
    if (depth > 6) return; // cap depth — DOM outline is for at-a-glance shape
    const indent = '  '.repeat(depth);
    const tag = node.name;
    const id = node.attribs?.id ? `#${node.attribs.id}` : '';
    const cls = node.attribs?.class
      ? '.' + node.attribs.class.split(/\s+/).filter(Boolean).slice(0, 4).join('.')
      : '';
    lines.push(`${indent}${tag}${id}${cls}`);
    for (const c of node.children || []) walk(c, depth + 1);
  };

  for (const c of root.children || []) walk(c, 0);
  return lines.join('\n');
}

function buildReadme({ sourceUrl, selector, metadata, tailwindClasses, domOutline, htmlSnippet, pseudoContent, hasScreenshot }) {
  const tailwindBlock = tailwindClasses.length === 0
    ? '_no class attributes detected_'
    : '```\n' + tailwindClasses.join(' ') + '\n```';

  const assetsBlock = metadata.assets.length === 0
    ? '_none — component uses no images, fonts, or videos that were captured_'
    : metadata.assets.map((a) => `- \`assets/${a.filename}\` — ${formatBytes(a.bytes)} — ${a.sourceUrl}`).join('\n');

  const pseudoBlock = pseudoContent.length === 0
    ? '_none detected_'
    : pseudoContent.map((p) => `- \`${p.path}${p.position}\` → content: \`${p.content}\` (raw: \`${p.raw}\`)`).join('\n');

  const screenshotBlock = hasScreenshot
    ? `## Screenshot\n\n![Component screenshot](component.png)\n\n_The image above is the ground-truth rendering of the picked component. Match this exactly when rebuilding._\n`
    : '';

  const filesTable = [
    `| \`component.html\` | The picked subtree, pretty-printed. ${formatBytes(metadata.htmlBytes)}. |`,
    `| \`component.css\` | Minimal stylesheet — only rules that match this subtree, plus the design tokens (\`:root\`), \`@font-face\`, and \`@keyframes\` it references. ${formatBytes(metadata.cssBytes)}. |`,
    `| \`assets/\` | Locally-saved copies of the images, fonts, and other binary assets the component references. |`,
    `| \`metadata.json\` | Same data as above, structured for code. |`,
  ];
  if (hasScreenshot) {
    filesTable.push(`| \`component.png\` | Live render of the picked element. **Match this image pixel-for-pixel.** |`);
  }
  if (metadata.computedStyleElements > 0) {
    filesTable.push(`| \`component.computed.json\` | Per-element computed styles from a live render. Use as ground truth when \`component.css\` lacks a rule (utility classes, JS-applied styles, animation states). |`);
  }
  if (metadata.pseudoElementCount > 0) {
    filesTable.push(`| \`component.pseudo.json\` | Visible \`::before\` / \`::after\` / \`::marker\` content. **This text is on the page but missing from \`component.html\`** — re-add it when rebuilding. |`);
  }
  if (metadata.fullCssBytes > 0) {
    filesTable.push(`| \`component.full.css\` | All CSS rules from the page (${formatBytes(metadata.fullCssBytes)}). Fallback if a rule was missed by the matcher. |`);
  }

  return `# Component export

> Source: ${sourceUrl}
> Selector: \`${selector}\`
> Generated: ${metadata.generatedAt}
> Element count: ${metadata.elementCount}

## Rebuild prompt (paste this to your coding agent)

> Recreate the component shown in \`component.png\` as production-quality code in the framework I'm using (React + Tailwind unless I tell you otherwise).
>
> Source files in this bundle, in priority order:
> 1. **\`component.png\`** — the visual ground truth. Match it pixel-for-pixel.
> 2. **\`component.html\`** — the rendered DOM. Use it for structure, semantic tags, ARIA, text content, and class lists.
> 3. **\`component.css\`** — every CSS rule that applies to the subtree. Use it for design tokens, fonts, keyframes, and exact spacing/colors.
> 4. **\`component.computed.json\`** (if present) — resolved computed styles per element. When the CSS rule is ambiguous, this is the actual final value the browser is using.
> 5. **\`component.pseudo.json\`** (if present) — \`::before\` / \`::after\` text that's **visible on screen but absent from the HTML**. Re-add this content using pseudo-elements (or inline spans, your call).
> 6. **\`assets/\`** — fonts and images. Use the exact filenames; do not refetch from the source URL.
> 7. **\`component.full.css\`** (if present) — every stylesheet rule from the page. Reference this only when something looks wrong and you suspect a missed rule.
>
> When the HTML and the screenshot disagree, trust the screenshot. When the matched CSS and the computed JSON disagree, trust the computed JSON. When you're unsure about an animation, watch the source URL above.

${screenshotBlock}
## What's in this bundle

| File | Purpose |
| --- | --- |
${filesTable.join('\n')}

## CSS summary

| Section | Rules |
| --- | --- |
| \`:root\` variables | ${metadata.css.rootVarRules} |
| \`@font-face\` | ${metadata.css.fontFaceRules} |
| \`@keyframes\` | ${metadata.css.keyframeRules} |
| Matching style rules | ${metadata.css.matchingRules} |
| Wrapped rules (\`@media\`, \`@supports\`, \`@layer\`, etc.) | ${metadata.css.wrappedRules} |

## Assets

${assetsBlock}

## Pseudo-element content (visible on page, NOT in HTML)

${pseudoBlock}

## Tailwind / utility classes used

The picked HTML uses ${tailwindClasses.length} unique \`class\` tokens. If this is a Tailwind-based component, an LLM agent can re-implement it from the class list alone:

${tailwindBlock}

## DOM outline

\`\`\`
${domOutline}
\`\`\`

## Full HTML

\`\`\`html
${htmlSnippet.trimEnd()}
\`\`\`

## Notes for downstream agents

- The HTML is the **rendered** subtree captured after JS hydration, scroll-triggered reveals, and a settle pass — it should reflect what a user sees, not the empty pre-hydration shell.
- Pseudo-element \`content:\` is captured separately in \`component.pseudo.json\` because it cannot live in HTML. **Always check it** — buttons with arrow icons, list bullets, and badge labels often live there.
- Pseudo-elements and \`:hover\` / \`:focus\` rules **are** in \`component.css\` — pseudo-state pseudos are stripped during matching and unconditionally included.
- Closed shadow DOM cannot be inspected; if the component uses one, it will not appear here. Open shadow trees are serialized as \`<template shadowrootmode="open">\` children and parsed back into shadow roots automatically by modern browsers.
- This bundle is **not runnable on its own** — it does not include the original framework runtime. Drop \`component.html\` + \`component.css\` into a fresh HTML file to preview, or feed everything to a coding agent to rebuild.
`;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
