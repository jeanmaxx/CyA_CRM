const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/manage-advisor/index.ts','utf8').replace(/^import .*\n/,''));
let handler,state;
function query(table){
  let filters=[];
  const rows=()=>table==='profiles'?state.profiles:table==='platform_tenants'?state.tenants:[];
  const q={
    select(){return q},
    eq(k,v){filters.push([k,v]);return q},
    order(){return q},
    limit(){return q},
    async single(){return {data:rows().find(p=>filters.every(([k,v])=>p[k]===v))}},
    async maybeSingle(){return {data:rows().find(p=>filters.every(([k,v])=>p[k]===v))||null,error:null}},
    async upsert(p){if(table==='profiles')state.saved=p;return {error:null}},
    then(resolve){return Promise.resolve({data:rows().filter(p=>filters.every(([k,v])=>p[k]===v))}).then(resolve)}
  };
  return q;
}
const context={
  Request,Response,Set,Record:Object,String,Error,
  Deno:{env:{get:k=>k},serve:h=>handler=h},
  createClient:(url,key)=>key==='SUPABASE_ANON_KEY'
    ?{auth:{getUser:async()=>({data:{user:state.user?{id:state.user}:null}})}}
    :{from:query,auth:{admin:{
      createUser:async attrs=>{state.creations++;state.createdAttrs=attrs;return {data:{user:{id:'new-user'}}}},
      updateUserById:async()=>({}),
      deleteUser:async()=>({})
    }}}
};
vm.createContext(context);vm.runInContext(source,context);
const caller={id:'founder',organization_id:'org',role:'admin',active:true};
async function call(body,profiles=[caller],user='founder',tenants=[{organization_id:'org',status:'active',suspension_reason:null}]){
  state={profiles,user,tenants,creations:0,createdAttrs:null};
  return handler(new Request('https://edge.invalid',{
    method:'POST',
    headers:{Authorization:'Bearer test','Content-Type':'application/json'},
    body:JSON.stringify(body)
  }));
}
(async()=>{
  assert.equal((await call({action:'upsert',role:'advisor',fullName:'Nuevo Asesor',email:'advisor@example.invalid',password:'Example-1234',active:true})).status,200);
  assert.equal(state.saved.role,'advisor');
  assert.equal(state.createdAttrs.user_metadata.portal,'internal');

  assert.equal((await call({action:'upsert',role:'admin',fullName:'Otro',email:'other@example.invalid',password:'Example-1234'})).status,403);
  assert.equal((await call({action:'upsert'})).status,403);assert.equal(state.creations,0);
  assert.equal((await call({action:'bootstrap'},[caller,{...caller,id:'technical',role:'tech_admin'}])).status,403);
  assert.equal((await call({action:'bootstrap'},[caller,{...caller,id:'second'}],'second')).status,403);

  const body={action:'bootstrap',fullName:'Administrador Técnico',email:'tech@example.invalid',password:'Example-1234',active:false};
  assert.equal((await call(body)).status,200);assert.equal(state.saved.role,'tech_admin');assert.equal(state.saved.active,true);assert.equal(state.creations,1);
  assert.equal((await call({...body,password:'weak'})).status,400);assert.equal(state.creations,0);
  assert.equal((await call({action:'upsert',id:'outsider'},[{...caller,role:'tech_admin'},{...caller,id:'outsider',organization_id:'other'}])).status,403);
  assert.equal((await call({action:'delete',id:'founder'},[{...caller,role:'tech_admin'}])).status,400);
  assert.equal((await call(body,[caller],null)).status,401);

  const suspended=[{organization_id:'org',status:'suspended',suspension_reason:'Pago vencido'}];
  const suspendedResponse=await call({action:'upsert',role:'advisor',fullName:'Bloqueado',email:'blocked@example.invalid',password:'Example-1234'},[caller],'founder',suspended);
  assert.equal(suspendedResponse.status,403);assert.equal(state.creations,0);
  const suspendedPayload=await suspendedResponse.json();assert.match(suspendedPayload.error,/suspendido/i);

  console.log('PASS: Edge bootstrap, organization isolation, internal-user bootstrap, suspended-tenant blocking, password and self-protection rules.');
})().catch(e=>{console.error(e);process.exitCode=1});
