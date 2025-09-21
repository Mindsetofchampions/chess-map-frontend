import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

// Expects env NETLIFY_DATABASE_URL to be set in Netlify (Dashboard -> Site settings -> Environment)
// Example: postgresql://user:password@ep-...neon.tech/dbname?sslmode=require&channel_binding=require

export const handler: Handler = async (event) => {
  try {
    const sql = neon(); // uses NETLIFY_DATABASE_URL

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing id parameter' }),
        };
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
      const rows =
        await sql`INSERT INTO posts (title, content) VALUES (${title}, ${content}) RETURNING *`;
      return { statusCode: 201, body: JSON.stringify(rows?.[0] ?? null) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Neon function error:', err);
    }
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
