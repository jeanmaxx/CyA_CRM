import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://jeanmaxx.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://jeanmaxx.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function respond(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) });
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password)
    && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
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
    const { data: caller } = await admin.from('profiles')
      .select('id,organization_id,role,active')
      .eq('id', authData.user.id).single();
    if (!caller || caller.role !== 'admin' || caller.active !== true) {
      return respond(req, 403, { error: 'Solo un administrador puede gestionar asesores' });
    }

    const body = await req.json();
    const action = String(body.action || 'upsert');

    if (action === 'delete') {
      const targetId = String(body.id || '');
      if (!targetId) return respond(req, 400, { error: 'Falta el asesor' });
      if (targetId === authData.user.id) return respond(req, 400, { error: 'No puedes eliminar tu propia cuenta' });
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return respond(req, 200, { ok: true });
    }

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const city = String(body.city || '').trim();
    const role = body.role === 'admin' ? 'admin' : 'advisor';
    const active = body.active !== false;
    const requestedId = String(body.id || '');
    const legacyId = String(body.legacyId || '') || null;
    if (!fullName || !email) return respond(req, 400, { error: 'Nombre y correo son obligatorios' });
    if (!requestedId && !validPassword(password)) {
      return respond(req, 400, { error: 'La contraseña temporal no cumple los requisitos' });
    }
    if (requestedId === authData.user.id && (role !== 'admin' || !active)) {
      return respond(req, 400, { error: 'No puedes quitar tu propio acceso de administrador' });
    }

    let userId = requestedId;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      const attributes: Record<string, unknown> = { email, user_metadata: { full_name: fullName } };
      if (password) {
        if (!validPassword(password)) return respond(req, 400, { error: 'La nueva contraseña no cumple los requisitos' });
        attributes.password = password;
      }
      const { error } = await admin.auth.admin.updateUserById(userId, attributes);
      if (error) throw error;
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      organization_id: caller.organization_id,
      legacy_id: legacyId,
      email,
      full_name: fullName,
      city: city || null,
      role,
      active,
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    if (legacyId) {
      for (const table of ['collaborators', 'leads', 'clients', 'agenda_events']) {
        const { error } = await admin.from(table)
          .update({ advisor_id: userId, legacy_advisor_id: null })
          .eq('organization_id', caller.organization_id)
          .eq('legacy_advisor_id', legacyId);
        if (error) throw error;
      }
    }

    return respond(req, 200, { ok: true, userId, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return respond(req, 400, { error: message });
  }
});
