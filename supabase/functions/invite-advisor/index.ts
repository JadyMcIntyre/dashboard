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
  if (!["manager", "owner"].includes(profile?.role)) return respond(403, "manager_required");

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, "invalid_email");

  const requestId = crypto.randomUUID();
  const invitations = admin.from("advisor_invitations");
  const { error: reserveError } = await admin.rpc("reserve_advisor_invitation", {
    invite_id: requestId, invite_email: email, manager_id: user.id,
  });
  if (reserveError) {
    if (reserveError.code === "PT409") return respond(409, "account_exists");
    if (reserveError.code === "23505") return respond(409, "already_invited");
    if (reserveError.code === "42501") return respond(403, "manager_required");
    return respond(503, "unavailable");
  }

  // Uses the project's existing invite template and configured Site URL.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { renue_advisor_invite: requestId },
  });
  if (inviteError) {
    // Keep a bound record if Auth created the account before reporting failure.
    await invitations.delete().eq("request_id", requestId).eq("status", "sending");
    if (inviteError.code === "email_exists" || inviteError.code === "user_already_exists") {
      return respond(409, "account_exists");
    }
    if (inviteError.status === 429) return respond(429, "email_limit");
    return respond(502, "send_failed");
  }
  const { data: tracked, error: trackingError } = await invitations.select("status")
    .eq("request_id", requestId).maybeSingle();
  if (trackingError) return respond(503, "unavailable");
  if (!tracked || tracked.status === "sending") {
    await invitations.delete().eq("request_id", requestId).eq("status", "sending");
    return respond(409, "account_exists");
  }
  return respond(201, "invited");
});
