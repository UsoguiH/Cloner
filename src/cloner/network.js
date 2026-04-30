/**
 * CDP-based network recorder.
 *
 * Listens to the raw Chrome DevTools Protocol Network domain so we capture
 * every response body (including ones loaded by sub-frames and workers),
 * not just the requests Playwright surfaces via page.on('response').
 */
export class CDPNetworkRecorder {
  constructor({ page }) {
    this.page = page;
    this.cdp = null;
    this.requests = new Map(); // requestId -> { url, method, headers, type }
    this.responses = new Map(); // url -> { mimeType, status, headers, body, bodyBase64, error }
    this.harEntries = [];
    this.pendingBody = [];
  }

  async attach() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    await this.cdp.send('Network.enable');
    await this.cdp.send('Page.enable');

    this.cdp.on('Network.requestWillBeSent', (e) => {
      this.requests.set(e.requestId, {
        url: e.request.url,
        method: e.request.method,
        headers: e.request.headers,
        type: e.type,
        wallTime: e.wallTime,
        timestamp: e.timestamp,
      });
    });

    this.cdp.on('Network.responseReceived', (e) => {
      const req = this.requests.get(e.requestId);
      if (!req) return;
      req.response = {
        status: e.response.status,
        statusText: e.response.statusText,
        mimeType: e.response.mimeType,
        headers: e.response.headers,
        remoteIPAddress: e.response.remoteIPAddress,
        fromDiskCache: e.response.fromDiskCache,
        protocol: e.response.protocol,
      };
    });

    this.cdp.on('Network.loadingFinished', (e) => {
      this.pendingBody.push(this._fetchBody(e.requestId));
    });

    this.cdp.on('Network.loadingFailed', (e) => {
      const req = this.requests.get(e.requestId);
      if (!req) return;
      this.responses.set(req.url, {
        url: req.url,
        status: 0,
        mimeType: req.response?.mimeType,
        headers: req.response?.headers || {},
        error: e.errorText,
      });
    });

    this.cdp.on('Network.webSocketCreated', (e) => {
      this.harEntries.push({ kind: 'ws-created', url: e.url, requestId: e.requestId });
    });
    this.cdp.on('Network.webSocketFrameSent', (e) => {
      this.harEntries.push({ kind: 'ws-tx', requestId: e.requestId, payload: e.response?.payloadData });
    });
    this.cdp.on('Network.webSocketFrameReceived', (e) => {
      this.harEntries.push({ kind: 'ws-rx', requestId: e.requestId, payload: e.response?.payloadData });
    });
    this.cdp.on('Network.eventSourceMessageReceived', (e) => {
      this.harEntries.push({ kind: 'sse', requestId: e.requestId, data: e.data });
    });
  }

  async _fetchBody(requestId) {
    const req = this.requests.get(requestId);
    if (!req) return;
    try {
      const { body, base64Encoded } = await this.cdp.send('Network.getResponseBody', { requestId });
      this.responses.set(req.url, {
        url: req.url,
        status: req.response?.status,
        mimeType: req.response?.mimeType,
        headers: req.response?.headers || {},
        body,
        bodyBase64: base64Encoded,
      });
    } catch (err) {
      this.responses.set(req.url, {
        url: req.url,
        status: req.response?.status,
        mimeType: req.response?.mimeType,
        headers: req.response?.headers || {},
        error: err.message || String(err),
      });
    }
  }

  async flush() {
    // Drain in-flight body fetches.
    let prev;
    do {
      prev = this.pendingBody.length;
      await Promise.allSettled(this.pendingBody.splice(0));
    } while (this.pendingBody.length && this.pendingBody.length !== prev);
    try { await this.cdp.detach(); } catch {}
  }

  toHAR(pageUrl) {
    const entries = [];
    for (const req of this.requests.values()) {
      if (!req.response) continue;
      entries.push({
        startedDateTime: req.wallTime
          ? new Date(req.wallTime * 1000).toISOString()
          : new Date().toISOString(),
        time: 0,
        request: {
          method: req.method,
          url: req.url,
          httpVersion: req.response.protocol || 'HTTP/1.1',
          headers: headerObjToArr(req.headers),
          queryString: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: {
          status: req.response.status,
          statusText: req.response.statusText || '',
          httpVersion: req.response.protocol || 'HTTP/1.1',
          headers: headerObjToArr(req.response.headers),
          content: {
            size: -1,
            mimeType: req.response.mimeType || '',
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        },
        cache: {},
        timings: { send: 0, wait: 0, receive: 0 },
        _resourceType: req.type,
      });
    }
    return {
      log: {
        version: '1.2',
        creator: { name: 'clone-saas', version: '0.1.0' },
        pages: [{ id: 'page_1', startedDateTime: new Date().toISOString(), title: pageUrl, pageTimings: {} }],
        entries,
      },
    };
  }
}

function headerObjToArr(h = {}) {
  return Object.entries(h).map(([name, value]) => ({ name, value: String(value) }));
}
