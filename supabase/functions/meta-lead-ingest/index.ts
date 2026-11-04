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
function safeExternalId(value: unknown) { return text(value).replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 120); }
function findAnswer(answers: Record<string, unknown>, needle: string) {
  const normalizedNeedle = normalizeKey(needle);
  for (const [key, value] of Object.entries(answers)) if (normalizeKey(key).includes(normalizedNeedle)) return text(value);
  return '';
}
function envKey(jsonName:string,legacyName:string){
  try{
    const raw=Deno.env.get(jsonName);
    if(raw){const parsed=JSON.parse(raw);if(parsed?.default)return String(parsed.default)}
  }catch(_){ }
  return Deno.env.get(legacyName)||'';
}
function declaredEligibility(answers: Record<string, unknown>) {
  const raw = answers.raw && typeof answers.raw === 'object' ? answers.raw as Record<string, unknown> : {};
  const pick = (canonical: string, needles: string[]) => {
    const direct = text(answers[canonical]);
    if (direct) return direct;
    for (const needle of needles) {
      const value = findAnswer(raw, needle) || findAnswer(answers, needle);
      if (value) return value;
    }
    return '';
  };
  const cotizaRaw = pick('imss_status_declared', ['cual describe mejor tu situacion actual ante el imss','actualmente te encuentras sin cotizar']);
  const semanasRaw = pick('weeks_declared', ['acumulaste al menos 2 anos cotizando','calculas haber cotizado al menos 2 anos']);
  const retiroRaw = pick('previous_withdrawal_declared', ['has realizado antes un retiro por desempleo','has tramitado algun retiro por desempleo']);
  const c = normalizeKey(cotizaRaw), s = normalizeKey(semanasRaw), r = normalizeKey(retiroRaw);
  // Conservative interpretation: unknown or ambiguous answers never become a favorable result.
  const activo = /opcion_b|actualmente_cotiz|imss_activo|trabajando|empleo_formal|dado_de_alta|si_cotizo/.test(c)
    && !/no_estoy|sin_cotizar|ya_no|no_cotizo/.test(c);
  const sinCotizar = activo ? 'cotiza_activo'
    : /opcion_a|mas_de_45|45_dias|sin_cotizar|dado_de_baja|no_estoy_cotizando/.test(c) ? 'mas_45_dias_sin_cotizar'
    : 'requiere_revision';
  const semanas = /opcion_b|menos_de_2_anos|menos_de_105/.test(s) ? 'menos_105'
    : /opcion_a|al_menos_2_anos|105_o_mas|mas_de_2_anos/.test(s) ? '105_o_mas'
    : 'no_recuerda';
  const retiro = /opcion_c|menos_de_5_anos|hace_menos_de_5/.test(r) ? 'menos_5_anos'
    : /opcion_b|mas_de_5_anos|hace_mas_de_5/.test(r) ? 'mas_5_anos'
    : /opcion_a|nunca|no_he_realizado/.test(r) ? 'nunca' : 'no_recuerda';
  const motivos = [];
  if (sinCotizar === 'cotiza_activo') motivos.push('imss_activo');
  if (retiro === 'menos_5_anos') motivos.push('retiro_menos_5');
  if (semanas === 'menos_105') motivos.push('cotizacion_insuficiente_declarada');
  const precalificacion = motivos.length ? 'probable_no_elegible'
    : sinCotizar === 'mas_45_dias_sin_cotizar' && semanas === '105_o_mas' && ['nunca','mas_5_anos'].includes(retiro)
      ? 'favorable' : 'requiere_revision';
  return { sinCotizar, semanas, retiro, precalificacion, motivos, respuestasOriginales: { cotiza: cotizaRaw, semanas: semanasRaw, retiro: retiroRaw } };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });
  try {
    const token = text(req.headers.get('X-Lead-Integration-Token'));
    if (!token) return json(401, { error: 'Falta token de integración' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const secretKey = envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
    if(!supabaseUrl||!secretKey)return json(500,{error:'Configuración de Supabase incompleta'});
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

    const tokenHash = await sha256(token);
    const { data: integration, error: integrationError } = await admin.from('lead_integrations')
      .select('id,organization_id,advisor_id,provider,label,enabled').eq('token_hash', tokenHash).maybeSingle();
    if (integrationError) throw integrationError;
    if (!integration || integration.enabled !== true) return json(403, { error: 'Integración inválida o desactivada' });

    const body = await req.json();
    const requestedAction = ['auto','import','reactivate'].includes(text(body.crm_action).toLowerCase()) ? text(body.crm_action).toLowerCase() : 'auto';
    const externalId = safeExternalId(body.external_id);
    const curp = normalizeCurp(body.curp);
    const phone = normalizePhone(body.phone);
    const email = text(body.email).toLowerCase();
    const rawName = text(body.full_name);
    const name = rawName || 'Nombre pendiente de validar';
    if (!externalId && !curp && !phone && !email) return json(400, { error: 'El lead no contiene identificadores suficientes' });

    const fallbackKey = await sha256([curp, phone, email].join('|'));
    const leadId = `meta_${String(integration.id).slice(0, 8)}_${externalId || fallbackKey.slice(0, 24)}`;

    async function findExistingLead() {
      const { data: exact, error: exactError } = await admin.from('leads')
        .select('id,name,payload,status,archive_type,recontact_date,advisor_id')
        .eq('organization_id', integration.organization_id).eq('id', leadId).maybeSingle();
      if (exactError) throw exactError;
      if (exact) return exact;

      if (curp.length === 18) {
        const { data, error } = await admin.from('leads').select('id,name,payload,status,archive_type,recontact_date,advisor_id')
          .eq('organization_id', integration.organization_id).eq('curp', curp).limit(1);
        if (error) throw error;
        if (data?.[0]) return data[0];
      }
      if (phone.length === 10) {
        const { data, error } = await admin.from('leads').select('id,name,payload,status,archive_type,recontact_date,advisor_id')
          .eq('organization_id', integration.organization_id).eq('phone', phone).limit(1);
        if (error) throw error;
        if (data?.[0]) return data[0];
      }
      if (email) {
        const { data, error } = await admin.from('leads').select('id,name,payload,status,archive_type,recontact_date,advisor_id')
          .eq('organization_id', integration.organization_id).contains('payload', { email }).limit(1);
        if (error) throw error;
        if (data?.[0]) return data[0];
      }
      return null;
    }

    const existing = await findExistingLead();
    const now = new Date().toISOString();
    const createdAt = text(body.created_time) || now;
    const declaredAnswers = typeof body.answers === 'object' && body.answers ? body.answers as Record<string, unknown> : {};
    const declared = declaredEligibility(declaredAnswers);

    if (requestedAction === 'reactivate' && existing) {
      const oldPayload = existing.payload && typeof existing.payload === 'object' ? existing.payload as Record<string, unknown> : {};
      const priorReactivations = Array.isArray(oldPayload.reactivacionesMeta) ? oldPayload.reactivacionesMeta : [];
      const reactivation = {
        at: now,
        originalMetaCreatedTime: createdAt,
        externalId,
        campaignName: text(body.campaign_name),
        adsetName: text(body.adset_name),
        adName: text(body.ad_name),
        formName: text(body.form_name),
        platform: text(body.platform)
      };
      const mergedPayload = {
        ...oldPayload,
        metaAds: true,
        fuenteContacto: 'Meta Ads',
        revisionSolicitada: false,
        metaReactivado: true,
        fechaReactivacion: now,
        reactivacionesMeta: [...priorReactivations, reactivation]
      };
      const shouldAdoptMetaName = Boolean(rawName && (!text(existing.name) || /^nombre pendiente de validar$/i.test(text(existing.name))));
      const { error: updateError } = await admin.from('leads').update({
        ...(shouldAdoptMetaName ? { name: rawName } : {}),
        status: 'semanas',
        archive_type: null,
        recontact_date: null,
        payload: mergedPayload
      }).eq('organization_id', integration.organization_id).eq('id', existing.id);
      if (updateError) throw updateError;
      await admin.from('lead_integrations').update({ last_received_at: now, last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, reactivated: true, lead_id: existing.id });
    }

    if (existing && requestedAction !== 'reactivate') {
      await admin.from('lead_integrations').update({ last_received_at: now, last_error: null }).eq('id', integration.id);
      return json(200, { ok: true, duplicate: true, possible_duplicate: existing.id !== leadId, lead_id: existing.id });
    }

    const importedHistorical = requestedAction === 'import' || requestedAction === 'reactivate';
    const payload = {
      nombreMeta: rawName,
      nombreVerificado: false,
      nombrePendienteValidacion: true,
      email,
      correo: email,
      ciudad: text(body.city),
      fuenteContacto: 'Meta Ads',
      metaAds: true,
      revisionSolicitada: false,
      importacionMeta: importedHistorical ? (requestedAction === 'reactivate' ? 'reactivacion_historica' : 'manual_historica') : 'automatica',
      fechaImportacionCRM: now,
      ...(requestedAction === 'reactivate' ? { metaReactivado: true, fechaReactivacion: now } : {}),
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
      fechaCaptura: now,
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

    await admin.from('lead_integrations').update({ last_received_at: now, last_error: null }).eq('id', integration.id);
    return json(201, {
      ok: true,
      duplicate: false,
      reactivated: requestedAction === 'reactivate',
      imported_historical: importedHistorical,
      lead_id: leadId,
      precalificacion: declared.precalificacion
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return json(400, { error: message });
  }
});
