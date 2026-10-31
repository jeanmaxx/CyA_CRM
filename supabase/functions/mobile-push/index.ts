import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { JWT } from "npm:google-auth-library@9.15.1";

type LeadRecord = {
  organization_id: string;
  id: string;
  advisor_id: string | null;
  name: string;
  service_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type HookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: { organization_id?: string; id?: string; created_at?: string };
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function supabaseSecretKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.default || Object.values(parsed)[0] || "");
  } catch {
    return "";
  }
}

function decodeServiceAccount(): ServiceAccount | null {
  const raw = String(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "").trim();
  let parsed: Partial<ServiceAccount> = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(atob(raw));
      } catch {
        parsed = {};
      }
    }
  }
  const project_id = String(parsed.project_id || Deno.env.get("FIREBASE_PROJECT_ID") || "").trim();
  const client_email = String(parsed.client_email || Deno.env.get("FIREBASE_CLIENT_EMAIL") || "").trim();
  const private_key = String(parsed.private_key || Deno.env.get("FIREBASE_PRIVATE_KEY") || "").replace(/\\n/g, "\n").trim();
  if (!project_id || !client_email || !private_key) return null;
  return { project_id, client_email, private_key };
}

async function googleAccessToken(account: ServiceAccount): Promise<string> {
  return await new Promise((resolve, reject) => {
    const client = new JWT({
      email: account.client_email,
      key: account.private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    client.authorize((error, tokens) => {
      if (error) return reject(error);
      const token = String(tokens?.access_token || "");
      if (!token) return reject(new Error("Google no devolvió access_token"));
      resolve(token);
    });
  });
}

function roleMayReceive(role: string, userId: string, advisorId: string | null) {
  return role === "admin" || role === "tech_admin" || !advisorId || userId === advisorId;
}

function safeLeadName(value: string) {
  const name = String(value || "").trim();
  if (!name || /^nombre pendiente de validar$/i.test(name)) return "Nuevo prospecto";
  return name.slice(0, 80);
}

function isInvalidRegistration(status: number, payload: any) {
  const text = JSON.stringify(payload || {}).toUpperCase();
  return status === 404 || text.includes("UNREGISTERED") || text.includes("REGISTRATION TOKEN IS NOT A VALID FCM REGISTRATION TOKEN");
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return json({
      ok: true,
      service: "mobile-push",
      firebaseConfigured: Boolean(decodeServiceAccount()),
      supabaseAdminConfigured: Boolean(supabaseSecretKey()),
    });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = supabaseSecretKey();
  if (!url || !key) return json({ error: "supabase_admin_not_configured" }, 500);

  let payload: HookPayload;
  try { payload = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  if (payload.type !== "INSERT" || payload.table !== "leads" || payload.schema !== "public") {
    return json({ ignored: true, reason: "unsupported_event" }, 202);
  }
  const organizationId = String(payload.record?.organization_id || "").trim();
  const leadId = String(payload.record?.id || "").trim();
  if (!organizationId || !leadId) return json({ error: "missing_lead_identity" }, 400);

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("organization_id,id,advisor_id,name,service_id,payload,created_at")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle<LeadRecord>();
  if (leadError) return json({ error: "lead_lookup_failed", detail: leadError.message }, 500);
  if (!lead) return json({ ignored: true, reason: "lead_not_found" }, 202);

  const ageMs = Date.now() - new Date(lead.created_at).getTime();
  if (!Number.isFinite(ageMs) || ageMs < -60_000 || ageMs > 60 * 60 * 1000) {
    return json({ ignored: true, reason: "stale_lead" }, 202);
  }

  const { data: tokens, error: tokenError } = await supabase
    .from("mobile_push_tokens")
    .select("id,user_id,token,active")
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (tokenError) return json({ error: "token_lookup_failed", detail: tokenError.message }, 500);
  if (!tokens?.length) return json({ ok: true, recipients: 0, sent: 0 });

  const userIds = [...new Set(tokens.map((t: any) => String(t.user_id)))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,active,organization_id")
    .eq("organization_id", organizationId)
    .in("id", userIds);
  if (profileError) return json({ error: "profile_lookup_failed", detail: profileError.message }, 500);

  const profileById = new Map((profiles || []).map((p: any) => [String(p.id), p]));
  const recipients = tokens.filter((token: any) => {
    const profile: any = profileById.get(String(token.user_id));
    return profile?.active === true && roleMayReceive(String(profile.role || ""), String(token.user_id), lead.advisor_id ? String(lead.advisor_id) : null);
  });
  if (!recipients.length) return json({ ok: true, recipients: 0, sent: 0 });

  const account = decodeServiceAccount();
  if (!account) {
    console.error("mobile-push: Firebase server credential missing");
    return json({ error: "firebase_service_account_not_configured", recipients: recipients.length }, 503);
  }

  let accessToken: string;
  try { accessToken = await googleAccessToken(account); }
  catch (error) {
    console.error("mobile-push: OAuth failed", error);
    return json({ error: "firebase_oauth_failed" }, 502);
  }

  const name = safeLeadName(lead.name);
  const title = "🔔 Nuevo lead recibido";
  const body = `${name} · Abre C&A CRM para revisarlo.`;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const target of recipients as any[]) {
    const deliveryKey = { organization_id: organizationId, lead_id: leadId, push_token_id: target.id };
    const { data: existing } = await supabase
      .from("mobile_push_deliveries")
      .select("id,status,attempts")
      .match(deliveryKey)
      .maybeSingle();
    if (existing?.status === "sent") { skipped++; continue; }

    let deliveryId = existing?.id;
    if (!deliveryId) {
      const { data: inserted, error: insertError } = await supabase
        .from("mobile_push_deliveries")
        .insert({ ...deliveryKey, user_id: target.user_id, status: "pending", attempts: 1 })
        .select("id")
        .single();
      if (insertError) {
        if (insertError.code === "23505") { skipped++; continue; }
        console.error("mobile-push delivery insert", insertError);
        failed++; continue;
      }
      deliveryId = inserted.id;
    } else {
      await supabase.from("mobile_push_deliveries").update({
        status: "pending",
        attempts: Number(existing.attempts || 0) + 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", deliveryId);
    }

    let response: Response;
    let responseBody: any = {};
    try {
      response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: target.token,
            notification: { title, body },
            data: {
              type: "new_lead",
              organizationId,
              leadId,
              deepLink: `lead:${leadId}`,
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "cya_general",
                sound: "default",
                visibility: "PRIVATE",
                default_vibrate_timings: true,
              },
            },
          },
        }),
      });
      responseBody = await response.json().catch(() => ({}));
    } catch (error) {
      response = new Response(null, { status: 599 });
      responseBody = { error: String(error) };
    }

    if (response.ok) {
      sent++;
      await supabase.from("mobile_push_deliveries").update({
        status: "sent",
        fcm_message_name: String(responseBody?.name || ""),
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", deliveryId);
    } else {
      failed++;
      const errorText = JSON.stringify(responseBody || {}).slice(0, 1200);
      await supabase.from("mobile_push_deliveries").update({
        status: "failed",
        last_error: errorText,
        updated_at: new Date().toISOString(),
      }).eq("id", deliveryId);
      if (isInvalidRegistration(response.status, responseBody)) {
        await supabase.from("mobile_push_tokens").update({ active: false, updated_at: new Date().toISOString() }).eq("id", target.id);
      }
      console.error("mobile-push FCM failure", response.status, errorText);
    }
  }

  return json({ ok: failed === 0, recipients: recipients.length, sent, failed, skipped }, failed ? 207 : 200);
});
