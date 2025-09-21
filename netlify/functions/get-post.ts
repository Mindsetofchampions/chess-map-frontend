// Netlify Function: get-post
// Fetch a post by id from Neon using @netlify/neon. Expects NETLIFY_DATABASE_URL env.

import { neon } from '@netlify/neon';

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const sql = neon(); // uses NETLIFY_DATABASE_URL under the hood

    const rows = await sql`SELECT * FROM posts WHERE id = ${postId}`;
    const post = rows?.[0] ?? null;

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Database query failed' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
};
