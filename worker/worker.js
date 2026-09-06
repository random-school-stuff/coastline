// vimalinx.com/coastline/* -> GitHub Pages origin (vimalinx.xyz/coastline/*).
// Streams the Unity WebGL payload through unchanged so the game is served
// under the main domain while GitHub keeps hosting the 134 MB release.
const ORIGIN = 'https://vimalinx.xyz/coastline';

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('coastline proxy: GET/HEAD only', { status: 405 });
    }
    const url = new URL(request.url);
    let path = url.pathname.slice('/coastline'.length) || '/';
    if (!path.startsWith('/')) path = '/' + path;
    const headers = new Headers();
    const response = await fetch(ORIGIN + path + url.search, {
      headers,
      redirect: 'manual',
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    const out = new Headers(response.headers);
    out.delete('set-cookie');
    return new Response(response.body, { status: response.status, headers: out });
  },
};
