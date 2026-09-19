import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import JSZip from 'npm:jszip@3.10.1';
const headers={'Access-Control-Allow-Origin':'https://crm-alvasd.pages.dev','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return response(200,{});if(req.method!=='POST')return response(405,{error:'Método no permitido'});
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const admin=createClient(url,key,{auth:{persistSession:false}});
 let callerRole='';let actor:string|null=null,orgs:string[]=[],source=admin,kind='daily';
 try{
  const token=req.headers.get('x-backup-token');
  if(token){const {data,error}=await admin.rpc('crm_backup_cron_authorize',{provided_token:token});if(error||data!==true)return response(401,{error:'No autorizado'});const {data:organizations,error:oe}=await admin.from('organizations').select('id');if(oe)throw oe;orgs=(organizations||[]).map(o=>o.id);}
  else{const auth=req.headers.get('authorization');if(!auth)return response(401,{error:'Sesión requerida'});source=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data,error}=await source.auth.getUser();if(error||!data.user)return response(401,{error:'Sesión inválida'});actor=data.user.id;const {data:p}=await source.from('profiles').select('organization_id,active,role').eq('id',actor).single();if(!p?.active)return response(403,{error:'Cuenta inactiva'});orgs=[p.organization_id];callerRole=p.role;kind='manual';}
  const results=[];
  for(const org of orgs){
   const {data:run,error:runError}=await admin.from('backup_runs').insert({organization_id:org,actor_id:actor,kind}).select().single();if(runError)throw runError;
   try{
    const {data:snapshot,error}=await source.rpc('crm_backup_data',{target_org:org});if(error)throw error;
    const zip=new JSZip();zip.file('database.json',JSON.stringify(snapshot));const files:{path:string,bytes:number}[]=[];
    // Download the documents referenced by this snapshot, not expiring signed URLs.
    const paths=new Map<string,Set<string>>();const add=(bucket:string,path:string)=>{if(!path||!path.startsWith(org+'/'))return;if(!paths.has(bucket))paths.set(bucket,new Set());paths.get(bucket)!.add(path);};
    for(const c of snapshot.clients||[])for(const h of c.payload?.historialContratos||[])if(h.docxPath)add('crm-contracts',h.docxPath);
    for(const p of snapshot.profiles||[])if(p.photo_path&&(!actor||callerRole==='tech_admin'||p.id===actor))add('crm-avatars',p.photo_path);
    const {data:branding,error:be}=await source.storage.from('crm-branding').list(org,{limit:1000});if(be)throw be;for(const f of branding||[])if(f.id)add('crm-branding',org+'/'+f.name);
    for(const [bucket,names] of paths)for(const path of names){const {data,error}=await source.storage.from(bucket).download(path);if(error)throw new Error('No se pudo respaldar un documento: '+error.message);const bytes=await data.arrayBuffer();zip.file('storage/'+bucket+'/'+path,bytes);files.push({path:bucket+'/'+path,bytes:bytes.byteLength});}
    const counts=Object.fromEntries(Object.entries(snapshot).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,(v as unknown[]).length]));
    zip.file('manifest.json',JSON.stringify({format:'cya-crm-backup-v1',run:run.id,counts,files,scope:actor?'Permisos de la cuenta solicitante':'Organización completa',auth:'No incluye contraseñas ni sesiones de Auth. La recuperación de cuentas requiere un procedimiento separado.'},null,2));
    const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
    // Verify both archive readability and a required payload before marking success.
    const check=await JSZip.loadAsync(bytes);JSON.parse(await check.file('database.json')!.async('string'));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const path=org+'/'+run.id+'.zip';const {error:uploadError}=await admin.storage.from('crm-backups').upload(path,bytes,{contentType:'application/zip',upsert:false});if(uploadError)throw uploadError;
    let driveId:string|null=null,driveError:string|null=null;
    // External transfer is intentionally disabled until an account and folder are connected.
    const status=actor?'complete':driveId?'complete':driveError?'external_failed':'external_pending';
    const {error:finishError}=await admin.from('backup_runs').update({status,path,drive_file_id:driveId,bytes:bytes.length,sha256:hash,counts,finished_at:new Date().toISOString(),error:driveError}).eq('id',run.id);if(finishError)throw finishError;
    results.push({id:run.id,status,path,bytes:bytes.length,counts});
   }catch(e){await admin.from('backup_runs').update({status:'failed',error:(e as Error).message,finished_at:new Date().toISOString()}).eq('id',run.id);results.push({id:run.id,status:'failed',error:(e as Error).message});}
  }
  return response(200,{results});
 }catch(e){return response(500,{error:(e as Error).message});}
});
