import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('INTERNAL_SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST')
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '') || '';
    if (!jwt)
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Verify caller is master_admin via REST RPC
    const check = await fetch(`${SUPABASE_URL}/rest/v1/rpc/actor_is_master_admin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!check.ok) {
      return new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const ok = await check.json();
    if (!ok)
      return new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const { email, org_id, org_role } = await req.json();
    if (!email)
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Find user id by email using GoTrue admin
    const lookup = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
    );
    if (!lookup.ok) {
      const body = await lookup.text();
      return new Response(JSON.stringify({ error: body || 'lookup failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const lu = await lookup.json();
    const userId = lu?.users?.[0]?.id as string | undefined;
    if (!userId)
      return new Response(JSON.stringify({ error: 'user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    if (!org_id) {
      // Clear membership and profile org
      await supabaseAdmin.from('memberships').delete().eq('user_id', userId);
      await supabaseAdmin.from('profiles').update({ org_id: null }).eq('user_id', userId);
      return new Response(JSON.stringify({ ok: true, user_id: userId, org_id: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const role = (org_role as string) || 'staff';
    const { error: upErr } = await supabaseAdmin
      .from('memberships')
      .upsert({ user_id: userId, org_id, role } as any, { onConflict: 'user_id,org_id' });
    if (upErr)
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: userId, org_id } as any, { onConflict: 'user_id' });

    // Return org name for convenience
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id,name')
      .eq('id', org_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, org_id, org_name: org?.name ?? null, role }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
