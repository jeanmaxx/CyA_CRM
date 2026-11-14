/* Expediente híbrido de clientes, etapa 3. No cambia reglas de negocio. */
(function(){
'use strict';
if(window.__cyaHybridClientInstalled)return;
window.__cyaHybridClientInstalled=true;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const field=(v,empty='Pendiente')=>String(v??'').trim()||empty;
const items=[
['contratos','Contratos','▤','pd-contratos'],['identidad','Identidad y contacto','♙','pd-contacto'],
['previsional','Información previsional','▣','pd-datos'],['afore','AFORE','▦','pd-cita-afore'],
['banco','Banco','▥','pd-datos'],['finanzas','Finanzas','▤','pd-finanzas'],
['comisiones','Comisiones','♧',null],['notas','Notas','▧',null],['historial','Historial','◷','pd-historial']
];
const getClient=()=>typeof store==='undefined'?null:(store.clientes||[]).find(c=>String(c.id)===String(typeof perfilClienteActivo==='undefined'?'':perfilClienteActivo));
const getAdvisor=c=>typeof store==='undefined'?null:(store.asesores||[]).find(a=>String(a.id)===String(c.asesorId));
const getCollaborator=c=>typeof store==='undefined'?null:(store.colaboradores||[]).find(a=>String(a.id)===String(c.colaboradorId));

const canAccessClient=c=>{
 if(!c)return false;
 if(typeof sesionActiva==='undefined')return true; // isolated regression harnesses
 if(!sesionActiva?.id)return false;
 if(typeof isAdmin==='function'&&isAdmin())return true;
 return String(c.asesorId||'')===String(sesionActiva.id);
};

const signed=c=>c.contratoFirmado===true||c.etapasOperativasV2?.firmado?.done===true||['contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(c.etapa);
const order=c=>signed(c)?[...items.slice(1,6),items[6],items[0],items[7],items[8]]:items;
const format=d=>{if(!d)return 'Por confirmar';const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?m[3]+'/'+m[2]+'/'+m[1]:String(d)};
const plusBusiness=(d)=>{
 const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return '';
 let x=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])),n=0;
 while(n<2){x.setUTCDate(x.getUTCDate()+1);if(x.getUTCDay()!==0&&x.getUTCDay()!==6)n++;}
 return x.toISOString().slice(0,10);
};
const summary=(c,id)=>{
 switch(id){
 case 'contratos':return 'Documentos y firmas';
 case 'identidad':return 'Datos personales';
 case 'previsional':return 'NSS · IMSS · Semanas';
 case 'afore':return field(c.afore,'AFORE')+' · Citas y trámites';
 case 'banco':return 'Cuenta y CLABE';
 case 'finanzas':return 'Retiros y cobros';
 case 'comisiones':return 'Asesor y colaborador';
 case 'notas':return 'Seguimiento y pendientes';
 case 'historial':return 'Movimientos registrados';
 }return '';
};
// Read-only header for the next operational step. The milestone engine remains
// canonical; Agenda and its existing SLA may add an urgency color and a link.
// Never manufacture a priority or overwrite dates, stages or financial fields.
const NEXT_LABELS={contrato:'Contrato',firmas:'Firmas',firmado:'Firmado',alta:'Alta',app:'AFORE móvil',banco_n4:'Banco N4',cita:'Cita AFORE',documentos:'Documentos',expediente:'Expediente actualizado',solicitud:'Solicitud',deposito:'Depósito',honorarios:'Honorarios'};
const STEP_EVENT_RULES={contrato:['flujo_generar_contrato'],firmas:['flujo_enviar_firma'],firmado:['flujo_confirmar_firma'],alta:['flujo_confirmar_alta'],app:['flujo_afore_movil'],banco_n4:['flujo_banco_n4'],cita:['cita_afore'],documentos:['flujo_documentos'],expediente:['flujo_expediente'],solicitud:['flujo_solicitud'],deposito:['flujo_deposito'],honorarios:['flujo_honorarios']};
const clientNextAction=c=>{
 const stages=c.servicio==='retiro_desempleo'?window.__cyaClientActivitiesV2?.statuses?.(c)||[]:[];
 const next=stages.find(st=>st.state==='future')||stages.find(st=>st.state==='skipped');
 const pending=(typeof store!=='undefined'&&Array.isArray(store.agenda)?store.agenda:[])
  .filter(ev=>String(ev.clienteId||'')===String(c.id)&&!ev.completado&&!ev.cancelarRecordatorio&&ev.fecha)
  .sort((a,b)=>String(a.fecha||'')+' '+String(a.hora||'23:59')>String(b.fecha||'')+' '+String(b.hora||'23:59')?1:-1);
 const matched=next?pending.find(ev=>(STEP_EVENT_RULES[next.id]||[]).includes(ev.regla)):null;
 const event=matched||pending[0]||null;
 const label=matched||!event?next?NEXT_LABELS[next.id]||next.short:'Sin acción pendiente'
  :String(event.titulo||'Seguimiento').trim();
 let tone='neutral',priorityText=event?'Pendiente en Agenda':'Sin prioridad registrada';
 if(event){
  let sla=null;
  if(typeof agendaPrioritariaDashboard==='function'){
   try{sla=agendaPrioritariaDashboard().find(ev=>String(ev.id)===String(event.id))?.seguimientoContrato||null;}catch(_){}
  }
  if(sla?.clave==='en_tiempo'){tone='low';priorityText='EN TIEMPO';}
  else if(sla?.clave==='pendiente'){tone='medium';priorityText='PENDIENTE';}
  else if(sla?.clave==='vencido'){tone='high';priorityText='VENCIDO';}
  else if(['alta','media','baja'].includes(String(event.prioridad||'').toLowerCase())){
   tone={alta:'high',media:'medium',baja:'low'}[String(event.prioridad).toLowerCase()];
   priorityText='PRIORIDAD '+String(event.prioridad).toUpperCase();
  }else{
   // Generic Agenda events do not store a priority; reflect due-date urgency,
   // never present it as a manually assigned priority.
   const date=String(event.fecha||'').slice(0,10),now=new Date();
   const local=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
   if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
    tone=date<local?'high':date===local?'medium':'low';
    priorityText=date<local?'VENCIDO':date===local?'PARA HOY':'PROGRAMADO';
   }
  }
 }
 return {label,tone,priorityText,eventId:event?.id||'',event};
};
const stageTitle=c=>{
 const labels={generando_contrato:'Generando contrato',contrato_firmas:'Contrato en firmas',contrato_firmado:'Contrato firmado',dado_alta:'Dado de alta',afore_actualizada:'AFORE actualizada',solicitud_realizada:'Solicitud realizada',deposito_recibido:'Depósito recibido',honorarios_recibidos:'Honorarios recibidos',concluido:'Concluido'};
 return labels[c.etapa]||(typeof STAGES_RETIRO!=='undefined'?STAGES_RETIRO.find(x=>x.id===c.etapa)?.label:'')||field(c.etapa,'Por confirmar');
};
// Native profile warnings are the source of truth; surface only unresolved
// warnings in the same horizontal strip as the four approved status cards.
const pendingProfileAlerts=body=>{
 if(!body)return [];
 const warnings=[...body.children].filter(el=>
  el.matches('.alerta-firma,.alerta-afore-urgente,.alerta-afore-warning')&&
  !el.classList.contains('alerta-verde')&&!el.classList.contains('alerta-green'));
 const rows=warnings.map(el=>{
  const raw=String(el.textContent||'').replace(/\s+/g,' ').trim().replace(/^[✓✔⚠!\s]+/,'');
  const resolved=/^(contrato firmado|cita confirmada|completad[oa]|realizad[oa]|recibid[oa]|pagad[oa])/i.test(raw);
  const level=el.classList.contains('alerta-roja')||el.classList.contains('alerta-afore-urgente')?'high':'medium';
  el.classList.add('cya-client-native-alert');
  return {text:raw,level,resolved};
 }).filter(a=>a.text&&!a.resolved);
 // Do not hide additional warnings. When there are more than two, keep their
 // full descriptions accessible via title and the merged second alert.
 if(rows.length<=2)return rows;
 return [rows[0],{text:rows.slice(1).map(x=>x.text).join(' · '),level:rows.slice(1).some(x=>x.level==='high')?'high':'medium',more:rows.length-1}];
};
const summaryCards=(c,pending=[])=>{
 const next=clientNextAction(c);
 const solicitud=c.fechaSolicitudManual||c.fechaRetiroEstimada||'';
 const cobro=c.fechaCobroProbable||plusBusiness(c.fechaSolicitudRealizada||c.etapasOperativasV2?.solicitud?.fecha||solicitud);
 const card=(id,title,value)=>'<div class="cya-client-summary-card" data-cya-summary="'+id+'"><small>'+title+'</small><strong>'+esc(value)+'</strong></div>';
 const alerts=pending.slice(0,2).map(a=>
  '<div class="cya-client-pending-alert is-'+(a.level==='high'?'high':'medium')+'" role="status" title="'+esc(a.text)+'">'+
  '<span class="cya-client-pending-symbol" aria-hidden="true">⚠</span><span class="cya-client-alert-text">'+esc(a.text)+'</span></div>'
 ).join('');
 return '<div class="cya-client-summary-grid has-'+Math.min(pending.length,2)+'-alerts" aria-label="Resumen y avisos pendientes del cliente">'+
  card('stage','ETAPA ACTUAL',stageTitle(c))+
  '<'+(next.eventId?'button':'div')+' class="cya-client-summary-card cya-client-next is-'+next.tone+'"'+(next.eventId?' type="button" data-cya-next-event="'+esc(next.eventId)+'" title="Abrir el evento pendiente en Agenda"':'')+'>'+
  '<small>ACCIÓN SIGUIENTE</small><strong>'+esc(next.label)+'</strong><span class="cya-client-next-priority">'+esc(next.priorityText)+'</span></'+(next.eventId?'button':'div')+'>'+
  card('request','SOLICITUD PROBABLE',format(solicitud))+
  card('collection','COBRO PROBABLE',format(cobro))+
  alerts+'</div>';
};

let currentId='',selected='',building=false,previousSigned=null;
function header(c){
 const modal=$('modal-perfil'),copy=modal?.querySelector('.profile-header-copy');if(!copy)return;
 $('perfil-title').textContent='Expediente del cliente';
 // Compact identity line: use the same existing client name and metadata, no
 // independent edit form or duplicate CURP action.
 $('cya-hybrid-copy-curp')?.remove();
 let identity=$('cya-hybrid-client-identity');
 if(!identity){identity=document.createElement('div');identity.id='cya-hybrid-client-identity';identity.className='cya-hybrid-client-identity';copy.insertBefore(identity,$('perfil-sub'));}
 let name=$('cya-hybrid-client-name');
 if(!name){name=document.createElement('strong');name.id='cya-hybrid-client-name';identity.appendChild(name);}
 name.textContent=c.nombre||'Cliente';
 let meta=$('cya-hybrid-client-meta');
 if(!meta){meta=document.createElement('div');meta.id='cya-hybrid-client-meta';meta.className='cya-hybrid-client-meta';}
 if(meta.parentElement!==identity)identity.appendChild(meta);
 meta.innerHTML='<span>'+esc(getAdvisor(c)?.nombre||c.asesorNombre||'Asesor asignado')+'</span><span>'+esc(getCollaborator(c)?.nombre||'Cliente directo')+'</span><span>'+esc(c.fuenteContacto||(typeof FUENTES!=='undefined'?FUENTES[c.fuente]:c.fuente)||'Origen pendiente')+'</span>';
 $('perfil-sub').innerHTML=esc([c.curp||'CURP pendiente',c.telefono||''].filter(Boolean).join(' · '))+
   ' <span class="cya-client-register-label">REGISTRO</span> <strong>'+esc(format(c.fechaRegistro||c.fechaInicio||c.createdAt||''))+'</strong>';
 // The two probable dates now live in the 4-card summary, not repeated beside the header.
 $('cya-hybrid-client-dates')?.remove();
 let agenda=$('cya-hybrid-client-agenda');
 if(!agenda){
  agenda=document.createElement('button');agenda.id='cya-hybrid-client-agenda';agenda.type='button';agenda.className='btn';
  agenda.textContent='Agenda';agenda.title='Crear un evento en Agenda vinculado a este cliente';
  const actions=modal.querySelector('.profile-header-actions');
  actions?.insertBefore(agenda,actions.querySelector('.profile-close'));
 }
 agenda.onclick=()=>{
  if(editorActive&&!confirmSwitch())return;
  if(typeof window.openModalAgenda!=='function')return;
  if(editorActive)stopInlineEditor();
  if(typeof window.closeModal==='function')window.closeModal('modal-perfil');
  window.openModalAgenda(null);
  if(typeof window.selAgCliente==='function')window.selAgCliente(c.id,c.nombre||'');
 };
 let menu=$('cya-hybrid-client-admin');
 if(!menu){
  menu=document.createElement('details');menu.id='cya-hybrid-client-admin';
  menu.innerHTML='<summary aria-label="Administración del expediente" title="Administración del expediente"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.91 1.91-.06-.06A1.65 1.65 0 0 0 16 18.4l-.12.07a1.65 1.65 0 0 0-.88 1.46V20h-3v-.07a1.65 1.65 0 0 0-.88-1.46l-.12-.07a1.65 1.65 0 0 0-1.82.33l-.06.06-1.91-1.91.06-.06A1.65 1.65 0 0 0 7.6 15l-.07-.12A1.65 1.65 0 0 0 6.07 14H6v-3h.07a1.65 1.65 0 0 0 1.46-.88L7.6 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.91-1.91.06.06A1.65 1.65 0 0 0 11 6.6l.12-.07A1.65 1.65 0 0 0 12 5.07V5h3v.07a1.65 1.65 0 0 0 .88 1.46l.12.07a1.65 1.65 0 0 0 1.82-.33l.06-.06 1.91 1.91-.06.06A1.65 1.65 0 0 0 19.4 10l.07.12a1.65 1.65 0 0 0 1.46.88H21v3h-.07a1.65 1.65 0 0 0-1.46.88l-.07.12z"/></svg></summary><div class="cya-hybrid-client-menu"><div id="cya-hybrid-return"></div><button class="btn" id="cya-hybrid-advisor" type="button">Cambiar asesor</button><div id="cya-hybrid-discard"></div><button class="btn cya-hybrid-danger" disabled type="button" title="Pendiente de validación de permisos y dependencias">Eliminar definitivamente</button></div>';
  const actions=modal.querySelector('.profile-header-actions');
  actions?.insertBefore(menu,actions.querySelector('.profile-close'));
 }
 const r=$('perfil-regresar-prospecto-btn'),d=$('perfil-descartar-btn');
 if(r&&!$('cya-hybrid-return').contains(r))$('cya-hybrid-return').appendChild(r);
 if(d&&!$('cya-hybrid-discard').contains(d))$('cya-hybrid-discard').appendChild(d);
 $('cya-hybrid-advisor').onclick=()=>{
  menu.open=false;
  if(typeof sesionActiva!=='undefined'&&['admin','tech_admin'].includes(String(sesionActiva?.rol||''))){
   if(editorActive&&!confirmSwitch())return;
   identityShowAdvisor=true;selected='identidad';selection(c);
   const owner=$('fc-asesor');if(owner){owner.closest('.form-group').hidden=false;owner.focus();}
  }
  else if(typeof window.cyaAbrirSolicitudCambioAsesor==='function')window.cyaAbrirSolicitudCambioAsesor(c.id);
  else $('perfil-edit-btn')?.click();
 };
}

/* Reuse the native client-edit form IN PLACE. No parallel save code or data model. */
const inlineCategories=new Set(['identidad','previsional','afore','banco','comisiones','notas']);
const inlineFields={
 identidad:['fc-nombre','fc-telefono','fc-email','fc-ciudad','fc-curp','fc-domicilio','fc-asesor'],
 previsional:['fc-nss','fc-rfc','el-semanas','el-imss','el-retiro','el-fecha'],
 afore:['fc-afore','fc-fecha-biometrica','fc-hora-afore','fc-sucursal-afore','fc-fecha-solicitud-manual'],
 banco:['fc-banco','fc-nivel-bbva','fc-clabe'],
 comisiones:['fc-colaborador','fc-col-pct','fc-col-comision','fc-honorarios','fc-comision'],
 notas:['fc-notas','fc-prox-tipo','fc-prox-fecha','fc-prox-hora','fc-prox-nota']
};
let editorHome=null,editorActive=false,editorSection='',identityShowAdvisor=false;
let identityPlaces=[],identityCurpRow=null,identityCurpControl=null,identityCurpLabelHTML='';
// Relocate the exact six NATIVE form controls: no duplicate inputs, no parallel
// save model and no mutation of clients. Each original location is restored on
// section change/close so the rest of the CRM still sees its original form.
function restoreIdentityFields(){
 if(identityCurpRow&&identityCurpControl){
  identityCurpRow.parentNode?.insertBefore(identityCurpControl,identityCurpRow);
  identityCurpRow.remove();
 }
 identityCurpRow=null;identityCurpControl=null;
 for(const entry of identityPlaces){
  if(entry.label&&entry.html!==null)entry.label.innerHTML=entry.html;
  if(entry.anchor?.parentNode){entry.anchor.parentNode.insertBefore(entry.group,entry.anchor);entry.anchor.remove();}
 }
 identityPlaces=[];
 $('cya-client-identity-grid')?.remove();
 $('modal-cliente')?.classList.remove('cya-client-identity-active');
}
async function copyCurrentIdentityCurp(button){
 const input=$('fc-curp'),curp=String(input?.value||'').trim();
 if(!curp){if(typeof showToast==='function')showToast('No hay CURP para copiar','warn');return;}
 let copied=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(curp);copied=true;}}catch(_){}
 if(!copied){
  try{
   input.focus();input.select();
   copied=Boolean(document.execCommand?.('copy'));
   input.setSelectionRange?.(curp.length,curp.length);
  }catch(_){}
 }
 if(copied){
  button.setAttribute('aria-label','CURP copiada');
  button.classList.add('copied');
  if(typeof showToast==='function')showToast('CURP copiada','success');
 }else if(typeof showToast==='function')showToast('No se pudo copiar la CURP','warn');
}
function setupIdentityFields(section){
 if(section!=='identidad')return;
 const modal=$('modal-cliente'),body=modal?.querySelector('.modal-body');
 if(!body)return;
 const layouts=[
  [{id:'fc-nombre'}, {id:'fc-curp',label:'CURP'}, {id:'fc-telefono'}],
  [{id:'fc-email'}, {id:'fc-domicilio'}, {id:'fc-ciudad',label:'Ciudad / municipio'}]
 ];
 // Isolated tests or older native forms may not have every input. In that case
 // keep the existing editor unchanged instead of risking partial relocation.
 if(!layouts.every(row=>row.every(spec=>$(spec.id)?.closest('.form-group'))))return;
 restoreIdentityFields();
 const layout=document.createElement('div');
 layout.className='cya-client-identity-grid';layout.id='cya-client-identity-grid';
 for(let rowIndex=0;rowIndex<layouts.length;rowIndex++){
  const row=document.createElement('div');row.className='cya-client-identity-row row-'+(rowIndex+1);
  for(const spec of layouts[rowIndex]){
   const group=$(spec.id).closest('.form-group'),anchor=document.createComment('restore-'+spec.id);
   group.parentNode.insertBefore(anchor,group);
   const label=group.querySelector('.form-label'),html=label?.innerHTML??null;
   identityPlaces.push({group,anchor,label,html});
   group.hidden=false;
   if(spec.label&&label)label.textContent=spec.label;
   row.appendChild(group);
  }
  layout.appendChild(row);
 }
 if(identityShowAdvisor){
  const owner=$('fc-asesor'),group=owner?.closest('.form-group');
  if(group){
   const anchor=document.createComment('restore-fc-asesor');
   group.parentNode.insertBefore(anchor,group);
   identityPlaces.push({group,anchor,label:null,html:null});
   group.hidden=false;
   const row=document.createElement('div');row.className='cya-client-identity-row cya-client-identity-advisor';row.appendChild(group);
   layout.appendChild(row);
  }
 }
 // CURP input retains its native indicator and validation. The copy button
 // reads the complete live 18-character value, including unsaved edits.
 const curp=$('fc-curp'),control=curp.closest('.nss-wrap')||curp;
 const ctrl=document.createElement('div');ctrl.className='cya-client-identity-curp-control';
 control.parentNode.insertBefore(ctrl,control);ctrl.appendChild(control);
 const copy=document.createElement('button');copy.type='button';copy.id='cya-client-copy-curp';
 copy.className='cya-client-copy-curp';copy.title='Copiar CURP completa';
 copy.setAttribute('aria-label','Copiar CURP completa');
 copy.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
 copy.addEventListener('click',()=>copyCurrentIdentityCurp(copy));
 ctrl.appendChild(copy);
 identityCurpRow=ctrl;identityCurpControl=control;
 body.insertBefore(layout,body.firstChild);
 modal.classList.add('cya-client-identity-active');
}

function stopInlineEditor(){
 const modal=$('modal-cliente');if(!modal||!editorActive)return;
 // Restore the original DOM placement of all six fields before opening any other form.
 restoreIdentityFields();
 // Restore the native ISO date input before returning the original editor.
 const nativeDate=$('el-fecha');
 if(nativeDate?.dataset.cyaHybridDateHidden==='1'){nativeDate.hidden=false;delete nativeDate.dataset.cyaHybridDateHidden;}
 $('cya-last-withdrawal-mx')?.remove();
 modal.classList.remove('cya-hybrid-inline-editor','open');
 modal.removeAttribute('data-hybrid-section');
 modal.querySelectorAll('.form-group[hidden],.form-row[hidden],.tab-panel[hidden],details[hidden],.cya-next-action-heading[hidden]').forEach(el=>{el.hidden=false;});
 const cancel=modal.querySelector('.modal-footer .btn:not(.btn-primary)');
 if(cancel)cancel.setAttribute('onclick',"closeModal('modal-cliente')");
 if(editorHome&&modal.parentElement!==editorHome)editorHome.appendChild(modal);
 editorActive=false;editorSection='';window.__cyaHybridClientEditSection='';
}
function confirmSwitch(){
 if(!editorActive)return true;
 if(typeof clienteFormDirty!=='undefined'&&clienteFormDirty&&
    !window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos y cambiar de sección?'))return false;
 return true;
}
function showEditorFields(section){
 const modal=$('modal-cliente');if(!modal)return;
 const allow=new Set(inlineFields[section]||[]);
 const groupIds=[...modal.querySelectorAll('.form-group')];
 for(const group of groupIds){
  const ids=[...group.querySelectorAll('input[id],select[id],textarea[id]')].map(el=>el.id);
  group.hidden=!ids.some(id=>allow.has(id));
 }
 // Row-level hiding makes the editor compact, but leaves source inputs in the
 // document so guardarCliente's existing validation and persistence work.
 for(const row of modal.querySelectorAll('.form-row')){
  const children=[...row.querySelectorAll('.form-group')];
  row.hidden=children.length>0&&!children.some(g=>!g.hidden);
 }
 modal.querySelectorAll('.tab-panel').forEach(panel=>{
  const visible=[...panel.querySelectorAll('.form-group')].some(g=>!g.hidden);
  panel.hidden=!visible;
 });
 // Hide orphan optional headers and non-form containers: only fields belonging
 // to the selected category should occupy vertical space.
 modal.querySelectorAll('details').forEach(details=>{
  const visible=[...details.querySelectorAll('.form-group')].some(g=>!g.hidden);
  details.hidden=!visible;
 });
 const nextAction=$('fc-prox-tipo')?.closest('.form-row')?.previousElementSibling;
 if(nextAction&&/pr[oó]xima acci[oó]n/i.test(nextAction.textContent||'')){nextAction.classList.add('cya-next-action-heading');nextAction.hidden=section!=='notas';}
 // Eligibility is generated dynamically by the original application.
 const eligibility=$('tab-elegibilidad');
 if(eligibility)eligibility.hidden=section!=='previsional';
}
// Display the last-withdrawal date in Mexican format while preserving the
// underlying ISO field required by eligibility calculations and persistence.
function setupMxLastWithdrawal(section){
 if(section!=='previsional')return;
 const native=$('el-fecha');
 if(!native||native.type!=='date')return;
 let proxy=$('cya-last-withdrawal-mx');
 if(!proxy){
  proxy=document.createElement('input');
  proxy.id='cya-last-withdrawal-mx';proxy.type='text';proxy.className='form-input input-fecha-mx';
  proxy.inputMode='numeric';proxy.maxLength=10;proxy.placeholder='dd/mm/aaaa';
  proxy.setAttribute('aria-label','Fecha del último retiro en formato día mes año');
  native.insertAdjacentElement('afterend',proxy);
  proxy.addEventListener('input',()=>{
   const text=String(proxy.value||'').trim(),m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
   let iso='';
   if(m){
    const date=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
    if(date.getUTCFullYear()===+m[3]&&date.getUTCMonth()+1===+m[2]&&date.getUTCDate()===+m[1])
     iso=m[3]+'-'+m[2]+'-'+m[1];
   }
   native.value=iso;
   proxy.setCustomValidity(text&&!iso?'Fecha inválida. Usa dd/mm/aaaa':'');
   native.dispatchEvent(new Event('input',{bubbles:true}));
  });
 }
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(native.value||''));
 proxy.value=m?m[3]+'/'+m[2]+'/'+m[1]:'';
 proxy.setCustomValidity('');
 native.hidden=true;native.dataset.cyaHybridDateHidden='1';
}
function mountInlineEditor(c,section){
 const area=$('cya-hybrid-client-content'),editor=$('modal-cliente');
 if(!area||!editor||typeof window.editCliente!=='function'||!canAccessClient(c))return false;
 if(!editorHome)editorHome=editor.parentElement;
 // editCliente populates native form fields and retains its current validation,
 // advisor permissions and cloudSyncNow guarded save.
 window.editCliente(c.id);
 area.appendChild(editor);
 editor.classList.add('cya-hybrid-inline-editor');
 editor.dataset.hybridSection=section;
 editorSection=section;
 window.__cyaHybridClientEditSection=section;
 editorActive=true;
 showEditorFields(section);
 setupMxLastWithdrawal(section);
 setupIdentityFields(section);
 const originalCancel=editor.querySelector('.modal-footer .btn:not(.btn-primary)');
 if(originalCancel){originalCancel.dataset.cyaHybridCancel='1';originalCancel.onclick=()=>{
  stopInlineEditor();selected='';selection(c);
 };}
 if(typeof clienteFormDirty!=='undefined')clienteFormDirty=false;
 return true;
}

function selection(c){
 const root=$('cya-hybrid-client-root'),area=$('cya-hybrid-client-panel');
 if(!root||!area)return;
 root.querySelectorAll('[data-hybrid-client]').forEach(b=>{const yes=b.dataset.hybridClient===selected;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
 if(!selected){if(editorActive)stopInlineEditor();area.hidden=true;identityShowAdvisor=false;return;}
 if(selected!=='identidad')identityShowAdvisor=false;
 area.hidden=false;
 const x=items.find(v=>v[0]===selected);
 if(editorActive)stopInlineEditor();
 const stash=$('cya-hybrid-client-legacy');
 if(stash){for(const old of [...area.querySelectorAll(':scope > .cya-hybrid-client-panel-content > .tab-panel')]){old.hidden=true;old.classList.remove('active');stash.appendChild(old);}}
 area.innerHTML='<div class="cya-hybrid-client-panel-head"><strong>'+esc(x[1])+'</strong><small>Datos del cliente</small></div><div class="cya-hybrid-client-panel-content" id="cya-hybrid-client-content"></div>';
 const box=$('cya-hybrid-client-content'),source=$(x[3]);
 if(inlineCategories.has(selected)&&mountInlineEditor(c,selected)){
  // The native AFORE editor already renders its reference information.
  // Never inject the legacy pd-cita-afore panel a second time.
  if(selected==='notas'){
   const entries=(c.historial||[]).filter(h=>/nota|observaci/i.test(String(h.tipo||'')+' '+String(h.texto||''))).slice(-8).reverse();
   if(entries.length){const log=document.createElement('div');log.className='cya-hybrid-notes-log';log.innerHTML='<strong>Notas anteriores</strong>'+entries.map(h=>'<p>'+esc(h.texto||'')+' <small>'+esc(format(h.fecha))+'</small></p>').join('');box.insertBefore(log,box.firstChild);}
  }
  return;
 }
 if(source){
  source.classList.add('active');source.hidden=false;box.appendChild(source);
  if(selected==='previsional'||selected==='banco'){
   source.querySelectorAll('.info-row').forEach(row=>{
    const label=String(row.querySelector('.ir-label')?.textContent||'').toLowerCase(),bank=/banco|nivel bbva|cuenta/.test(label);
    row.hidden=selected==='banco'?!bank:bank;
   });
  }
  if(selected==='afore'){const docs=$('pd-docs');if(docs){docs.hidden=false;docs.classList.add('active');box.appendChild(docs);}}
 }else if(selected==='comisiones'){
  const col=getCollaborator(c);
  box.innerHTML='<p>Asesor: '+esc(getAdvisor(c)?.nombre||c.asesorNombre||'Por confirmar')+'</p><p>Colaborador: '+esc(col?.nombre||'Cliente directo')+'</p><button type="button" class="btn" id="cya-hybrid-go-finance">Consultar y administrar en Finanzas</button>';
  $('cya-hybrid-go-finance').onclick=()=>{selected='finanzas';selection(c);};
 }else if(selected==='notas'){
  box.innerHTML='<p>'+esc(c.notas||'Sin observaciones')+'</p><button type="button" class="btn" id="cya-hybrid-edit-notes">Editar información del cliente</button>';
  $('cya-hybrid-edit-notes').onclick=()=>$('perfil-edit-btn')?.click();
 }
}
function build(){
 if(building||!$('modal-perfil')?.classList.contains('open'))return;
 const c=getClient(),body=$('perfil-body');if(!c||!body||!$('pd-contacto')||$('cya-hybrid-client-root'))return;
 if(!canAccessClient(c)){
  if(typeof showToast==='function')showToast('Este expediente no está asignado a tu cuenta','warn');
  if(typeof closeModal==='function')closeModal('modal-perfil');
  return;
 }
 building=true;
 try{
  if(String(c.id)!==currentId||signed(c)!==previousSigned){currentId=String(c.id);previousSigned=signed(c);selected=signed(c)?'identidad':'contratos';}
  header(c);
  const tabs=$('perfil-tabs');if(tabs)tabs.hidden=true;
  const summaryGrid=body.querySelector('.profile-summary-grid');if(summaryGrid)summaryGrid.hidden=true;
  const root=document.createElement('section');root.id='cya-hybrid-client-root';
  const nativeAlerts=pendingProfileAlerts(body);
  root.innerHTML=summaryCards(c,nativeAlerts)+'<nav class="cya-hybrid-client-cards" aria-label="Tarjetas del expediente"></nav><div id="cya-hybrid-client-legacy" hidden></div><section class="cya-hybrid-client-panel" id="cya-hybrid-client-panel" hidden></section>';
  const stages=body.querySelector('.profile-stage-wrap');if(stages)stages.insertAdjacentElement('afterend',root);else body.prepend(root);
  const stash=$('cya-hybrid-client-legacy');
  for(const panel of [...body.querySelectorAll(':scope>.tab-panel')]){panel.hidden=true;panel.classList.remove('active');stash.appendChild(panel);}
  root.querySelector('.cya-hybrid-client-cards').innerHTML=order(c).map(x=>'<button class="cya-hybrid-client-card" type="button" data-hybrid-client="'+x[0]+'" aria-pressed="false"><strong>'+esc(x[2])+' &nbsp; '+esc(x[1])+'</strong><small>'+esc(summary(c,x[0]))+'</small></button>').join('');
  root.querySelector('.cya-hybrid-client-cards').addEventListener('click',e=>{const b=e.target.closest('[data-hybrid-client]');if(!b||!confirmSwitch())return;selected=selected===b.dataset.hybridClient?'':b.dataset.hybridClient;selection(c);});
  const nextButton=root.querySelector('[data-cya-next-event]');
  if(nextButton)nextButton.addEventListener('click',()=>{
   if(editorActive&&!confirmSwitch())return;
   if(typeof window.openModalAgenda!=='function')return;
   const eventId=nextButton.dataset.cyaNextEvent;
   if(!(store.agenda||[]).some(ev=>String(ev.id)===eventId&&!ev.completado))return;
   if(editorActive)stopInlineEditor();
   if(typeof window.closeModal==='function')window.closeModal('modal-perfil');
   window.openModalAgenda(eventId);
  });
  selection(c);
 }finally{building=false;}
}

const nativeOpenProfile=window.openPerfil;
if(typeof nativeOpenProfile==='function')window.openPerfil=function(...args){
 if(editorActive)stopInlineEditor();
 return nativeOpenProfile.apply(this,args);
};
const nativeSave=window.guardarCliente;
if(typeof nativeSave==='function')window.guardarCliente=async function(...args){
 const wasInline=editorActive,priorSection=selected,wasId=currentId;
 if(wasInline)window.__cyaHybridClientEditSection=editorSection;
 const result=await nativeSave.apply(this,args);
 if(wasInline&&!$('modal-cliente')?.classList.contains('open')){
  stopInlineEditor();
  if($('modal-perfil')?.classList.contains('open')&&typeof window.openPerfil==='function'){
   window.openPerfil(wasId);
   selected=priorSection;
   // The existing openPerfil rebuilds the profile; its MutationObserver
   // reconstructs the nine cards and their selected native form.
  }
 }
 return result;
};
// Confirm pending edits before navigation and destructive actions.
for(const id of ['perfil-regresar-prospecto-btn','perfil-descartar-btn']){
 const action=$(id);
 if(action&&!action.dataset.cyaHybridDirtyGuard){
  action.dataset.cyaHybridDirtyGuard='1';
  action.addEventListener('click',event=>{
   if(editorActive&&!confirmSwitch()){event.preventDefault();event.stopImmediatePropagation();}
   else if(editorActive)stopInlineEditor();
  },true);
 }
}
// Always restore the native modal before closing the parent profile.
$('modal-perfil')?.querySelector('.profile-close')?.addEventListener('click',event=>{
 if(editorActive&&!confirmSwitch()){event.preventDefault();event.stopImmediatePropagation();return;}
 stopInlineEditor();
},true);
// If the modal is closed by a different existing action, return editor to its
// original DOM position before any new-client flow is attempted.
const parentProfile=$('modal-perfil');
if(parentProfile)new MutationObserver(()=>{if(!parentProfile.classList.contains('open')&&editorActive)stopInlineEditor();}).observe(parentProfile,{attributes:true,attributeFilter:['class']});

const target=$('perfil-body');
if(target)new MutationObserver(()=>{if(!$('cya-hybrid-client-root')&&$('pd-contacto'))build();}).observe(target,{childList:true,subtree:false});
if($('modal-perfil')?.classList.contains('open'))build();
})();