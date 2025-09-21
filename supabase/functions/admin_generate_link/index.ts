import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('INTERNAL_SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { email, type = 'magiclink', redirectTo } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // Use a hardened check that doesn't rely on user_roles RLS
    const check = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_master_admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const ok = await check.json();
    if (!ok) return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 });

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type, redirect_to: redirectTo }),
    });
    const body = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify(body), { status: 400 });

    return new Response(
      JSON.stringify({ url: body?.properties?.action_link ?? body?.action_link }),
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
