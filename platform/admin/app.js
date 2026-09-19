const CFG=window.ALVA_PLATFORM_CONFIG;
const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={session:null,admin:null,tenants:[],plans:[],stats:{},leads:[],payments:[],backups:[],platformAdmins:[],view:'dashboard'};
const viewTitles={dashboard:'Resumen',clientes:'Clientes',solicitudes:'Solicitudes',planes:'Planes y módulos',facturacion:'Facturación',respaldos:'Respaldos',equipo:'Equipo ALVA',actividad:'Actividad',configuracion:'Configuración'};
const statusLabels={active:'Activo',implementation:'Implementación',suspended:'Suspendido',cancelled:'Cancelado'};
const moduleLabels={prospects:'Prospectos',clients:'Clientes',agenda:'Agenda',dashboard:'Dashboard',finance:'Finanzas',collaborators:'Colaboradores',documents:'Documentos',reports:'Reportes',multi_office:'Múltiples oficinas',custom_workflows:'Flujos personalizados'};
const leadStatusLabels={new:'Nueva',contacted:'Contactada',demo:'Demo',qualified:'Calificada',won:'Ganada',lost:'Perdida'};
const roleLabels={owner:'Propietario',admin:'Administrador',support:'Soporte',billing:'Facturación'};
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]||m))}
function toast(msg,error=false){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3200)}
function formatDate(v){if(!v)return '—';const raw=String(v).slice(0,10);const p=raw.split('-');if(p.length===3)return p[2]+'/'+p[1]+'/'+p[0];const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-MX').format(d)}
function timeAgo(v){if(!v)return 'Sin actividad';const d=new Date(v),diff=Date.now()-d.getTime();if(diff<60000)return 'Ahora';if(diff<3600000)return 'Hace '+Math.floor(diff/60000)+' min';if(diff<86400000)return 'Hace '+Math.floor(diff/3600000)+' h';return formatDate(v)}
function money(cents,currency='MXN'){if(cents===null||cents===undefined||cents==='')return '—';return new Intl.NumberFormat('es-MX',{style:'currency',currency:currency||'MXN',maximumFractionDigits:0}).format(Number(cents)/100)}
function slugify(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)}
function isoToday(){return new Date().toISOString().slice(0,10)}
function plusMonths(dateString,n){if(!dateString)return '';const d=new Date(dateString+'T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)}
async function api(action,payload={}){const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Tu sesión terminó. Ingresa nuevamente.');const res=await fetch(CFG.functionUrl,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.publishableKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify({action,...payload})});let data={};try{data=await res.json()}catch{}if(!res.ok||data.ok===false)throw new Error(data.error||'No se pudo completar la operación');return data}
function showAuth(){state.session=null;$('#shell')?.classList.add('hidden');$('#auth-view')?.classList.remove('hidden')}
function showShell(){$('#auth-view')?.classList.add('hidden');$('#shell')?.classList.remove('hidden')}
function applyRoleUI(){const role=state.admin?.role||'';$('[data-role-view="owner"]').forEach(el=>el.hidden=role!=='owner');$('[data-role-view="billing"]').forEach(el=>el.hidden=!['owner','admin','billing'].includes(role));$('[data-role-view="backups"]').forEach(el=>el.hidden=!['owner','admin','support'].includes(role));if($('#new-client'))$('#new-client').hidden=!['owner','admin'].includes(role)}
async function boot(){const {data:{session}}=await sb.auth.getSession();if(!session)return showAuth();state.session=session;try{const info=await api('session');state.admin=info.admin;$('#admin-name').textContent=info.admin.display_name||'Administrador';$('#admin-role').textContent=roleLabels[info.admin.role]||String(info.admin.role||'admin').toUpperCase();$('#admin-email').textContent=info.admin.email||'';$('#avatar').textContent=(info.admin.display_name||'A').trim().slice(0,1).toUpperCase();applyRoleUI();showShell();await loadDashboard(true)}catch(e){await sb.auth.signOut();showAuth();$('#login-status').textContent=e.message}}
$('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');const status=$('#login-status');status.textContent='';btn.disabled=true;btn.textContent='Ingresando…';const email=$('#login-email').value.trim(),password=$('#login-password').value;const {error}=await sb.auth.signInWithPassword({email,password});btn.disabled=false;btn.textContent='Ingresar';if(error){status.textContent='No se pudo iniciar sesión. Verifica tus credenciales.';return}await boot()});
$('#logout')?.addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});
$('#account-button')?.addEventListener('click',()=>$('#account-popover').classList.toggle('open'));
document.addEventListener('click',e=>{if(!e.target.closest('.account-menu'))$('#account-popover')?.classList.remove('open')});
function switchView(v){if(!$('#view-'+v))return;state.view=v;$$('.view').forEach(x=>x.classList.remove('active'));$$('.sidebar nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#view-'+v).classList.add('active');$('#view-title').textContent=viewTitles[v]||v;if(v==='actividad')loadActivity();if(v==='planes')renderPlans();if(v==='solicitudes')loadSalesLeads();if(v==='facturacion')loadBilling();if(v==='respaldos')loadBackups();if(v==='equipo')loadPlatformAdmins()}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));

async function loadDashboard(silent=false){if(!silent)toast('Actualizando datos…');try{const data=await api('dashboard');state.tenants=data.tenants||[];state.plans=data.plans||[];state.stats=data.stats||{};renderDashboard();renderClients();renderPlans();fillPlanOptions();fillPaymentOrganizations();if(!silent)toast('Datos actualizados')}catch(e){toast(e.message,true)}}
$('#refresh-data')?.addEventListener('click',()=>loadDashboard());
function renderDashboard(){const s=state.stats;$('#kpi-clients').textContent=s.total??0;$('#kpi-active').textContent=s.active??0;$('#kpi-implementation').textContent=s.implementation??0;$('#kpi-users').textContent=s.users??0;$('#kpi-mrr').textContent=money(s.mrr_cents||0);$('#kpi-overdue').textContent=s.overdue??0;$('#kpi-renewals').textContent=s.renewals_30d??0;const recent=$('#recent-clients');recent.innerHTML=state.tenants.length?state.tenants.slice(0,5).map(c=>`<div class="client-row" data-client="${esc(c.id)}"><div><strong>${esc(c.name)}</strong><small>${esc(c.slug)} · ${c.user_count||0} usuarios</small></div><span>${esc(c.plan_name)}</span><span class="tag ${esc(c.status)}">${esc(statusLabels[c.status]||c.status)}</span></div>`).join(''):'<div class="empty">Todavía no hay organizaciones registradas.</div>';bindClientRows()}
function filteredTenants(){const q=($('#client-search')?.value||'').toLowerCase(),st=$('#status-filter')?.value||'';return state.tenants.filter(c=>(!q||[c.name,c.slug,c.plan_name].join(' ').toLowerCase().includes(q))&&(!st||c.status===st))}
function renderClients(){const body=$('#client-table');if(!body)return;const rows=filteredTenants();body.innerHTML=rows.length?rows.map(c=>`<tr data-client="${esc(c.id)}"><td><strong>${esc(c.name)}</strong><small>${esc(c.slug)}</small></td><td>${esc(c.plan_name)}</td><td><span class="tag ${esc(c.status)}">${esc(statusLabels[c.status]||c.status)}</span></td><td>${c.user_count||0}/${c.seat_limit||'∞'}</td><td>${c.lead_count||0}</td><td>${c.client_count||0}</td><td>${esc(timeAgo(c.last_activity))}</td><td>›</td></tr>`).join(''):'<tr><td colspan="8"><div class="empty">No hay resultados.</div></td></tr>';bindClientRows()}
$('#client-search')?.addEventListener('input',renderClients);$('#status-filter')?.addEventListener('change',renderClients);
function bindClientRows(){$$('[data-client]').forEach(el=>el.onclick=()=>openClient(el.dataset.client))}
function fillPlanOptions(){const sel=$('#org-plan');if(!sel)return;const current=sel.value;sel.innerHTML=state.plans.filter(p=>p.active!==false).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if(current&&state.plans.some(p=>p.id===current))sel.value=current}
function fillPaymentOrganizations(){const sel=$('#payment-org');if(!sel)return;const current=sel.value;sel.innerHTML=state.tenants.filter(t=>!['cancelled'].includes(t.status)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');if(current&&state.tenants.some(t=>t.id===current))sel.value=current}

function renderPlans(){const grid=$('#plans-grid');if(!grid)return;if(!state.plans.length){grid.innerHTML='<div class="empty">Cargando planes…</div>';return}grid.innerHTML=state.plans.map((p,i)=>{const price=p.monthly_price_cents?money(p.monthly_price_cents,p.currency):'Por definir';return `<article class="${i===1?'featured':''}"><span>${esc(p.name.toUpperCase())}</span><h3>${esc(p.description||p.name)}</h3><div class="price">${esc(price)} ${p.monthly_price_cents?'<small>/ mes</small>':''}</div><p>${p.user_limit?('Hasta '+p.user_limit+' usuarios'):'Usuarios según contrato'}</p><ul>${(p.modules||[]).map(m=>`<li>${esc(moduleLabels[m]||m)}</li>`).join('')}</ul><button data-plan="${esc(p.id)}">Editar plan</button></article>`}).join('');$$('[data-plan]').forEach(b=>b.onclick=()=>openPlan(b.dataset.plan))}
function openPlan(id){const p=state.plans.find(x=>x.id===id);if(!p)return;const f=$('#plan-form');f.elements.id.value=p.id;f.elements.name.value=p.name||'';f.elements.user_limit.value=p.user_limit||'';f.elements.price.value=p.monthly_price_cents?(p.monthly_price_cents/100).toFixed(2):'';f.elements.active.value=String(p.active!==false);f.elements.description.value=p.description||'';f.elements.modules.value=(p.modules||[]).join(', ');$('#plan-dialog-title').textContent='Editar '+p.name;$('#plan-dialog').showModal()}
$('#plan-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type=submit]');btn.disabled=true;try{const modules=f.elements.modules.value.split(',').map(x=>x.trim()).filter(Boolean),price=f.elements.price.value.trim();await api('update_plan',{id:f.elements.id.value,name:f.elements.name.value.trim(),description:f.elements.description.value.trim(),user_limit:f.elements.user_limit.value||null,monthly_price_cents:price?Math.round(Number(price)*100):null,active:f.elements.active.value==='true',modules});$('#plan-dialog').close();toast('Plan actualizado');await loadDashboard(true)}catch(err){toast(err.message,true)}finally{btn.disabled=false}});

function prepareClientDialog(){
  const f=$('#client-form');f.reset();$('#org-slug').dataset.touched='';$('#org-sales-lead-id').value='';fillPlanOptions();
  f.elements.status.value='implementation';f.elements.billing_cycle.value='monthly';
}
$('#new-client')?.addEventListener('click',()=>{prepareClientDialog();$('#client-dialog').showModal()});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close)?.close()));
$('#org-name')?.addEventListener('input',()=>{const slug=$('#org-slug');if(!slug.dataset.touched)slug.value=slugify($('#org-name').value)});
$('#org-slug')?.addEventListener('input',e=>{e.currentTarget.dataset.touched='1';e.currentTarget.value=slugify(e.currentTarget.value)});
function showCredentials(kicker,title,email,password,copy='Guarda y comparte estas credenciales por un canal seguro. La contraseña no volverá a mostrarse.',accessUrl=''){$('#credential-kicker').textContent=kicker;$('#credential-title').textContent=title;$('#credential-copy').textContent=copy;$('#credential-email').value=email||'';$('#credential-password').value=password||'';const wrap=$('#credential-url-wrap'),url=$('#credential-url');if(wrap&&url){wrap.hidden=!accessUrl;url.value=accessUrl||''}$('#credentials-dialog').showModal()}
$('#client-form')?.addEventListener('submit',async e=>{e.preventDefault();const btn=$('#save-client');btn.disabled=true;btn.textContent='Creando…';const fd=new FormData(e.currentTarget),payload=Object.fromEntries(fd.entries());payload.agreed_price_cents=payload.agreed_price?Math.round(Number(payload.agreed_price)*100):null;payload.auto_suspend_on_overdue=fd.get('auto_suspend_on_overdue')==='on';delete payload.agreed_price;try{const data=await api('create_tenant',payload);$('#client-dialog').close();showCredentials('ORGANIZACIÓN CREADA','Credenciales iniciales',data.admin.email,data.admin.temporary_password,'Guarda y comparte estas credenciales por un canal seguro. La contraseña no volverá a mostrarse.',data.crm_url||location.origin+'/?tenant='+encodeURIComponent(data.slug||payload.slug||''));toast(payload.sales_lead_id?'Solicitud convertida y organización creada correctamente':'Organización creada correctamente');await loadDashboard(true);if(payload.sales_lead_id)await loadSalesLeads()}catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.textContent='Crear organización'}});
$('#copy-password')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#credential-password').value);toast('Contraseña copiada')}catch{toast('No se pudo copiar automáticamente',true)}});$('#copy-url')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#credential-url').value);toast('Enlace copiado')}catch{toast('No se pudo copiar automáticamente',true)}});

function openClient(id){const c=state.tenants.find(x=>x.id===id);if(!c)return;$('#drawer-name').textContent=c.name;const planOptions=state.plans.map(p=>`<option value="${esc(p.id)}" ${p.id===c.plan_id?'selected':''}>${esc(p.name)}</option>`).join('');const statusWarn=c.status==='suspended'||c.status==='cancelled';$('#drawer-content').innerHTML=`
<div class="metric-strip"><div><small>USUARIOS</small><strong>${c.user_count||0}</strong></div><div><small>PROSPECTOS</small><strong>${c.lead_count||0}</strong></div><div><small>CLIENTES</small><strong>${c.client_count||0}</strong></div></div>
<div class="drawer-card"><h4>Módulos habilitados</h4><div class="module-tags">${(c.modules||[]).map(m=>`<span class="module-tag">${esc(moduleLabels[m]||m)}</span>`).join('')||'<span class="module-tag">Sin módulos</span>'}</div></div>
<form id="drawer-form" class="drawer-card drawer-form">
<h4>Servicio y operación</h4>
<div class="row"><label>Plan<select name="plan_id">${planOptions}</select></label><label>Estado<select name="status"><option value="implementation" ${c.status==='implementation'?'selected':''}>Implementación</option><option value="active" ${c.status==='active'?'selected':''}>Activo</option><option value="suspended" ${c.status==='suspended'?'selected':''}>Suspendido</option><option value="cancelled" ${c.status==='cancelled'?'selected':''}>Cancelado</option></select></label></div>
<label>Motivo de suspensión / cancelación<input name="suspension_reason" value="${esc(c.suspension_reason||'')}" placeholder="Se utiliza cuando el estado está suspendido o cancelado"></label>
<div class="row"><label>Límite de usuarios<input name="seat_limit" type="number" min="1" value="${esc(c.seat_limit||'')}"></label><label>Etapa de onboarding<select name="onboarding_stage"><option value="setup" ${c.onboarding_stage==='setup'?'selected':''}>Configuración</option><option value="migration" ${c.onboarding_stage==='migration'?'selected':''}>Migración</option><option value="training" ${c.onboarding_stage==='training'?'selected':''}>Capacitación</option><option value="live" ${c.onboarding_stage==='live'?'selected':''}>Operativo</option></select></label></div>
<h4>Contacto</h4>
<label>Contacto<input name="primary_contact_name" value="${esc(c.primary_contact_name||'')}"></label>
<label>Correo de contacto<input name="primary_contact_email" type="email" value="${esc(c.primary_contact_email||'')}"></label>
<label>Teléfono<input name="primary_contact_phone" value="${esc(c.primary_contact_phone||'')}"></label>
<label>Correo de facturación<input name="billing_email" type="email" value="${esc(c.billing_email||'')}"></label>
<h4>Datos corporativos del CRM</h4>
<label>Domicilio de la empresa<input name="company_address" value="${esc(c.company_address||'')}" placeholder="Domicilio para documentos y contratos"></label>
<div class="row"><label>Representante legal<input name="company_representative" value="${esc(c.company_representative||'')}"></label><label>Ciudad para contratos<input name="contract_city" value="${esc(c.contract_city||'')}"></label></div>
<label>Nombre de la aplicación<input name="app_name" value="${esc(c.app_name||'ALVA CRM')}"></label>
<h4>Contrato y cobranza</h4>
<div class="row"><label>Inicio de contrato<input name="contract_started_on" type="date" value="${esc(c.contract_started_on||'')}"></label><label>Renovación<input name="renews_on" type="date" value="${esc(c.renews_on||'')}"></label></div>
<div class="row"><label>Ciclo<select name="billing_cycle"><option value="monthly" ${c.billing_cycle==='monthly'?'selected':''}>Mensual</option><option value="annual" ${c.billing_cycle==='annual'?'selected':''}>Anual</option><option value="custom" ${c.billing_cycle==='custom'?'selected':''}>Personalizado</option></select></label><label>Precio contratado MXN<input name="agreed_price" type="number" min="0" step=".01" value="${c.agreed_price_cents?esc((c.agreed_price_cents/100).toFixed(2)):''}"></label></div>
<div class="row"><label>Próximo pago<input name="next_payment_on" type="date" value="${esc(c.next_payment_on||'')}"></label><label>Gracia hasta<input name="grace_until" type="date" value="${esc(c.grace_until||'')}"></label></div>
<label class="check-row"><input name="auto_suspend_on_overdue" type="checkbox" ${c.auto_suspend_on_overdue?'checked':''}> Suspender automáticamente al vencer el periodo de gracia</label>
<label>Días de aviso de renovación<input name="renewal_notice_days" type="number" min="1" max="90" value="${esc(c.renewal_notice_days||15)}"></label>
<label>Notas<textarea name="notes" rows="4">${esc(c.notes||'')}</textarea></label>
${statusWarn?'<div class="warning-box">Este cliente no tiene acceso operativo al CRM mientras permanezca suspendido o cancelado.</div>':''}
<button class="primary" type="submit">Guardar cambios</button></form>
<div class="drawer-card"><h4>Identificación</h4><div class="drawer-grid"><div><span>Slug</span><strong>${esc(c.slug)}</strong></div><div><span>Última actividad</span><strong>${esc(timeAgo(c.last_activity))}</strong></div><div><span>Creado</span><strong>${esc(formatDate(c.created_at))}</strong></div><div><span>Plan</span><strong>${esc(c.plan_name)}</strong></div></div><div class="tenant-access-link"><span>Enlace de acceso</span><a href="${location.origin+'/?tenant='+encodeURIComponent(c.slug)}" target="_blank" rel="noopener">${esc(location.origin+'/?tenant='+c.slug)}</a><button class="ghost" type="button" id="copy-tenant-link">Copiar enlace</button></div></div>`;
const copyTenantLink=$('#copy-tenant-link');if(copyTenantLink)copyTenantLink.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/?tenant='+c.slug);toast('Enlace del cliente copiado')}catch{toast('No se pudo copiar el enlace',true)}};const form=$('#drawer-form');form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Guardando…';try{const fd=new FormData(form),payload=Object.fromEntries(fd.entries());payload.agreed_price_cents=payload.agreed_price?Math.round(Number(payload.agreed_price)*100):null;payload.auto_suspend_on_overdue=fd.get('auto_suspend_on_overdue')==='on';delete payload.agreed_price;await api('update_tenant',{organization_id:c.id,...payload});toast(payload.status==='suspended'?'Cliente suspendido y acceso bloqueado':'Cliente actualizado');await loadDashboard(true);openClient(c.id)}catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.textContent='Guardar cambios'}};$('#client-drawer').classList.add('open')}
$('#close-drawer')?.addEventListener('click',()=>$('#client-drawer').classList.remove('open'));

async function loadActivity(){const list=$('#activity-list');list.innerHTML='<div class="empty">Cargando actividad…</div>';try{const data=await api('activity',{limit:150}),tenants=new Map(state.tenants.map(t=>[t.id,t.name]));list.innerHTML=(data.activity||[]).length?(data.activity||[]).map(a=>`<div class="activity-item"><div class="activity-icon">↗</div><div><strong>${esc(a.summary)}</strong><p>${esc(tenants.get(a.organization_id)||'Plataforma')} · ${esc(a.event_type)}</p></div><time>${esc(timeAgo(a.created_at))}</time></div>`).join(''):'<div class="empty">Aún no hay actividad registrada.</div>'}catch(e){list.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
$('#reload-activity')?.addEventListener('click',loadActivity);

function leadStatusClass(s){return s==='won'?'active':s==='lost'?'cancelled':['new','demo','qualified'].includes(s)?'implementation':'active'}
async function loadSalesLeads(){const body=$('#lead-table');body.innerHTML='<tr><td colspan="6"><div class="empty">Cargando solicitudes…</div></td></tr>';try{const data=await api('sales_leads',{limit:200});state.leads=data.leads||[];renderSalesLeads()}catch(e){body.innerHTML='<tr><td colspan="6"><div class="empty">'+esc(e.message)+'</div></td></tr>'}}
function filteredLeads(){const q=($('#lead-search')?.value||'').toLowerCase(),st=$('#lead-status-filter')?.value||'';return state.leads.filter(l=>(!q||[l.name,l.company,l.contact,l.need].join(' ').toLowerCase().includes(q))&&(!st||l.status===st))}
function renderSalesLeads(){const rows=filteredLeads();$('#lead-table').innerHTML=rows.length?rows.map(l=>`<tr data-lead="${esc(l.id)}"><td><strong>${esc(l.company)}</strong><small>${esc(l.name)}</small></td><td>${esc(l.contact)}</td><td>${esc((l.need||'').slice(0,90)||'—')}</td><td><span class="tag ${leadStatusClass(l.status)}">${esc(leadStatusLabels[l.status]||l.status)}</span></td><td>${esc(formatDate(l.created_at))}</td><td>›</td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">No hay solicitudes comerciales.</div></td></tr>';$$('[data-lead]').forEach(el=>el.onclick=()=>openLead(el.dataset.lead))}
$('#lead-search')?.addEventListener('input',renderSalesLeads);$('#lead-status-filter')?.addEventListener('change',renderSalesLeads);
function leadContactParts(contact){
  const value=String(contact||'').trim();
  if(!value)return {email:'',phone:''};
  const emailMatch=value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if(emailMatch)return {email:emailMatch[0].toLowerCase(),phone:value.replace(emailMatch[0],'').replace(/^[\s|,;·/-]+|[\s|,;·/-]+$/g,'')};
  return {email:'',phone:value};
}
function convertLeadToClient(id){
  const l=state.leads.find(x=>x.id===id);if(!l)return;
  if(l.converted_organization_id){
    const tenant=state.tenants.find(t=>t.id===l.converted_organization_id);
    if(tenant){$('#lead-drawer').classList.remove('open');switchView('clientes');openClient(tenant.id)}
    else toast('La organización vinculada ya no está disponible',true);
    return;
  }
  prepareClientDialog();
  const f=$('#client-form'),parts=leadContactParts(l.contact);
  f.elements.sales_lead_id.value=l.id;
  f.elements.name.value=l.company||'';
  f.elements.slug.value=slugify(l.company||'');$('#org-slug').dataset.touched='1';
  f.elements.primary_contact_name.value=l.name||'';
  f.elements.primary_contact_email.value=parts.email;
  f.elements.primary_contact_phone.value=parts.phone;
  f.elements.billing_email.value=parts.email;
  f.elements.admin_name.value=l.name||'';
  f.elements.admin_email.value=parts.email;
  f.elements.notes.value=[l.need?('Necesidad: '+l.need):'',l.notes?('Seguimiento previo: '+l.notes):''].filter(Boolean).join('\n\n');
  $('#lead-drawer').classList.remove('open');
  $('#client-dialog').showModal();
  if(!parts.email)toast('Completa el correo del administrador antes de crear la organización');
}
function openLead(id){const l=state.leads.find(x=>x.id===id);if(!l)return;$('#lead-drawer-name').textContent=l.company;$('#lead-drawer-content').innerHTML=`<div class="drawer-card"><h4>Contacto</h4><div class="drawer-grid"><div><span>Nombre</span><strong>${esc(l.name)}</strong></div><div><span>Medio de contacto</span><strong>${esc(l.contact)}</strong></div><div><span>Origen</span><strong>${esc(l.source||'website')}</strong></div><div><span>Recibida</span><strong>${esc(formatDate(l.created_at))}</strong></div></div></div><div class="drawer-card"><h4>Necesidad</h4><span class="detail-text">${esc(l.need||'Sin detalle adicional')}</span></div><form id="lead-drawer-form" class="drawer-card drawer-form"><h4>Seguimiento comercial</h4><label>Estado<select name="status"><option value="new" ${l.status==='new'?'selected':''}>Nueva</option><option value="contacted" ${l.status==='contacted'?'selected':''}>Contactada</option><option value="demo" ${l.status==='demo'?'selected':''}>Demo</option><option value="qualified" ${l.status==='qualified'?'selected':''}>Calificada</option><option value="won" ${l.status==='won'?'selected':''}>Ganada</option><option value="lost" ${l.status==='lost'?'selected':''}>Perdida</option></select></label><label>Notas<textarea name="notes" rows="6">${esc(l.notes||'')}</textarea></label><button class="primary" type="submit">Guardar seguimiento</button></form><div class="drawer-card lead-conversion-card"><h4>Conversión</h4>${l.converted_organization_id?`<p class="detail-text">Esta solicitud ya fue convertida en cliente.</p><button class="primary" type="button" id="convert-lead-client">Abrir organización</button>`:`<p class="detail-text">Crea la organización conservando esta solicitud como origen comercial.</p><button class="primary" type="button" id="convert-lead-client">Convertir en cliente</button>`}</div>`;$('#lead-drawer-form').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const fd=new FormData(e.currentTarget);await api('update_sales_lead',{id:l.id,status:fd.get('status'),notes:fd.get('notes')});toast('Solicitud actualizada');await loadSalesLeads();openLead(l.id)}catch(err){toast(err.message,true)}finally{btn.disabled=false}};const convertBtn=$('#convert-lead-client');if(convertBtn)convertBtn.onclick=()=>convertLeadToClient(l.id);$('#lead-drawer').classList.add('open')}
$('#close-lead-drawer')?.addEventListener('click',()=>$('#lead-drawer').classList.remove('open'));

async function loadBilling(){const body=$('#billing-table');if(!body)return;body.innerHTML='<tr><td colspan="7"><div class="empty">Cargando facturación…</div></td></tr>';try{const data=await api('billing_overview');state.payments=data.payments||[];const rows=data.tenants||[];renderBilling(rows)}catch(e){body.innerHTML='<tr><td colspan="7"><div class="empty">'+esc(e.message)+'</div></td></tr>'}}
function renderBilling(rows){const today=isoToday();const monthly=rows.reduce((sum,t)=>sum+(t.status==='active'?Number(t.billing_cycle==='annual'?Math.round((t.agreed_price_cents||0)/12):(t.agreed_price_cents||0)):0),0);const overdue=rows.filter(t=>t.overdue).length,grace=rows.filter(t=>t.in_grace).length,cutoff=plusMonths(today,1),renewals=rows.filter(t=>t.renews_on&&t.renews_on>=today&&t.renews_on<=cutoff).length;$('#billing-mrr').textContent=money(monthly);$('#billing-overdue').textContent=overdue;$('#billing-grace').textContent=grace;$('#billing-renewals').textContent=renewals;$('#billing-table').innerHTML=rows.length?rows.map(t=>{const alert=t.overdue?'<span class="tag cancelled">Vencido</span>':t.in_grace?'<span class="tag implementation">En gracia</span>':t.renews_on&&t.renews_on<=cutoff&&t.renews_on>=today?'<span class="tag implementation">Renueva pronto</span>':'—';return `<tr data-client="${esc(t.id)}"><td><strong>${esc(t.name)}</strong><small>${esc(t.billing_email||t.primary_contact_email||'')}</small></td><td>${esc(money(t.agreed_price_cents||0))}</td><td>${esc(t.billing_cycle==='annual'?'Anual':t.billing_cycle==='custom'?'Personalizado':'Mensual')}</td><td>${esc(formatDate(t.next_payment_on))}</td><td>${esc(formatDate(t.renews_on))}</td><td><span class="tag ${esc(t.status)}">${esc(statusLabels[t.status]||t.status)}</span></td><td>${alert}</td></tr>`}).join(''):'<tr><td colspan="7"><div class="empty">No hay clientes.</div></td></tr>';bindClientRows();renderPayments()}
function renderPayments(){const host=$('#payments-list');if(!host)return;const orgMap=new Map(state.tenants.map(t=>[t.id,t.name]));host.innerHTML=state.payments.length?state.payments.slice(0,30).map(p=>`<div class="payment-row"><div><strong>${esc(orgMap.get(p.organization_id)||'Organización')}</strong><small>${esc(formatDate(p.paid_on))} · ${esc(p.method||'Método no indicado')}</small></div><span>${esc(p.reference||'')}</span><b>${esc(money(p.amount_cents,p.currency))}</b></div>`).join(''):'<div class="empty">Aún no hay pagos registrados.</div>'}
$('#new-payment')?.addEventListener('click',()=>{const f=$('#payment-form');f.reset();fillPaymentOrganizations();f.elements.paid_on.value=isoToday();const t=state.tenants.find(x=>x.id===f.elements.organization_id.value);if(t&&t.next_payment_on)f.elements.next_payment_on.value=t.billing_cycle==='annual'?plusMonths(t.next_payment_on,12):plusMonths(t.next_payment_on,1);$('#payment-dialog').showModal()});
$('#payment-org')?.addEventListener('change',e=>{const t=state.tenants.find(x=>x.id===e.target.value),f=$('#payment-form');if(t?.agreed_price_cents)f.elements.amount.value=(t.agreed_price_cents/100).toFixed(2);if(t?.next_payment_on)f.elements.next_payment_on.value=t.billing_cycle==='annual'?plusMonths(t.next_payment_on,12):plusMonths(t.next_payment_on,1)});
$('#payment-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type=submit]'),fd=new FormData(f),payload=Object.fromEntries(fd.entries());payload.amount_cents=Math.round(Number(payload.amount||0)*100);delete payload.amount;btn.disabled=true;try{await api('add_payment',payload);$('#payment-dialog').close();toast('Pago registrado');await loadDashboard(true);await loadBilling()}catch(err){toast(err.message,true)}finally{btn.disabled=false}});
$('#run-billing-rules')?.addEventListener('click',async()=>{const btn=$('#run-billing-rules');btn.disabled=true;try{const data=await api('run_billing_rules');const n=Number(data.result?.suspended_count||0);toast(n?('Revisión completa: '+n+' organización(es) suspendida(s)'):'Revisión completa: no hubo suspensiones');await loadDashboard(true);await loadBilling()}catch(e){toast(e.message,true)}finally{btn.disabled=false}});


function formatBytes(bytes){
  const n=Number(bytes||0);
  if(!n)return '—';
  if(n<1024)return n+' B';
  if(n<1048576)return (n/1024).toFixed(1)+' KB';
  return (n/1048576).toFixed(n>10485760?0:1)+' MB';
}
async function loadBackups(){
  const body=$('#backup-table');
  if(!body)return;
  body.innerHTML='<tr><td colspan="7"><div class="empty">Cargando respaldos…</div></td></tr>';
  try{
    const data=await api('backups_overview');
    state.backups=data.runs||[];
    renderBackups();
  }catch(e){
    body.innerHTML='<tr><td colspan="7"><div class="empty">'+esc(e.message)+'</div></td></tr>';
  }
}
function renderBackups(){
  const orgMap=new Map(state.tenants.map(t=>[t.id,t.name]));
  const latestByOrg=new Map();
  for(const run of state.backups)if(!latestByOrg.has(run.organization_id))latestByOrg.set(run.organization_id,run);
  const covered=[...latestByOrg.values()].filter(r=>['complete','external_pending'].includes(r.status)).length;
  const failed=state.backups.filter(r=>r.status==='failed').length;
  const latest=state.backups[0];
  $('#backup-latest').textContent=latest?formatDate(latest.started_at):'—';
  $('#backup-covered').textContent=covered+'/'+state.tenants.length;
  $('#backup-failed').textContent=failed;
  if(!state.backups.length){
    $('#backup-table').innerHTML='<tr><td colspan="7"><div class="empty">Aún no hay respaldos registrados.</div></td></tr>';
    return;
  }
  $('#backup-table').innerHTML=state.backups.map(r=>{
    const counts=r.counts&&typeof r.counts==='object'?Object.values(r.counts).reduce((sum,n)=>sum+Number(n||0),0):0;
    const status=r.status==='complete'?'Completo':r.status==='external_pending'?'Supabase OK':r.status==='failed'?'Fallido':r.status;
    const download=r.path?'<button class="table-action" data-backup-download="'+esc(r.id)+'">Descargar</button>':'';
    return '<tr><td><strong>'+esc(orgMap.get(r.organization_id)||r.organization_id)+'</strong><small>'+esc(r.id)+'</small></td>'+
      '<td>'+(r.kind==='daily'?'Automático':'Manual')+'</td>'+
      '<td><span class="tag '+(r.status==='failed'?'cancelled':'active')+'">'+esc(status)+'</span></td>'+
      '<td>'+esc(formatDate(r.started_at))+'</td>'+
      '<td>'+esc(formatBytes(r.bytes))+'</td>'+
      '<td>'+(counts||'—')+'</td>'+
      '<td><div class="table-actions"><button class="table-action" data-backup-run="'+esc(r.organization_id)+'">Nuevo</button>'+download+'</div></td></tr>';
  }).join('');
  $('[data-backup-run]').forEach(btn=>btn.onclick=()=>requestBackup(btn.dataset.backupRun));
  $('[data-backup-download]').forEach(btn=>btn.onclick=()=>downloadBackup(btn.dataset.backupDownload));
}
async function requestBackup(orgId){
  const tenant=state.tenants.find(t=>t.id===orgId);
  if(!confirm('¿Generar un respaldo manual de '+(tenant?.name||'esta organización')+'?'))return;
  try{
    await api('run_backup',{organization_id:orgId});
    toast('Respaldo solicitado. Se procesará en unos segundos.');
    setTimeout(loadBackups,4500);
  }catch(e){toast(e.message,true)}
}
async function downloadBackup(runId){
  try{
    const data=await api('backup_download',{run_id:runId});
    window.open(data.url,'_blank','noopener');
    toast('Enlace seguro generado por 5 minutos');
  }catch(e){toast(e.message,true)}
}
$('#reload-backups')?.addEventListener('click',loadBackups);

async function loadPlatformAdmins(){const body=$('#platform-admin-table');if(!body)return;body.innerHTML='<tr><td colspan="6"><div class="empty">Cargando accesos…</div></td></tr>';try{const data=await api('platform_admins');state.platformAdmins=data.admins||[];renderPlatformAdmins()}catch(e){body.innerHTML='<tr><td colspan="6"><div class="empty">'+esc(e.message)+'</div></td></tr>'}}
function renderPlatformAdmins(){$('#platform-admin-table').innerHTML=state.platformAdmins.length?state.platformAdmins.map(a=>`<tr><td><strong>${esc(a.display_name)}</strong></td><td>${esc(a.email||'—')}</td><td><select class="inline-select" data-admin-role="${esc(a.user_id)}" ${a.user_id===state.admin?.user_id?'disabled':''}><option value="owner" ${a.role==='owner'?'selected':''}>Propietario</option><option value="admin" ${a.role==='admin'?'selected':''}>Administrador</option><option value="support" ${a.role==='support'?'selected':''}>Soporte</option><option value="billing" ${a.role==='billing'?'selected':''}>Facturación</option></select></td><td><span class="tag ${a.active?'active':'cancelled'}">${a.active?'Activo':'Inactivo'}</span></td><td>${esc(formatDate(a.created_at))}</td><td><button class="table-action" data-admin-toggle="${esc(a.user_id)}" data-active="${a.active?'1':'0'}" ${a.user_id===state.admin?.user_id?'disabled':''}>${a.active?'Desactivar':'Activar'}</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">No hay accesos de plataforma.</div></td></tr>';$$('[data-admin-role]').forEach(sel=>sel.onchange=async()=>{try{await api('update_platform_admin',{user_id:sel.dataset.adminRole,role:sel.value});toast('Rol actualizado');await loadPlatformAdmins()}catch(e){toast(e.message,true)}});$$('[data-admin-toggle]').forEach(btn=>btn.onclick=async()=>{try{await api('update_platform_admin',{user_id:btn.dataset.adminToggle,active:btn.dataset.active!=='1'});toast('Acceso actualizado');await loadPlatformAdmins()}catch(e){toast(e.message,true)}})}
$('#new-platform-admin')?.addEventListener('click',()=>{$('#platform-admin-form').reset();$('#platform-admin-dialog').showModal()});
$('#platform-admin-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type=submit]'),payload=Object.fromEntries(new FormData(f).entries());btn.disabled=true;try{const data=await api('create_platform_admin',payload);$('#platform-admin-dialog').close();showCredentials('ACCESO ALVA CREADO','Credenciales administrativas',data.admin.email,data.admin.temporary_password,'Comparte estas credenciales únicamente con la persona autorizada.');toast('Acceso ALVA creado');await loadPlatformAdmins()}catch(err){toast(err.message,true)}finally{btn.disabled=false}});

sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')showAuth();state.session=session});
boot();