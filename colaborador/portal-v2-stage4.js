/* Portal v2 · Seguimiento y constancia de verificación externa de depósitos y honorarios. */
(function installCollaboratorActivitiesV2(){
 'use strict';
 if(window.__caActivitiesV2)return;window.__caActivitiesV2=true;
 const steps=[
  {key:'firma',short:'Firma',title:'Contrato firmado'},
  {key:'alta',short:'Alta',title:'Cliente dado de alta'},
  {key:'app',short:'App AforeMóvil',title:'App AforeMóvil instalada'},
  {key:'banco',short:'Banco N4',title:'Revisión de cuenta bancaria nivel 4'},
  {key:'cita',short:'Cita AFORE',title:'Crear cita en AFORE'},
  {key:'expediente',short:'Expediente',title:'Expediente AFORE actualizado'},
  {key:'solicitud',short:'Solicitud',title:'Solicitud en aplicación'},
  {key:'deposito',short:'Depósito',title:'Recepción de depósito',external:true},
  {key:'honorarios',short:'Honorarios',title:'Pago de honorarios',external:true}
 ];
 const $=id=>document.getElementById(id);
 const items=()=>Array.isArray(state?.bootstrap?.clients)?state.bootstrap.clients.filter(c=>!c.discarded&&!(c.serviceId==='retiro_desempleo'&&c.stage==='generando_contrato')):[];
 const find=id=>items().find(c=>c.id===id);
 const stages=['generando_contrato','contrato_firmas','contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'];
 const rank=s=>stages.indexOf(String(s||''));
 function done(c,key){
  const activities=c.activities||{},record=activities[key];
  if(record?.done===true)return true;
  const stage=rank(c.stage);
  if(key==='firma')return Boolean(c.signature?.signed)||stage>=2;
  if(key==='alta')return stage>=3;
  if(key==='app')return String(c.aforeMovil||'').toLowerCase()==='si';
  if(key==='banco')return c.bankLevel4==='si'||c.bankLevel4==='4';
  if(key==='cita')return Boolean(c.appointment?.date);
  if(key==='expediente')return stage>=4;
  if(key==='solicitud')return stage>=5&&c.stage!=='solicitud_rechazada';
  if(key==='deposito')return stage>=6||c.collected===true&&stage>=5;
  if(key==='honorarios')return stage>=7||c.collected===true;
  return false;
 }
 function stepButton(c,step){
  const complete=done(c,step.key);
  return '<button type="button" class="ca-v2-step '+(complete?'is-done':'')+'" aria-label="'+esc(step.title)+' de '+esc(c.name)+': '+(complete?'completado':'pendiente')+'" title="'+esc(step.title)+'" onclick="caV2OpenActivity(\''+esc(c.id)+'\',\''+step.key+'\')">'+(complete?'✓':'○')+'</button>';
 }
 function render(){
  const clients=items();
  return '<section class="clients-toolbar"><div><h1>Mis clientes</h1><p>Consulta y registra cada actividad en el expediente compartido con tu asesor.</p></div></section>'+
  '<div class="ca-v2-table-wrap" tabindex="0" role="region" aria-label="Seguimiento de clientes, desplazamiento horizontal"><table class="ca-v2-table"><thead><tr><th class="ca-v2-sticky">Cliente</th>'+
  steps.map(s=>'<th scope="col" title="'+esc(s.title)+'">'+esc(s.short)+'</th>').join('')+'</tr></thead><tbody>'+
  (clients.length?clients.map(c=>'<tr><th scope="row" class="ca-v2-sticky"><button type="button" class="client-name-link" onclick="caOpenClient(\''+esc(c.id)+'\')">'+esc(c.name)+'</button><small>'+esc(c.stage==='contrato_firmas'?'Firma pendiente':c.curp||'')+'</small>'+(c.stage==='contrato_firmas'?'':'')+'</th>'+
    steps.map(step=>'<td>'+(c.serviceId==='retiro_desempleo'?stepButton(c,step):'<span class="ca-v2-na" title="No aplica a este servicio">—</span>')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="10">Todavía no hay clientes asignados.</td></tr>')+
  '</tbody></table></div><div class="ca-v2-table-legend"><span><b class="good">✓</b> Completado</span><span>○ Pendiente</span><span>Para depósito y honorarios se registra quién realizó la verificación externa. El cobro de comisiones se controla en Finanzas.</span></div>';
 }
 function ensure(){
  if($('ca-v2-activity-modal'))return;
  const el=document.createElement('div');el.id='ca-v2-activity-modal';el.className='modal-overlay';el.hidden=true;
  el.innerHTML='<section class="modal ca-v2-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-v2-activity-title"><header class="modal-head"><div><span class="eyebrow">SEGUIMIENTO</span><h3 id="ca-v2-activity-title">Actividad</h3></div><button type="button" id="ca-v2-activity-close" class="icon-button" aria-label="Cerrar">×</button></header><div id="ca-v2-activity-content"></div></section>';
  document.body.appendChild(el);
  $('ca-v2-activity-close').addEventListener('click',close);
  el.addEventListener('click',e=>{if(e.target===el)close();});
 }
 let selected=null;
 function close(){$('ca-v2-activity-modal').hidden=true;selected=null;}
 function field(label,id,type='text',value='',attrs=''){
   if(type==='date')return '<label class="ca-v2-form-field">'+esc(label)+' <small>(dd/mm/aaaa)</small><input id="'+id+'" type="text" inputmode="numeric" data-mx-date maxlength="10" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/aaaa" autocomplete="off" value="'+esc(window.caV2Dates?.toMX(value)||'')+'" '+attrs+'></label>';
   return '<label class="ca-v2-form-field">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(value||'')+'" '+attrs+'></label>';
 }
 function formFor(c,key){
  if(key==='deposito'||key==='honorarios'){
    const advisor=state.bootstrap?.advisor?.name||'Asesor asignado';
    return '<p class="ca-expediente-help">Registra quién verificó externamente la información, por ejemplo mediante WhatsApp o Finanzas. Esta constancia no envía una aprobación interna ni modifica por sí sola una comisión cobrada.</p>'+
      '<label class="ca-v2-form-field">¿Quién verificó el pago?<select id="ca-v2-verifier" required><option value="">Seleccionar persona</option><option value="advisor">'+esc(advisor)+' (asesor asignado)</option><option value="jorge_casillas">Jorge Casillas</option><option value="fernanda_massiel">Fernanda Massiel</option></select></label>'+
      '<label class="ca-v2-form-field">Notas (opcional)<textarea id="ca-v2-verification-notes" rows="4" maxlength="1000" placeholder="Observaciones de la verificación, medio o detalle relevante"></textarea></label>';
  }
  if(key==='alta')return field('Fecha real de alta','ca-v2-date','date',c.registeredAt,'required');
  if(key==='app')return '<label class="ca-v2-form-field">¿La aplicación AforeMóvil está instalada?<select id="ca-v2-installed" required><option value="">Seleccionar</option><option value="si">Sí</option></select></label>';
  if(key==='banco')return field('Banco','ca-v2-bank','text',c.bank,'maxlength="100" required')+'<label class="ca-v2-form-field">Nivel de cuenta<select id="ca-v2-level" required><option value="">Seleccionar</option><option value="4">Nivel 4 confirmado</option></select></label>';
  if(key==='cita')return field('Fecha de la cita','ca-v2-date','date',c.appointment?.date,'required')+field('Hora de la cita','ca-v2-time','time',c.appointment?.time,'required')+field('Sucursal de AFORE','ca-v2-branch','text',c.appointment?.branch,'maxlength="180" required')+field('AFORE (opcional)','ca-v2-afore','text',c.afore,'maxlength="100"');
  if(key==='solicitud')return field('Fecha de solicitud en aplicación','ca-v2-date','date',c.requestDate,'required');
  return '<p>Confirma que el expediente fue actualizado en AFORE.</p>';
 }
 function dataFor(key){
  const get=id=>$(id)?.value?.trim()||'';
  if(key==='deposito'||key==='honorarios')return {verifier:get('ca-v2-verifier'),notes:get('ca-v2-verification-notes')};
  if(key==='alta'||key==='solicitud')return {date:window.caV2Dates.toISO(get('ca-v2-date'))};
  if(key==='app')return {installed:get('ca-v2-installed')};
  if(key==='banco')return {bank:get('ca-v2-bank'),level:get('ca-v2-level')};
  if(key==='cita')return {date:window.caV2Dates.toISO(get('ca-v2-date')),time:get('ca-v2-time'),branch:get('ca-v2-branch'),afore:get('ca-v2-afore')};
  return {};
 }
 window.caV2OpenActivity=function(id,key){
  const c=find(id),step=steps.find(s=>s.key===key);
  if(!c||!step||c.serviceId!=='retiro_desempleo')return;
  if(key==='firma'){window.caV2ConfirmSignature?.(c.id);return;}
  ensure();selected={id,key};
  $('ca-v2-activity-title').textContent=step.title;
  const complete=done(c,key);
  if(complete){
   const verification=c.verifications?.[key];
   const verifiedBy=verification?.verifierName?'<p>Verificado externamente por: <strong>'+esc(verification.verifierName)+'</strong></p>':'';
   const note=verification?.notes?'<p>Notas: '+esc(verification.notes)+'</p>':'';
   $('ca-v2-activity-content').innerHTML='<div class="ca-v2-activity-inner"><strong>'+esc(c.name)+'</strong><p>✓ Actividad completada en el expediente del CRM.</p>'+verifiedBy+note+'<button type="button" class="btn" id="ca-v2-dismiss">Cerrar</button></div>';
   $('ca-v2-dismiss').addEventListener('click',close);
  }else{
   $('ca-v2-activity-content').innerHTML='<form class="ca-v2-activity-inner" id="ca-v2-activity-form"><strong>'+esc(c.name)+'</strong>'+formFor(c,key)+'<p class="ca-expediente-help">Este registro actualizará el expediente que consulta el asesor.</p><div id="ca-v2-activity-error" role="alert"></div><div class="modal-actions"><button type="submit" class="btn btn-primary" id="ca-v2-activity-save">Guardar actividad</button></div></form>';
   $('ca-v2-activity-form').addEventListener('submit',save);
   window.caV2Dates?.bind($('ca-v2-activity-form'));
  }
  $('ca-v2-activity-modal').hidden=false;
 };
 async function save(e){
  e.preventDefault();if(!selected)return;
  const c=find(selected.id);if(!c)return;
  const button=$('ca-v2-activity-save');button.disabled=true;
  const error=$('ca-v2-activity-error');error.textContent='';
  try{
   if(['alta','cita','solicitud'].includes(selected.key)&&!window.caV2Dates.toISO($('ca-v2-date')?.value)){error.textContent='Introduce una fecha válida en formato dd/mm/aaaa.';button.disabled=false;return;}
   const result=await portalAction({action:'complete_activity',clientId:c.id,activity:selected.key,expectedUpdatedAt:c.updatedAt,data:dataFor(selected.key)});
   const ix=(state.bootstrap?.clients||[]).findIndex(x=>x.id===c.id);
   if(ix>=0&&result.client)state.bootstrap.clients[ix]=result.client;
   await refreshDashboardOnly();
   const prior=selected.key;close();
   if(state.page==='clientes')window.navigate('clientes',true);
   toast(result.warning||('Actividad registrada: '+steps.find(s=>s.key===prior)?.title),result.warning?'error':'success');
  }catch(ex){error.textContent=ex?.message||'No se pudo guardar la actividad.';button.disabled=false;}
 }
 window.caV2TrackingSummary=function(c){
  return '<div class="ca-v2-mini-activities">'+steps.map(step=>'<div class="ca-v2-mini-row"><button type="button" onclick="caV2OpenActivity(\''+esc(c.id)+'\',\''+step.key+'\')"><span class="'+(done(c,step.key)?'good':'')+'">'+(done(c,step.key)?'✓':'○')+'</span> '+esc(step.title)+'</button></div>').join('')+'</div>';
 };
 window.caV2ActivityCompleted=done;
 window.caV2ActivitySteps=steps.map(s=>({key:s.key,title:s.title}));
 const baseNavigate=window.navigate;
 window.navigate=function(page,silent=false){
  const output=baseNavigate(page,silent);
  if(page==='clientes')$('page-content').innerHTML=render();
  return output;
 };
})();
