// ==================== DESCARTAR CLIENTE ====================
let descartandoClienteId = null;
let clienteParaRegresarId = null;

function abrirRegresoProspecto(id){
  const c=store.clientes.find(x=>x.id===id);
  if(!c||c.descartado||c.devueltoAProspectos) return;
  clienteParaRegresarId=id;
  const etapaSugerida=c.servicio==='asesoria_pension'?'pensiones':c.servicio==='correccion_imss'?'correccion_imss':'semanas';
  setVal('regreso-prospecto-etapa',etapaSugerida);
  setVal('regreso-archivo-causa','docs_incompletos');
  setVal('regreso-fecha-retiro','');
  setVal('regreso-otros-causa','');
  setVal('regreso-prospecto-notas','');
  toggleRegresoProspectoArchivo();
  document.getElementById('modal-regresar-prospecto').classList.add('open');
}

function toggleRegresoProspectoArchivo(){
  const archivado=getVal('regreso-prospecto-etapa')==='archivado';
  document.getElementById('regreso-archivo-wrap').style.display=archivado?'':'none';
  toggleRegresoCausa();
}

function toggleRegresoCausa(){
  const causa=getVal('regreso-archivo-causa');
  document.getElementById('regreso-fecha-retiro-wrap').style.display=causa==='retiro_menos_5'?'':'none';
  document.getElementById('regreso-otros-wrap').style.display=causa==='otros'?'':'none';
}

function confirmarRegresoProspecto(){
  const c=store.clientes.find(x=>x.id===clienteParaRegresarId);
  if(!c) return;
  const etapa=getVal('regreso-prospecto-etapa')||'semanas';
  const causa=getVal('regreso-archivo-causa');
  const otros=getVal('regreso-otros-causa').trim();
  const notasRegreso=getVal('regreso-prospecto-notas').trim();
  if(etapa==='archivado'&&causa==='otros'&&!otros){ showToast('Especifica la causa de archivo','warn'); return; }
  if(etapa==='archivado'&&causa==='retiro_menos_5'&&!getVal('regreso-fecha-retiro')){ showToast('Captura la fecha del último retiro','warn'); return; }
  const hoy=new Date().toISOString();
  const causaLabels={docs_incompletos:'No envió toda la documentación',no_contesta:'No contesta',aprobado_no_contesta:'Aprobado y no contesta',no_quiso:'No quiso continuar',imss_activo:'Tiene IMSS activo',inconsistencias_curp_nss:'Inconsistencias de CURP / NSS',retiro_menos_5:'Retiró hace menos de 5 años',otros:otros||'Otros'};
  const lead={
    id:'lead_'+Date.now(),
    nombre:c.nombre||'', telefono:c.telefono||'', curp:c.curp||'',
    servicio:c.servicio||'retiro_desempleo', estado:etapa,
    colaboradorId:c.colaboradorId||null, asesorId:c.asesorId||sesionActiva?.id||null,
    notas:`REGRESADO DESDE CLIENTES${notasRegreso?' — '+notasRegreso:''}${c.notas?'\n'+c.notas:''}`,
    fechaInicio:hoy, origenClienteId:c.id,
    historialClienteOrigen:[...(c.historial||[])],
  };
  if(etapa==='archivado'){
    lead.causaArchivoId=causa;
    lead.causaArchivo=causaLabels[causa]||causa;
    lead.notasArchivo=notasRegreso;
    lead.fechaArchivo=hoy;
    lead.archivoTipo=causa==='retiro_menos_5'?'temporal':'definitivo';
    if(causa==='retiro_menos_5'){
      lead.fechaUltimoRetiro=getVal('regreso-fecha-retiro');
      const d=new Date(lead.fechaUltimoRetiro+'T10:00:00'); d.setFullYear(d.getFullYear()+4); d.setMonth(d.getMonth()+11);
      lead.fechaRecontacto=d.toISOString().split('T')[0];
      store.agenda.push({id:'ev_recontacto_'+lead.id,titulo:'Recontactar prospecto — posible nuevo retiro por desempleo',tipo:'recordatorio',fecha:lead.fechaRecontacto,hora:'10:00',notas:notasRecontactoLead(lead),leadId:lead.id,completado:false,autoGenerado:true,asesorId:lead.asesorId||null});
    }
  }
  store.leads.push(lead);
  store.clientes=store.clientes.filter(x=>x.id!==c.id);
  store.agenda=(store.agenda||[]).filter(e=>e.clienteId!==c.id);
  saveStore();
  closeModal('modal-regresar-prospecto');
  closeModal('modal-perfil');
  clienteParaRegresarId=null;
  showToast(etapa==='archivado'?'Cliente enviado a Archivados':'Cliente regresado a Prospectos','success');
  navigate('leads',document.querySelector('[data-page="leads"]'));
}

function abrirDescarte(id){
  descartandoClienteId=id;
  setVal('descarte-causa','imss_activo');
  setVal('descarte-notas','');
  setVal('descarte-otros-texto','');
  setVal('descarte-fecha-retiro','');
  toggleDescartarOtros();
  document.getElementById('modal-descartar').classList.add('open');
}

function toggleDescartarOtros(){
  const v=getVal('descarte-causa');
  document.getElementById('descarte-otros-wrap').style.display=v==='otros'?'':'none';
  document.getElementById('descarte-fecha-retiro-wrap').style.display=v==='retiro_reciente'?'':'none';
}

function confirmarDescarte(){
  if(!descartandoClienteId) return;
  const c=store.clientes.find(x=>x.id===descartandoClienteId);
  if(!c) return;
  const causa=getVal('descarte-causa');
  const causaLabels={
    imss_activo:'Sigue con servicio activo del IMSS',
    retiro_reciente:'Tiene menos de 5 años que retiró',
    inconsistencias:'Inconsistencias de CURP / NSS',
    no_contesta:'Aprobado pero ya no contesta',
    semanas:'No cumple con las semanas',
    otros:getVal('descarte-otros-texto')||'Otros',
  };
  c.descartado=true;
  c.causaDescarte=causaLabels[causa];
  c.fechaDescarte=new Date().toISOString().split('T')[0];
  c.notasDescarte=getVal('descarte-notas');
  if(causa==='retiro_reciente'&&getVal('descarte-fecha-retiro')){
    c.fechaUltimoRetiro=getVal('descarte-fecha-retiro');
    // Calcular cuándo podría ser elegible de nuevo
    const d=new Date(c.fechaUltimoRetiro+'T12:00:00');
    d.setFullYear(d.getFullYear()+5);
    c.fechaElegibleNuevo=d.toISOString().split('T')[0];
  }
  addHist(c,'descarte','Descartado: '+c.causaDescarte);
  saveStore();
  closeModal('modal-descartar');
  descartandoClienteId=null;
  showToast('Cliente descartado','info');
  closeModal('modal-perfil');
  renderPage('clientes');
}

// ==================== VALIDACIONES NUEVAS ====================
function validateCLABE(input){
  const v=input.value;
  const ind=document.getElementById('fc-clabe-ind');
  if(!v){if(ind)ind.textContent='';return;}
  if(v.length===18){
    input.className='form-input input-nss-ok';
    if(ind){ind.textContent='✓';ind.className='nss-indicator nss-ok';}
  } else {
    input.className='form-input input-nss-err';
    if(ind){ind.textContent=v.length+'/18';ind.className='nss-indicator nss-err';}
  }
}

// Alertas AFORE en perfil del cliente
function renderAlertasAFORE(c){
  if(!c.fechaBiometrica&&!c.fechaSolicitudManual) return '';
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  let alertas='';
  if(c.fechaBiometrica){
    const fb=new Date(c.fechaBiometrica+'T12:00:00');
    const diff=Math.floor((fb-hoy)/(1000*60*60*24));
    if(diff===0) alertas+=`<div class="alerta-afore-urgente">🔴 Cita biométrica AFORE: HOY</div>`;
    else if(diff===1) alertas+=`<div class="alerta-afore-urgente">🔴 Cita biométrica AFORE: MAÑANA (${fmtDate(c.fechaBiometrica)})</div>`;
    else if(diff===2) alertas+=`<div class="alerta-afore-proxima">⚠ Cita biométrica AFORE en 2 días (${fmtDate(c.fechaBiometrica)})</div>`;
  }
  if(c.fechaSolicitudManual){
    const fs=new Date(c.fechaSolicitudManual+'T12:00:00');
    const diff=Math.floor((fs-hoy)/(1000*60*60*24));
    if(diff===0) alertas+=`<div class="alerta-afore-urgente">🔴 Fecha de solicitud AFORE: HOY</div>`;
    else if(diff===1) alertas+=`<div class="alerta-afore-urgente">🔴 Fecha solicitud AFORE: MAÑANA (${fmtDate(c.fechaSolicitudManual)})</div>`;
    else if(diff===2) alertas+=`<div class="alerta-afore-proxima">⚠ Fecha solicitud AFORE en 2 días (${fmtDate(c.fechaSolicitudManual)})</div>`;
  }
  return alertas;
}

// Verificación diaria de alertas AFORE
function verificarAlertasAFOREDiarias(){
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  store.clientes.forEach(c=>{
    if(c.descartado||c.etapa==='concluido') return;
    [c.fechaBiometrica,c.fechaSolicitudManual].forEach(fecha=>{
      if(!fecha) return;
      const d=new Date(fecha+'T12:00:00');
      const diff=Math.floor((d-hoy)/(1000*60*60*24));
      if(diff===1||diff===2){
        const tipo=fecha===c.fechaBiometrica?'cita biométrica':'solicitud AFORE';
        const existe=(store.agenda||[]).some(e=>e.clienteId===c.id&&e.fecha===fecha&&e.tipo==='recordatorio');
        if(!existe){
          if(!store.agenda) store.agenda=[];
          store.agenda.push({
            id:'ev_afore_'+c.id+'_'+fecha,
            titulo:'⚠ '+tipo.toUpperCase()+' — '+c.nombre,
            tipo:'recordatorio', fecha,
            hora:'09:00', notas:'Alerta automática',
            clienteId:c.id, completado:false,
            autoGenerado:true, asesorId:c.asesorId||null,
          });
          saveStore();
        }
      }
    });
  });
}

// ==================== EXPORTACIÓN POR ETAPA ====================
function exportarLeadsPorEtapa(){
  const leads=leadsVistaActual();
  if(!leads.length){showToast('Sin prospectos para exportar','info');return;}
  const ESTADO_LABEL={pensiones:'Pensiones',correccion_imss:'Corrección ante IMSS',semanas:'En revisión de semanas / NSS',sindos:'En revisión de SINDOs',aprobado:'Aprobado',archivado:'Archivado'};
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  let csv='\uFEFFEtapa,Nombre,CURP,Servicio\n';
  leads.forEach(l=>{ csv+=[ESTADO_LABEL[l.estado]||l.estado||'',l.nombre||'',l.curp||'',getSvcLabel(l.servicio)].map(esc).join(',')+'\n'; });

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='prospectos_por_etapa_'+new Date().toISOString().split('T')[0]+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Prospectos exportados por etapa','success');
}

function exportarClientesPorEtapa(){
  const cl=(clientesVistaActual()||[]).filter(c=>!c.descartado&&!c.archivado);
  if(!cl.length){showToast('Sin clientes para exportar','info');return;}
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  let csv='\uFEFFEtapa,Nombre,Teléfono,CURP\n';
  cl.sort((a,b)=>stageLabel(a.etapa,a.servicio).localeCompare(stageLabel(b.etapa,b.servicio),'es'))
    .forEach(c=>{ csv+=[stageLabel(c.etapa,c.servicio),c.nombre||'',c.telefono||'',c.curp||''].map(esc).join(',')+'\n'; });

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='clientes_por_etapa_'+new Date().toISOString().split('T')[0]+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Clientes exportados por etapa','success');
}

// ==================== SIDEBAR CONTRAÍBLE ====================
let sidebarCollapsed = false;
let mobileSidebarOpen = false;
const mobileSidebarMedia = window.matchMedia('(max-width: 900px)');

function setMobileSidebar(open, restoreFocus=true){
  const isMobile=mobileSidebarMedia.matches;
  const shouldOpen=Boolean(open&&isMobile);
  const wasOpen=mobileSidebarOpen;
  const sidebar=document.getElementById('main-sidebar');
  const scrim=document.getElementById('sidebar-scrim');
  const menuButton=document.getElementById('mobile-menu-btn');
  const main=document.querySelector('.main');
  mobileSidebarOpen=shouldOpen;
  if(sidebar){
    sidebar.classList.toggle('mobile-open',shouldOpen);
    if(isMobile) sidebar.setAttribute('aria-hidden',shouldOpen?'false':'true');
    else sidebar.removeAttribute('aria-hidden');
  }
  if(scrim) scrim.classList.toggle('open',shouldOpen);
  if(menuButton) menuButton.setAttribute('aria-expanded',shouldOpen?'true':'false');
  if(main){
    if(shouldOpen) main.setAttribute('inert','');
    else main.removeAttribute('inert');
  }
  document.body.classList.toggle('mobile-nav-open',shouldOpen);
  if(shouldOpen) requestAnimationFrame(()=>document.getElementById('mobile-sidebar-close')?.focus());
  else if(wasOpen&&restoreFocus) menuButton?.focus();
}

function toggleMobileSidebar(){
  setMobileSidebar(!mobileSidebarOpen);
}

function closeMobileSidebar(restoreFocus=true){
  setMobileSidebar(false,restoreFocus);
}

function toggleSidebar(){
  if(mobileSidebarMedia.matches){ toggleMobileSidebar(); return; }
  sidebarCollapsed = !sidebarCollapsed;
  const sb = document.getElementById('main-sidebar');
  const btn = document.getElementById('sidebar-toggle-btn');
  if(sb) sb.classList.toggle('collapsed', sidebarCollapsed);
  if(btn) btn.innerHTML = sidebarCollapsed ? '&#x203A;' : '&#x2039;';
  try{ localStorage.setItem('sidebar_collapsed', sidebarCollapsed?'1':'0'); }catch(e){}
}
function initSidebarState(){
  try{
    const saved = localStorage.getItem('sidebar_collapsed');
    if(saved==='1'){ sidebarCollapsed=true; const sb=document.getElementById('main-sidebar'); if(sb) sb.classList.add('collapsed'); const btn=document.getElementById('sidebar-toggle-btn'); if(btn) btn.innerHTML='&#x203A;'; }
  }catch(e){}
}

function initResponsiveShell(){
  setMobileSidebar(false,false);
  const syncViewport=()=>setMobileSidebar(false,false);
  if(mobileSidebarMedia.addEventListener) mobileSidebarMedia.addEventListener('change',syncViewport);
  else mobileSidebarMedia.addListener(syncViewport);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mobileSidebarOpen) closeMobileSidebar();
  });
}

initResponsiveShell();

// ==================== MODO DIRECTOR ====================
let vistaActual = 'propia'; // 'propia' | 'director' | asesor_id

function getSelectorVistaHTML(compacto=false){
  if(!isAdmin()) return '';
  const asesores = store.asesores
    .filter(a=>a.activo!==false&&a.id!==sesionActiva?.id)
    .sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:${compacto?'0':'16px'};">
    <span style="font-size:12px;color:var(--text-muted);">Vista:</span>
    <select id="selector-vista" class="form-select" style="width:auto;font-size:13px;padding:4px 10px;"
      onchange="cambiarVista(this.value)">
      <option value="propia" ${vistaActual==='propia'?'selected':''}>Mi vista</option>
      <option value="director" ${vistaActual==='director'?'selected':''}>&#127919; Vista director</option>
      ${asesores.map(a=>`<option value="${a.id}" ${vistaActual===a.id?'selected':''}>${a.nombre}${a.rol==='admin'?' · Admin':''}</option>`).join('')}
    </select>
  </div>`;
}

function cambiarVista(val){
  vistaActual = val;
  renderPage(currentPage);
}

function asesorDestinoVista(){
  if(!sesionActiva) return null;
  if(isAdmin()&&vistaActual!=='propia'&&vistaActual!=='director') return vistaActual;
  return sesionActiva.id;
}

function clientesVistaActual(){
  const todos = store.clientes||[];
  if(!sesionActiva) return [];
  if(!isAdmin()||vistaActual==='propia') return todos.filter(c=>c.asesorId===sesionActiva.id);
  if(vistaActual==='director') return todos;
  // Por asesor específico
  return todos.filter(c=>c.asesorId===vistaActual);
}

function leadsVistaActual(){
  const todos=store.leads||[];
  if(!sesionActiva) return [];
  if(!isAdmin()||vistaActual==='propia') return todos.filter(l=>l.asesorId===sesionActiva.id);
  if(vistaActual==='director') return todos;
  return todos.filter(l=>l.asesorId===vistaActual);
}

function eventosVistaActual(){
  const todos=store.agenda||[];
  if(!sesionActiva) return [];
  if(!isAdmin()||vistaActual==='propia') return todos.filter(e=>e.asesorId===sesionActiva.id);
  if(vistaActual==='director') return todos;
  return todos.filter(e=>e.asesorId===vistaActual);
}

function colaboradoresVistaActual(){
  const todos=store.colaboradores||[];
  if(!sesionActiva) return [];
  if(!isAdmin()||vistaActual==='propia') return todos.filter(c=>c.asesorId===sesionActiva.id);
  if(vistaActual==='director') return todos;
  return todos.filter(c=>c.asesorId===vistaActual);
}

// ==================== REORDENAR PESTAÑAS ====================
// Orden default del sidebar (guardado en localStorage)
const NAV_DEFAULT = ['dashboard','leads','clientes','pipeline','contratos','plantillas','agenda','finanzas','servicios','colaboradores','asesores','configuracion'];
let navOrder = [...NAV_DEFAULT];

function loadNavOrder(){
  try{
    const saved = localStorage.getItem('nav_order');
    if(saved){ const o=JSON.parse(saved); if(Array.isArray(o)&&o.length>=6) navOrder=o; }
  }catch(e){}
}

function saveNavOrder(){
  try{ localStorage.setItem('nav_order',JSON.stringify(navOrder)); }catch(e){}
}

function moverPestaña(page, dir){
  const idx = navOrder.indexOf(page);
  if(idx<0) return;
  const newIdx = idx+dir;
  if(newIdx<0||newIdx>=navOrder.length) return;
  [navOrder[idx],navOrder[newIdx]]=[navOrder[newIdx],navOrder[idx]];
  saveNavOrder();
  aplicarOrdenSidebar();
  renderPage('configuracion');
}

function aplicarOrdenSidebar(){
  // Reordenar los nav-item del sidebar según navOrder
  const allNavItems = document.querySelectorAll('.nav-item[data-page]');
  if(!allNavItems.length) return;
  // Crear mapa page -> elemento
  const itemMap={};
  allNavItems.forEach(el=>{ if(el.dataset.page) itemMap[el.dataset.page]=el; });
  // Reordenar dentro de sus secciones respectivas
  // Principal: dashboard, leads, clientes, pipeline
  // Operaciones: contratos, plantillas, agenda, finanzas, colaboradores
  // Administración: servicios, asesores. Cuenta: configuracion.
  const secciones={
    principal:['dashboard','leads','clientes','pipeline'],
    operaciones:['contratos','plantillas','agenda','finanzas','colaboradores'],
    administracion:['servicios','asesores'],
    cuenta:['configuracion'],
  };
  const ordenPorSeccion={principal:[],operaciones:[],administracion:[],cuenta:[]};
  navOrder.forEach(page=>{
    for(const [sec,pages] of Object.entries(secciones)){
      if(pages.includes(page)) ordenPorSeccion[sec].push(page);
    }
  });
  // Aplicar reorden en cada sección
  Object.entries(ordenPorSeccion).forEach(([sec,pages])=>{
    if(!pages.length) return;
    const firstEl = itemMap[pages[0]];
    if(!firstEl) return;
    const parent = firstEl.parentElement;
    pages.forEach(page=>{
      const el=itemMap[page];
      if(el&&parent) parent.appendChild(el);
    });
  });
}

function renderOrdenPestañas(){
  const LABELS={dashboard:'Dashboard',leads:'Prospectos',clientes:'Clientes',pipeline:'Pipeline',contratos:'Contratos',plantillas:'Plantillas',agenda:'Agenda',finanzas:'Finanzas',servicios:'Servicios',colaboradores:'Colaboradores',asesores:'Asesores',configuracion:'Configuración'};
  return navOrder.map((page,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:4px;">
      <span style="flex:1;font-size:13px;">${LABELS[page]||page}</span>
      <button class="btn btn-icon" onclick="moverPestaña('${page}',-1)" ${i===0?'disabled':''} style="font-size:10px;padding:2px 6px;">↑</button>
      <button class="btn btn-icon" onclick="moverPestaña('${page}',1)" ${i===navOrder.length-1?'disabled':''} style="font-size:10px;padding:2px 6px;">↓</button>
    </div>`).join('');
}

// ==================== ESTABILIDAD Y GUARDADO V23 ====================
function activarSeguimientoFormularioCliente(){
  const modal=document.getElementById('modal-cliente'); if(!modal||modal.dataset.dirtyBound==='1') return;
  modal.dataset.dirtyBound='1';
  modal.addEventListener('input',()=>{ if(modal.classList.contains('open')) clienteFormDirty=true; });
  modal.addEventListener('change',()=>{ if(modal.classList.contains('open')) clienteFormDirty=true; });
}

function guardarCambiosPerfil(){
  saveStore(); perfilDirty=false; showToast('Cambios del cliente guardados','success');
  if(perfilClienteActivo) openPerfil(perfilClienteActivo);
}

async function supaGuardarCliente(){ saveStore(); return true; }

// Única ruta de acceso efectiva. Evita que las implementaciones antiguas de PIN
// anulen la carga de la sesión y garantiza que Dashboard se pinte al entrar.
async function verificarLoginPin(){
  if(!loginUserSeleccionado) return;
  const pwd=(document.getElementById('login-password-input')?.value||loginPasswordCurrent||'');
  const errEl=document.getElementById('pin-login-error'); if(errEl) errEl.textContent='';
  if(esPrimerAcceso){
    const confirmPwd=document.getElementById('login-password-confirm')?.value||loginPasswordConfirm_v||'';
    if(!passwordValida(pwd)){ if(errEl) errEl.textContent='La contraseña no cumple todos los requisitos'; return; }
    if(pwd!==confirmPwd){ if(errEl) errEl.textContent='Las contraseñas no coinciden'; return; }
    const hash=simpleHash(pwd); loginUserSeleccionado.pin=hash;
    const a=store.asesores.find(x=>x.id===loginUserSeleccionado.id); if(a) a.pin=hash;
    saveStore();
  } else {
    if(!pwd){ if(errEl) errEl.textContent='Ingresa tu contraseña'; return; }
    const valido=await verificarPin(loginUserSeleccionado,pwd);
    if(!valido){ if(errEl) errEl.textContent='Contraseña incorrecta. Intenta de nuevo.'; const inp=document.getElementById('login-password-input'); if(inp){inp.value='';inp.focus();} return; }
  }
  sesionActiva={...loginUserSeleccionado}; currentPage='dashboard';
  document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));
  const loginScreen=document.getElementById('login-screen'); const main=document.querySelector('.main'); const sidebar=document.getElementById('main-sidebar');
  if(loginScreen) loginScreen.style.display='none'; if(main) main.style.display='flex'; if(sidebar) sidebar.style.display='flex';
  actualizarSidebarSesion(); updateRolUI(); aplicarOrdenSidebar(); procesarRecontactosLeads();
  const nav=document.querySelector('[data-page="dashboard"]');
  navigate('dashboard',nav);
  requestAnimationFrame(()=>{ renderPage('dashboard'); const content=document.getElementById('main-content'); if(content) content.scrollTop=0; });
  iniciarRecordatorioEventos(); initSidebarState();
}
