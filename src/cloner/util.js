import crypto from 'node:crypto';
import mime from 'mime-types';

export function hashUrl(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);
}

export function extFromMime(mimeType, url) {
  // Prefer URL extension when it matches a known type
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return `.${m[1].toLowerCase()}`;
  } catch {}
  if (mimeType) {
    const ext = mime.extension(String(mimeType).split(';')[0].trim());
    if (ext) return `.${ext}`;
  }
  return '';
}

export function sanitizeBasename(pathname) {
  const last = pathname.replace(/\/+$/, '').split('/').pop() || '';
  const cleaned = last.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^a-z0-9._-]/gi, '_');
  return cleaned.slice(0, 60);
}
