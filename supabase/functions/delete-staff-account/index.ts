import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const allowedOrigins = new Set(["https://renue.pages.dev", "https://jadymcintyre.github.io"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins.has(origin)) return new Response(null, { status: 403 });

  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  function respond(status: number, code: string) {
    return Response.json({ code }, { status, headers: cors });
  }

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond(405, "method_not_allowed");
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond(401, "sign_in_required");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return respond(401, "sign_in_required");
  const { data: profile, error: profileError } = await admin.from("staff_profiles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (profileError) return respond(503, "unavailable");
  if (profile?.role !== "owner") return respond(403, "owner_required");

  const body = await request.json().catch(() => null);
  const id = typeof body?.user_id === "string" ? body.user_id.toLowerCase() : "";
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) return respond(400, "invalid_account");
  if (id === user.id) return respond(403, "protected_account");

  const { data: target, error: targetError } = await admin.from("staff_profiles")
    .select("role").eq("user_id", id).maybeSingle();
  if (targetError) return respond(503, "unavailable");
  if (!target || target.role !== body.role) return respond(409, "account_changed");
  if (target.role === "owner") return respond(403, "protected_account");

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) return respond(502, "delete_failed");
  return respond(200, "deleted");
});
