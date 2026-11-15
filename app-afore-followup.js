/* C&A: single source of truth for AFORE appointment attendance.
   Uses the existing client record and cloudSyncNow, no parallel backend. */
(function(){
'use strict';
if(window.__cyaAforeFollowup)return;
const $=id=>document.getElementById(id);
const client=()=>typeof store==='undefined'?null:(store.clientes||[]).find(c=>String(c.id)===String(typeof perfilClienteActivo==='undefined'?'':perfilClienteActivo));
const find=id=>typeof store==='undefined'?null:(store.clientes||[]).find(c=>String(c.id)===String(id));
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateMX=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||''));return m?m[3]+'/'+m[2]+'/'+m[1]:'—';};
const nowISO=()=>typeof fechaISOLocal==='function'?fechaISOLocal(new Date()):new Date().toISOString().slice(0,10);
const validISO=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));if(!m)return false;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()+1===+m[2]&&d.getUTCDate()===+m[3];};
const validTime=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''));
const authorized=c=>Boolean(c&&(typeof sesionActiva==='undefined'||(sesionActiva?.id&&((typeof isAdmin==='function'&&isAdmin())||String(c.asesorId||'')===String(sesionActiva.id)))));
const updated=c=>c?.aforeSeguimiento?.estado==='actualizado'||c?.etapasOperativasV2?.expediente?.done===true||['afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(c?.etapa);
const appointment=(c)=>c?.aforeSeguimiento?.citaFecha===c?.fechaBiometrica?c.aforeSeguimiento:null;
const due=(c,ref=new Date())=>{
 if(!c||!c.fechaBiometrica||updated(c))return false;
 const status=appointment(c);
 if(status&&['no_asistio','asistio_pendiente','actualizado'].includes(status.estado))return false;
 const date=String(c.fechaBiometrica||''),time=validTime(c.horaBiometrica)?c.horaBiometrica:'23:59';
 const when=new Date(date+'T'+time+':00');
 return !Number.isNaN(when.getTime())&&ref>=when;
};
const eventFor=e=>{
 if(e?.regla==='cita_afore_actualizacion')return true;
 // Older manually scheduled AFORE appointments keep working too: require
 // both the AFORE title and the same calendar day as the client's actual
 // appointment, so unrelated client appointments are never intercepted.
 const c=e?.clienteId?find(e.clienteId):null;
 return Boolean(c&&e?.tipo==='cita'&&e.fecha===c.fechaBiometrica&&/afore|biom[eé]tric|expediente/i.test(String(e.titulo||'')));
};
const eventDue=(e,ref=new Date())=>eventFor(e)&&!e.completado&&due(find(e.clienteId),ref);
const eventId=c=>'ev_cita_afore_'+c.id+'_'+c.fechaBiometrica+'_'+(validTime(c.horaBiometrica)?c.horaBiometrica:'sin_hora').replace(':','');
function schedule(c,old){
 if(!c||!validISO(c.fechaBiometrica))return;
 if(old?.fechaBiometrica===c.fechaBiometrica&&String(old.horaBiometrica||'')===String(c.horaBiometrica||'')&&String(old.sucursalAfore||'')===String(c.sucursalAfore||''))return;
 const events=Array.isArray(store.agenda)?store.agenda:(store.agenda=[]);
 for(const e of events){
  if(String(e.clienteId)===String(c.id)&&eventFor(e)&&!e.completado){
   e.completado=true;e.resultado='reprogramada';e.notas=(e.notas||'')+' · Sustituida por una nueva programación';
  }
 }
 const when=c.fechaBiometrica+' '+(c.horaBiometrica||'hora por confirmar');
 c.aforeSeguimiento={estado:'programada',citaFecha:c.fechaBiometrica,fechaActualizacion:null,modalidad:null,confirmacion:null,registro:new Date().toISOString()};
 events.push({id:eventId(c),titulo:'Actualización de expediente AFORE — '+c.nombre,tipo:'cita',fecha:c.fechaBiometrica,hora:c.horaBiometrica||'10:00',notas:'Cita de actualización de datos y biométricos · '+(c.sucursalAfore||'Sucursal por definir'),clienteId:c.id,asesorId:c.asesorId||null,completado:false,regla:'cita_afore_actualizacion',autoGenerado:true});
 if(typeof addHist==='function')addHist(c,'afore','Cita AFORE programada: '+when+(c.sucursalAfore?' · '+c.sucursalAfore:''));
}
function completeEvents(c,result){
 for(const e of store.agenda||[]){
  if(String(e.clienteId)===String(c.id)&&eventFor(e)&&!e.completado){
   e.completado=true;e.resultado=result;
  }
 }
}
let busy=false;
function dialog(){
 let el=$('cya-afore-followup-dialog');if(el)return el;
 el=document.createElement('div');el.id='cya-afore-followup-dialog';el.hidden=true;
 el.innerHTML='<div class="cya-afore-dialog-box" role="dialog" aria-modal="true" aria-labelledby="cya-afore-dialog-title">'+
 '<div class="cya-afore-dialog-head"><strong id="cya-afore-dialog-title"></strong><button type="button" data-afore-close aria-label="Cerrar">×</button></div>'+
 '<div class="cya-afore-dialog-body" id="cya-afore-dialog-body"></div>'+
 '<div class="cya-afore-dialog-actions"><button type="button" class="btn" data-afore-close>Cancelar</button><button type="button" class="btn btn-primary" id="cya-afore-confirm">Guardar resultado</button></div></div>';
 document.body.appendChild(el);
 el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-afore-close]'))el.hidden=true;});
 return el;
}
const input=(id)=>$(id)?.value?.trim()||'';
const field=(label,id,type='text',value='')=>'<label class="cya-afore-dialog-field">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+(type==='date'?'min="2020-01-01"':'')+'></label>';
const select=(label,id,opts)=>'<label class="cya-afore-dialog-field">'+label+'<select id="'+id+'">'+opts.map(p=>'<option value="'+esc(p[0])+'">'+esc(p[1])+'</option>').join('')+'</select></label>';
function openModal(kind){
 const c=client();if(!authorized(c)){if(typeof showToast==='function')showToast('No tienes acceso a este expediente','warn');return;}
 const popup=dialog();popup.hidden=false;popup.dataset.kind=kind;
 $('cya-afore-dialog-title').textContent=kind==='sin_cita'?'Expediente actualizado sin cita':'Resultado de cita AFORE';
 let markup='';
 if(kind==='sin_cita'){
  markup='<p>Confirmar actualización de datos y biométricos realizada por el cliente.</p>'+
   '<div class="cya-afore-dialog-grid">'+field('Fecha de actualización','cya-afore-date','date',nowISO())+
   select('Confirmación','cya-afore-confirmation',[['cliente','Confirmado por el cliente'],['cya','Verificado por C&A']])+'</div>'+
   '<label class="cya-afore-dialog-field">Observaciones (opcional)<textarea id="cya-afore-note" rows="2"></textarea></label>';
 }else{
  markup='<p>¿El cliente asistió a su cita de actualización AFORE?</p>'+
   select('Asistencia','cya-afore-attendance',[['','— Seleccionar —'],['si','Sí asistió'],['no','No asistió']])+
   '<div id="cya-afore-attended" hidden>'+select('¿Actualizó datos y biométricos?','cya-afore-completed',[['si','Sí, actualización completada'],['no','No, sigue pendiente']])+field('Fecha real de actualización','cya-afore-visit-date','date',c.fechaBiometrica||nowISO())+'</div>'+
   '<div id="cya-afore-absent" hidden>'+select('Motivo de inasistencia','cya-afore-reason',[['','— Seleccionar —'],['imprevisto','Imprevisto personal'],['documentos','Faltaron documentos'],['trabajo','No obtuvo permiso laboral'],['no_contesta','No contesta'],['otro','Otro motivo']])+
   select('¿Reprogramar cita?','cya-afore-reschedule',[['si','Sí'],['no','Más adelante']])+
   '<div class="cya-afore-dialog-grid" id="cya-afore-new-when">'+field('Nueva fecha','cya-afore-new-date','date','')+field('Nueva hora','cya-afore-new-time','time','10:00')+'</div></div>'+
   '<label class="cya-afore-dialog-field" id="cya-afore-note-wrap" hidden>Nota / detalle<textarea id="cya-afore-note" rows="2" placeholder="Motivo o explicación del resultado"></textarea></label>';
 }
 $('cya-afore-dialog-body').innerHTML=markup;
 if(kind!=='sin_cita'){
  $('cya-afore-attendance').onchange=()=>{
   const v=input('cya-afore-attendance');
   $('cya-afore-attended').hidden=v!=='si';$('cya-afore-absent').hidden=v!=='no';
   $('cya-afore-note-wrap').hidden=!v;
  };
  $('cya-afore-reschedule').onchange=()=>{$('cya-afore-new-when').hidden=input('cya-afore-reschedule')!=='si';};
 }
 $('cya-afore-confirm').onclick=()=>void confirm(kind);
}
async function confirm(kind){
 const c=client();if(busy||!authorized(c))return;
 const attendance=kind==='sin_cita'?'sin_cita':input('cya-afore-attendance');
 if(!attendance){showToast?.('Selecciona si el cliente asistió','warn');return;}
 const reason=input('cya-afore-reason'),note=input('cya-afore-note');
 if(attendance==='no'&&!reason){showToast?.('Selecciona el motivo de inasistencia','warn');return;}
 const reschedule=attendance==='no'&&input('cya-afore-reschedule')==='si';
 const newDate=input('cya-afore-new-date'),newTime=input('cya-afore-new-time');
 if(reschedule&&(!validISO(newDate)||!validTime(newTime)||new Date(newDate+'T'+newTime+':00')<=new Date())){showToast?.('Indica una nueva cita futura con fecha y hora válidas','warn');return;}
 const completed=attendance==='sin_cita'||(attendance==='si'&&input('cya-afore-completed')==='si');
 const actualDate=attendance==='sin_cita'?input('cya-afore-date'):attendance==='si'?input('cya-afore-visit-date'):nowISO();
 if(completed&&(!validISO(actualDate)||actualDate>nowISO())){showToast?.('Indica una fecha de actualización válida, no futura','warn');return;}
 const previous=JSON.parse(JSON.stringify(c)),agendaBefore=JSON.parse(JSON.stringify(store.agenda||[]));
 busy=true;const btn=$('cya-afore-confirm');btn.disabled=true;btn.textContent='Guardando…';
 try{
  const stamp=new Date().toISOString();
  const method=attendance==='sin_cita'?'sin_cita':'con_cita';
  const confirmation=attendance==='sin_cita'?input('cya-afore-confirmation'):'cliente';
  let outcome=completed?'actualizado':attendance==='no'?'no_asistio':'asistio_pendiente';
  if(completed){
   c.aforeSeguimiento={estado:'actualizado',modalidad:method,fechaActualizacion:actualDate,confirmacion:confirmation,registro:stamp,citaFecha:c.fechaBiometrica||null,observaciones:note};
   c.fechaActualizacionAfore=actualDate;
   c.etapasOperativasV2=c.etapasOperativasV2||{};
   c.etapasOperativasV2.expediente={done:true,fecha:actualDate,fuente:method,usuario:sesionActiva?.id||null};
   if(c.etapa==='dado_alta')c.etapa='afore_actualizada';
   completeEvents(c,outcome);
  }else if(attendance==='no'){
   const labels={imprevisto:'Imprevisto personal',documentos:'Faltaron documentos',trabajo:'Sin permiso laboral',no_contesta:'No contesta',otro:'Otro motivo'};
   const explanation=labels[reason]||reason;
   c.aforeSeguimiento={estado:'no_asistio',citaFecha:c.fechaBiometrica,registro:stamp,motivo:explanation,observaciones:note};
   completeEvents(c,'no_asistio');
   c.notas=((c.notas||'')+'\n'+dateMX(nowISO())+' · Inasistencia a cita AFORE: '+explanation+(note?' · '+note:'')).trim();
   if(reschedule){
    const oldDate=c.fechaBiometrica;
    c.fechaBiometrica=newDate;c.horaBiometrica=newTime;
    schedule(c,{fechaBiometrica:oldDate,horaBiometrica:previous.horaBiometrica,sucursalAfore:previous.sucursalAfore});
    outcome='reprogramada';
   }
  }else{
   c.aforeSeguimiento={estado:'asistio_pendiente',citaFecha:c.fechaBiometrica,registro:stamp,observaciones:note};
   completeEvents(c,'asistio_pendiente');
  }
  const text=completed?(method==='sin_cita'?'Expediente AFORE actualizado sin cita':'Expediente AFORE actualizado tras cita'):
   attendance==='no'?'No asistió a cita AFORE'+(reschedule?' · Reprogramada: '+dateMX(newDate)+' '+newTime:''):'Asistió, actualización pendiente';
  if(typeof addHist==='function')addHist(c,'afore',text+(note?' · '+note:''));
  await cloudSyncNow({throwOnError:true});
  dialog().hidden=true;
  showToast?.('Seguimiento AFORE guardado','success');
  mount();if(typeof renderPage==='function'&&typeof currentPage==='string'&&['dashboard','operativo','agenda'].includes(currentPage))renderPage(currentPage);
 }catch(error){
  Object.assign(c,previous);
  store.agenda=agendaBefore;
  console.error('No se pudo sincronizar resultado AFORE',error);
  showToast?.('No se pudo guardar. El expediente permanece abierto.','warn');
 }finally{busy=false;btn.disabled=false;btn.textContent='Guardar resultado';}
}
function mount(){
 const c=client(),grid=$('cya-afore-inline-fields');
 if(!c||!grid)return;
 let bar=$('cya-afore-followup-strip');
 if(!bar){bar=document.createElement('div');bar.id='cya-afore-followup-strip';grid.insertAdjacentElement('afterend',bar);}
 const state=c.aforeSeguimiento||{},isUpdated=updated(c);
 const status=isUpdated?'Actualizado'+(state.modalidad==='sin_cita'?' sin cita':''):due(c)?'Asistencia por confirmar':c.fechaBiometrica?'Cita programada':'Pendiente';
 const follow=isUpdated?(state.modalidad==='sin_cita'?'Confirmado fuera de agenda':'Actualización confirmada'):
  state.estado==='no_asistio'?'No asistió':state.estado==='asistio_pendiente'?'Asistió · Pendiente':due(c)?'¿El cliente asistió a su cita?':c.fechaBiometrica?'Por confirmar':'Sin cita';
 const last=dateMX(c.fechaActualizacionAfore||state.fechaActualizacion);
 bar.innerHTML='<div class="cya-afore-status-item"><small>Última actualización</small><span class="cya-afore-pill">'+esc(last)+'</span></div>'+
 '<div class="cya-afore-status-item"><small>Estado expediente</small><span class="cya-afore-pill'+(isUpdated?' success':'')+'">'+esc(status)+'</span></div>'+
 '<div class="cya-afore-status-item"><small>Seguimiento de cita</small><span class="cya-afore-pill'+(isUpdated?' success':due(c)?' warning':'')+'">'+esc(follow)+'</span></div>'+
 '<button type="button" class="btn cya-afore-result-btn" id="cya-afore-result">Resultado de cita</button>'+
 '<button type="button" class="btn cya-afore-independent-btn" id="cya-afore-no-appointment">Actualizado sin cita</button>';
 $('cya-afore-result').onclick=()=>openModal('resultado');
 $('cya-afore-no-appointment').onclick=()=>openModal('sin_cita');
}
function open(id){
 const c=find(id);if(!authorized(c)){showToast?.('No tienes permiso para acceder al expediente','warn');return;}
 if(typeof window.openPerfil!=='function')return;
 window.openPerfil(id);
 setTimeout(()=>{
  const root=$('cya-hybrid-client-root');
  const btn=root?.querySelector('[data-hybrid-client="afore"]');
  if(btn&&btn.getAttribute('aria-pressed')!=='true')btn.click();
  else mount();
 },90);
}
// Rerender the opened scheduling surface at the precise minute a pending
// appointment becomes due. Do not disturb an open modal or unsaved edits.
const dueAtLoad=new Map();
const dueFor=c=>Boolean(c?.fechaBiometrica&&!updated(c)&&due(c));
function snapshotDue(){
 if(typeof store==='undefined')return;
 const relevant=(store.clientes||[]).filter(c=>c?.fechaBiometrica);
 for(const c of relevant)dueAtLoad.set(String(c.id),dueFor(c));
}
snapshotDue();
if(typeof window.setInterval==='function')window.setInterval(()=>{
 if(typeof store==='undefined')return;
 let changed=false;
 for(const c of store.clientes||[]){
  const key=String(c.id),value=dueFor(c),previous=dueAtLoad.get(key);
  if(previous!==undefined&&previous!==value)changed=true;
  dueAtLoad.set(key,value);
 }
 if(changed&&typeof currentPage!=='undefined'&&['dashboard','agenda','operativo'].includes(currentPage)&&
  !document.querySelector('.modal-overlay.open, #modal-perfil.open, #modal-cliente.open')&&typeof renderPage==='function')
  renderPage(currentPage);
},60000);
window.cyaAbrirSeguimientoAfore=open;
window.__cyaAforeFollowup={mount,schedule,due,updated,eventDue,eventFor,open};
})();