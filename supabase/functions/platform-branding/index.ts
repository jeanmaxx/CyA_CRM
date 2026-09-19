import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const allowedOrigins = new Set([
  'https://crm-alvasd.pages.dev',
  'https://alva-crm-platform.crm-alvasd.pages.dev',
  'https://jeanmaxx.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

function corsHeaders(req:Request){
  const origin=req.headers.get('origin')||'';
  const preview=/^https:\/\/[a-z0-9-]+\.crm-alvasd\.pages\.dev$/i.test(origin);
  return {
    'Access-Control-Allow-Origin':(allowedOrigins.has(origin)||preview)?origin:'https://crm-alvasd.pages.dev',
    'Access-Control-Allow-Headers':'apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json',
    'Vary':'Origin'
  };
}
function respond(req:Request,status:number,payload:Record<string,unknown>){
  return new Response(JSON.stringify(payload),{status,headers:corsHeaders(req)});
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(req)});
  if(req.method!=='POST')return respond(req,405,{error:'Método no permitido'});
  try{
    const body=await req.json().catch(()=>({}));
    const slug=String(body.slug||'').trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug))return respond(req,400,{error:'Identificador inválido'});
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:org,error:orgError}=await admin.from('organizations').select('id,name,slug').eq('slug',slug).maybeSingle();
    if(orgError)throw orgError;
    if(!org)return respond(req,404,{error:'Organización no encontrada'});
    const [{data:settings,error:settingsError},{data:tenant,error:tenantError}]=await Promise.all([
      admin.from('app_settings').select('payload').eq('organization_id',org.id).maybeSingle(),
      admin.from('platform_tenants').select('status').eq('organization_id',org.id).maybeSingle()
    ]);
    if(settingsError)throw settingsError;if(tenantError)throw tenantError;
    if(tenant?.status==='cancelled')return respond(req,404,{error:'Organización no disponible'});
    const payload=settings?.payload||{};
    const fallback='https://ibhgisndtaclvwznqugu.supabase.co/storage/v1/object/public/crm-branding/ca000000-0000-4000-8000-000000000001/alva-sd-official-20260918.png';
    return respond(req,200,{ok:true,brand:{
      slug:org.slug,
      companyName:String(org.name||payload.empresa_nombre||''),
      appName:String(payload.nombre_app||'ALVA CRM'),
      logoUrl:String(payload.logo_empresa||fallback),
      status:String(tenant?.status||'active')
    }});
  }catch(error){
    return respond(req,400,{error:error instanceof Error?error.message:'No se pudo cargar la identidad'});
  }
});