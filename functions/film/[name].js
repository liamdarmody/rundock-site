// Serves the homepage film with byte-range support.
//
// Cloudflare Pages serves static files whole, ignoring Range requests. Safari
// will not play a video without them, and no browser can jump ahead in one
// before it has downloaded the whole file. This function reads the static
// file and answers a Range request with just the bytes asked for (206).
//
// Only the film files listed here are served; anything else is a 404.

const FILMS = new Set(['rundock-film-1080.mp4', 'rundock-film-720.mp4']);

export async function onRequestGet({ request, params, env }) {
  const name = params.name;
  if (!FILMS.has(name)) return new Response('Not found', { status: 404 });

  const asset = await env.ASSETS.fetch(new URL('/' + name, request.url));
  if (!asset.ok) return new Response('Not found', { status: 404 });
  const body = await asset.arrayBuffer();
  const size = body.byteLength;

  const headers = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  };

  const range = request.headers.get('Range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    return new Response(body, { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  }

  let start, end;
  if (m[1] === '') {
    // A suffix range: the last N bytes.
    const n = Math.min(Number(m[2]), size);
    start = size - n;
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  }

  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
    },
  });
}

export async function onRequestHead(ctx) {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
