import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

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
    const { email, type = 'magiclink', redirectTo } = await req.json();
    if (!email)
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Verify caller is master admin using auth.uid() aware function
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

    // Only include redirect_to if it matches allowed hosts (to avoid 400 from GoTrue)
    let includeRedirect = false;
    if (redirectTo) {
      try {
        const u = new URL(redirectTo);
        const allowed = (Deno.env.get('ALLOWED_REDIRECT_HOSTS') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowed.length === 0) {
          // default allow: same host as SUPABASE_URL if provided
          const sHost = new URL(SUPABASE_URL).host;
          includeRedirect = u.host === sHost;
        } else {
          includeRedirect = allowed.includes(u.host);
        }
      } catch (_) {
        includeRedirect = false;
      }
    }

    const payload: Record<string, unknown> = { email, type, options: {} };
    if (includeRedirect) {
      // Set both legacy top-level and new options.redirect_to for compatibility
      (payload as any).redirect_to = redirectTo;
      (payload.options as any) = { ...(payload.options as any), redirect_to: redirectTo };
    }

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await resp.json();
    if (!resp.ok)
      return new Response(
        JSON.stringify({
          error: body?.error || body?.message || body?.error_description || 'generate_link failed',
          details: body,
        }),
        {
          status: resp.status || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );

    return new Response(
      JSON.stringify({ url: body?.properties?.action_link ?? body?.action_link }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
