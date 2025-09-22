import 'dotenv/config';
import https from 'node:https';

const token =
  process.env.VITE_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.VITE_MAPBOX_TOKEN_PK;

if (!token) {
  console.error('[mapbox] No token found in env (VITE_MAPBOX_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN).');
  process.exit(1);
}

const url = new URL('https://api.mapbox.com/styles/v1/mapbox/dark-v11');
url.searchParams.set('access_token', token);

const req = https.get(
  {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      // Avoid logging token; not sending referer
      'User-Agent': 'chess-map-frontend-token-check/1.0',
      Accept: 'application/json',
    },
  },
  (res) => {
    const status = res.statusCode || 0;
    const msg =
      status === 200
        ? 'OK (200) — token valid for styles.'
        : status === 401
          ? 'Unauthorized (401) — token invalid or missing scope.'
          : status === 403
            ? 'Forbidden (403) — domain/origin restricted or token disabled.'
            : `${status} — unexpected status`;
    console.log(`[mapbox] Styles API check: ${msg}`);
    process.exit(status === 200 ? 0 : 2);
  },
);

req.on('error', (err) => {
  console.error('[mapbox] Network error:', err.message);
  process.exit(2);
});
