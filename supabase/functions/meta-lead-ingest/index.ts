import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeCurp(value: unknown) {
  return text(value).replace(/[^A-ZÑ0-9]/gi, '').toUpperCase().slice(0, 18);
}

function normalizePhone(value: unknown) {
  return text(value).replace(/^p:/i, '').replace(/[^0-9+]/g, '').slice(0, 20);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeExternalId(value: unknown) {
  return text(value).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  try {
    const token = text(req.headers.get('X-Lead-Integration-Token'));
    if (!token) return json(401, { error: 'Falta token de integración' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const tokenHash = await sha256(token);
    const { data: integration, error: integrationError } = await admin
      .from('lead_integrations')
      .select('id,organization_id,advisor_id,provider,label,enabled')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (integrationError) throw integrationError;
    if (!integration || integration.enabled !== true) return json(403, { error: 'Integración inválida o desactivada' });

    const body = await req.json();
    const externalId = safeExternalId(body.external_id);
    const curp = normalizeCurp(body.curp);
    const phone = normalizePhone(body.phone);
    const email = text(body.email).toLowerCase();
    const rawName = text(body.full_name);
    const name = rawName || 'Nombre pendiente de validar';

    if (!externalId && !curp && !phone && !email) {
      return json(400, { error: 'El lead no contiene identificadores suficientes' });
    }

    // Meta lead IDs are used as the primary idempotency key. If unavailable,
    // use a stable hash of the strongest fields available.
    const fallbackKey = await sha256([curp, phone, email].join('|'));
    const leadId = `meta_${String(integration.id).slice(0, 8)}_${externalId || fallbackKey.slice(0, 24)}`;

    const { data: existing, error: existingError } = await admin
      .from('leads')
      .select('id,name,phone,curp,payload')
      .eq('organization_id', integration.organization_id)
      .eq('id', leadId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      await admin.from('lead_integrations').update({ last_received_at: new Date().toISOString(), last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, duplicate: true, lead_id: existing.id });
    }

    // Secondary duplicate checks prevent a repeated lead without the original Meta id
    // from silently creating another prospect. These are advisory: matching rows are
    // returned to the CRM for review instead of being overwritten automatically.
    let possibleDuplicate: { id: string } | null = null;
    if (curp.length === 18) {
      const { data } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).eq('curp', curp).limit(1);
      possibleDuplicate = data?.[0] || null;
    }
    if (!possibleDuplicate && phone) {
      const { data } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).eq('phone', phone).limit(1);
      possibleDuplicate = data?.[0] || null;
    }

    if (possibleDuplicate) {
      await admin.from('lead_integrations').update({ last_received_at: new Date().toISOString(), last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, duplicate: true, possible_duplicate: true, lead_id: possibleDuplicate.id });
    }

    const createdAt = text(body.created_time) || new Date().toISOString();
    const declaredAnswers = typeof body.answers === 'object' && body.answers ? body.answers : {};

    const payload = {
      nombreMeta: rawName,
      nombreVerificado: false,
      email,
      correo: email,
      ciudad: text(body.city),
      fuenteContacto: 'Meta Ads',
      metaAds: true,
      revisionSolicitada: false,
      metaLead: {
        externalId,
        nombreRecibido: rawName,
        campaignName: text(body.campaign_name),
        adsetName: text(body.adset_name),
        adName: text(body.ad_name),
        formName: text(body.form_name),
        platform: text(body.platform),
        createdTime: createdAt,
        answers: declaredAnswers,
      },
      elegibilidadDeclarada: {
        origen: 'Meta Ads',
        respuestas: declaredAnswers,
      },
      fechaRegistro: createdAt.slice(0, 10),
      fechaInicio: createdAt,
      fechaCaptura: new Date().toISOString(),
    };

    const { error: insertError } = await admin.from('leads').insert({
      organization_id: integration.organization_id,
      id: leadId,
      advisor_id: integration.advisor_id,
      collaborator_id: null,
      name,
      phone: phone || null,
      curp: curp || null,
      service_id: 'retiro_desempleo',
      status: 'semanas',
      archive_type: null,
      recontact_date: null,
      payload,
    });
    if (insertError) throw insertError;

    await admin.from('lead_integrations').update({ last_received_at: new Date().toISOString(), last_error: null }).eq('id', integration.id);
    return json(201, { ok: true, duplicate: false, lead_id: leadId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return json(400, { error: message });
  }
});
