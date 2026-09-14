const SUPABASE_URL='https://ibhgisndtaclvwznqugu.supabase.co';
const SUPABASE_KEY='sb_publishable_grQYYOgYg0WR9gmn3QBHpg_UyieIrZ8';
const portalClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'ca-collaborator-portal-auth'}});

const PHASES=[
  {id:1,title:'Revisión de elegibilidad (CURP)',tip:'Enviamos la CURP para revisar si el prospecto cumple los criterios necesarios para continuar.'},
  {id:2,title:'Documentación para contrato',tip:'Si el perfil es viable, confirma si ya cuenta con INE y comprobante de domicilio. Lo demás puede completarlo el equipo.'},
  {id:3,title:'Descarga de AFORE Móvil',tip:'Apoya al prospecto a instalar AFORE Móvil e identificar en qué AFORE se encuentra registrado.'},
  {id:4,title:'Revisión de cuenta bancaria Nivel 4',tip:'Confirma si cuenta con una cuenta a su nombre sin límite de depósitos mensuales. Si no sabes el nivel, puedes dejarlo pendiente.'},
  {id:5,title:'Firma de contrato',tip:'Da seguimiento a la cita de firma. Tu confirmación indica que tu parte fue realizada; el asesor valida oficialmente el contrato.'},
];

const state={page:'inicio',bootstrap:null,prospects:[],editingId:null,loading:false};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(value||0));
const dateMX=value=>{if(!value)return '—';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:new Date(value).toLocaleDateString('es-MX');};
const initials=value=>String(value||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'?';

function toast(message,type='info'){
  const el=$('toast');el.textContent=message;el.hidden=false;el.style.borderLeftColor=type==='success'?'var(--success)':type==='error'?'var(--danger)':'var(--gold)';
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3200);
}
function setSync(message){const el=$('sync-label');if(el)el.textContent=message||'Actualizado';}
function setBusy(busy,message='Guardando…'){state.loading=busy;setSync(busy?message:'Actualizado');document.body.style.cursor=busy?'progress':'';}

async function portalAction(body){
  const {data,error}=await portalClient.functions.invoke('collaborator-portal',{body});
  if(error){
    let message=error.message||'No se pudo completar la operación';
    try{if(error.context){const payload=await error.context.json();message=payload?.error||message;}}catch(_){ }
    throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return data;
}

function showLogin(message=''){
  $('portal-view').hidden=true;$('login-view').hidden=false;$('login-error').textContent=message;
}
function showPortal(){
  $('login-view').hidden=true;$('portal-view').hidden=false;
}

async function bootstrap(){
  try{
    setBusy(true,'Sincronizando…');
    const data=await portalAction({action:'bootstrap'});
    state.bootstrap=data;state.prospects=data.prospects||[];
    const c=data.collaborator||{},a=data.advisor||{};
    $('sidebar-name').textContent=c.name||'Colaborador';$('sidebar-avatar').textContent=initials(c.name);$('sidebar-advisor').textContent=`Asesor: ${a.name||'Asignado'}`;
    fillServices();showPortal();navigate(state.page,true);
  }catch(error){
    await portalClient.auth.signOut();showLogin(error.message||'No fue posible validar tu acceso.');
  }finally{setBusy(false);}
}

function fillServices(){
  const select=$('p-service');
  const services=state.bootstrap?.services||[];
  select.innerHTML=services.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')||'<option value="retiro_desempleo">Retiro por desempleo</option>';
}

function renderHome(){
  const data=state.bootstrap||{},d=data.dashboard||{},c=data.collaborator||{},a=data.advisor||{};
  const recent=[...state.prospects].sort((x,y)=>String(y.updatedAt||y.createdAt).localeCompare(String(x.updatedAt||x.createdAt))).slice(0,5);
  return `<section class="hero"><div><span class="eyebrow">BIENVENIDO</span><h1>Hola, ${esc(String(c.name||'').split(/\s+/)[0]||'colaborador')}</h1><p>Registra oportunidades y consulta lo que ya compartiste con Casillas & Asociados.</p></div><div class="advisor-pill">Asesor asignado · ${esc(a.name||'—')}</div></section>
  <section class="kpi-grid">
    <article class="kpi-card"><span>Prospectos enviados</span><strong>${Number(d.opportunities||0)}</strong><small>Oportunidades históricas</small></article>
    <article class="kpi-card"><span>Clientes convertidos</span><strong>${Number(d.converted||0)}</strong><small>Ya forman parte del proceso</small></article>
    <article class="kpi-card"><span>Efectividad</span><strong>${Number(d.effectiveness||0).toFixed(Number(d.effectiveness||0)%1?1:0)}%</strong><small>Clientes / oportunidades</small></article>
    <article class="kpi-card money"><span>Comisiones pendientes</span><strong>${money(d.pending||0)}</strong><small>Cobrado: ${money(d.collected||0)}</small></article>
  </section>
  <section class="section-card"><div class="section-head"><div><h3>Prospectos recientes</h3><p>Últimas oportunidades que continúan en seguimiento</p></div><button class="btn" onclick="navigate('prospectos')">Ver todos</button></div>
    ${recent.length?`<div class="quick-list">${recent.map(p=>`<div class="quick-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.curp||'')}</span></div><span class="quick-stage">${esc(PHASES.find(x=>x.id===p.phase)?.title||'Seguimiento')}</span><span>${dateMX(p.updatedAt||p.createdAt)}</span></div>`).join('')}</div>`:'<div class="empty-state">Todavía no tienes prospectos activos. Usa “+ Prospecto” para enviar el primero.</div>'}
  </section>`;
}

function prospectDetails(p){
  const values=[];
  if(p.phone)values.push(`Tel. <b>${esc(p.phone)}</b>`);
  if(p.afore)values.push(`AFORE <b>${esc(p.afore)}</b>`);
  if(p.bank)values.push(`Banco <b>${esc(p.bank)}</b>`);
  if(p.honorariosManejados!==''&&p.honorariosManejados!==null)values.push(`Honorarios <b>${money(p.honorariosManejados)}</b>`);
  return values.slice(0,3).map(v=>`<span>${v}</span>`).join('');
}
function phaseCard(p,phase){
  const done=Boolean(p.steps?.[String(phase.id)]?.completado);
  const isCurrent=p.phase===phase.id;
  const canComplete=isCurrent&&!done;
  const waiting=phase.id===5&&done&&p.waitingSignatureConfirmation;
  return `<article class="prospect-card ${done&&isCurrent?'done-current':''}">
    <div class="prospect-card-head"><div><h4>${esc(p.name)}</h4><div class="curp">${esc(p.curp)}</div></div><button class="icon-button" style="width:28px;height:28px;font-size:11px" onclick="openProspectModal('${esc(p.id)}')" title="Editar">✎</button></div>
    <div class="prospect-meta">${prospectDetails(p)}</div>
    ${done?`<div class="phase-done">✓ Tu parte en esta fase está marcada como realizada.</div>`:''}
    ${waiting?`<div class="phase-waiting">Pendiente de confirmación oficial del asesor.</div>`:''}
    <div class="prospect-actions"><button class="btn" onclick="openProspectModal('${esc(p.id)}')">Ver datos</button>${canComplete?`<button class="btn btn-primary" onclick="completePhase('${esc(p.id)}',${phase.id})">Marcar realizada</button>`:''}</div>
  </article>`;
}
function renderProspects(){
  return `<div class="prospects-toolbar"><div><h1>Mis prospectos</h1><p>Completa tu parte del seguimiento sin bloquear el avance por datos opcionales.</p></div><button class="btn btn-primary" onclick="openProspectModal()">+ Nuevo prospecto</button></div>
  <div class="phase-board-wrap"><section class="phase-board">${PHASES.map(phase=>{const cards=state.prospects.filter(p=>p.phase===phase.id);return `<div class="phase-column"><header class="phase-head"><div class="phase-title-row"><span class="phase-num">${phase.id}</span><div><h3>${esc(phase.title)}</h3><p>${esc(phase.tip)}</p></div><span class="phase-count">${cards.length}</span></div></header><div class="phase-cards">${cards.length?cards.map(p=>phaseCard(p,phase)).join(''):'<div class="empty-state">Sin prospectos en esta fase.</div>'}</div></div>`;}).join('')}</section></div>`;
}

function navigate(page,silent=false){
  if(['clientes','estadisticas','finanzas'].includes(page)){if(!silent)toast('Esta sección se habilitará en las siguientes fases.');return;}
  state.page=page;
  document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
  $('page-title').textContent=page==='prospectos'?'Mis prospectos':'Inicio';
  $('new-prospect-top').style.display=page==='prospectos'?'none':'';
  $('page-content').innerHTML=page==='prospectos'?renderProspects():renderHome();
  window.scrollTo({top:0,behavior:silent?'auto':'smooth'});
}
window.navigate=navigate;

function openProspectModal(id=''){
  state.editingId=id||null;
  const p=id?state.prospects.find(x=>x.id===id):null;
  $('prospect-modal-title').textContent=p?'Editar prospecto':'Nuevo prospecto';$('prospect-id').value=p?.id||'';
  $('p-name').value=p?.name||'';$('p-phone').value=p?.phone||'';$('p-curp').value=p?.curp||'';$('p-service').value=p?.serviceId||'retiro_desempleo';
  $('p-fees').value=p?.honorariosManejados??'';$('p-city').value=p?.city||'';$('p-afore').value=p?.afore||'';$('p-afore-mobile').value=p?.aforeMovil||'';$('p-bank').value=p?.bank||'';$('p-bank-level').value=p?.bankLevel4||'';$('p-notes').value=p?.notes||'';
  $('prospect-form-message').textContent='';updateCurpHelper();$('prospect-modal').hidden=false;setTimeout(()=>$('p-name').focus(),30);
}
window.openProspectModal=openProspectModal;
function closeProspectModal(){$('prospect-modal').hidden=true;state.editingId=null;}

function payloadFromForm(){return {name:$('p-name').value,phone:$('p-phone').value,curp:$('p-curp').value,serviceId:$('p-service').value,honorariosManejados:$('p-fees').value,city:$('p-city').value,afore:$('p-afore').value,aforeMovil:$('p-afore-mobile').value,bank:$('p-bank').value,bankLevel4:$('p-bank-level').value,notes:$('p-notes').value};}
function updateCurpHelper(){const value=$('p-curp').value.trim().toUpperCase();const helper=$('curp-helper');if(!value){helper.textContent='Puedes guardar aunque el formato requiera revisión.';helper.style.color='';return;}if(value.length===18){helper.textContent='18 caracteres capturados.';helper.style.color='var(--success)';}else{helper.textContent=`${value.length}/18 caracteres. No bloquearemos el guardado.`;helper.style.color='var(--warning)';}}

async function saveProspect(event){
  event.preventDefault();if(state.loading)return;
  const payload=payloadFromForm();
  if(!payload.name.trim()||!payload.phone.trim()||!payload.curp.trim()){$('prospect-form-message').textContent='Nombre, teléfono y CURP son los únicos datos obligatorios.';return;}
  try{setBusy(true);$('save-prospect').disabled=true;const action=state.editingId?'update_prospect':'create_prospect';const data=await portalAction({...payload,action,leadId:state.editingId||undefined});
    const prospect=data.prospect;if(state.editingId){const i=state.prospects.findIndex(x=>x.id===state.editingId);if(i>=0)state.prospects[i]=prospect;}else state.prospects.unshift(prospect);
    closeProspectModal();await refreshDashboardOnly();navigate('prospectos',true);toast(state.editingId?'Prospecto actualizado':'Prospecto enviado a tu asesor','success');
  }catch(error){$('prospect-form-message').textContent=error.message;toast(error.message,'error');}finally{setBusy(false);$('save-prospect').disabled=false;}
}

async function refreshDashboardOnly(){
  const data=await portalAction({action:'bootstrap'});state.bootstrap=data;state.prospects=data.prospects||state.prospects;
}

async function completePhase(id,step){
  const phase=PHASES.find(x=>x.id===step);if(!phase)return;
  if(!confirm(`¿Marcar como realizada tu parte de “${phase.title}”?`))return;
  try{setBusy(true);const data=await portalAction({action:'complete_step',leadId:id,step});const i=state.prospects.findIndex(x=>x.id===id);if(i>=0)state.prospects[i]=data.prospect;await refreshDashboardOnly();navigate('prospectos',true);toast('Fase actualizada','success');}catch(error){toast(error.message,'error');}finally{setBusy(false);}
}
window.completePhase=completePhase;

$('login-form').addEventListener('submit',async event=>{event.preventDefault();$('login-error').textContent='';const email=$('login-email').value.trim(),password=$('login-password').value;try{setBusy(true,'Ingresando…');const {error}=await portalClient.auth.signInWithPassword({email,password});if(error)throw error;await bootstrap();}catch(error){$('login-error').textContent=error.message||'No fue posible iniciar sesión.';}finally{setBusy(false);}});
$('logout-btn').addEventListener('click',async()=>{await portalClient.auth.signOut();state.bootstrap=null;state.prospects=[];showLogin();});
$('new-prospect-top').addEventListener('click',()=>openProspectModal());$('close-prospect-modal').addEventListener('click',closeProspectModal);$('cancel-prospect').addEventListener('click',closeProspectModal);$('prospect-form').addEventListener('submit',saveProspect);$('p-curp').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase();updateCurpHelper();});
['p-name','p-city','p-afore','p-bank'].forEach(id=>$(id).addEventListener('input',event=>event.target.value=event.target.value.toLocaleUpperCase('es-MX')));
$('prospect-modal').addEventListener('click',event=>{if(event.target===$('prospect-modal'))closeProspectModal();});
document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.page)));

(async function init(){
  const {data:{session}}=await portalClient.auth.getSession();
  if(session)await bootstrap();else showLogin();
})();
