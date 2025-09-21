import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('INTERNAL_SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  try {
    const { email } = await req.json();
    if (!email)
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    const normalized = String(email).trim().toLowerCase();

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const check = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_master_admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const ok = await check.json();
    if (!ok)
      return new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const lookup = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
      {
        headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
      },
    );
    const lu = await lookup.json();
    let userId = lu?.users?.[0]?.id || lu?.user?.id;
    // Fallback to PostgREST lookup in auth.users
    if (!userId) {
      const rest = await fetch(
        `${SUPABASE_URL}/rest/v1/auth.users?select=id,email&email=eq.${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE}`,
            apikey: SERVICE_ROLE,
            'Content-Type': 'application/json',
          },
        },
      );
      const arr = await rest.json();
      if (Array.isArray(arr) && arr.length) userId = arr[0].id;
    }
    if (!userId)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
    });

    if (!del.ok) {
      const body = await del.json();
      return new Response(JSON.stringify(body), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort cleanup of app-side rows (ignore errors)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/memberships?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      });
    } catch (_) {}

    return new Response(JSON.stringify({ id: userId, email: normalized }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
