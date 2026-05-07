// =============================================================================
// AI client — thin wrapper around @google/genai. Lazy-initialized so a missing
// or invalid GEMINI_API_KEY never blocks server startup; pipelines call
// `safeCall(fn)` and gracefully degrade to deterministic-only when `ok: false`.
//
// Hard rule (CLAUDE.md): never log the API key value. Errors are routed
// through `redactError()`, which strips the literal key out of error messages
// in case the SDK echoes the request URL.
// =============================================================================

import { GoogleGenAI } from '@google/genai';

let _client = null;
let _disabled = false;
let _disabledReason = '';

// Known-leaked value guard. If the env key ever matches this, the wrapper
// refuses to initialize — operating with a leaked key would let anyone with
// the chat transcript run up usage on the user's account.
const KNOWN_LEAKED_KEY = 'AIzaSyAwG0tpm9_ZgFPiaq8gEC5hPutFIek7GOk';

export function isAvailable() {
  if (_disabled) return false;
  const k = process.env.GEMINI_API_KEY;
  if (!k) return false;
  if (k === KNOWN_LEAKED_KEY) return false;
  return true;
}

export function getClient() {
  if (_disabled) {
    throw new Error(`AI client disabled: ${_disabledReason}`);
  }
  const k = process.env.GEMINI_API_KEY;
  if (!k) {
    throw new Error('GEMINI_API_KEY not set — running deterministic-only.');
  }
  if (k === KNOWN_LEAKED_KEY) {
    throw new Error('GEMINI_API_KEY equals a previously-leaked value — rotate at https://aistudio.google.com/apikey before continuing.');
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: k });
  }
  return _client;
}

export function disableAi(reason) {
  _disabled = true;
  _disabledReason = reason || 'unknown';
  console.warn(`[ai] disabled: ${_disabledReason}`);
}

// Strip the API key out of any string that might contain it. The Google SDK
// occasionally surfaces the request URL (with `?key=...`) in error messages.
export function redactError(err) {
  const k = process.env.GEMINI_API_KEY || '';
  const raw = err?.message || String(err);
  const msg = k && raw.includes(k) ? raw.split(k).join('<redacted-key>') : raw;
  return `${err?.name || 'Error'}: ${msg}`;
}

// Run a callback against the SDK client with timeout + redacted error
// reporting. Pipelines should use this rather than calling getClient()
// directly so a transient failure can't take down the rest of the job.
//
// Note: we use Promise.race for the timeout, which means the underlying
// SDK request keeps running until it resolves on its own. Acceptable for
// short stages; if we ever stream long generations we'll need AbortController.
export async function safeCall(fn, { timeoutMs = 30_000 } = {}) {
  if (!isAvailable()) {
    return { ok: false, error: 'GEMINI_API_KEY not set or compromised', code: 'no-key' };
  }
  let timer;
  try {
    const result = await Promise.race([
      fn(getClient()),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('AI call timed out')), timeoutMs);
      }),
    ]);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: redactError(err), code: err?.code || 'call-failed' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
