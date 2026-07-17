import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getFirstNamedKey(raw: string | undefined) {
  if (!raw) return "";
  try {
    return String(Object.values(JSON.parse(raw))[0] || "");
  } catch {
    return "";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = getFirstNamedKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"))
    || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = getFirstNamedKey(Deno.env.get("SUPABASE_SECRET_KEYS"))
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = request.headers.get("Authorization") || "";

  if (!supabaseUrl || !publishableKey || !secretKey || !authorization) {
    return Response.json({ error: "Missing server configuration or authorization" }, { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });

  const body = await request.json().catch(() => ({}));
  const workspaceId = String(body.workspaceId || "");
  const action = String(body.action || "create");
  const displayName = String(body.displayName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "coordinator" ? "coordinator" : "collaborator";

  if (!workspaceId || !displayName || !email || password.length < 8) {
    return Response.json({ error: "Workspace, name, email and an 8-character password are required" }, { status: 400, headers: corsHeaders });
  }

  const { data: membership } = await adminClient
    .from("workspace_members")
    .select("role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (membership?.role !== "coordinator" || membership.status !== "active") {
    return Response.json({ error: "Coordinator access required" }, { status: 403, headers: corsHeaders });
  }

  if (action === "delete") {
    const targetUserId = String(body.userId || "");
    if (!targetUserId || targetUserId === userData.user.id) {
      return Response.json({ error: "A coordinator cannot delete the active account" }, { status: 400, headers: corsHeaders });
    }
    const { data: targetMembership } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!targetMembership) return Response.json({ ok: true }, { headers: corsHeaders });
    if (targetMembership.role === "coordinator") {
      const { count } = await adminClient
        .from("workspace_members")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("role", "coordinator")
        .eq("status", "active");
      if ((count || 0) <= 1) {
        return Response.json({ error: "The final coordinator cannot be deleted" }, { status: 400, headers: corsHeaders });
      }
    }
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 400, headers: corsHeaders });
    return Response.json({ ok: true }, { headers: corsHeaders });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError || !created.user) {
    return Response.json({ error: createError?.message || "Could not create user" }, { status: 400, headers: corsHeaders });
  }

  const { error: memberError } = await adminClient.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: created.user.id,
    role,
    status: "active",
  });
  if (memberError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: memberError.message }, { status: 400, headers: corsHeaders });
  }

  await adminClient.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userData.user.id,
    action: "member.created",
    entity_type: "profile",
    entity_id: created.user.id,
    details: { display_name: displayName, role },
  });

  return Response.json({ id: created.user.id, email, displayName, role }, { status: 201, headers: corsHeaders });
});
