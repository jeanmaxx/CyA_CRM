const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const avatarAdapter=fs.readFileSync('cloud-adapter.js','utf8');
assert.match(avatarAdapter,/CLOUD_AVATAR_SIGNED_URL_TTL_SECONDS=86400/);
assert.match(avatarAdapter,/__cyaCloudAvatarRefreshInstalled/);
assert.match(avatarAdapter,/cloudRefreshAdvisorAvatar/);
assert.match(avatarAdapter,/document\.addEventListener\('error'/);

const dom=new JSDOM('<div class="main"></div>',{url:'https://example.invalid',runScripts:'outside-only'});const ctx=dom.getInternalVMContext();const run=s=>vm.runInContext(s,ctx);let requests=[],fail=false,release;
Object.assign(dom.window,{structuredClone,console});
run(`const CA_ORG_ID='org';let store={clientes:[],leads:[],agenda:[],colaboradores:[],plantillas:[],servicios:[],configuracion:{}};let cloudReady=true,cloudSyncTimer=null,cloudLegacyAdvisors=[];let cloudSelect=async()=>[],cloudLoadStore=async()=>{},cloudSyncNow,cloudQueueSync,saveStore,cerrarSesion=async()=>{};const isTechnicalAdmin=()=>false;const cloudTableEnabled=()=>true;const cloudCleanObject=v=>JSON.parse(JSON.stringify(v));const escapeHTMLBasico=v=>v;const fechaISOLocal=()=> '2026-09-09';const showToast=()=>{};function rows(key){return store[key].map(r=>({id:r.id,organization_id:'org',payload:r}));}const cloudCollaboratorRows=()=>rows('colaboradores'),cloudLeadRows=()=>rows('leads'),cloudClientRows=()=>rows('clientes'),cloudEventRows=()=>rows('agenda'),cloudTemplateRows=()=>rows('plantillas'),cloudServiceRows=()=>rows('servicios');`);
dom.window.supabaseClient={rpc:async(name,{operations})=>{requests.push(JSON.parse(JSON.stringify(operations)));if(fail)return {error:{message:'network failure'}};if(release)await new Promise(r=>release=r);return {data:operations.map(o=>({table:o.table,id:o.id,updated_at:'v2'}))};}};
run(fs.readFileSync('cloud-sync-safe.js','utf8'));
(async()=>{run(`store.leads=[{id:'a',nombre:'Before'}];syncVersions={leads:{a:'v1'}};syncInitialize('user-a');store.leads[0].nombre='After';`);fail=true;await assert.rejects(run('cloudSyncNow({throwOnError:true})'));assert.equal(run("JSON.parse(localStorage.getItem(syncKey())).ops.length"),1);assert.equal(requests[0].length,1);
// Reload preserves original expected version and pending draft.
run("store.leads=[{id:'a',nombre:'Remote new edit'}];syncVersions={leads:{a:'newer'}};syncInitialize('user-a')");assert.equal(run('store.leads[0].nombre'),'After');assert.equal(run('syncDiff()[0].expected'),'v1');fail=false;await run('cloudSyncNow({throwOnError:true})');assert.equal(run('localStorage.getItem(syncKey())'),null);assert.equal(run('syncDiff().length'),0);
run("localStorage.setItem(syncPrefix()+':other-tab',JSON.stringify({owner:'user-a',ops:[{id:'other'}]}));store.leads.push({id:'b',nombre:'New'})");await run('cloudSyncNow({throwOnError:true})');assert.equal(requests.at(-1).length,1);assert.equal(requests.at(-1)[0].expected,null);assert.ok(run("localStorage.getItem(syncPrefix()+':other-tab')"));
run('cloudReady=false');await assert.rejects(run('cloudSyncNow({throwOnError:true})'));run('cloudReady=true;syncInitialize("user-b")');assert.equal(run('localStorage.getItem(syncKey())'),null);
console.log('PASS: failed saves retain per-account outbox, restart preserves conflict version, only changed rows sent, new inserts retry by ID, inactive session cannot report success.');dom.window.close();})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
