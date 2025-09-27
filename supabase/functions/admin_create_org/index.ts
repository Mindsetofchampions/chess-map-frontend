/**
 * Admin Create Organization Edge Function
 *
 * Securely creates an organization using service role after verifying the caller
 * is a master admin via the actor_is_master_admin RPC. CORS enabled.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateOrgRequest {
  name: string;
  status?: 'pending' | 'active' | 'rejected' | 'suspended';
  slug?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL =
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('INTERNAL_SUPABASE_URL') ?? '';
    const SERVICE_ROLE =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({
          error: 'Server misconfigured: missing env for Supabase',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify caller is master admin
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    const ok = await check.json();
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Master admin privileges required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const body: CreateOrgRequest = await req.json();
    const name = (body?.name || '').trim();
    const status = body?.status;
    const slug = body?.slug;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Organization name required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Build insert payload conservatively; only include known fields if provided
    const payload: Record<string, unknown> = { name };
    if (status) payload.status = status;
    if (slug) payload.slug = slug;

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: `Insert failed: ${error.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true, organization: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('admin_create_org error', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
