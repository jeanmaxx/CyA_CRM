/* Casillas & Asociados CRM — seguimiento operativo de doce actividades.
 * Compatible con las etapas heredadas; la fuente financiera y las fechas
 * existentes NO se sobrescriben desde estos indicadores.
 */
(function(){
 'use strict';
 if(window.__cyaClientActivitiesV2)return;
 const STEPS=Object.freeze([
  {id:'contrato',short:'Contrato',label:'Creando contrato',required:true},
  {id:'firmas',short:'Firmas',label:'Contrato en firmas',optional:true},
  {id:'firmado',short:'Firmado',label:'Contrato firmado',required:true},
  {id:'alta',short:'Alta',label:'Alta realizada',optional:true},
  {id:'app',short:'App',label:'App AforeMóvil instalada',optional:true},
  {id:'banco_n4',short:'Banco N4',label:'Cuenta bancaria nivel 4 verificada',optional:true},
  {id:'cita',short:'Cita',label:'Cita AFORE programada',optional:true},
  {id:'documentos',short:'Documentos',label:'Documentos integrados',optional:true},
  {id:'expediente',short:'Expediente',label:'Expediente AFORE actualizado',required:true},
  {id:'solicitud',short:'Solicitud',label:'Solicitud realizada',required:true},
  {id:'deposito',short:'Depósito',label:'Depósito realizado',required:true},
  {id:'honorarios',short:'Honorarios',label:'Honorarios liquidados',required:true},
 ]);
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const older=['generando_contrato','contrato_firmas','contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'];
 const legacyAt=(c,id)=>older.indexOf(c?.etapa)>=older.indexOf(id)&&older.indexOf(c?.etapa)>=0;
 const flag=(c,id)=>Boolean(c?.etapasOperativasV2?.[id]?.done||c?.portalActividades?.[id==='firmado'?'firma':id==='banco_n4'?'banco':id]?.done);
 const feeCollected=c=>['cobrado','pagado','liquidado','pago recibido','recibido'].some(v=>String(c?.estadoPago||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(v));
 const documents=c=>{
  const d=c?.etapasOperativasV2?.documentos?.checks||{},old=c?.docs||{};
  return {
   curp:Boolean(d.curp===true||old.curp===true),
   csf:Boolean(d.csf===true||old.csf===true||old.constancia_fiscal===true||old.constanciaSituacionFiscal===true),
   acta:Boolean(d.acta===true||old.acta===true),
  };
 };
 const allDocuments=c=>Object.values(documents(c)).every(Boolean);
 const flags=c=>{
  const done={
   contrato:flag(c,'contrato')||Boolean((c?.historialContratos||[]).length),
   firmas:flag(c,'firmas')||Boolean(c?.contratoFirmado)||legacyAt(c,'contrato_firmado'),
   firmado:flag(c,'firmado')||Boolean(c?.contratoFirmado)||legacyAt(c,'contrato_firmado'),
   alta:flag(c,'alta')||Boolean(c?.fechaAltaAfore),
   app:flag(c,'app')||String(c?.aforeMovil||'').toLowerCase()==='si',
   banco_n4:flag(c,'banco_n4')||String(c?.cuentaNivel4||'').toLowerCase()==='si'||String(c?.nivelCuentaBBVA||'')==='4',
   cita:flag(c,'cita')||Boolean(c?.fechaBiometrica),
   documentos:allDocuments(c),
   expediente:flag(c,'expediente')||legacyAt(c,'afore_actualizada'),
   solicitud:flag(c,'solicitud')||Boolean(c?.fechaSolicitudRealizada)||legacyAt(c,'solicitud_realizada'),
   deposito:flag(c,'deposito')||legacyAt(c,'deposito_recibido'),
   honorarios:(flag(c,'honorarios')&&feeCollected(c))||legacyAt(c,'honorarios_recibidos')
  };
  // Do not guess optional milestones from later legacy stages. They remain yellow.
  return done;
 };
 const statuses=c=>{
  const f=flags(c);
  return STEPS.map((step,i)=>{
   const later=STEPS.slice(i+1).some(s=>f[s.id]);
   return {...step,index:i+1,done:f[step.id],state:f[step.id]?'done':later?'skipped':'future'};
  });
 };
 const getClient=id=>typeof store==='undefined'?null:(store.clientes||[]).find(c=>String(c.id)===String(id));
 const authorized=c=>{
  if(!c||c.servicio!=='retiro_desempleo'||c.descartado||c.archivado||c.devueltoAProspectos)return false;
  if(typeof sesionActiva==='undefined')return true; // test harness only
  if(!sesionActiva?.id)return false;
  if(typeof isAdmin==='function'&&isAdmin())return true;
  return String(c.asesorId||'')===String(sesionActiva.id);
 };
 const renderStep=(item,id,mini)=>{
  const icon=item.state==='done'?'✓':item.state==='skipped'?'!':String(item.index);
  const title=esc(item.label+' · '+(item.state==='done'?'Confirmado':item.state==='skipped'?'Pendiente anterior (omitido)':'Sin confirmar'));
  return '<button type="button" class="cya-operational-step is-'+item.state+(mini?' is-mini':'')+'" data-cya-activity="'+esc(item.id)+'" data-cya-client="'+esc(id)+'" aria-label="'+title+'" title="'+title+'"><span class="cya-operational-dot" aria-hidden="true">'+icon+'</span>'+(mini?'':'<span class="cya-operational-name">'+esc(item.short)+'</span>')+'</button>';
 };
 const render=(c,mini=false)=>{
  if(!c||c.servicio!=='retiro_desempleo')return '';
  return '<div class="cya-operational-track'+(mini?' is-compact':'')+'" role="group" aria-label="Seguimiento de doce actividades">'+statuses(c).map(item=>renderStep(item,c.id,mini)).join('')+'</div>';
 };
 const renderMini=c=>render(c,true);
 const renderFull=c=>render(c,false);
 const isoToday=()=>{
  if(typeof fechaISOLocal==='function')return fechaISOLocal(new Date());
  const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 };
 const readDate=(id)=>{
  const el=$(id);if(!el)return '';
  const v=String(el.value||'').trim();if(!v)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);if(!m)return null;
  const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
  return d.getUTCDate()===+m[1]&&d.getUTCMonth()+1===+m[2]?m[3]+'-'+m[2]+'-'+m[1]:null;
 };
 let active=null;
 const close=()=>{
  $('cya-operational-modal')?.remove();
  active=null;
 };
 function form(c,step){
  const record=c.etapasOperativasV2?.[step.id]||{},when=record.fecha||isoToday(),date=when.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local=date?date[3]+'/'+date[2]+'/'+date[1]:'';
  const canEdit=authorized(c),done=flags(c)[step.id];
  const check=documents(c);
  const docs=step.id==='documentos'?'<fieldset class="cya-operational-docs"><legend>Documentos integrados</legend>'+
   [['curp','CURP'],['csf','Constancia de Situación Fiscal'],['acta','Acta de Nacimiento']].map(([key,label])=>'<label><input type="checkbox" id="cya-op-doc-'+key+'" '+(check[key]?'checked':'')+' '+(!canEdit?'disabled':'')+'> '+label+'</label>').join('')+
   '<small>Recordar INE vigente y comprobante de domicilio de máximo tres meses.</small></fieldset>':'';
  const citaFields=step.id==='cita'?'<label class="cya-operational-field">Hora programada (HH:MM)<input class="form-input" id="cya-op-time" type="time" value="'+esc(c.horaBiometrica||'')+'"></label><label class="cya-operational-field">Sucursal o ubicación<input class="form-input" id="cya-op-branch" maxlength="180" value="'+esc(c.sucursalAfore||'')+'"></label>':'';
  const detail=step.id==='cita'?'<p class="cya-operational-tip">La cita confirmada aquí significa <strong>programada</strong>, no atendida.</p>':
   step.id==='banco_n4'?'<p class="cya-operational-tip">Seleccionar un banco no confirma que su cuenta sea nivel 4.</p>':
   step.id==='honorarios'?'<p class="cya-operational-tip">Este indicador no registra el pago de comisiones ni sustituye los movimientos de Finanzas.</p>':
   step.id==='alta'?'<p class="cya-operational-tip">Registra el alta solo si fue confirmada. No se calcula automáticamente por hora de firma.</p>':'';
  return '<div class="cya-operational-overlay" id="cya-operational-modal"><div class="cya-operational-dialog" role="dialog" aria-modal="true" aria-labelledby="cya-operational-title">'+
   '<div class="cya-operational-header"><div><small>ACTIVIDAD '+step.index+' DE 12</small><h3 id="cya-operational-title">'+esc(step.label)+'</h3></div><button type="button" class="btn" data-op-close aria-label="Cerrar">✕</button></div>'+
   '<div class="cya-operational-body"><p>Estado: <strong>'+({done:'Confirmado',skipped:'Pendiente anterior',future:'Sin confirmar'}[step.state])+'</strong></p>'+detail+docs+
   '<label class="cya-operational-field">Fecha real o de confirmación (dd/mm/aaaa)<input class="form-input" id="cya-op-date" value="'+esc(local)+'" inputmode="numeric" placeholder="dd/mm/aaaa" '+(!canEdit?'disabled':'')+'></label>'+
   citaFields+
   '<label class="cya-operational-field">Observaciones<textarea class="form-textarea" id="cya-op-note" rows="3" '+(!canEdit?'disabled':'')+'>'+esc(record.nota||'')+'</textarea></label>'+
   (done?'<p class="cya-operational-tip">Para corregir un paso confirmado debes indicar el motivo. La corrección quedará en el historial.</p>':'')+
   '</div><div class="cya-operational-actions">'+(canEdit?'<button type="button" class="btn btn-primary" data-op-save>'+(done?'Corregir registro':'Confirmar actividad')+'</button>':'')+'<button type="button" class="btn" data-op-close>Cancelar</button></div></div></div>';
 }
 function open(id,stepId){
  const c=getClient(id),status=statuses(c).find(x=>x.id===stepId);
  if(!c||!status)return false;
  close();active={id:c.id,stepId};
  const div=document.createElement('div');div.innerHTML=form(c,status);
  document.body.appendChild(div.firstChild);
  $('cya-operational-modal').addEventListener('click',e=>{if(e.target.id==='cya-operational-modal'||e.target.closest('[data-op-close]'))close();});
  $('cya-operational-modal').querySelector('[data-op-save]')?.addEventListener('click',()=>save(id,stepId));
  return true;
 }
 const confirmed=(message)=>typeof window.confirm==='function'?window.confirm(message):false;
 const msg=(text,type='warn')=>{if(typeof showToast==='function')showToast(text,type);};
 function requiredDependencies(c,stepId){
  const done=flags(c);
  if(stepId==='solicitud'&&!done.expediente)
   return confirmed('¿Confirmas que el expediente AFORE ya está actualizado? También se registrará esta confirmación.');
  if(stepId==='deposito'&&!done.solicitud)
   return confirmed('¿Confirmas que la solicitud fue realmente presentada? Se registrará esta confirmación antes de marcar el depósito.');
  if(stepId==='honorarios'&&!done.deposito)
   return confirmed('¿Confirmas que el depósito al cliente ya se realizó? Se registrará esta confirmación, sin modificar Finanzas.');
  return true;
 }
 function save(id,stepId){
  const c=getClient(id),step=statuses(c).find(s=>s.id===stepId);
  if(!step||!authorized(c))return msg('No tienes permiso para actualizar este seguimiento');
  if(stepId==='honorarios'&&!(feeCollected(c)||legacyAt(c,'honorarios_recibidos'))){
   return msg('Primero confirma el cobro en Finanzas; el indicador no sustituye ese registro');
  }
  const note=String($('cya-op-note')?.value||'').trim(),date=readDate('cya-op-date');
  if(!date||date>isoToday())return msg('Registra una fecha real válida en formato dd/mm/aaaa');
  if(step.done&&note.length<3)return msg('Escribe un motivo de corrección de al menos tres caracteres');
  const docChecks={curp:Boolean($('cya-op-doc-curp')?.checked),csf:Boolean($('cya-op-doc-csf')?.checked),acta:Boolean($('cya-op-doc-acta')?.checked)};
  if(stepId==='documentos'&&!Object.values(docChecks).every(Boolean))return msg('Marca CURP, Constancia de Situación Fiscal y Acta de Nacimiento');
  if((stepId==='firmado'||stepId==='firmas')&&!flags(c).contrato)return msg('Primero genera el contrato desde el expediente');
  if(stepId==='contrato'&&!(c.historialContratos||[]).length)return msg('Primero genera el contrato desde Contratos');
  if(stepId==='banco_n4'&&!String(c.banco||'').trim())return msg('Primero registra el banco en su tarjeta');
  const citaTime=String($('cya-op-time')?.value||''),citaBranch=String($('cya-op-branch')?.value||'').trim();
  if(stepId==='cita'&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(citaTime)||!citaBranch))return msg('Registra hora y sucursal de la cita AFORE');
  if(stepId==='firmado'&&typeof window.confirm==='function'&&!window.confirm('¿Confirmas que el contrato está firmado en la fecha registrada?'))return;
  if(stepId==='deposito'&&typeof window.confirm==='function'&&!window.confirm('¿Confirmas que el depósito fue recibido realmente por el cliente?'))return;
  if(!requiredDependencies(c,stepId))return;
  const fieldsBefore={etapa:c.etapa,contratoFirmado:c.contratoFirmado,fechaFirmaContrato:c.fechaFirmaContrato,fechaAltaAfore:c.fechaAltaAfore,fechaSolicitudRealizada:c.fechaSolicitudRealizada,aforeMovil:c.aforeMovil,cuentaNivel4:c.cuentaNivel4,docs:JSON.parse(JSON.stringify(c.docs||{})),fechaBiometrica:c.fechaBiometrica,horaBiometrica:c.horaBiometrica,sucursalAfore:c.sucursalAfore};
  const previous=JSON.parse(JSON.stringify(c.etapasOperativasV2||{}));
  const history=JSON.parse(JSON.stringify(c.historial||[]));
  const before=flags(c),now=new Date().toISOString();
  c.etapasOperativasV2={...previous};
  if(stepId==='solicitud'&&!before.expediente)c.etapasOperativasV2.expediente={done:true,fecha:null,nota:'Confirmado al registrar Solicitud; fecha real del expediente no disponible',actorId:typeof sesionActiva==='undefined'?null:sesionActiva?.id||null,registradaEn:now};
  if(stepId==='deposito'&&!before.solicitud)c.etapasOperativasV2.solicitud={done:true,fecha:null,nota:'Solicitud confirmada al registrar Depósito; fecha real no disponible',actorId:typeof sesionActiva==='undefined'?null:sesionActiva?.id||null,registradaEn:now};
  if(stepId==='honorarios'&&!before.deposito)c.etapasOperativasV2.deposito={done:true,fecha:null,nota:'Depósito confirmado al registrar Honorarios; fecha real no disponible',actorId:typeof sesionActiva==='undefined'?null:sesionActiva?.id||null,registradaEn:now};
  c.etapasOperativasV2[stepId]={done:true,fecha:date,nota:note,actorId:typeof sesionActiva==='undefined'?null:sesionActiva?.id||null,registradaEn:now,...(stepId==='documentos'?{checks:docChecks}:{})};
  if(stepId==='firmado'&&!before.firmas)c.etapasOperativasV2.firmas={done:true,fecha:date,nota:'Completado automáticamente al confirmar firma',actorId:typeof sesionActiva==='undefined'?null:sesionActiva?.id||null,registradaEn:now};
  // Puente con el pipeline canónico: solo cuando se confirma una actividad
  // REAL y el estado anterior permite avanzar. Nunca modifica el pronóstico.
  const currentRank=older.indexOf(c.etapa);
  const advance=(target)=>{const index=older.indexOf(target);if(index>currentRank&&currentRank>=0)c.etapa=target;};
  if(stepId==='firmas'&&c.etapa==='generando_contrato')advance('contrato_firmas');
  if(stepId==='firmado'){
    c.contratoFirmado=true;c.fechaFirmaContrato=date;
    if(['generando_contrato','contrato_firmas'].includes(c.etapa))advance('contrato_firmado');
  }
  if(stepId==='alta'){
    c.fechaAltaAfore=date;
    if(c.etapa==='contrato_firmado')advance('dado_alta');
  }
  if(stepId==='app')c.aforeMovil='si';
  if(stepId==='banco_n4')c.cuentaNivel4='si';
  if(stepId==='cita'){c.fechaBiometrica=date;c.horaBiometrica=citaTime;c.sucursalAfore=citaBranch;}
  if(stepId==='documentos')c.docs={...(c.docs||{}),...docChecks};
  if(stepId==='expediente'&&['contrato_firmado','dado_alta'].includes(c.etapa))advance('afore_actualizada');
  if(stepId==='solicitud'){
    c.fechaSolicitudRealizada=date;
    if(['contrato_firmado','dado_alta','afore_actualizada'].includes(c.etapa))advance('solicitud_realizada');
  }
  if(stepId==='deposito'&&['solicitud_realizada','afore_actualizada','dado_alta','contrato_firmado'].includes(c.etapa))advance('deposito_recibido');
  // Para Honorarios, el cierre y archivado siguen bajo el flujo de Finanzas:
  // no basta el indicador para cerrar el expediente ni pagar comisiones.
  if(typeof addHist==='function')addHist(c,'actividad','Actividad '+step.label+(step.done?' corregida':' confirmada')+' · '+date+(note?' · '+note:''));
  // Crucial: no writes to c.etapa, fechaFirmaContrato, fechaRetiroEstimada,
  // fechaSolicitudRealizada, estadoPago, commissions or native Agenda.
  const saved=()=>{
   close();
   if(typeof renderPage==='function'&&typeof currentPage!=='undefined')renderPage(currentPage);
   if(typeof openPerfil==='function'&&$('modal-perfil')?.classList.contains('open'))openPerfil(id);
   msg('Actividad confirmada','success');
  };
  if(typeof cloudSyncNow!=='function'){Object.assign(c,fieldsBefore);c.etapasOperativasV2=previous;c.historial=history;return msg('No está disponible la sincronización; no se guardó la actividad');}
  Promise.resolve().then(()=>cloudSyncNow({throwOnError:true})).then(saved).catch(()=>{
    Object.assign(c,fieldsBefore);
    c.etapasOperativasV2=previous;c.historial=history;
    msg('No se pudo guardar. El registro anterior se conserva.');
  });
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-cya-activity][data-cya-client]');
  if(!button)return;
  e.stopPropagation();e.preventDefault();
  open(button.dataset.cyaClient,button.dataset.cyaActivity);
 },true);
 window.__cyaClientActivitiesV2={STEPS,statuses,flags,documents,renderMini,renderFull,open,close};
 window.cyaRenderActivitiesMini=renderMini;
 window.cyaRenderActivitiesFull=renderFull;
})();
