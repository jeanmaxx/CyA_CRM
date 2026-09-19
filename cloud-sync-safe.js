/* Transactional saves and a per-account durable outbox. No credentials are stored here. */
const syncTables={collaborators:['colaboradores',cloudCollaboratorRows],leads:['leads',cloudLeadRows],clients:['clientes',cloudClientRows],agenda_events:['agenda',cloudEventRows],message_templates:['plantillas',cloudTemplateRows],services:['servicios',cloudServiceRows]};
let syncBaseline={},syncVersions={},syncFlight=null,syncOwner=null;
const syncTabId=crypto.randomUUID();
let syncPreviousKey=null,syncPreviousText=null;
const syncOriginalSelect=cloudSelect;
cloudSelect=async function(table){
  let rows=[];let offset=0;
  do{const {data,error}=await supabaseClient.from(table).select('*').range(offset,offset+499);if(error)throw new Error(table+': '+error.message);rows.push(...(data||[]));if((data||[]).length<500)break;offset+=500;}while(true);
  if(syncTables[table]||table==='app_settings')syncVersions[table]=Object.fromEntries(rows.map(r=>[r.id||r.organization_id,r.updated_at]));
  return rows;
};
function syncRows(){
  const rows=Object.fromEntries(
    Object.entries(syncTables)
      .filter(([t])=>cloudTableEnabled(t)&&(t!=='services'||isTechnicalAdmin()))
      .map(([t,[,build]])=>[t,build()])
  );
  if(isTechnicalAdmin())rows.app_settings=[{organization_id:CA_ORG_ID,payload:{...cloudCleanObject(store.configuracion),__legacyAdvisors:cloudLegacyAdvisors}}];
  return rows;
}
function syncPrefix(){return 'cya-pending-v1:'+CA_ORG_ID+':'+syncOwner;}
function syncKey(){return syncPrefix()+':'+syncTabId;}
function syncDiff(){const ops=[];for(const [table,rows] of Object.entries(syncRows())){
  const current=new Map(rows.map(r=>[r.id||CA_ORG_ID,r]));const base=syncBaseline[table]||{};
  for(const [id,row] of current)if(JSON.stringify(row)!==JSON.stringify(base[id]))ops.push({table,id,row,expected:syncVersions[table]?.[id]||null});
  for(const id of Object.keys(base))if(!current.has(id))ops.push({table,id,row:null,expected:syncVersions[table]?.[id]||null});
}return ops;}
function syncBanner(message){let el=document.getElementById('sync-status');if(!el){el=document.createElement('div');el.id='sync-status';el.setAttribute('role','status');el.style.cssText='position:sticky;top:0;z-index:1000;padding:10px;background:var(--bg-card,#192234);color:var(--text-primary);border-bottom:1px solid var(--warning)';document.querySelector('.main')?.prepend(el);}el.innerHTML=message?`<span>${escapeHTMLBasico(message)}</span> <button class="btn" onclick="cloudSyncNow()">Reintentar</button> <button class="btn" onclick="descargarPendientes()">Descargar pendientes</button> <button class="btn" onclick="revisarVersionGuardada()">Cargar versión guardada</button>`:'';el.hidden=!message;}
function syncJournal(ops){if(!syncOwner)return;try{if(ops.length)localStorage.setItem(syncKey(),JSON.stringify({owner:syncOwner,ops,at:new Date().toISOString()}));else localStorage.removeItem(syncKey());if(syncPreviousKey&&localStorage.getItem(syncPreviousKey)===syncPreviousText)localStorage.removeItem(syncPreviousKey);syncPreviousKey=null;syncPreviousText=null;}catch(e){syncBanner('No se pudo conservar el borrador en este navegador. Mantén abierta esta página hasta confirmar el guardado.');throw e;}}
function revisarVersionGuardada(){if(!confirm('Se descargará una copia de tus pendientes y se abrirán los datos guardados en la nube. Podrás revisar y volver a capturar los cambios de la copia.'))return;descargarPendientes();localStorage.removeItem(syncKey());cloudReady=false;location.reload();}
function descargarPendientes(){const text=localStorage.getItem(syncKey());if(!text)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='CRM-pendientes-'+fechaISOLocal(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
const syncOriginalLoad=cloudLoadStore;
function syncIsJwtFutureError(error){return /JWT issued at future/i.test(String(error?.message||error||''));}
cloudLoadStore=async function(){
  const retryDelays=[0,1000,2000,4000];
  let lastError=null;
  for(let attempt=0;attempt<retryDelays.length;attempt++){
    if(retryDelays[attempt]) await new Promise(resolve=>setTimeout(resolve,retryDelays[attempt]));
    try{return await syncOriginalLoad();}
    catch(error){
      lastError=error;
      if(!syncIsJwtFutureError(error)||attempt===retryDelays.length-1) throw error;
      console.warn(`JWT recién emitido rechazado temporalmente por PostgREST; reintento ${attempt+1}/${retryDelays.length-1}.`,error);
      if(typeof cloudSetLoginLoading==='function')cloudSetLoginLoading(true,'Sincronizando sesión...');
    }
  }
  throw lastError;
};
function syncInitialize(userId){syncOwner=userId;syncBaseline={};for(const [t,rows] of Object.entries(syncRows()))syncBaseline[t]=Object.fromEntries(rows.map(r=>[r.id||CA_ORG_ID,cloudCleanObject(r)]));
  const slot=syncPrefix()+':tab';const previous=sessionStorage.getItem(slot);sessionStorage.setItem(slot,syncKey());
  syncPreviousKey=previous!==syncKey()?previous:null;
  if(!syncPreviousKey&&localStorage.getItem(syncPrefix()))syncPreviousKey=syncPrefix();
  syncPreviousText=syncPreviousKey?localStorage.getItem(syncPreviousKey):null;
  let saved;try{saved=JSON.parse(localStorage.getItem(syncKey())||syncPreviousText||'null');}catch(e){syncBanner('Hay un borrador que no se pudo leer. Descarga los pendientes antes de continuar.');throw e;}if(!saved||saved.owner!==userId)return;
  for(const op of saved.ops||[]){if(!syncTables[op.table]&&op.table!=='app_settings')continue;
    if(op.table!=='app_settings'&&!cloudTableEnabled(op.table))continue;
    if(op.table==='app_settings'){if(!isTechnicalAdmin())continue;store.configuracion={...op.row.payload};delete store.configuracion.__legacyAdvisors;}
    else{if(op.table==='services'&&!isTechnicalAdmin())continue;const key=syncTables[op.table][0];store[key]=store[key].filter(r=>r.id!==op.id);if(op.row)store[key].push({...op.row.payload,id:op.id});}
    if(op.row&&JSON.stringify(syncBaseline[op.table]?.[op.id])===JSON.stringify(op.row))continue;
    if(!op.row&&!syncBaseline[op.table]?.[op.id])continue;
    syncVersions[op.table]||={};syncVersions[op.table][op.id]=op.expected;
    // Preserve a deletion/new record as a pending operation even after reloading.
    if(!op.row&&!syncBaseline[op.table]?.[op.id]){syncBaseline[op.table]||={};syncBaseline[op.table][op.id]={id:op.id};}
    if(op.row&&op.expected===null)delete syncBaseline[op.table]?.[op.id];
  }
  // Older collaborator-profile drafts could contain an empty/unknown advisor after the
  // portal account was created in another request. Keep the authoritative cloud owner
  // rather than replaying a broken ownership value into the durable outbox.
  for(const col of (store.colaboradores||[])){
    const ownerKnown=Boolean(col?.asesorId&&(store.asesores||[]).some(a=>a.id===col.asesorId));
    if(ownerKnown)continue;
    const server=syncBaseline.collaborators?.[col.id];
    const owner=server?.advisor_id||server?.payload?.asesorId||null;
    if(owner&&(store.asesores||[]).some(a=>a.id===owner))col.asesorId=owner;
  }
  syncJournal(syncDiff());
  if(!syncDiff().length){syncBanner('');return;}
  syncBanner('Se recuperaron cambios pendientes de esta cuenta. Reintenta guardarlos; si hay un conflicto, descarga la copia para revisarla.');
}
cloudSyncNow=async function(options={}){
  if(!cloudReady){const e=new Error('La sesión no está lista. Los cambios todavía no se han guardado.');if(options.throwOnError)throw e;syncBanner(e.message);return false;}
  if(syncFlight){try{await syncFlight;}catch(e){if(options.throwOnError)throw e;return false;}return cloudSyncNow(options);}
  const ops=syncDiff();if(!ops.length)return true;
  try{syncJournal(ops);}catch(e){if(options.throwOnError)throw e;return false;}
  syncBanner('Guardando cambios…');
  const owner=syncOwner;
  syncFlight=(async()=>{const {data,error}=await supabaseClient.rpc('crm_save_changes',{operations:ops});if(error)throw new Error(error.message);if(owner!==syncOwner)throw new Error('La cuenta cambió durante el guardado');
    for(const op of ops){syncBaseline[op.table]||={};syncVersions[op.table]||={};if(op.row){syncBaseline[op.table][op.id]=cloudCleanObject(op.row);syncVersions[op.table][op.id]=data.find(r=>r.table===op.table&&r.id===op.id)?.updated_at;}else{delete syncBaseline[op.table][op.id];delete syncVersions[op.table][op.id];}}
    const pending=syncDiff();syncJournal(pending);syncBanner(pending.length?'Hay cambios pendientes de guardar.':'');return true;})();
  try{return await syncFlight;}catch(e){syncBanner('No se confirmó el guardado: '+e.message);if(options.throwOnError)throw e;return false;}finally{syncFlight=null;}
};
cloudQueueSync=function(){if(!cloudReady)return;try{syncJournal(syncDiff());}catch(e){return;}clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>cloudSyncNow(),250);};
saveStore=function(){cloudQueueSync();};
window.addEventListener('online',()=>{if(cloudReady)cloudSyncNow();});
window.addEventListener('beforeunload',e=>{if(cloudReady&&syncDiff().length){try{syncJournal(syncDiff());}catch(_){}e.preventDefault();e.returnValue='';}});
const syncOriginalLogout=cerrarSesion;
cerrarSesion=async function(){clearTimeout(cloudSyncTimer);try{await cloudSyncNow({throwOnError:true});}catch(e){showToast('Hay cambios sin guardar. Reintenta o descarga los pendientes antes de salir.','warn');return;}await syncOriginalLogout();syncOwner=null;syncBaseline={};syncVersions={};};

function descargarCapturasPendientes(){
 const prefix=syncPrefix()+':';const drafts=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key===syncPrefix()||key.startsWith(prefix)){try{const draft=JSON.parse(localStorage.getItem(key));if(draft?.owner===syncOwner&&draft.ops?.length)drafts.push(draft);}catch(_){}}}
 if(!drafts.length)return showToast('No hay capturas pendientes en este navegador','info');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({capturas:drafts},null,2)],{type:'application/json'}));a.download='CRM-capturas-pendientes.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}