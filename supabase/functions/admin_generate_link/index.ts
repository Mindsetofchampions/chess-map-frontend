import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { email, type = "magiclink", redirectTo } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=role&limit=1`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await r.json();
    if (!Array.isArray(data) || data[0]?.role !== "master_admin") {
      return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
    }

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, type, redirect_to: redirectTo }),
    });
    const body = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify(body), { status: 400 });

    return new Response(JSON.stringify({ url: body?.properties?.action_link ?? body?.action_link }), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});