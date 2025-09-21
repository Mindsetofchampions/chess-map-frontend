import { neon } from '@netlify/neon';

// Netlify Functions (JS/ESM) handler - GET /api/posts?id=123
export async function handler(event) {
  try {
    const sql = neon(); // uses env NETLIFY_DATABASE_URL automatically

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing id parameter' }) };
      }
      const rows = await sql`SELECT * FROM posts WHERE id = ${id}`;
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rows?.[0] ?? null),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { title, content } = body;
      if (!title || !content) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
      }
      const rows = await sql`INSERT INTO posts (title, content) VALUES (${title}, ${content}) RETURNING *`;
      return { statusCode: 201, body: JSON.stringify(rows?.[0] ?? null) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Neon function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Server error' }) };
  }
}
