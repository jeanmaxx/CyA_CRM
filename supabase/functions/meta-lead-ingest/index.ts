import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function text(value: unknown) { return String(value ?? '').trim(); }
function normalizeCurp(value: unknown) { return text(value).replace(/[^A-ZÑ0-9]/gi, '').toUpperCase().slice(0, 18); }
function normalizePhone(value: unknown) {
  let digits = text(value).replace(/^p:/i, '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  else if (digits.length > 10) digits = digits.slice(-10);
  return digits.slice(0, 10);
}
function normalizeKey(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function safeExternalId(value: unknown) { return text(value).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120); }
function findAnswer(answers: Record<string, unknown>, needle: string) {
  const normalizedNeedle = normalizeKey(needle);
  for (const [key, value] of Object.entries(answers)) if (normalizeKey(key).includes(normalizedNeedle)) return text(value);
  return '';
}
function declaredEligibility(answers: Record<string, unknown>) {
  const cotizaRaw = findAnswer(answers, 'actualmente te encuentras sin cotizar');
  const semanasRaw = findAnswer(answers, 'calculas haber cotizado al menos 2 anos');
  const retiroRaw = findAnswer(answers, 'has tramitado algun retiro por desempleo');
  const opt = (v: string) => normalizeKey(v);
  const c = opt(cotizaRaw), s = opt(semanasRaw), r = opt(retiroRaw);
  const sinCotizar = c.includes('opcion_a') ? 'mas_45_dias_sin_cotizar' : c.includes('opcion_b') ? 'cotiza_activo' : c ? 'requiere_revision' : '';
  const semanas = s.includes('opcion_a') ? '105_o_mas' : s.includes('opcion_b') ? 'menos_105' : s.includes('opcion_c') ? 'no_recuerda' : '';
  const retiro = r.includes('opcion_a') ? 'nunca' : r.includes('opcion_b') ? 'mas_5_anos' : r.includes('opcion_c') ? 'menos_5_anos' : r.includes('opcion_d') ? 'no_recuerda' : '';
  let precalificacion = 'requiere_revision';
  if (sinCotizar === 'cotiza_activo' || semanas === 'menos_105' || retiro === 'menos_5_anos') precalificacion = 'probable_no_elegible';
  else if (sinCotizar === 'mas_45_dias_sin_cotizar' && semanas === '105_o_mas' && ['nunca','mas_5_anos'].includes(retiro)) precalificacion = 'favorable';
  return { sinCotizar, semanas, retiro, precalificacion, respuestasOriginales: { cotiza: cotizaRaw, semanas: semanasRaw, retiro: retiroRaw } };
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
    const { data: integration, error: integrationError } = await admin.from('lead_integrations')
      .select('id,organization_id,advisor_id,provider,label,enabled').eq('token_hash', tokenHash).maybeSingle();
    if (integrationError) throw integrationError;
    if (!integration || integration.enabled !== true) return json(403, { error: 'Integración inválida o desactivada' });

    const body = await req.json();
    const externalId = safeExternalId(body.external_id);
    const curp = normalizeCurp(body.curp);
    const phone = normalizePhone(body.phone);
    const email = text(body.email).toLowerCase();
    const rawName = text(body.full_name);
    const name = rawName || 'Nombre pendiente de validar';
    if (!externalId && !curp && !phone && !email) return json(400, { error: 'El lead no contiene identificadores suficientes' });

    const fallbackKey = await sha256([curp, phone, email].join('|'));
    const leadId = `meta_${String(integration.id).slice(0, 8)}_${externalId || fallbackKey.slice(0, 24)}`;
    const { data: existing, error: existingError } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).eq('id', leadId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      await admin.from('lead_integrations').update({ last_received_at: new Date().toISOString(), last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, duplicate: true, lead_id: existing.id });
    }

    let possibleDuplicate: { id: string } | null = null;
    if (curp.length === 18) {
      const { data } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).eq('curp', curp).limit(1);
      possibleDuplicate = data?.[0] || null;
    }
    if (!possibleDuplicate && phone.length === 10) {
      const { data } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).eq('phone', phone).limit(1);
      possibleDuplicate = data?.[0] || null;
    }
    if (!possibleDuplicate && email) {
      const { data } = await admin.from('leads').select('id').eq('organization_id', integration.organization_id).contains('payload', { email }).limit(1);
      possibleDuplicate = data?.[0] || null;
    }
    if (possibleDuplicate) {
      await admin.from('lead_integrations').update({ last_received_at: new Date().toISOString(), last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, duplicate: true, possible_duplicate: true, lead_id: possibleDuplicate.id });
    }

    const createdAt = text(body.created_time) || new Date().toISOString();
    const declaredAnswers = typeof body.answers === 'object' && body.answers ? body.answers as Record<string, unknown> : {};
    const declared = declaredEligibility(declaredAnswers);
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
      elegibilidad: { porServicio: { retiro_desempleo: { declarado: declared } } },
      elegibilidadDeclarada: { origen: 'Meta Ads', ...declared },
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
    return json(201, { ok: true, duplicate: false, lead_id: leadId, precalificacion: declared.precalificacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return json(400, { error: message });
  }
});
