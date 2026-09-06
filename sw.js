/* Coastline web deployment worker.
 * GitHub Pages serves .gz files without Content-Encoding and rejects
 * pushes containing files over 100 MB, so the 121 MB Web.data.gz is
 * stored as 4 chunks. This worker reassembles them, verifies SHA-256
 * against Build/manifest.json, gunzips every Unity payload with
 * DecompressionStream and hands the loader plain bytes. */

const MIME = {
  'Web.data.gz': 'application/octet-stream',
  'Web.wasm.gz': 'application/wasm',
  'Web.framework.js.gz': 'text/javascript',
};

const DIGEST_KEY = {
  'Web.data.gz': 'dataSha256',
  'Web.wasm.gz': 'wasmSha256',
  'Web.framework.js.gz': 'frameworkSha256',
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const name = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
  if (!Object.prototype.hasOwnProperty.call(MIME, name)) return;
  event.respondWith(serve(name, MIME[name]));
});

async function serve(name, mime) {
  try {
    const manifest = await (await fetch(new URL('Build/manifest.json', self.registration.scope))).json();
    const payload = name === 'Web.data.gz'
      ? await reassemble(manifest)
      : await fetchBuffer(new URL('Build/' + name, self.registration.scope));
    await verify(payload, manifest, name);
    return new Response(await gunzip(payload), {
      headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    return new Response('coastline deploy worker: ' + (error && error.message), { status: 500 });
  }
}

async function reassemble(manifest) {
  const urls = [];
  for (let i = 0; i < manifest.dataParts; i++) {
    urls.push(new URL('Build/Web.data.gz.' + String(i).padStart(2, '0'), self.registration.scope));
  }
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  for (const response of responses) {
    if (!response.ok) throw new Error('chunk request failed: HTTP ' + response.status);
  }
  const parts = responses.map(() => ({ chunks: [], bytes: 0 }));
  let announced = -1;
  await Promise.all(responses.map(async (response, index) => {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts[index].chunks.push(value);
      parts[index].bytes += value.byteLength;
      const loaded = parts.reduce((sum, part) => sum + part.bytes, 0);
      if (loaded - announced >= 4194304 || loaded === manifest.dataBytes) {
        announced = loaded;
        report({ type: 'coastline-progress', loaded, total: manifest.dataBytes });
      }
    }
  }));
  const out = new Uint8Array(manifest.dataBytes);
  let offset = 0;
  for (const part of parts) {
    for (const chunk of part.chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
  }
  if (offset !== manifest.dataBytes) throw new Error('chunk bytes mismatch: ' + offset + ' != ' + manifest.dataBytes);
  return out;
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('asset request failed: ' + url.pathname + ' HTTP ' + response.status);
  return new Uint8Array(await response.arrayBuffer());
}

async function verify(payload, manifest, name) {
  const digest = await crypto.subtle.digest('SHA-256', payload);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== manifest[DIGEST_KEY[name]]) throw new Error('integrity mismatch for ' + name);
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).arrayBuffer();
}

async function report(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}
