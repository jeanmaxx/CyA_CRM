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
const signed=c=>c.contratoFirmado===true||['contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(c.etapa);
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
 case 'contratos':return (c.historialContratos||[]).length?'Último contrato · '+format((c.historialContratos||[]).at(-1)?.fecha):'Crear contrato';
 case 'identidad':return [c.telefono,c.ciudad].filter(Boolean).join(' · ')||'Nombre, teléfono y dirección';
 case 'previsional':return 'NSS: '+field(c.nss)+' · CURP';
 case 'afore':return field(c.afore)+' · '+(c.fechaBiometrica?'Cita '+format(c.fechaBiometrica):'Sin cita');
 case 'banco':return field(c.banco)+' · '+(c.nivelCuentaBBVA?'Nivel '+c.nivelCuentaBBVA:'Nivel por confirmar');
 case 'finanzas':return 'Retiro, honorarios y cobros';
 case 'comisiones':return 'Asesor y colaborador';
 case 'notas':return c.notas?String(c.notas).slice(0,65):'Sin observaciones';
 case 'historial':return (c.historial||[]).length+' movimientos';
 }return '';
};
let currentId='',selected='',building=false,previousSigned=null;
function header(c){
 const modal=$('modal-perfil'),copy=modal?.querySelector('.profile-header-copy');if(!copy)return;
 $('perfil-title').textContent=c.nombre||'Cliente';
 $('perfil-sub').textContent=[c.curp||'CURP pendiente',c.telefono||'',c.ciudad||''].filter(Boolean).join(' · ');
 let meta=$('cya-hybrid-client-meta');if(!meta){meta=document.createElement('div');meta.id='cya-hybrid-client-meta';copy.appendChild(meta);}
 meta.innerHTML='<span>'+esc(getAdvisor(c)?.nombre||c.asesorNombre||'Asesor asignado')+'</span><span>'+esc(getCollaborator(c)?.nombre||'Cliente directo')+'</span><span>'+esc(c.fuenteContacto||(typeof FUENTES!=='undefined'?FUENTES[c.fuente]:c.fuente)||'Origen pendiente')+'</span>';
 let dates=$('cya-hybrid-client-dates');if(!dates){dates=document.createElement('div');dates.id='cya-hybrid-client-dates';copy.insertAdjacentElement('afterend',dates);}
 // Only display existing estimated request values; do not alter formula or stored dates.
 const solicitud=c.fechaSolicitudManual||c.fechaRetiroEstimada||'';
 const cobro=c.fechaCobroProbable||plusBusiness(c.fechaSolicitudRealizada||solicitud);
 dates.innerHTML='<div><small>SOLICITUD PROBABLE</small><strong>'+esc(format(solicitud))+'</strong></div><div><small>COBRO PROBABLE</small><strong>'+esc(format(cobro))+'</strong></div>';
 let menu=$('cya-hybrid-client-admin');
 if(!menu){
  menu=document.createElement('details');menu.id='cya-hybrid-client-admin';
  menu.innerHTML='<summary aria-label="Administración del expediente" title="Administración del expediente">⚙</summary><div class="cya-hybrid-client-menu"><div id="cya-hybrid-return"></div><button class="btn" id="cya-hybrid-advisor" type="button">Cambiar asesor</button><div id="cya-hybrid-discard"></div><button class="btn cya-hybrid-danger" disabled type="button" title="Pendiente de validación de permisos y dependencias">Eliminar definitivamente</button></div>';
  const actions=modal.querySelector('.profile-header-actions');
  actions?.insertBefore(menu,actions.querySelector('.profile-close'));
 }
 const r=$('perfil-regresar-prospecto-btn'),d=$('perfil-descartar-btn');
 if(r&&!$('cya-hybrid-return').contains(r))$('cya-hybrid-return').appendChild(r);
 if(d&&!$('cya-hybrid-discard').contains(d))$('cya-hybrid-discard').appendChild(d);
 $('cya-hybrid-advisor').onclick=()=>{
  menu.open=false;
  if(typeof sesionActiva!=='undefined'&&['admin','tech_admin'].includes(String(sesionActiva?.rol||'')))$('perfil-edit-btn')?.click();
  else if(typeof window.cyaAbrirSolicitudCambioAsesor==='function')window.cyaAbrirSolicitudCambioAsesor(c.id);
  else $('perfil-edit-btn')?.click();
 };
}
function selection(c){
 const root=$('cya-hybrid-client-root'),area=$('cya-hybrid-client-panel');
 if(!root||!area)return;
 root.querySelectorAll('[data-hybrid-client]').forEach(b=>{const yes=b.dataset.hybridClient===selected;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
 if(!selected){area.hidden=true;return;}
 area.hidden=false;
 const x=items.find(v=>v[0]===selected);
 const stash=$('cya-hybrid-client-legacy');
 if(stash){for(const old of [...area.querySelectorAll(':scope > .cya-hybrid-client-panel-content > .tab-panel')]){old.hidden=true;old.classList.remove('active');stash.appendChild(old);}}
 area.innerHTML='<div class="cya-hybrid-client-panel-head"><strong>'+esc(x[1])+'</strong><small>Panel interno</small></div><div class="cya-hybrid-client-panel-content" id="cya-hybrid-client-content"></div>';
 const box=$('cya-hybrid-client-content'),source=$(x[3]);
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
 building=true;
 try{
  if(String(c.id)!==currentId||signed(c)!==previousSigned){currentId=String(c.id);previousSigned=signed(c);selected=signed(c)?'':'contratos';}
  header(c);
  const tabs=$('perfil-tabs');if(tabs)tabs.hidden=true;
  const summaryGrid=body.querySelector('.profile-summary-grid');if(summaryGrid)summaryGrid.hidden=true;
  const root=document.createElement('section');root.id='cya-hybrid-client-root';
  root.innerHTML='<div class="cya-hybrid-client-section-title">TARJETAS DEL EXPEDIENTE</div><nav class="cya-hybrid-client-cards" aria-label="Tarjetas del expediente"></nav><div id="cya-hybrid-client-legacy" hidden></div><section class="cya-hybrid-client-panel" id="cya-hybrid-client-panel" hidden></section>';
  const stages=body.querySelector('.profile-stage-wrap');if(stages)stages.insertAdjacentElement('afterend',root);else body.prepend(root);
  const stash=$('cya-hybrid-client-legacy');
  for(const panel of [...body.querySelectorAll(':scope>.tab-panel')]){panel.hidden=true;panel.classList.remove('active');stash.appendChild(panel);}
  root.querySelector('.cya-hybrid-client-cards').innerHTML=order(c).map(x=>'<button class="cya-hybrid-client-card" type="button" data-hybrid-client="'+x[0]+'" aria-pressed="false"><strong>'+esc(x[2])+' &nbsp; '+esc(x[1])+'</strong><small>'+esc(summary(c,x[0]))+'</small></button>').join('');
  root.querySelector('.cya-hybrid-client-cards').addEventListener('click',e=>{const b=e.target.closest('[data-hybrid-client]');if(!b)return;selected=selected===b.dataset.hybridClient?'':b.dataset.hybridClient;selection(c);});
  selection(c);
 }finally{building=false;}
}
const target=$('perfil-body');
if(target)new MutationObserver(()=>{if(!$('cya-hybrid-client-root')&&$('pd-contacto'))build();}).observe(target,{childList:true,subtree:false});
if($('modal-perfil')?.classList.contains('open'))build();
})();