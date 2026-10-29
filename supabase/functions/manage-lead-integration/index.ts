import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};
function json(status:number,payload:Record<string,unknown>){return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'content-type':'application/json; charset=utf-8'}})}
function text(v:unknown){return String(v??'').trim()}
async function sha256(v:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function newToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function envKey(jsonName:string,legacyName:string){
  try{
    const raw=Deno.env.get(jsonName);
    if(raw){const parsed=JSON.parse(raw);if(parsed?.default)return String(parsed.default)}
  }catch(_){ }
  return Deno.env.get(legacyName)||'';
}
function configObject(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?{...(value as Record<string,unknown>)}:{};}
function validAppsScriptUrl(value:string){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/i.test(value)}
function publicConfig(value:unknown){
  const cfg=configObject(value);
  const manualSyncUrl=text(cfg.manualSyncUrl);
  return {
    sheetUrl:text(cfg.sheetUrl),
    sheetName:text(cfg.sheetName),
    manualSyncUrl,
    manualSyncConfigured:Boolean(manualSyncUrl&&text(cfg.manualSyncSecret)),
  };
}
function publicIntegration(row:any){
  if(!row)return null;
  return {...row,config:publicConfig(row.config)};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json(405,{error:'Método no permitido'});
  try{
    const supabaseUrl=Deno.env.get('SUPABASE_URL')!;
    const publishableKey=envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
    const secretKey=envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
    if(!supabaseUrl||!publishableKey||!secretKey)return json(500,{error:'Configuración de Supabase incompleta'});
    const authorization=req.headers.get('Authorization');
    if(!authorization)return json(401,{error:'Sesión requerida'});

    const caller=createClient(supabaseUrl,publishableKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:authData,error:authError}=await caller.auth.getUser();
    if(authError||!authData.user)return json(401,{error:'Sesión inválida'});

    const admin=createClient(supabaseUrl,secretKey,{auth:{persistSession:false}});
    const {data:profile,error:profileError}=await admin.from('profiles').select('id,organization_id,role,active').eq('id',authData.user.id).single();
    if(profileError||!profile||profile.active!==true)return json(403,{error:'Cuenta inactiva'});
    const {data:tenant}=await admin.from('platform_tenants').select('status').eq('organization_id',profile.organization_id).maybeSingle();
    if(tenant&&['suspended','cancelled'].includes(String(tenant.status)))return json(403,{error:'La organización no está activa'});

    const body=await req.json().catch(()=>({}));
    const action=text(body.action||'status');
    const allowed=['status','create_or_rotate','disable','enable','prepare_manual_sync','set_manual_sync_url','manual_sync'];
    if(!allowed.includes(action))return json(400,{error:'Acción inválida'});

    const q=()=>admin.from('lead_integrations').select('id,provider,label,enabled,config,last_received_at,last_error,created_at,updated_at').eq('organization_id',profile.organization_id).eq('advisor_id',profile.id).eq('provider','google_sheets_meta').maybeSingle();
    const {data:existing,error:existingError}=await q();
    if(existingError)throw existingError;

    if(action==='status')return json(200,{ok:true,integration:publicIntegration(existing)});

    if(action==='disable'||action==='enable'){
      if(!existing)return json(404,{error:'Aún no existe una integración'});
      const enabled=action==='enable';
      const {error}=await admin.from('lead_integrations').update({enabled,updated_at:new Date().toISOString()}).eq('id',existing.id);
      if(error)throw error;
      return json(200,{ok:true,enabled});
    }

    if(action==='prepare_manual_sync'){
      if(!existing)return json(404,{error:'Primero crea la integración de Meta Ads'});
      const manualSyncSecret=newToken();
      const config={...configObject(existing.config),manualSyncSecret};
      const updatedAt=new Date().toISOString();
      const {error}=await admin.from('lead_integrations').update({config,updated_at:updatedAt,last_error:null}).eq('id',existing.id);
      if(error)throw error;
      return json(200,{
        ok:true,
        manual_sync_key:manualSyncSecret,
        property_name:'CRM_MANUAL_SYNC_KEY',
        integration:publicIntegration({...existing,config,updated_at:updatedAt}),
      });
    }

    if(action==='set_manual_sync_url'){
      if(!existing)return json(404,{error:'Primero crea la integración de Meta Ads'});
      const manualSyncUrl=text(body.manual_sync_url);
      if(manualSyncUrl&&!validAppsScriptUrl(manualSyncUrl))return json(400,{error:'La URL debe ser una aplicación web de Google Apps Script terminada en /exec'});
      const config={...configObject(existing.config),manualSyncUrl};
      const updatedAt=new Date().toISOString();
      const {error}=await admin.from('lead_integrations').update({config,updated_at:updatedAt,last_error:null}).eq('id',existing.id);
      if(error)throw error;
      return json(200,{ok:true,integration:publicIntegration({...existing,config,updated_at:updatedAt})});
    }

    if(action==='manual_sync'){
      if(!existing)return json(404,{error:'Aún no existe una integración',setup_required:true});
      if(existing.enabled!==true)return json(409,{error:'La integración de Meta Ads está desactivada',setup_required:true});
      const cfg=configObject(existing.config);
      const manualSyncUrl=text(cfg.manualSyncUrl);
      const manualSyncSecret=text(cfg.manualSyncSecret);
      if(!manualSyncUrl||!manualSyncSecret)return json(409,{error:'Falta completar la configuración única de sincronización manual en Mi cuenta',setup_required:true});
      if(!validAppsScriptUrl(manualSyncUrl))return json(409,{error:'La URL de sincronización manual ya no es válida',setup_required:true});

      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),60000);
      try{
        const response=await fetch(manualSyncUrl,{
          method:'POST',
          headers:{'content-type':'application/json; charset=utf-8'},
          body:JSON.stringify({action:'sync',key:manualSyncSecret}),
          redirect:'follow',
          signal:controller.signal,
        });
        const raw=await response.text();
        let payload:any={};
        try{payload=raw?JSON.parse(raw):{};}catch(_){payload={};}
        if(!response.ok||payload?.ok!==true){
          const message=text(payload?.error)||`Apps Script respondió HTTP ${response.status}`;
          await admin.from('lead_integrations').update({last_error:message,updated_at:new Date().toISOString()}).eq('id',existing.id);
          return json(502,{error:message});
        }
        await admin.from('lead_integrations').update({last_error:null,updated_at:new Date().toISOString()}).eq('id',existing.id);
        return json(200,{ok:true,result:{processed:Number(payload.processed||0),skipped:Number(payload.skipped||0),rows:Number(payload.rows||0),sheets:Array.isArray(payload.sheets)?payload.sheets:[]}});
      }catch(error){
        const message=error instanceof Error&&error.name==='AbortError'?'La sincronización manual tardó demasiado':(error instanceof Error?error.message:'No fue posible ejecutar Apps Script');
        await admin.from('lead_integrations').update({last_error:message,updated_at:new Date().toISOString()}).eq('id',existing.id);
        return json(502,{error:message});
      }finally{clearTimeout(timer);}
    }

    const token=newToken();
    const tokenHash=await sha256(token);
    const label=text(body.label)||'Meta Ads';
    const oldConfig=configObject(existing?.config);
    const config={...oldConfig,sheetUrl:text(body.sheet_url),sheetName:text(body.sheet_name)};
    const row={organization_id:profile.organization_id,advisor_id:profile.id,provider:'google_sheets_meta',label,token_hash:tokenHash,enabled:true,config,updated_at:new Date().toISOString(),last_error:null};
    if(existing){
      const {error}=await admin.from('lead_integrations').update(row).eq('id',existing.id);if(error)throw error;
    }else{
      const {error}=await admin.from('lead_integrations').insert(row);if(error)throw error;
    }
    return json(200,{ok:true,token,endpoint:`${supabaseUrl}/functions/v1/meta-lead-ingest`,integration:{label,enabled:true,config:publicConfig(config)}});
  }catch(error){return json(400,{error:error instanceof Error?error.message:'Error inesperado'})}
});
