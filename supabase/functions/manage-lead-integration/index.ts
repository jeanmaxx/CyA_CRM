import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

function json(status:number,payload:Record<string,unknown>){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8'}})}
function text(v:unknown){return String(v??'').trim()}
async function sha256(v:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function newToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json(405,{error:'Método no permitido'});
  try{
    const supabaseUrl=Deno.env.get('SUPABASE_URL')!;
    const anonKey=Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization=req.headers.get('Authorization');
    if(!authorization)return json(401,{error:'Sesión requerida'});

    const caller=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:authData,error:authError}=await caller.auth.getUser();
    if(authError||!authData.user)return json(401,{error:'Sesión inválida'});

    const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false}});
    const {data:profile,error:profileError}=await admin.from('profiles').select('id,organization_id,role,active').eq('id',authData.user.id).single();
    if(profileError||!profile||profile.active!==true)return json(403,{error:'Cuenta inactiva'});
    const {data:tenant}=await admin.from('platform_tenants').select('status').eq('organization_id',profile.organization_id).maybeSingle();
    if(tenant&&['suspended','cancelled'].includes(String(tenant.status)))return json(403,{error:'La organización no está activa'});

    const body=await req.json().catch(()=>({}));
    const action=text(body.action||'status');
    if(!['status','create_or_rotate','disable','enable'].includes(action))return json(400,{error:'Acción inválida'});

    const q=()=>admin.from('lead_integrations').select('id,provider,label,enabled,config,last_received_at,last_error,created_at,updated_at').eq('organization_id',profile.organization_id).eq('advisor_id',profile.id).eq('provider','google_sheets_meta').maybeSingle();
    const {data:existing,error:existingError}=await q();
    if(existingError)throw existingError;

    if(action==='status')return json(200,{ok:true,integration:existing||null});
    if(action==='disable'||action==='enable'){
      if(!existing)return json(404,{error:'Aún no existe una integración'});
      const enabled=action==='enable';
      const {error}=await admin.from('lead_integrations').update({enabled,updated_at:new Date().toISOString()}).eq('id',existing.id);
      if(error)throw error;
      return json(200,{ok:true,enabled});
    }

    const token=newToken();
    const tokenHash=await sha256(token);
    const label=text(body.label)||'Meta Ads';
    const config={sheetUrl:text(body.sheet_url),sheetName:text(body.sheet_name)};
    const row={organization_id:profile.organization_id,advisor_id:profile.id,provider:'google_sheets_meta',label,token_hash:tokenHash,enabled:true,config,updated_at:new Date().toISOString(),last_error:null};
    if(existing){
      const {error}=await admin.from('lead_integrations').update(row).eq('id',existing.id);if(error)throw error;
    }else{
      const {error}=await admin.from('lead_integrations').insert(row);if(error)throw error;
    }
    return json(200,{ok:true,token,endpoint:`${supabaseUrl}/functions/v1/meta-lead-ingest`,integration:{label,enabled:true,config}});
  }catch(error){return json(400,{error:error instanceof Error?error.message:'Error inesperado'})}
});
