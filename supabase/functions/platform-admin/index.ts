import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const allowedOrigins = new Set([
  'https://crm-alvasd.pages.dev',
  'https://alva-crm-platform.crm-alvasd.pages.dev',
  'https://jeanmaxx.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const pagesPreview = /^https:\/\/[a-z0-9-]+\.crm-alvasd\.pages\.dev$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': (allowedOrigins.has(origin) || pagesPreview) ? origin : 'https://crm-alvasd.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function respond(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) });
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  let body = '';
  for (const b of bytes) body += chars[b % chars.length];
  return 'Alva!' + body + '9a';
}

function normalizeDate(value: unknown) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return respond(req, 405, { error: 'Método no permitido' });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = req.headers.get('Authorization');
    if (!authorization) return respond(req, 401, { error: 'Sesión requerida' });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return respond(req, 401, { error: 'Sesión inválida' });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: platformAdmin, error: platformAdminError } = await admin
      .from('platform_admins')
      .select('user_id,display_name,role,active,permissions')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (platformAdminError) throw platformAdminError;
    if (!platformAdmin || platformAdmin.active !== true) {
      return respond(req, 403, { error: 'Esta cuenta no tiene acceso al Control Center' });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'dashboard');

    const logActivity = async (
      organizationId: string | null,
      eventType: string,
      summary: string,
      details: Record<string, unknown> = {},
    ) => {
      const { error } = await admin.from('platform_activity').insert({
        admin_user_id: authData.user.id,
        organization_id: organizationId,
        event_type: eventType,
        summary,
        details,
      });
      if (error) console.error('platform activity error', error);
    };

    const loadPlans = async () => {
      const { data, error } = await admin.from('crm_plans')
        .select('id,name,description,active,currency,monthly_price_cents,user_limit,modules,features,sort_order')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    };

    const loadTenants = async () => {
      const { data: organizations, error: organizationsError } = await admin
        .from('organizations')
        .select('id,name,slug,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (organizationsError) throw organizationsError;

      const { data: tenantRows, error: tenantError } = await admin
        .from('platform_tenants')
        .select('organization_id,plan_id,status,onboarding_stage,primary_contact_name,primary_contact_email,primary_contact_phone,billing_email,seat_limit,modules_override,contract_started_on,renews_on,trial_ends_on,billing_cycle,agreed_price_cents,next_payment_on,grace_until,auto_suspend_on_overdue,renewal_notice_days,suspended_at,suspension_reason,notes,metadata,created_at,updated_at');
      if (tenantError) throw tenantError;

      const { data: plans, error: planError } = await admin
        .from('crm_plans')
        .select('id,name,user_limit,modules,monthly_price_cents,currency');
      if (planError) throw planError;

      const { data: profiles, error: profilesError } = await admin
        .from('profiles').select('organization_id,id,active,role');
      if (profilesError) throw profilesError;

      const { data: leads, error: leadsError } = await admin
        .from('leads').select('organization_id,id');
      if (leadsError) throw leadsError;

      const { data: clients, error: clientsError } = await admin
        .from('clients').select('organization_id,id,archived');
      if (clientsError) throw clientsError;

      const { data: audit, error: auditError } = await admin
        .from('record_audit').select('organization_id,occurred_at').order('occurred_at', { ascending: false });
      if (auditError) throw auditError;

      const tenantMap = new Map((tenantRows || []).map((row: any) => [row.organization_id, row]));
      const planMap = new Map((plans || []).map((row: any) => [row.id, row]));

      const countByOrg = (rows: any[]) => {
        const map = new Map<string, number>();
        for (const row of rows || []) map.set(row.organization_id, (map.get(row.organization_id) || 0) + 1);
        return map;
      };
      const userCount = countByOrg((profiles || []).filter((row: any) => row.active));
      const leadCount = countByOrg(leads || []);
      const clientCount = countByOrg((clients || []).filter((row: any) => !row.archived));
      const lastActivity = new Map<string, string>();
      for (const row of audit || []) {
        if (!lastActivity.has(row.organization_id)) lastActivity.set(row.organization_id, row.occurred_at);
      }

      return (organizations || []).map((org: any) => {
        const tenant: any = tenantMap.get(org.id) || {};
        const plan: any = planMap.get(tenant.plan_id) || null;
        const modulesOverride = tenant.modules_override || {};
        const enabledOverride = Array.isArray(modulesOverride.enabled) ? modulesOverride.enabled : null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          created_at: org.created_at,
          plan_id: tenant.plan_id || null,
          plan_name: plan?.name || 'Sin plan',
          status: tenant.status || 'implementation',
          onboarding_stage: tenant.onboarding_stage || 'setup',
          primary_contact_name: tenant.primary_contact_name || '',
          primary_contact_email: tenant.primary_contact_email || '',
          primary_contact_phone: tenant.primary_contact_phone || '',
          billing_email: tenant.billing_email || '',
          seat_limit: tenant.seat_limit ?? plan?.user_limit ?? null,
          modules: enabledOverride || plan?.modules || [],
          modules_override: modulesOverride,
          contract_started_on: tenant.contract_started_on,
          renews_on: tenant.renews_on,
          trial_ends_on: tenant.trial_ends_on,
          billing_cycle: tenant.billing_cycle || 'monthly',
          agreed_price_cents: tenant.agreed_price_cents ?? plan?.monthly_price_cents ?? null,
          next_payment_on: tenant.next_payment_on,
          grace_until: tenant.grace_until,
          auto_suspend_on_overdue: tenant.auto_suspend_on_overdue === true,
          renewal_notice_days: tenant.renewal_notice_days ?? 15,
          suspended_at: tenant.suspended_at,
          suspension_reason: tenant.suspension_reason || '',
          notes: tenant.notes || '',
          user_count: userCount.get(org.id) || 0,
          lead_count: leadCount.get(org.id) || 0,
          client_count: clientCount.get(org.id) || 0,
          last_activity: lastActivity.get(org.id) || org.updated_at || org.created_at,
        };
      });
    };

    if (action === 'session') {
      return respond(req, 200, {
        ok: true,
        admin: {
          user_id: platformAdmin.user_id,
          display_name: platformAdmin.display_name,
          role: platformAdmin.role,
          permissions: platformAdmin.permissions || {},
          email: authData.user.email || '',
        },
      });
    }

    if (action === 'plans') {
      return respond(req, 200, { ok: true, plans: await loadPlans() });
    }

    if (action === 'dashboard' || action === 'list_tenants') {
      const tenants = await loadTenants();
      const plans = await loadPlans();
      const today = new Date().toISOString().slice(0,10);
      const renewalCutoff = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
      const monthlyEquivalent = (x: any) => {
        const cents = Number(x.agreed_price_cents || 0);
        if (!cents || x.status !== 'active') return 0;
        return x.billing_cycle === 'annual' ? Math.round(cents / 12) : cents;
      };
      const stats = {
        total: tenants.length,
        active: tenants.filter((x: any) => x.status === 'active').length,
        implementation: tenants.filter((x: any) => x.status === 'implementation').length,
        suspended: tenants.filter((x: any) => x.status === 'suspended').length,
        users: tenants.reduce((sum: number, x: any) => sum + Number(x.user_count || 0), 0),
        mrr_cents: tenants.reduce((sum: number, x: any) => sum + monthlyEquivalent(x), 0),
        overdue: tenants.filter((x: any) => x.status === 'active' && x.next_payment_on && x.next_payment_on < today).length,
        renewals_30d: tenants.filter((x: any) => x.renews_on && x.renews_on >= today && x.renews_on <= renewalCutoff).length,
      };
      return respond(req, 200, { ok: true, tenants, plans, stats });
    }

    if (action === 'activity') {
      const limit = Math.min(Math.max(Number(body.limit || 50), 1), 200);
      const { data, error } = await admin.from('platform_activity')
        .select('id,admin_user_id,organization_id,event_type,summary,details,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return respond(req, 200, { ok: true, activity: data || [] });
    }

    if (action === 'create_tenant') {
      if (!['owner', 'admin'].includes(platformAdmin.role)) {
        return respond(req, 403, { error: 'Tu rol no puede crear organizaciones' });
      }
      const name = String(body.name || '').trim();
      const slug = slugify(String(body.slug || name));
      const planId = String(body.plan_id || 'professional');
      const primaryContactName = String(body.primary_contact_name || '').trim();
      const primaryContactEmail = String(body.primary_contact_email || '').trim().toLowerCase();
      const primaryContactPhone = String(body.primary_contact_phone || '').trim();
      const adminName = String(body.admin_name || primaryContactName || '').trim();
      const adminEmail = String(body.admin_email || primaryContactEmail || '').trim().toLowerCase();
      const requestedStatus = String(body.status || 'implementation');
      const status = ['implementation','active','suspended'].includes(requestedStatus)
        ? requestedStatus : 'implementation';

      if (!name || slug.length < 3) return respond(req, 400, { error: 'Nombre y slug son obligatorios' });
      if (!adminName || !validEmail(adminEmail)) {
        return respond(req, 400, { error: 'Nombre y correo del administrador inicial son obligatorios' });
      }

      const { data: existingOrg } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle();
      if (existingOrg) return respond(req, 409, { error: 'Ya existe una organización con ese identificador' });

      const { data: plan, error: planCheckError } = await admin.from('crm_plans')
        .select('id,user_limit,modules').eq('id', planId).eq('active', true).maybeSingle();
      if (planCheckError) throw planCheckError;
      if (!plan) return respond(req, 400, { error: 'El plan seleccionado no existe o está inactivo' });

      const orgId = crypto.randomUUID();
      const temporaryPassword = generatePassword();
      let authUserId = '';

      try {
        const { error: orgError } = await admin.from('organizations').insert({
          id: orgId,
          name,
          slug,
        });
        if (orgError) throw orgError;

        const { error: tenantError } = await admin.from('platform_tenants').insert({
          organization_id: orgId,
          plan_id: planId,
          status,
          onboarding_stage: 'setup',
          primary_contact_name: primaryContactName || adminName,
          primary_contact_email: primaryContactEmail || adminEmail,
          primary_contact_phone: primaryContactPhone || null,
          billing_email: String(body.billing_email || primaryContactEmail || adminEmail).trim().toLowerCase(),
          seat_limit: Number(body.seat_limit || plan.user_limit || 0) || null,
          contract_started_on: normalizeDate(body.contract_started_on),
          renews_on: normalizeDate(body.renews_on),
          billing_cycle: ['monthly','annual','custom'].includes(String(body.billing_cycle||'')) ? String(body.billing_cycle) : 'monthly',
          agreed_price_cents: Number(body.agreed_price_cents || 0) || null,
          next_payment_on: normalizeDate(body.next_payment_on),
          grace_until: normalizeDate(body.grace_until),
          auto_suspend_on_overdue: body.auto_suspend_on_overdue === true,
          notes: String(body.notes || '').trim() || null,
          metadata: { created_from: 'control_center' },
        });
        if (tenantError) throw tenantError;

        const { error: settingsError } = await admin.from('app_settings').insert({
          organization_id: orgId,
          payload: {
            rol: 'admin',
            tema: 'dark',
            asesor: adminName,
            nombre_app: 'ALVA CRM',
            empresa_nombre: name,
            logo_empresa: '',
            oficinas: [],
            saludos_dashboard: {},
          },
        });
        if (settingsError) throw settingsError;

        const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
          email: adminEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { full_name: adminName, organization: name, portal: 'platform' },
        });
        if (createUserError || !userData.user) throw createUserError || new Error('No se pudo crear el administrador');
        authUserId = userData.user.id;

        const { error: profileError } = await admin.from('profiles').insert({
          id: authUserId,
          organization_id: orgId,
          email: adminEmail,
          full_name: adminName,
          role: 'admin',
          active: true,
        });
        if (profileError) throw profileError;

        await logActivity(orgId, 'tenant_created', 'Organización creada', {
          name, slug, plan_id: planId, status, initial_admin: adminEmail,
        });

        return respond(req, 200, {
          ok: true,
          organization_id: orgId,
          slug,
          admin: {
            user_id: authUserId,
            email: adminEmail,
            temporary_password: temporaryPassword,
          },
        });
      } catch (error) {
        if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
        await admin.from('organizations').delete().eq('id', orgId);
        throw error;
      }
    }

    if (action === 'update_tenant') {
      if (!['owner', 'admin', 'support', 'billing'].includes(platformAdmin.role)) {
        return respond(req, 403, { error: 'Tu rol no puede modificar organizaciones' });
      }
      const organizationId = String(body.organization_id || '');
      if (!organizationId) return respond(req, 400, { error: 'Falta la organización' });

      const { data: current, error: currentError } = await admin.from('platform_tenants')
        .select('*').eq('organization_id', organizationId).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return respond(req, 404, { error: 'La organización no está registrada en Control Center' });

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Object.prototype.hasOwnProperty.call(body, 'plan_id')) patch.plan_id = String(body.plan_id || '') || null;
      if (Object.prototype.hasOwnProperty.call(body, 'status')) {
        const status = String(body.status || '');
        if (!['implementation','active','suspended','cancelled'].includes(status)) {
          return respond(req, 400, { error: 'Estado inválido' });
        }
        patch.status = status;
        if (status === 'suspended' || status === 'cancelled') {
          patch.suspended_at = new Date().toISOString();
          patch.suspension_reason = String(body.suspension_reason || current.suspension_reason || '').trim() || null;
        } else if (status === 'active' || status === 'implementation') {
          patch.suspended_at = null;
          patch.suspension_reason = null;
        }
      }
      if (Object.prototype.hasOwnProperty.call(body, 'onboarding_stage')) patch.onboarding_stage = String(body.onboarding_stage || 'setup');
      if (Object.prototype.hasOwnProperty.call(body, 'primary_contact_name')) patch.primary_contact_name = String(body.primary_contact_name || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'primary_contact_email')) patch.primary_contact_email = String(body.primary_contact_email || '').trim().toLowerCase() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'primary_contact_phone')) patch.primary_contact_phone = String(body.primary_contact_phone || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'billing_email')) patch.billing_email = String(body.billing_email || '').trim().toLowerCase() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'seat_limit')) patch.seat_limit = Number(body.seat_limit || 0) || null;
      if (Object.prototype.hasOwnProperty.call(body, 'contract_started_on')) patch.contract_started_on = normalizeDate(body.contract_started_on);
      if (Object.prototype.hasOwnProperty.call(body, 'renews_on')) patch.renews_on = normalizeDate(body.renews_on);
      if (Object.prototype.hasOwnProperty.call(body, 'trial_ends_on')) patch.trial_ends_on = normalizeDate(body.trial_ends_on);
      if (Object.prototype.hasOwnProperty.call(body, 'billing_cycle')) {
        const cycle = String(body.billing_cycle || '');
        if (!['monthly','annual','custom'].includes(cycle)) return respond(req,400,{error:'Ciclo de cobro inválido'});
        patch.billing_cycle = cycle;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'agreed_price_cents')) patch.agreed_price_cents = Number(body.agreed_price_cents || 0) || null;
      if (Object.prototype.hasOwnProperty.call(body, 'next_payment_on')) patch.next_payment_on = normalizeDate(body.next_payment_on);
      if (Object.prototype.hasOwnProperty.call(body, 'grace_until')) patch.grace_until = normalizeDate(body.grace_until);
      if (Object.prototype.hasOwnProperty.call(body, 'auto_suspend_on_overdue')) patch.auto_suspend_on_overdue = body.auto_suspend_on_overdue === true;
      if (Object.prototype.hasOwnProperty.call(body, 'renewal_notice_days')) patch.renewal_notice_days = Math.max(1,Math.min(90,Number(body.renewal_notice_days||15)));
      if (Object.prototype.hasOwnProperty.call(body, 'suspension_reason') && !['active','implementation'].includes(String(patch.status || current.status))) patch.suspension_reason = String(body.suspension_reason || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'notes')) patch.notes = String(body.notes || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'modules_override')) patch.modules_override = body.modules_override || {};

      const { error: updateError } = await admin.from('platform_tenants')
        .update(patch).eq('organization_id', organizationId);
      if (updateError) throw updateError;

      await logActivity(organizationId, 'tenant_updated', 'Organización actualizada', {
        fields: Object.keys(patch).filter((key) => key !== 'updated_at'),
        before: {
          plan_id: current.plan_id,
          status: current.status,
          seat_limit: current.seat_limit,
        },
        after: {
          plan_id: patch.plan_id ?? current.plan_id,
          status: patch.status ?? current.status,
          seat_limit: patch.seat_limit ?? current.seat_limit,
        },
      });

      return respond(req, 200, { ok: true });
    }

    if (action === 'update_plan') {
      if (!['owner', 'admin'].includes(platformAdmin.role)) return respond(req, 403, { error: 'Tu rol no puede editar planes' });
      const id = String(body.id || '').trim();
      if (!id) return respond(req, 400, { error: 'Falta el plan' });

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const field of ['name','description','currency']) {
        if (Object.prototype.hasOwnProperty.call(body, field)) patch[field] = String(body[field] || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(body, 'active')) patch.active = body.active !== false;
      if (Object.prototype.hasOwnProperty.call(body, 'monthly_price_cents')) patch.monthly_price_cents = Number(body.monthly_price_cents || 0) || null;
      if (Object.prototype.hasOwnProperty.call(body, 'user_limit')) patch.user_limit = Number(body.user_limit || 0) || null;
      if (Array.isArray(body.modules)) patch.modules = body.modules.map((x: unknown) => String(x));
      if (Object.prototype.hasOwnProperty.call(body, 'features')) patch.features = body.features || {};

      const { error } = await admin.from('crm_plans').update(patch).eq('id', id);
      if (error) throw error;
      await logActivity(null, 'plan_updated', 'Plan actualizado', { plan_id: id, fields: Object.keys(patch) });
      return respond(req, 200, { ok: true });
    }

    if (action === 'billing_overview') {
      if (!['owner','admin','billing'].includes(platformAdmin.role)) return respond(req,403,{error:'Tu rol no puede consultar facturación'});
      const tenants = await loadTenants();
      const { data: payments, error: paymentError } = await admin.from('platform_payments')
        .select('id,organization_id,amount_cents,currency,paid_on,period_start,period_end,method,reference,notes,created_at')
        .order('paid_on',{ascending:false}).limit(500);
      if (paymentError) throw paymentError;
      const today = new Date().toISOString().slice(0,10);
      const items = tenants.map((t:any)=>({
        ...t,
        overdue: Boolean(t.status==='active' && t.next_payment_on && t.next_payment_on < today && (!t.grace_until || t.grace_until < today)),
        in_grace: Boolean(t.status==='active' && t.next_payment_on && t.next_payment_on < today && t.grace_until && t.grace_until >= today),
      }));
      return respond(req,200,{ok:true,tenants:items,payments:payments||[]});
    }

    if (action === 'run_billing_rules') {
      if (!['owner','admin','billing'].includes(platformAdmin.role)) return respond(req,403,{error:'Tu rol no puede ejecutar revisión de cobranza'});
      const { data, error } = await admin.rpc('platform_apply_billing_rules');
      if (error) throw error;
      await logActivity(null,'billing_rules_run','Revisión de cobranza ejecutada',{result:data||{}});
      return respond(req,200,{ok:true,result:data||{}});
    }

    if (action === 'add_payment') {
      if (!['owner','admin','billing'].includes(platformAdmin.role)) return respond(req,403,{error:'Tu rol no puede registrar pagos'});
      const organizationId=String(body.organization_id||'');
      const amountCents=Math.round(Number(body.amount_cents||0));
      if(!organizationId||amountCents<=0)return respond(req,400,{error:'Organización e importe son obligatorios'});
      const { data: tenant }=await admin.from('platform_tenants').select('organization_id').eq('organization_id',organizationId).maybeSingle();
      if(!tenant)return respond(req,404,{error:'Organización no encontrada'});
      const record={
        organization_id:organizationId,
        amount_cents:amountCents,
        currency:String(body.currency||'MXN').trim().toUpperCase().slice(0,3),
        paid_on:normalizeDate(body.paid_on)||new Date().toISOString().slice(0,10),
        period_start:normalizeDate(body.period_start),
        period_end:normalizeDate(body.period_end),
        method:String(body.method||'').trim()||null,
        reference:String(body.reference||'').trim()||null,
        notes:String(body.notes||'').trim()||null,
        created_by:authData.user.id,
      };
      const { data: payment, error: paymentError }=await admin.from('platform_payments').insert(record).select('*').single();
      if(paymentError)throw paymentError;
      const tenantPatch:Record<string,unknown>={updated_at:new Date().toISOString()};
      if(Object.prototype.hasOwnProperty.call(body,'next_payment_on'))tenantPatch.next_payment_on=normalizeDate(body.next_payment_on);
      if(Object.prototype.hasOwnProperty.call(body,'grace_until'))tenantPatch.grace_until=normalizeDate(body.grace_until);
      if(Object.keys(tenantPatch).length>1)await admin.from('platform_tenants').update(tenantPatch).eq('organization_id',organizationId);
      await logActivity(organizationId,'payment_recorded','Pago registrado',{payment_id:payment.id,amount_cents:amountCents,currency:record.currency,paid_on:record.paid_on});
      return respond(req,200,{ok:true,payment});
    }

    if (action === 'platform_admins') {
      if (platformAdmin.role !== 'owner') return respond(req,403,{error:'Solo el propietario puede administrar accesos ALVA'});
      const { data: rows, error }=await admin.from('platform_admins').select('user_id,display_name,role,active,permissions,created_at,updated_at').order('created_at');
      if(error)throw error;
      const { data: usersData }=await admin.auth.admin.listUsers({page:1,perPage:1000});
      const emailMap=new Map((usersData?.users||[]).map((u:any)=>[u.id,u.email||'']));
      return respond(req,200,{ok:true,admins:(rows||[]).map((r:any)=>({...r,email:emailMap.get(r.user_id)||''}))});
    }

    if (action === 'create_platform_admin') {
      if (platformAdmin.role !== 'owner') return respond(req,403,{error:'Solo el propietario puede crear administradores ALVA'});
      const displayName=String(body.display_name||'').trim();
      const email=String(body.email||'').trim().toLowerCase();
      const role=['admin','support','billing'].includes(String(body.role||''))?String(body.role):'support';
      if(!displayName||!validEmail(email))return respond(req,400,{error:'Nombre y correo son obligatorios'});
      const temporaryPassword=generatePassword();
      const { data:userData,error:userError }=await admin.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true,user_metadata:{full_name:displayName,portal:'platform'}});
      if(userError||!userData.user)throw userError||new Error('No se pudo crear la cuenta');
      const { error:rowError }=await admin.from('platform_admins').insert({user_id:userData.user.id,display_name:displayName,role,active:true});
      if(rowError){await admin.auth.admin.deleteUser(userData.user.id);throw rowError}
      await logActivity(null,'platform_admin_created','Administrador ALVA creado',{user_id:userData.user.id,email,role});
      return respond(req,200,{ok:true,admin:{user_id:userData.user.id,email,display_name:displayName,role,temporary_password:temporaryPassword}});
    }

    if (action === 'update_platform_admin') {
      if (platformAdmin.role !== 'owner') return respond(req,403,{error:'Solo el propietario puede modificar administradores ALVA'});
      const userId=String(body.user_id||'');
      if(!userId)return respond(req,400,{error:'Falta el usuario'});
      if(userId===authData.user.id && body.active===false)return respond(req,400,{error:'No puedes desactivar tu propio acceso'});
      const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
      if(Object.prototype.hasOwnProperty.call(body,'display_name'))patch.display_name=String(body.display_name||'').trim();
      if(Object.prototype.hasOwnProperty.call(body,'role')){
        const role=String(body.role||'');
        if(!['owner','admin','support','billing'].includes(role))return respond(req,400,{error:'Rol inválido'});
        if(userId===authData.user.id && role!=='owner')return respond(req,400,{error:'No puedes quitarte el rol de propietario'});
        patch.role=role;
      }
      if(Object.prototype.hasOwnProperty.call(body,'active'))patch.active=body.active!==false;
      const { error }=await admin.from('platform_admins').update(patch).eq('user_id',userId);
      if(error)throw error;
      await logActivity(null,'platform_admin_updated','Acceso ALVA actualizado',{user_id:userId,fields:Object.keys(patch)});
      return respond(req,200,{ok:true});
    }

    if (action === 'sales_leads') {
      const limit = Math.min(Math.max(Number(body.limit || 100), 1), 300);
      const { data, error } = await admin.from('platform_sales_leads')
        .select('id,name,company,contact,need,status,source,notes,assigned_to,metadata,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return respond(req, 200, { ok: true, leads: data || [] });
    }

    if (action === 'update_sales_lead') {
      if (!['owner','admin','support'].includes(platformAdmin.role)) {
        return respond(req, 403, { error: 'Tu rol no puede actualizar solicitudes comerciales' });
      }
      const id = String(body.id || '').trim();
      if (!id) return respond(req, 400, { error: 'Falta la solicitud' });

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Object.prototype.hasOwnProperty.call(body, 'status')) {
        const status = String(body.status || '');
        if (!['new','contacted','demo','qualified','won','lost'].includes(status)) {
          return respond(req, 400, { error: 'Estado comercial inválido' });
        }
        patch.status = status;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'notes')) patch.notes = String(body.notes || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, 'assigned_to')) patch.assigned_to = body.assigned_to || null;

      const { data: lead, error: leadError } = await admin.from('platform_sales_leads')
        .update(patch).eq('id', id).select('id,company,status').maybeSingle();
      if (leadError) throw leadError;
      if (!lead) return respond(req, 404, { error: 'Solicitud no encontrada' });

      await logActivity(null, 'sales_lead_updated', 'Solicitud comercial actualizada', {
        lead_id: lead.id, company: lead.company, status: lead.status,
      });
      return respond(req, 200, { ok: true });
    }

    return respond(req, 400, { error: 'Acción inválida' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return respond(req, 400, { error: message });
  }
});