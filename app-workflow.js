/* Daily workflow and technical administration. Loaded after the cloud adapter. */
let technicalBootstrapMode=false;
let leadOrder={};
let archiveCollapsed={};
let leadEligibilityDraft={};
let leadEligibilityService='';
const AFORE_OPTIONS=['Azteca','Banamex','Inbursa','Invercap','PensionISSSTE','Principal','Profuturo','SURA','XXI Banorte'];
const esc=v=>escapeHTMLBasico(String(v??''));
function canBootstrapTechnicalAdmin(){
  const profiles=(store.asesores||[]).filter(a=>a.cloudUser&&a.activo!==false);
  const first=profiles.filter(a=>a.rol==='admin').sort((a,b)=>String(a.fechaAlta).localeCompare(String(b.fechaAlta))||a.id.localeCompare(b.id))[0];
  return Boolean(sesionActiva&&first?.id===sesionActiva.id&&!profiles.some(a=>a.rol==='tech_admin'));
}
function renderMiCuenta(){
  const a=sesionActiva;
  if(!a) return '';
  return `<div class="section-title">Mi cuenta</div><div class="section-sub">Tu foto de perfil y tu acceso al CRM</div>
  <div class="card account-card"><div class="card-body"><div class="account-profile"><div class="account-photo">${a.foto?`<img src="${esc(a.foto)}" alt="Tu foto de perfil">`:esc(initials(a.nombre))}</div><div><strong>${esc(a.nombre)}</strong><p>${esc(a.email)}</p><span>${isTechnicalAdmin()?'Administrador técnico':a.rol==='admin'?'Administrador':'Asesor'}</span></div></div>
  <label class="btn" for="account-photo-file">Cambiar foto</label><input id="account-photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="guardarMiFoto(this)"><button class="btn" onclick="quitarMiFoto()" ${a.foto?'':'disabled'}>Quitar foto</button><p class="form-helper">JPG, PNG o WebP, hasta 5 MB.</p></div></div>
  ${renderCardAcceso()}
  ${canBootstrapTechnicalAdmin()?`<div class="card"><div class="card-header"><div class="card-title">Cuenta de administrador técnico</div></div><div class="card-body"><p>Crea una cuenta independiente para gestionar usuarios y configuración. Tu cuenta actual conservará la operación y la vista Director.</p><button class="btn btn-primary" onclick="abrirAltaTecnica()">Crear cuenta técnica</button><p class="form-helper">Este paso aparece únicamente en tu cuenta inicial y se retira al crear la cuenta técnica.</p></div></div>`:''}`;
}
function abrirAltaTecnica(){
  if(!canBootstrapTechnicalAdmin()) return;
  openModalAsesor();technicalBootstrapMode=true;
  document.getElementById('modal-asesor-title').textContent='Crear administrador técnico';
  setVal('as-nombres','Administrador');setVal('as-apellidos','Técnico');setVal('as-rol','tech_admin');
  document.getElementById('as-rol').disabled=true;setVal('as-activo','true');document.getElementById('as-activo').disabled=true;
  document.getElementById('asesor-foto-preview').parentElement.hidden=true;
}
async function guardarMiFoto(input){
  const file=input.files?.[0];if(!file||!sesionActiva) return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){input.value='';return showToast('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB','warn');}
  const userId=sesionActiva.id;
  try{
    const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');
    canvas.width=canvas.height=400;const side=Math.min(bitmap.width,bitmap.height);
    canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,400,400);bitmap.close();
    const path=`${CA_ORG_ID}/${userId}/avatar.jpg`;
    await cloudUploadDataUrl('crm-avatars',path,canvas.toDataURL('image/jpeg',0.9));
    const {error}=await supabaseClient.from('profiles').update({photo_path:path}).eq('id',userId);if(error) throw error;
    const foto=await cloudSignedAvatar(path);
    Object.assign(sesionActiva,{foto,fotoPath:path});Object.assign(store.asesores.find(a=>a.id===userId)||{},{foto,fotoPath:path});
    actualizarSidebarSesion();renderPage('cuenta');showToast('Foto de perfil actualizada','success');
  }catch(e){showToast('No se pudo guardar la foto: '+e.message,'warn');}
}
async function quitarMiFoto(){
  if(!sesionActiva) return;
  const {error}=await supabaseClient.from('profiles').update({photo_path:null}).eq('id',sesionActiva.id);
  if(error) return showToast('No se pudo quitar la foto: '+error.message,'warn');
  Object.assign(sesionActiva,{foto:'',fotoPath:''});Object.assign(store.asesores.find(a=>a.id===sesionActiva.id)||{},{foto:'',fotoPath:''});
  actualizarSidebarSesion();renderPage('cuenta');showToast('Foto de perfil retirada','success');
}
const originalSidebarSesion=actualizarSidebarSesion;
actualizarSidebarSesion=function(){originalSidebarSesion();updateRolUI();};
updateRolUI=function(){
  if(!sesionActiva) return;
  const admin=document.getElementById('nav-admin-section');if(admin) admin.hidden=!isAdmin();
  if(admin) admin.style.display=isAdmin()?'':'none';
  const svc=document.querySelector('[data-page="servicios"]');if(svc)svc.hidden=!isTechnicalAdmin();
  const cfg=document.querySelector('[data-page="configuracion"]');if(cfg) cfg.hidden=!isTechnicalAdmin();
  const badge=document.getElementById('sidebar-rol-badge');if(badge) badge.textContent=isTechnicalAdmin()?'Admin técnico':sesionActiva.rol==='admin'?'Admin':'Asesor';
};
const originalOpenAsesor=openModalAsesor;
openModalAsesor=function(id){
  if(!isAdmin()&&!canBootstrapTechnicalAdmin()) return showToast('Acceso reservado al administrador técnico','warn');
  technicalBootstrapMode=false;originalOpenAsesor(id);document.getElementById('as-rol').disabled=false;document.getElementById('as-activo').disabled=false;document.getElementById('asesor-foto-preview').parentElement.hidden=false;
};
const originalActualizarLogo=actualizarLogoSidebar;
actualizarLogoSidebar=function(){originalActualizarLogo();if(!store.configuracion.logo_empresa){const el=document.getElementById('login-logo-wrap');if(el) el.innerHTML='<img src="/assets/brand/cya-logo-dark.svg?v=20260919-brand-clean1" alt="Casillas & Asociados" style="width:100%;height:100%;object-fit:contain;background:transparent;">';}};
function inputFecha(id,value,label,required=false){return `<div class="form-group"><label class="form-label" for="${id}">${label}</label><input class="form-input input-fecha-mx" id="${id}" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="off" value="${esc(fechaISOaMX(value||''))}" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)" ${required?'required':''}></div>`;}
function fechaRegistroISO(value){const d=parseFechaFlexible(value);return d?fechaISOLocal(d):'';}
function prepararFechasCliente(c){
  document.getElementById('client-real-dates')?.remove();document.getElementById('client-afore-fields')?.remove();
  const el=document.getElementById('tab-datos-extra');
  el.insertAdjacentHTML('afterbegin',`<div id="client-real-dates"><div class="form-section">Fechas del expediente</div><div class="form-row">${inputFecha('fc-fecha-registro',fechaRegistroISO(c?.fechaRegistro)||fechaISOLocal(new Date()),'Fecha de registro',true)}${inputFecha('fc-fecha-firma',c?.fechaFirmaContrato,'Fecha real de firma')}</div><p class="form-helper">${c?.fechaCaptura?'Captura en el sistema: '+esc(fmtDateTime(c.fechaCaptura))+'. ':''}Las fechas reales pueden corregirse; los cambios quedan registrados en el historial.</p></div>`);
  const cita=document.getElementById('fc-fecha-biometrica')?.closest('.form-row');
  const html=`<div id="client-afore-fields" class="form-row">${inputFecha('fc-fecha-alta',c?.fechaAltaAfore,'Fecha real de Dado de alta')}<div class="form-group"><label class="form-label" for="fc-afore">AFORE</label><select class="form-select" id="fc-afore"><option value="">— Seleccionar —</option>${[...new Set([...AFORE_OPTIONS,...(c?.afore?[c.afore]:[])])].map(n=>`<option ${c?.afore===n?'selected':''}>${esc(n)}</option>`).join('')}</select></div></div>`;
  if(cita) cita.insertAdjacentHTML('beforebegin',html);else el.insertAdjacentHTML('beforeend',html);
}
const originalNewClient=openModalCliente;
openModalCliente=function(id){originalNewClient(id);prepararFechasCliente(null);};
const originalEditClient=editCliente;
editCliente=function(id){originalEditClient(id);prepararFechasCliente(store.clientes.find(c=>c.id===id));};
function prepararFechasProspecto(l){
  document.getElementById('lead-registration-wrap')?.remove();
  const e=document.getElementById('lead-nombre')?.closest('.form-row')||document.getElementById('lead-nombre')?.closest('.form-group');
  e?.insertAdjacentHTML('beforebegin',`<div id="lead-registration-wrap">${inputFecha('lead-fecha-registro',fechaRegistroISO(l?.fechaRegistro||l?.fechaInicio)||fechaISOLocal(new Date()),'Fecha de registro',true)}</div>`);
}
function registrarCambioFecha(c,campo,anterior,nueva,label){
  if(fechaRegistroISO(anterior)===fechaRegistroISO(nueva)) return;
  addHist(c,'fecha',`${label}: ${anterior?fmtDate(anterior):'Sin fecha'} → ${nueva?fmtDate(nueva):'Sin fecha'}`);
}
function leerFechasCliente(){
  const out={};const hoy=fechaISOLocal(new Date());
  for(const [id,key] of [['fc-fecha-registro','fechaRegistro'],['fc-fecha-alta','fechaAltaAfore'],['fc-fecha-firma','fechaFirmaContrato']]){
    const v=leerFechaMX(id);if(v===null) return null;
    if(v>hoy){showToast('La fecha real no puede estar en el futuro','warn');return null;}out[key]=v;
  }
  if(!out.fechaRegistro){showToast('Registra la fecha de alta del expediente','warn');return null;}
  return out;
}
function sumarDiasISO(fecha,dias){const d=parseFechaFlexible(fecha);if(!d) return '';d.setDate(d.getDate()+dias);return fechaISOLocal(d);}
function sumarMesesISO(fecha,meses){
  const d=parseFechaFlexible(fecha);if(!d)return '';
  const dia=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+meses);
  d.setDate(Math.min(dia,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  return fechaISOLocal(d);
}
function sincronizarFechasCliente(c,anterior){
  for(const [key,label] of [['fechaRegistro','Registro'],['fechaAltaAfore','Dado de alta'],['fechaFirmaContrato','Firma']]) registrarCambioFecha(c,key,anterior?.[key],c[key],label);
  if(c.fechaAltaAfore){
    if(!c.fechaRetiroEstimadaManual) c.fechaRetiroEstimada=sumarDiasISO(c.fechaAltaAfore,45);
    agendarRecordatorio45(c);
  }
}
agendarRecordatorio45=function(c){
  if(c.servicio!=='retiro_desempleo'||!c.fechaAltaAfore) return;
  const fecha=sumarDiasISO(c.fechaAltaAfore,45);if(!fecha) return;
  const matches=(store.agenda||[]).filter(e=>e.clienteId===c.id&&e.autoGenerado&&e.tipo==='vencimiento'&&(e.regla==='solicitud_45'||/^Solicitud AFORE/.test(e.titulo||''))&&!e.completado);
  const data={titulo:'Solicitud AFORE — '+c.nombre,tipo:'vencimiento',fecha,hora:'09:00',notas:'Seguimiento operativo a 45 días desde Dado de alta. Verificar requisitos del trámite.',clienteId:c.id,asesorId:c.asesorId||sesionActiva?.id||null,completado:false,cancelarRecordatorio:false,autoGenerado:true,regla:'solicitud_45'};
  if(matches.length){Object.assign(matches[0],data);const duplicates=new Set(matches.slice(1).map(e=>e.id));store.agenda=store.agenda.filter(e=>!duplicates.has(e.id));}
  else {
    const after=stagesFor(c.servicio).findIndex(s=>s.id===c.etapa)>=stagesFor(c.servicio).findIndex(s=>s.id==='solicitud_realizada');
    if(after) return;
    store.agenda.push({id:'ev_solicitud45_'+c.id,...data});
  }
};
function fechaSolicitudCliente(c){return c.fechaSolicitudManual||c.fechaSolicitudRealizada||'';}
function ordenarProspectos(items,estado){const factor=leadOrder[estado]==='desc'?-1:1;return items.slice().sort((a,b)=>factor*String(a.fechaRegistro||a.fechaInicio||'').localeCompare(String(b.fechaRegistro||b.fechaInicio||''))||String(a.id).localeCompare(String(b.id)));}
function alternarOrdenProspectos(estado){leadOrder[estado]=leadOrder[estado]==='desc'?'asc':'desc';renderPage('leads');}
function archiveGroupKey(l){return l.archivoTipo==='temporal'?'temporal':'causa:'+String(l.causaArchivo||'Sin causa especificada');}
function toggleArchiveGroup(key){archiveCollapsed[key]=!archiveCollapsed[key];renderPage('leads');}
function archiveButton(key,title,n){return `<button class="archive-toggle" data-group="${esc(key)}" onclick="toggleArchiveGroup(this.dataset.group)" aria-expanded="${!archiveCollapsed[key]}"><span>${archiveCollapsed[key]?'▸':'▾'} ${esc(title)}</span><span>${n}</span></button>`;}
function renderGrupoArchivados(titulo,items,temporal){
  const key=temporal?'temporal':'definitivos';
  const sorted=items.slice().sort((a,b)=>String(a.fechaRecontacto||'9999').localeCompare(String(b.fechaRecontacto||'9999'))||String(a.id).localeCompare(String(b.id)));
  return `<div class="archivado-grupo">${archiveButton(key,titulo,items.length)}<div class="archivado-lista" ${archiveCollapsed[key]?'hidden':''}>${sorted.length?sorted.map(l=>renderTarjetaArchivado(l,temporal)).join(''):'<p class="form-helper">Sin prospectos</p>'}</div></div>`;
}
function renderArchivadosPorCausa(items){
  const groups={};for(const l of items){const k=l.causaArchivo||'Sin causa especificada';(groups[k]||=[]).push(l);}
  return `<div class="archivado-grupo">${archiveButton('definitivos','Archivados definitivos',items.length)}<div class="archivado-causas-grid" ${archiveCollapsed.definitivos?'hidden':''}>${Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([title,ls])=>`<div class="archivado-causa-col">${archiveButton('causa:'+title,title,ls.length)}<div class="archivado-causa-list" ${archiveCollapsed['causa:'+title]?'hidden':''}>${ls.slice().reverse().map(l=>renderTarjetaArchivado(l,false)).join('')}</div></div>`).join('')||'<p class="form-helper">Sin prospectos</p>'}</div></div>`;
}
procesarRecontactosLeads=function(){
  const hoy=fechaISOLocal(new Date());
  for(const l of store.leads||[]){if(l.estado==='archivado'&&l.archivoTipo==='temporal'){l.recontactar=Boolean(l.fechaRecontacto&&l.fechaRecontacto<=hoy);l.recontactoVencido=Boolean(l.fechaRecontacto&&l.fechaRecontacto<hoy);}}
};
function triSelect(id,label,value){return `<div class="form-group"><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" onchange="actualizarElegibilidadInicial()"><option value="">Por verificar</option><option value="si" ${value==='si'?'selected':''}>Sí</option><option value="no" ${value==='no'?'selected':''}>No</option></select></div>`;}
function guardarBorradorElegibilidad(){
  if(!leadEligibilityService) return;
  const current=leerElegibilidadActual();leadEligibilityDraft.porServicio||={};leadEligibilityDraft.porServicio[leadEligibilityService]=current;
}
function leerElegibilidadActual(){
  const old=leadEligibilityDraft.porServicio?.[leadEligibilityService]||{};
  return {...old,semanas:getVal('lead-el-semanas'),cotizaImss:getVal('lead-el-cotiza'),conservacionDerechos:getVal('lead-el-conservacion'),fechaNacimiento:fechaMXaISO(getVal('lead-el-fecha-nac')),primeraCotizacion:fechaMXaISO(getVal('lead-el-primera-cotizacion')),ley:getVal('lead-el-ley'),retiro5:getVal('lead-el-retiro'),fechaRetiro:fechaMXaISO(getVal('lead-el-fecha-retiro')),notas:getVal('lead-el-notas')};
}
function recogerElegibilidadLead(){guardarBorradorElegibilidad();return {...leadEligibilityDraft,...leerElegibilidadActual(),porServicio:{...leadEligibilityDraft.porServicio},criteriosVersion:2};}
function renderLeadElegibilidad(existing={}){
  const el=document.getElementById('lead-elegibilidad-container');if(!el) return;
  const svc=getVal('lead-servicio');const e=existing.porServicio?.[svc]||existing;
  let html='';
  if(svc==='retiro_desempleo'){
    html=`<div class="form-row"><div class="form-group"><label class="form-label">Semanas cotizadas (criterio inicial: mínimo 105)</label><input class="form-input" id="lead-el-semanas" type="number" min="0" step="1" value="${esc(e.semanas)}" oninput="actualizarElegibilidadInicial()"></div>${triSelect('lead-el-cotiza','¿Cotiza actualmente ante el IMSS?',e.cotizaImss)}</div><div class="form-row">${triSelect('lead-el-retiro','¿Retiró en los últimos 5 años?',e.retiro5)}${inputFecha('lead-el-fecha-retiro',e.fechaRetiro,'Fecha del último retiro, si se conoce')}</div>`;
  }else if(svc==='asesoria_pension'){
    html=`<div class="form-row">${inputFecha('lead-el-fecha-nac',e.fechaNacimiento||extraerFechaCurp(getVal('lead-curp')),'Fecha de nacimiento · desde CURP')}<div class="form-group"><label class="form-label">Semanas cotizadas</label><input class="form-input" id="lead-el-semanas" type="number" min="0" step="1" value="${esc(e.semanas)}" oninput="actualizarElegibilidadInicial()"></div></div><div class="form-row">${inputFecha('lead-el-primera-cotizacion',e.primeraCotizacion,'Fecha de primera cotización al IMSS')}<div class="form-group"><label class="form-label">Régimen verificado</label><select class="form-select" id="lead-el-ley" onchange="actualizarElegibilidadInicial()"><option value="">Por verificar</option><option value="73" ${e.ley==='73'?'selected':''}>Ley 73 · régimen de transición</option><option value="97" ${e.ley==='97'?'selected':''}>Ley 97</option></select></div></div>${triSelect('lead-el-conservacion','¿Cuenta con conservación de derechos?',e.conservacionDerechos)}<p class="form-helper">La CURP permite obtener la edad. Verifica la primera cotización en la constancia del IMSS para identificar el régimen. El filtro de asesoría comienza a los 58 años; no confirma el derecho a pensionarse.</p>`;
  }else{
    const label=svc==='correccion_imss'?'Datos o documentos que requieren corrección':svc==='seguro_social'?'Necesidad de cobertura y situación actual':svc==='ppr'?'Objetivo de retiro y capacidad de aportación':'Observaciones del servicio';
    html=`<div class="form-group"><label class="form-label">${label}</label><textarea class="form-textarea" id="lead-el-notas">${esc(e.notas)}</textarea></div><p class="form-helper">Evaluación por el asesor. Este servicio no utiliza los criterios de retiro por desempleo.</p>`;
  }
  el.innerHTML=html+'<div id="lead-initial-criteria" class="initial-criteria" aria-live="polite"></div>';
  el.querySelectorAll('.input-fecha-mx').forEach(input=>input.addEventListener('input',()=>{if(input.id==='lead-el-primera-cotizacion'){const f=fechaMXaISO(input.value);if(f)setVal('lead-el-ley',f<'1997-07-01'?'73':'97');}actualizarElegibilidadInicial();}));
  actualizarElegibilidadInicial();
}
function actualizarNacimientoDesdeCurp(){
  const input=document.getElementById('lead-el-fecha-nac');
  if(input){input.value=fechaISOaMX(extraerFechaCurp(getVal('lead-curp'))||'');actualizarElegibilidadInicial();}
}
function edadEnFecha(fecha,hoy=fechaISOLocal(new Date())){if(!fecha||fecha>hoy)return null;let edad=Number(hoy.slice(0,4))-Number(fecha.slice(0,4));if(hoy.slice(5)<fecha.slice(5))edad--;return edad;}
function evaluarCriteriosIniciales(svc,e,hoy=fechaISOLocal(new Date())){
  const n=Number(e.semanas);const entero=e.semanas!==''&&e.semanas!=null&&Number.isInteger(n)&&n>=0;
  if(svc==='retiro_desempleo'){
    const alertas=[];
    if(entero&&n<105)alertas.push({tono:'amarillo',texto:'No cuenta con las 105 semanas requeridas; revisar primero el saldo en AFORE.'});
    if(e.cotizaImss==='si')alertas.push({tono:'rojo',texto:'Servicio de IMSS activo; recontactar en una semana y verificar la baja.'});
    let retiroCumple=e.retiro5==='no';
    let fechaRecontacto='';
    if(e.retiro5==='si'||e.fechaRetiro){
      retiroCumple=false;
      if(!e.fechaRetiro)alertas.push({tono:'amarillo',texto:'Cambiar a REVISIÓN DE SINDOS y verificar la fecha del último retiro.'});
      else{
        const cinco=sumarMesesISO(e.fechaRetiro,60),inicio=sumarMesesISO(e.fechaRetiro,59);
        if(hoy>=cinco)retiroCumple=true;
        else if(hoy>=inicio)alertas.push({tono:'amarillo',texto:'No cumple todavía los 5 años, pero puede comenzar el trámite. Cumple 5 años el '+fmtDate(cinco)+'.'});
        else{fechaRecontacto=inicio;alertas.push({tono:'rojo',texto:'No elegible por el momento. Archivar y contactar a partir del '+fmtDate(inicio)+'.'});}
      }
    }
    const cumple=entero&&n>=105&&e.cotizaImss==='no'&&retiroCumple;
    if(cumple)alertas.push({tono:'verde',texto:'Cumple criterios iniciales.'});
    return {cumple,alertas,fechaRecontacto,detalle:alertas.map(a=>a.texto).join(' ')};
  }
  if(svc==='asesoria_pension'){
    const edad=edadEnFecha(e.fechaNacimiento,hoy);const min97=Math.min(1000,750+Math.max(0,Number(hoy.slice(0,4))-2021)*25);const minimo=e.ley==='73'?500:min97;
    const coherente=!e.primeraCotizacion||(e.primeraCotizacion<=hoy&&e.primeraCotizacion>=(e.fechaNacimiento||'')&&(e.ley==='73'?e.primeraCotizacion<'1997-07-01':e.primeraCotizacion>='1997-07-01'));
    return {cumple:['73','97'].includes(e.ley)&&coherente&&entero&&n>=minimo&&edad!==null&&edad>=58&&(e.ley!=='73'||e.conservacionDerechos==='si'),detalle:`Filtro inicial de asesoría: 58 años o más; ${e.ley==='73'?'500 semanas y conservación de derechos':e.ley==='97'?min97+' semanas para Ley 97 en '+hoy.slice(0,4):'régimen pendiente de verificar'}. La edad y los requisitos para solicitar pensión se revisan por separado.`};
  }
  return {cumple:false,detalle:'Revisión individual por el asesor.'};
}
function actualizarElegibilidadInicial(){
  const el=document.getElementById('lead-initial-criteria');if(!el)return;
  const r=evaluarCriteriosIniciales(getVal('lead-servicio'),leerElegibilidadActual());
  if(Array.isArray(r.alertas)){
    el.className='initial-criteria';
    el.innerHTML=r.alertas.map(a=>`<div class="criteria-alert criteria-${a.tono}"><strong>${a.tono==='verde'?'✓ ':a.tono==='rojo'?'● ':'⚠ '}${esc(a.texto)}</strong></div>`).join('')||'<div class="form-helper">Completa los datos para evaluar los criterios iniciales.</div>';
  }else{
    el.classList.toggle('criteria-ok',r.cumple);el.innerHTML=`<strong>${r.cumple?'✓ Cumple criterios iniciales':'Por revisar'}</strong><div class="form-helper">${esc(r.detalle)}</div>`;
  }
}
function validarFechasElegibilidad(){
  const hoy=fechaISOLocal(new Date());for(const id of ['lead-el-fecha-nac','lead-el-primera-cotizacion','lead-el-fecha-retiro']){if(!document.getElementById(id))continue;const f=leerFechaMX(id);if(f===null)return false;if(f>hoy){showToast('Revisa las fechas de elegibilidad: no pueden ser futuras','warn');return false;}}
  return true;
}
let firmaDialogResolver=null;
function confirmarFirmaCliente(c,solicitarFecha=true){
  return new Promise(resolve=>{
    document.getElementById('modal-confirmar-firma')?.remove();firmaDialogResolver=resolve;
    const id='modal-confirmar-firma';
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="${id}"><div class="modal"><div class="modal-header"><div class="modal-title">${solicitarFecha?'Confirmar contrato firmado':'Confirmar avance con firma pendiente'}</div></div><div class="modal-body"><p><strong>${esc(c.nombre)}</strong></p><p>${solicitarFecha?'Confirmo que verifiqué que el contrato de este cliente está firmado.':'El contrato continúa pendiente de firma. Confirmo el avance y asumo el seguimiento de la firma.'}</p><p>Responsable: <strong>${esc(sesionActiva?.nombre)}</strong></p>${solicitarFecha?inputFecha('confirmacion-firma-fecha',c.fechaFirmaContrato||fechaISOLocal(new Date()),'Fecha real de firma',true):''}<div class="form-group"><label class="form-label">Observación (opcional)</label><input class="form-input" id="confirmacion-firma-nota"></div><div class="modal-footer"><button class="btn" onclick="resolverConfirmacionFirma(false)">Cancelar</button><button class="btn btn-primary" onclick="resolverConfirmacionFirma(true,${solicitarFecha})">${solicitarFecha?'Confirmar firma':'Confirmar avance'}</button></div></div></div></div>`);
  });
}
function resolverConfirmacionFirma(ok,conFecha){
  let fecha='';if(ok&&conFecha){fecha=leerFechaMX('confirmacion-firma-fecha');if(!fecha||fecha>fechaISOLocal(new Date()))return showToast('Registra una fecha real de firma válida','warn');}
  const result=ok?{fecha,nota:getVal('confirmacion-firma-nota'),usuarioId:sesionActiva?.id,usuario:sesionActiva?.nombre,registradaEn:new Date().toISOString()}:null;
  document.getElementById('modal-confirmar-firma')?.remove();const resolve=firmaDialogResolver;firmaDialogResolver=null;resolve?.(result);
}
function aplicarConfirmacionFirma(c,data){c.contratoFirmado=true;c.fechaFirmaContrato=data.fecha;c.firmaConfirmadaPor=data.usuario;c.firmaConfirmadaPorId=data.usuarioId;c.firmaConfirmadaEn=data.registradaEn;addHist(c,'contrato','Firma verificada por '+data.usuario+(data.nota?' · '+data.nota:''));}
avanzarEtapa=async function(id){
  const original=store.clientes.find(c=>c.id===id);if(!original)return;
  const c=JSON.parse(JSON.stringify(original));const stages=stagesFor(c.servicio);const index=stages.findIndex(s=>s.id===c.etapa);const next=stages[index+1];if(!next)return;
  if(next.id==='afore_actualizada'&&!c.fechaBiometrica)return showToast('Registra la fecha de cita AFORE antes de avanzar','warn');
  if(next.id==='contrato_firmado'){
    const firma=await confirmarFirmaCliente(c);if(!firma)return;aplicarConfirmacionFirma(c,firma);
  }else if(c.servicio==='retiro_desempleo'&&index>=2&&!c.contratoFirmado){
    const confirmation=await confirmarFirmaCliente(c,false);if(!confirmation)return;
    addHist(c,'contrato','Avance con firma pendiente confirmado por '+confirmation.usuario+(confirmation.nota?' · '+confirmation.nota:''));
  }
  if(next.id==='honorarios_recibidos'){mostrarPopupCierre(id);return;}
  if(next.id==='dado_alta')c.fechaAltaAfore||=fechaISOLocal(new Date());
  if(next.id==='solicitud_realizada')c.fechaSolicitudRealizada||=c.fechaSolicitudManual||fechaISOLocal(new Date());
  if(next.id==='deposito_recibido'&&c.montoAfore&&!c.estadoPago){const calc=calcComision(Number(c.montoAfore),c.servicio,c.asesorId);if(!tieneMontoFinanciero(c.honorarios))c.honorarios=calc.honorarios;if(!tieneMontoFinanciero(c.comision))c.comision=calc.comision;c.comisionCalc=calc.comision;c.estadoPago='Pendiente';}
  c.etapa=next.id;addHist(c,'etapa','Avanzó a: '+next.label);
  const agendaBefore=JSON.parse(JSON.stringify(store.agenda));sincronizarFechasCliente(c,original);
  const pos=store.clientes.indexOf(original);store.clientes[pos]=c;
  try{await cloudSyncNow({throwOnError:true});closeModal('modal-perfil');renderPage(currentPage);showToast('Etapa: '+next.label,'success');}
  catch(e){showToast('Avance pendiente de guardar. Conservamos el cambio para reintentar.','warn');}
};
guardarFechaFirma=async function(id,fecha){
  const c=store.clientes.find(x=>x.id===id);if(!c)return;
  const f=fechaMXaISO(fecha);if(!f||f>fechaISOLocal(new Date()))return showToast('Fecha de firma inválida','warn');
  const before=c.fechaFirmaContrato;const historyBefore=JSON.parse(JSON.stringify(c.historial||[]));c.fechaFirmaContrato=f;registrarCambioFecha(c,'fechaFirmaContrato',before,f,'Firma');
  try{await cloudSyncNow({throwOnError:true});showToast('Fecha de firma guardada','success');}catch(e){showToast('Fecha pendiente de guardar. Conservamos el cambio para reintentar.','warn');}
};
