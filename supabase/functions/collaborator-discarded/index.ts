import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

function allowedOrigin(origin:string){return origin==='https://jeanmaxx.github.io'||origin==='http://localhost:8000'||origin==='http://127.0.0.1:8000'||/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)}
function corsHeaders(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://jeanmaxx.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'}}
function respond(req:Request,status:number,payload:Record<string,unknown>){return new Response(JSON.stringify(payload),{status,headers:corsHeaders(req)})}
function clean(v:unknown){return String(v??'').trim()}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(req)});
  if(req.method!=='POST')return respond(req,405,{error:'Método no permitido'});
  try{
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization=req.headers.get('Authorization');
    if(!authorization)return respond(req,401,{error:'Sesión requerida'});
    const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:authData,error:authError}=await caller.auth.getUser();
    if(authError||!authData.user)return respond(req,401,{error:'Sesión inválida'});

    const admin=createClient(url,service,{auth:{persistSession:false}});
    const {data:account,error:accountError}=await admin.from('collaborator_accounts').select('user_id,organization_id,collaborator_id,active').eq('user_id',authData.user.id).maybeSingle();
    if(accountError)throw accountError;
    if(!account||account.active!==true)return respond(req,403,{error:'Tu acceso al Portal de Colaboradores no está activo'});
    const body=await req.json().catch(()=>({}));
    const expectedTenantSlug=String(body.tenantSlug||'').trim().toLowerCase();
    const {data:organization,error:organizationError}=await admin.from('organizations').select('id,slug').eq('id',account.organization_id).maybeSingle();
    if(organizationError)throw organizationError;
    if(!organization)return respond(req,403,{error:'La organización de esta cuenta ya no está disponible'});
    if(expectedTenantSlug&&String(organization.slug||'').toLowerCase()!==expectedTenantSlug)return respond(req,403,{error:'Esta cuenta no corresponde a la organización de este enlace'});
    const {data:tenant}=await admin.from('platform_tenants').select('status,suspension_reason').eq('organization_id',account.organization_id).maybeSingle();
    if(tenant&&['suspended','cancelled'].includes(String(tenant.status)))return respond(req,403,{error:tenant.status==='cancelled'?'El servicio de esta organización está cancelado':('El servicio de esta organización está suspendido'+(tenant.suspension_reason?': '+tenant.suspension_reason:''))});
    const {data:moduleAllowed,error:moduleError}=await admin.rpc('organization_module_allowed',{target_org:account.organization_id,module_name:'collaborators'});
    if(moduleError)throw moduleError;
    if(moduleAllowed!==true)return respond(req,403,{error:'El Portal de Colaboradores no está incluido en el plan de esta organización'});
    const {data:collaborator,error:collabError}=await admin.from('collaborators').select('id,active').eq('organization_id',account.organization_id).eq('id',account.collaborator_id).maybeSingle();
    if(collabError)throw collabError;
    if(!collaborator||collaborator.active===false)return respond(req,403,{error:'El colaborador está inactivo'});

    const {data:rows,error}=await admin.from('leads').select('id,name,phone,curp,service_id,status,payload,created_at,updated_at').eq('organization_id',account.organization_id).eq('collaborator_id',collaborator.id).in('status',['archivado','descartado']).order('updated_at',{ascending:false});
    if(error)throw error;

    const items=(rows||[]).map((row:any)=>{
      const p=row.payload||{};
      const reason=clean(p.causaArchivo||p.causaDescarte||p.motivoDescarte||p.causaArchivoId||'Archivado por el asesor');
      const archiveNotes=clean(p.notasArchivo||p.notasDescarte||p.detalleDescarte||'');
      const originalNotes=clean(p.notas||'');
      const date=clean(p.fechaArchivo||p.fechaDescarte||row.updated_at||row.created_at);
      return {id:row.id,name:row.name||'',phone:row.phone||'',curp:row.curp||p.curp||'',serviceId:row.service_id||p.servicio||'retiro_desempleo',status:row.status,reason,archiveNotes,originalNotes,date,archiveType:clean(p.archivoTipo||p.tipoDescarte||'')};
    });
    return respond(req,200,{ok:true,items});
  }catch(error){const message=error instanceof Error?error.message:'Error inesperado';return respond(req,400,{error:message})}
});
