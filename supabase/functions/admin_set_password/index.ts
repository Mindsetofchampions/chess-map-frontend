import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { email, password } = await req.json();
    if (!email || !password || password.length < 10) {
      return new Response(JSON.stringify({ error: "email & strong password (>=10) required" }), { status: 400 });
    }

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=role&limit=1`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await r.json();
    if (!Array.isArray(data) || data[0]?.role !== "master_admin") {
      return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
    }

    const lookup = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const lu = await lookup.json();
    const userId = lu?.users?.[0]?.id;
    if (!userId) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    const patch = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const res = await patch.json();
    if (!patch.ok) return new Response(JSON.stringify(res), { status: 400 });

    return new Response(JSON.stringify({ id: userId, email }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});