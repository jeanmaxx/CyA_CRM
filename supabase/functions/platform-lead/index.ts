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
    'Access-Control-Allow-Headers': 'apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}
function reply(req:Request,status:number,payload:Record<string,unknown>){
  return new Response(JSON.stringify(payload),{status,headers:corsHeaders(req)});
}
function clean(value:unknown,max:number){return String(value||'').trim().slice(0,max)}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders(req)});
  if(req.method!=='POST') return reply(req,405,{error:'Método no permitido'});
  try{
    const body=await req.json().catch(()=>({}));
    if(clean(body.website,120)) return reply(req,200,{ok:true});
    const name=clean(body.name,120);
    const company=clean(body.company,160);
    const contact=clean(body.contact,180);
    const need=clean(body.need,1200);
    if(name.length<2||company.length<2||contact.length<4) return reply(req,400,{error:'Completa nombre, empresa y medio de contacto'});
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data,error}=await admin.from('platform_sales_leads').insert({
      name,company,contact,need:need||null,status:'new',source:'website',
      metadata:{user_agent:clean(req.headers.get('user-agent'),300)}
    }).select('id').single();
    if(error) throw error;
    return reply(req,200,{ok:true,id:data.id});
  }catch(error){
    return reply(req,400,{error:error instanceof Error?error.message:'No se pudo registrar la solicitud'});
  }
});