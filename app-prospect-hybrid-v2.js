/* C&A CRM — expediente híbrido de prospectos (etapa 2).
 * Capa de presentación sobre los campos reales y guardado existente:
 * nunca crea una segunda versión de los datos ni cambia estados de negocio.
 */
(function installHybridProspectExpediente(){
 'use strict';
 if(window.__cyaHybridProspectInstalled)return;
 window.__cyaHybridProspectInstalled=true;
 const TABS=[
  {id:'identidad',name:'Identidad y contacto',icon:'♙',description:'Nombre, CURP, teléfono y ubicación'},
  {id:'elegibilidad',name:'Elegibilidad',icon:'✓',description:'Declarado y verificado'},
  {id:'origen',name:'Origen y captación',icon:'◉',description:'Fuente, campaña y respuestas'},
  {id:'seguimiento',name:'Seguimiento',icon:'▤',description:'Etapa, acciones y observaciones'},
  {id:'historial',name:'Historial',icon:'◷',description:'Registro de actividad'}
 ];
 let current='identidad',dirty=false,lastLeadKey='',initialFields=null,closeBusy=false;
 const $=id=>document.getElementById(id);
 const safe=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
 const modal=()=> $('modal-lead');
 const body=()=>modal()?.querySelector('.modal-body');
 const currentLead=()=>{
  const id=typeof editingLeadId!=='undefined'?editingLeadId:null;
  return id&&typeof store!=='undefined'?store.leads?.find(l=>String(l.id)===String(id)):null;
 };
 const txt=x=>String(x??'').trim()||'—';
 const byId=id=>$(id)?.value||'';
 const sections=()=>TABS.map(tab=>$('cya-hybrid-section-'+tab.id));
 function makeUI(){
  const container=body();if(!container)return null;
  let root=$('cya-hybrid-lead-root');if(root)return root;
  root=document.createElement('div');root.id='cya-hybrid-lead-root';
  root.innerHTML='<div class="cya-hybrid-lead-heading"><div class="cya-hybrid-lead-person"><div class="cya-hybrid-kicker">CASILLAS & ASOCIADOS · EXPEDIENTE DEL PROSPECTO</div><div class="cya-hybrid-name-line"><strong id="cya-hybrid-lead-name">Prospecto</strong><div class="cya-hybrid-lead-context" id="cya-hybrid-lead-context"></div></div><div class="cya-hybrid-header-meta"><span id="cya-hybrid-lead-contact" class="cya-hybrid-lead-contact"></span><span class="cya-hybrid-registration-label">REGISTRO</span><span id="cya-hybrid-registration-slot"></span></div></div><button class="btn cya-hybrid-wa" type="button" id="cya-hybrid-lead-whatsapp">WhatsApp</button></div>'+ 
   '<nav class="cya-hybrid-lead-cards" aria-label="Categorías del expediente">'+TABS.map(t=>'<button type="button" class="cya-hybrid-lead-card" data-hybrid-lead-section="'+t.id+'" aria-pressed="false"><span class="cya-hybrid-card-title">'+safe(t.icon)+' &nbsp; '+safe(t.name)+'</span><small data-hybrid-summary="'+t.id+'">'+safe(t.description)+'</small></button>').join('')+'</nav>'+
   '<div class="cya-hybrid-lead-panels">'+TABS.map(t=>'<section class="cya-hybrid-lead-section" data-section="'+t.id+'" id="cya-hybrid-section-'+t.id+'" hidden><h3>'+safe(t.name)+'</h3><div class="cya-hybrid-section-fields" id="cya-hybrid-fields-'+t.id+'"></div></section>').join('')+'</div>';
  const eligibilityTitle=root.querySelector('#cya-hybrid-section-elegibilidad>h3');
  if(eligibilityTitle&&!root.querySelector('#cya-prospect-share-eligibility')){
   const share=document.createElement('button');
   share.type='button';share.id='cya-prospect-share-eligibility';
   share.className='btn cya-prospect-share-button';
   share.textContent='↗ Compartir';
   share.setAttribute('aria-label','Compartir elegibilidad por WhatsApp');
   share.addEventListener('click',()=>window.cyaAbrirCompartirElegibilidad?.());
   eligibilityTitle.appendChild(share);
  }
  container.insertBefore(root,container.firstChild);
  root.querySelectorAll('[data-hybrid-lead-section]').forEach(btn=>btn.addEventListener('click',()=>{
   if(btn.dataset.hybridLeadSection===current)return;
   current=btn.dataset.hybridLeadSection;showSelected();
  }));
  root.querySelector('#cya-hybrid-lead-whatsapp').addEventListener('click',()=>{
   if(typeof window.cyaAbrirCentroMensajesWhatsApp==='function')window.cyaAbrirCentroMensajesWhatsApp();
   else if(typeof window.cyaAbrirWhatsAppProspectoPorId==='function'&&currentLead())window.cyaAbrirWhatsAppProspectoPorId(currentLead().id);
  });
  return root;
 }
 // Real field-value snapshot: clicking around without editing never prompts.
 // All edits (including eligibility fields) are compared with the original
 // values; stage auto-saves refresh only the stage baseline.
 function fieldSnapshot(){
  const result={};
  modal()?.querySelectorAll('.modal-body input[id],.modal-body select[id],.modal-body textarea[id]').forEach(el=>{
   if(!el.id.startsWith('lead-'))return;
   result[el.id]=el.type==='checkbox'||el.type==='radio'?el.checked:el.value;
  });
  return result;
 }
 function captureSnapshot(){initialFields=fieldSnapshot();dirty=false;}
 function hasUnsavedChanges(){
  if(!initialFields)return false;
  const values=fieldSnapshot();
  return Object.keys({...initialFields,...values}).some(k=>values[k]!==initialFields[k]);
 }
 function ensureClosePrompt(){
  let popup=$('cya-prospect-unsaved-dialog');
  if(popup)return popup;
  popup=document.createElement('div');popup.id='cya-prospect-unsaved-dialog';
  popup.className='cya-prospect-unsaved-dialog';
  popup.hidden=true;
  popup.innerHTML='<div class="cya-prospect-unsaved-box" role="alertdialog" aria-modal="true" aria-labelledby="cya-unsaved-title">'+
    '<h3 id="cya-unsaved-title">Hay cambios sin guardar</h3><p>¿Deseas guardar los cambios antes de cerrar el expediente?</p>'+
    '<div class="cya-prospect-unsaved-actions"><button type="button" class="btn" data-unsaved-stay>Seguir editando</button>'+
    '<button type="button" class="btn" data-unsaved-discard>Descartar cambios</button>'+
    '<button type="button" class="btn btn-primary" data-unsaved-save>Guardar</button></div></div>';
  document.body.appendChild(popup);
  popup.querySelector('[data-unsaved-stay]').addEventListener('click',()=>{popup.hidden=true;closeBusy=false;});
  popup.querySelector('[data-unsaved-discard]').addEventListener('click',()=>{
   popup.hidden=true;closeBusy=false;dirty=false;initialFields=null;
   if(typeof window.closeModal==='function')window.closeModal('modal-lead');
   else modal()?.classList.remove('open');
  });
  popup.querySelector('[data-unsaved-save]').addEventListener('click',async()=>{
   if(closeBusy)return;
   closeBusy=true;
   const button=popup.querySelector('[data-unsaved-save]');
   button.disabled=true;button.textContent='Guardando…';
   try{
    const ok=typeof window.guardarLead==='function'?await window.guardarLead():false;
    if(ok===true){
     popup.hidden=true;initialFields=null;dirty=false;
     if(typeof window.closeModal==='function')window.closeModal('modal-lead');
     else modal()?.classList.remove('open');
    }else{
     if(typeof window.showToast==='function')window.showToast('No se pudo guardar. El expediente continúa abierto.','warn');
    }
   }catch(error){
    console.warn('No se pudo guardar al cerrar el prospecto',error);
    if(typeof window.showToast==='function')window.showToast('No se pudo guardar. Revisa tu conexión.','warn');
   }finally{
    button.disabled=false;button.textContent='Guardar';closeBusy=false;
   }
  });
  return popup;
 }
 function requestProspectClose(){
  if(!modal()?.classList.contains('open')||closeBusy)return;
  if(!hasUnsavedChanges()){
   initialFields=null;dirty=false;
   if(typeof window.closeModal==='function')window.closeModal('modal-lead');
   else modal()?.classList.remove('open');
   return;
  }
  const popup=ensureClosePrompt();popup.hidden=false;
  popup.querySelector('[data-unsaved-save]')?.focus();
 }
 // Capture outside clicks and the existing header close action before any
 // global legacy handler can dismiss the dossier and lose unsaved edits.
 document.addEventListener('click',event=>{
  const overlay=modal();
  if(!overlay?.classList.contains('open')||!initialFields)return;
  const outside=event.target===overlay;
  const headerClose=Boolean(event.target?.closest?.('#modal-lead .modal-header button, #modal-lead .modal-footer button[onclick*="closeModal"]'));
  if(!outside&&!headerClose)return;
  event.preventDefault();event.stopImmediatePropagation();requestProspectClose();
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!modal()?.classList.contains('open'))return;
  if($('cya-prospect-unsaved-dialog')?.hidden===false){
   event.preventDefault();event.stopImmediatePropagation();
   $('cya-prospect-unsaved-dialog').hidden=true;return;
  }
  if(document.getElementById('cya-wa-message-center')?.classList.contains('open'))return;
  if(document.getElementById('cya-share-eligibility-dialog')?.hidden===false)return;
  event.preventDefault();event.stopImmediatePropagation();requestProspectClose();
 },true);

 function appendTo(section,element){
  const target=$('cya-hybrid-fields-'+section);if(!target||!element)return;
  if(!target.contains(element))target.appendChild(element);
 }
 function arrangeIdentityActions(){
  const input=$('lead-curp');
  const group=input?.closest('.form-group');
  const actions=$('lead-curp-actions');
  if(input&&group&&actions){
   let line=$('cya-hybrid-curp-line');
   if(!line){
    line=document.createElement('div');line.id='cya-hybrid-curp-line';
    input.insertAdjacentElement('beforebegin',line);
   }
   if(input.parentElement!==line)line.appendChild(input);
   if(actions.parentElement!==line)line.appendChild(actions);
   const renapo=[...actions.querySelectorAll('button')].find(btn=>/renapo/i.test(btn.textContent||''));
   if(renapo){
    if(renapo.textContent!=='RENAPO')renapo.textContent='RENAPO';
    renapo.setAttribute('aria-label','Verificar CURP en RENAPO');
   }
  }
  const mark=$('cya-mark-review-sent');
  const identity=$('cya-hybrid-fields-identidad');
  if(mark&&identity){
   let status=$('cya-hybrid-review-row');
   if(!status){status=document.createElement('div');status.id='cya-hybrid-review-row';}
   if(mark.parentElement!==status)status.appendChild(mark);
   if(status.parentElement!==identity)identity.appendChild(status);
  }
 }
 // Internal commercial simulator. Uses the IMSS daily SBC as an optional
 // informational input and never changes official eligibility or finances.
 function commercialMax(period){return period==='2027'?37200:35193;}
 function commercialMoney(amount){
  return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
 }
 function defaultCommercialPeriod(){return new Date()>=new Date(2027,0,11)?'2027':'2026';}
 function updateCommercial(){
  const box=$('cya-prospect-commercial');if(!box)return;
  const period=$('lead-com-periodo')?.value||defaultCommercialPeriod();
  const sbc=Math.max(0,Number($('lead-com-sbc')?.value)||0);
  const amount=Math.max(0,Number($('lead-com-retiro')?.value)||0);
  const thirty=sbc*30,fee=Math.min(amount*0.30,10000),net=amount-fee;
  for(const [id,value] of [
   ['lead-com-max',commercialMoney(commercialMax(period))],
   ['lead-com-referencia',sbc>0?commercialMoney(thirty):'—'],
   ['lead-com-honorarios',commercialMoney(fee)],
   ['lead-com-neto',commercialMoney(net)],
   ['lead-com-comparacion',thirty>0?(net/thirty).toFixed(2)+' veces':'—']
  ]){const input=$(id);if(input)input.value=value;}
  const notice=$('cya-commercial-estimate-note');
  if(notice)notice.textContent=period==='2027'?
   'Proyección operativa de 2027: $37,200 a partir de la segunda semana de enero; no es un monto autorizado.':
   'Referencia operativa de 2026: $35,193; no es un monto autorizado.';
 }
 function ensureCommercial(){
  const container=$('cya-hybrid-fields-elegibilidad');if(!container)return;
  let box=$('cya-prospect-commercial');
  if(!box){
   box=document.createElement('section');box.id='cya-prospect-commercial';
   box.setAttribute('aria-label','Información laboral y comparación comercial');
   box.innerHTML=
    '<div class="cya-com-group"><div class="cya-com-heading">INFORMACIÓN LABORAL · ÚLTIMO EMPLEO</div>'+
     '<div class="cya-com-work"><div class="cya-com-field"><label for="lead-com-empresa">Última empresa</label><input class="form-input" id="lead-com-empresa" maxlength="180" placeholder="Empresa del reporte IMSS"></div>'+
      '<div class="cya-com-field"><label for="lead-com-sbc">Último salario diario (SBC)</label><input class="form-input" id="lead-com-sbc" inputmode="decimal" type="number" step="0.01" min="0" placeholder="0.00"></div>'+
      '<div class="cya-com-field"><label for="lead-com-referencia">Referencia de 30 días</label><input class="form-input" id="lead-com-referencia" readonly tabindex="-1" value="—"></div></div></div>'+
    '<div class="cya-com-group"><div class="cya-com-headrow"><span class="cya-com-heading">COMPARACIÓN COMERCIAL · RETIRO ESTIMADO</span>'+
     '<label class="cya-com-period-label" for="lead-com-periodo">Periodo <select class="form-select" id="lead-com-periodo"><option value="2026">2026</option><option value="2027">2027</option></select></label></div>'+
     '<div class="cya-com-values">'+
      '<div class="cya-com-field"><label for="lead-com-max">Máximo de referencia</label><input class="form-input" id="lead-com-max" readonly tabindex="-1"></div>'+
      '<div class="cya-com-field"><label for="lead-com-retiro">Retiro estimado</label><input class="form-input" id="lead-com-retiro" type="number" min="0" step="0.01" inputmode="decimal"></div>'+
      '<div class="cya-com-field"><label for="lead-com-honorarios">Honorarios</label><input class="form-input" id="lead-com-honorarios" readonly tabindex="-1"></div>'+
      '<div class="cya-com-field"><label for="lead-com-neto">Neto estimado</label><input class="form-input" id="lead-com-neto" readonly tabindex="-1"></div>'+
      '<div class="cya-com-field"><label for="lead-com-comparacion">Comparación neta</label><input class="form-input cya-com-ratio" id="lead-com-comparacion" readonly tabindex="-1"></div></div>'+
     '<p class="cya-com-note" id="cya-commercial-estimate-note"></p>'+
     '<p class="cya-com-disclaimer">Referencia de 30 días del SBC y comparación interna después de honorarios. No es un retiro garantizado; la AFORE determina el monto según la modalidad aplicable.</p></div>';
   box.addEventListener('input',event=>{
    if(event.target?.id==='lead-com-sbc'||event.target?.id==='lead-com-retiro')updateCommercial();
   });
   box.addEventListener('change',event=>{
    if(event.target?.id==='lead-com-periodo'){
     // Changing the scenario year resets ONLY the commercial estimate.
     const amount=$('lead-com-retiro');if(amount)amount.value=String(commercialMax(event.target.value));
     updateCommercial();
    }
   });
  }
  if(box.parentElement!==container)container.appendChild(box);
  const prospect=currentLead(),key=String(prospect?.id||'new');
  if(box.dataset.loadedLead!==key){
   const saved=prospect?.simulacionComercial||{};
   const period=['2026','2027'].includes(String(saved.periodo||''))?String(saved.periodo):defaultCommercialPeriod();
   $('lead-com-periodo').value=period;
   $('lead-com-empresa').value=String(saved.ultimaEmpresa||'');
   $('lead-com-sbc').value=saved.salarioDiarioSbc==null?'':String(saved.salarioDiarioSbc);
   $('lead-com-retiro').value=String(saved.retiroEstimado??commercialMax(period));
   box.dataset.loadedLead=key;
  }
  box.hidden=($('lead-servicio')?.value||'retiro_desempleo')!=='retiro_desempleo';
  updateCommercial();
 }
 function routeFields(){
  const container=body();if(!container)return;
  const rowFor=id=>$(id)?.closest('.form-row');
  const groupFor=id=>$(id)?.closest('.form-group');
  // Only the first category gets the approved compact, two-row layout.
  // Reuse live inputs/handlers; never mirror form state into a second form.
  for(const id of ['lead-nombre','lead-curp','lead-nss','lead-tel','lead-colaborador','lead-email','lead-domicilio','lead-ciudad']){
   appendTo('identidad',groupFor(id));
  }
  const registration=$('lead-registration-wrap'),registrationSlot=$('cya-hybrid-registration-slot');
  if(registration&&registrationSlot&&registration.parentElement!==registrationSlot)
   registrationSlot.appendChild(registration);
  arrangeIdentityActions();
  // Other categories retain their existing implementation until approved.
  appendTo('elegibilidad',container.querySelector('.form-section'));
  appendTo('elegibilidad',$('lead-elegibilidad-container'));
  appendTo('elegibilidad',groupFor('lead-afore'));
  appendTo('elegibilidad',groupFor('lead-banco'));
  const eleg=$('cya-hybrid-fields-elegibilidad');
  if(eleg)eleg.dataset.eligibilityService=$('lead-servicio')?.value||'retiro_desempleo';
  ensureCommercial();
  appendTo('origen',groupFor('lead-fuente'));
  // Keep the SINGLE original stage selector beside WhatsApp in the
  // persistent dossier header (not duplicated under Seguimiento).
  const stepper=$('cya-prospect-stage-stepper'),wa=$('cya-hybrid-lead-whatsapp');
  if(stepper&&wa&&stepper.nextElementSibling!==wa)wa.before(stepper);
  appendTo('seguimiento',rowFor('lead-servicio'));
  appendTo('seguimiento',groupFor('lead-notas'));
  const questionnaire=$('cya-meta-questionnaire-panel');
  if(questionnaire){
   appendTo('origen',questionnaire);
   const l=currentLead();
   questionnaire.hidden=!Boolean(l?.metaLead||l?.origenMeta||l?.metaAds);
  }
  const extra=$('cya-lead-extra-fields');if(extra)extra.hidden=true;
  const tabs=$('cya-meta-lead-tabs');if(tabs)tabs.hidden=true;
 }
 function makeHistory(lead){
  const target=$('cya-hybrid-fields-historial');if(!target)return;
  const arrays=[lead?.historial,lead?.historialRevision,lead?.historialReconsultas].filter(Array.isArray);
  const all=arrays.flat().filter(v=>v&&typeof v==='object');
  // Historical archived leads predate the archive-history event. Surface
  // their stored fechaArchivo without manufacturing a duplicate when present.
  if(lead?.fechaArchivo&&!all.some(v=>v.tipo==='archivo'))
   all.push({fecha:lead.fechaArchivo,tipo:'archivo',accion:'Prospecto archivado',detalle:'Archivado: '+(lead.causaArchivo||'Causa no especificada')});
  const entries=all.slice(-30).reverse();
  target.innerHTML=entries.length?entries.map(v=>{
   const rawDate=String(v.fecha||v.createdAt||v.registradoEn||v.fechaISO||'');
   const archiveStamp=/^\d{4}-\d{2}-\d{2}T/.test(rawDate);
   const date=archiveStamp&&!Number.isNaN(new Date(rawDate).getTime())?
     new Date(rawDate).toLocaleString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):txt(rawDate);
   const desc=txt(v.detalle||v.descripcion||v.accion||v.tipo||'Actividad');
   return '<div class="cya-hybrid-history-line"><small>'+safe(date)+'</small><span>'+safe(desc)+'</span></div>';
  }).join(''):'<div class="cya-hybrid-empty">Sin movimientos adicionales registrados.</div>';
 }
 function summary(){
  const root=$('cya-hybrid-lead-root');if(!root)return;
  const l=currentLead(),name=byId('lead-nombre')||l?.nombre||'Nuevo prospecto',
    curp=byId('lead-curp')||l?.curp||'CURP pendiente',
    phone=byId('lead-tel')||l?.telefono||'Teléfono pendiente',
    source=byId('lead-fuente')||l?.fuenteContacto||l?.origen?.fuente||'Origen pendiente';
  $('cya-hybrid-lead-name').textContent=name;
  $('cya-hybrid-lead-contact').textContent=curp+' · '+phone;
  const person=typeof store!=='undefined'?store.colaboradores?.find(c=>String(c.id)===String(byId('lead-colaborador')||l?.colaboradorId||'')):null;
  const advisor=typeof store!=='undefined'?store.asesores?.find(a=>String(a.id)===String(l?.asesorId||'')):null;
  $('cya-hybrid-lead-context').innerHTML=
   '<span>'+safe(advisor?.nombre||'Asesor asignado')+'</span><span>'+safe(person?.nombre||'Cliente directo')+'</span><span>'+safe(source)+'</span>';
  const descriptions={
   identidad:txt(byId('lead-nombre')||l?.nombre)+' · '+txt(byId('lead-tel')||l?.telefono),
   elegibilidad:(l?.servicio==='retiro_desempleo'||byId('lead-servicio')==='retiro_desempleo'?'Preaprobación y validación':'Validación por servicio'),
   origen:source+(l?.metaLead?.campaignName?' · '+l.metaLead.campaignName:''),
   seguimiento:txt($('lead-estado')?.selectedOptions?.[0]?.textContent||'Etapa pendiente'),
   historial:(Array.isArray(l?.historial)?l.historial.length:0)+' registros'
  };
  for(const [key,value] of Object.entries(descriptions)){const el=root.querySelector('[data-hybrid-summary="'+key+'"]');if(el)el.textContent=value;}
  // Interpretación humana de Meta Ads: no mostrar IDs técnicos, valores de API ni
  // cuestionarios duplicados. La fuente original sigue disponible en el registro.
  const meta=l?.metaLead||l?.origenMeta||null;
  const sourceBox=$('cya-hybrid-origin-overview')||document.createElement('details');
  if(!sourceBox.id){sourceBox.id='cya-hybrid-origin-overview';sourceBox.className='cya-hybrid-origin-overview';$('cya-hybrid-fields-origen')?.appendChild(sourceBox);}
  const wasExpanded=sourceBox.open===true;
  const clean=x=>String(x??'').trim();
  const sourceRows=[
   ['Campaña',meta?.campaignName||meta?.campaign_name],
   ['Conjunto',meta?.adsetName||meta?.adset_name],['Anuncio',meta?.adName||meta?.ad_name],
   ['Formulario',meta?.formName||meta?.form_name]
  ].filter(([k,v])=>clean(v)&&clean(v)!=='—'&&!(k==='Fuente'&&clean(v)==='Origen pendiente'));
  sourceBox.innerHTML='<summary class="cya-hybrid-source-title">Detalles de Meta Ads <span aria-hidden="true">▾</span></summary><div class="cya-hybrid-source-grid">'+
    (sourceRows.length?sourceRows.map(([label,value])=>'<div class="cya-hybrid-source-row"><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong></div>').join(''):'<span class="cya-hybrid-empty">Fuente sin confirmar</span>')+
    '</div><p class="cya-hybrid-source-note">Datos de procedencia de la solicitud. Los identificadores técnicos permanecen ocultos.</p>';
  sourceBox.open=wasExpanded;
  const qualify=$('cya-hybrid-qualification')||document.createElement('div');
  if(!qualify.id){qualify.id='cya-hybrid-qualification';$('cya-hybrid-fields-origen')?.prepend(qualify);}
  const result=l&&typeof window.cyaMetaQualification==='function'?window.cyaMetaQualification(l):null;
  qualify.className='cya-hybrid-qualification '+(result?'is-'+result.tone:'is-orange');
  qualify.innerHTML='<strong>'+safe(result?.label||'Precalificación pendiente de revisión')+'</strong><small>'+
    safe(result?.reason||'Sin respuestas suficientes para clasificar')+
    (result?.needsBalanceReview?' · Consultar saldo directamente en AFORE':'')+
    '</small><span>Resultado orientativo; no sustituye la validación IMSS/AFORE.</span>';
  // Operational priority: eligibility result, human answers, editable source,
  // then optional collapsed campaign metadata.
  const origin=$('cya-hybrid-fields-origen');
  if(origin){
   origin.prepend(qualify);
   const questionnaire=$('cya-meta-questionnaire-panel');
   if(questionnaire)qualify.insertAdjacentElement('afterend',questionnaire);
   const sourceControl=$('lead-fuente')?.closest('.form-group');
   if(sourceControl)origin.appendChild(sourceControl);
   origin.appendChild(sourceBox);
  }
  const status=root.querySelector('[data-hybrid-summary="elegibilidad"]');
  if(status&&result)status.textContent=result.label;
  makeHistory(l);
 }
 function showSelected(){
  const root=$('cya-hybrid-lead-root');if(!root)return;
  const eligibilityFields=$('cya-hybrid-fields-elegibilidad');
  if(eligibilityFields)eligibilityFields.dataset.eligibilityService=byId('lead-servicio')||'retiro_desempleo';
  const commercial=$('cya-prospect-commercial');if(commercial)commercial.hidden=byId('lead-servicio')!=='retiro_desempleo';
  // Use the approved short labels only inside the hybrid unemployment panel;
  // the original eligibility engine, values and validators stay untouched.
  if(eligibilityFields?.dataset.eligibilityService==='retiro_desempleo'){
   for(const [id,label] of [
     ['lead-el-semanas','Semanas cotizadas'],
     ['lead-el-cotiza','¿IMSS activo?'],
     ['lead-el-fecha-retiro','Último retiro']
   ]){
    const original=$(id)?.closest('.form-group')?.querySelector('.form-label');
    if(original&&original.textContent!==label)original.textContent=label;
   }
  }
  TABS.forEach(({id})=>{
   const section=$('cya-hybrid-section-'+id),btn=root.querySelector('[data-hybrid-lead-section="'+id+'"]');
   if(section)section.hidden=id!==current;
   if(btn){btn.classList.toggle('active',id===current);btn.setAttribute('aria-pressed',String(id===current));}
  });
  summary();
 }
 function refresh(){
  if(!modal()?.classList.contains('open'))return;
  const l=currentLead(),key=l?.id||'new';
  if(lastLeadKey!==key){current='identidad';dirty=false;lastLeadKey=key;}
  makeUI();routeFields();showSelected();
 }
 // Preserve all existing inputs and saving logic. Dirty guard only applies to
 // switching hybrid sections; existing Cancel and Guardar remain untouched.
 document.addEventListener('input',event=>{
  if(!modal()?.classList.contains('open'))return;
  if(event.target?.closest?.('.cya-hybrid-lead-section'))dirty=true;
 },true);
 document.addEventListener('change',event=>{
  if(!modal()?.classList.contains('open'))return;
  if(event.target?.closest?.('.cya-hybrid-lead-section')){dirty=true;summary();}
 },true);
 const baseOpen=window.openModalLead;
 if(typeof baseOpen==='function')window.openModalLead=function(...args){
  // A new edit session rehydrates persisted values; discarding a draft must not
  // bring back unsaved values when reopening the same prospect.
  const commercial=$('cya-prospect-commercial');if(commercial)delete commercial.dataset.loadedLead;
  const result=baseOpen.apply(this,args);
  const key=args[0]||'new';lastLeadKey=key;current='identidad';dirty=false;
  // The legacy modal is populated synchronously by openModalLead; rebuild its
  // presentation BEFORE the browser paints the next frame. No old-form flash.
  try{refresh();}catch(error){console.error('Prospecto híbrido: no se pudo preparar el expediente',error);}
  captureSnapshot();
  // Meta Ads fills its extra controls and builds the real stage buttons in a
  // zero-delay callback. Reparent once that completes and use their final
  // populated values as the clean baseline, not transient empty placeholders.
  setTimeout(()=>{
   if(!modal()?.classList.contains('open'))return;
   routeFields();
   captureSnapshot();
  },30);
  if(modal()?.classList.contains('open')&&!$('cya-hybrid-lead-root')){
   document.documentElement.dataset.cyaProspectFallback='1';
  }
  return result;
 };
 // Core save keeps an existing prospect's modal open. Refresh the card
 // metadata in place, without calling openModalLead or moving form controls.
 // The event is emitted only after cloudSyncNow succeeds.
 document.addEventListener('cya:prospect-saved',event=>{
  if(!modal()?.classList.contains('open'))return;
  const savedId=event.detail?.id;
  if(savedId&&String(savedId)!==String(currentLead()?.id))return;
  captureSnapshot();
  lastLeadKey=savedId||lastLeadKey;
  showSelected();
 });
 document.addEventListener('cya:prospect-stage-saved',event=>{
  if(!modal()?.classList.contains('open'))return;
  if(initialFields)initialFields['lead-estado']=$('lead-estado')?.value;
  dirty=hasUnsavedChanges();
  showSelected();
 });
 // Do not wrap guardarLead just to close and reopen the same dossier.
 // The native save plus the other Meta wrappers preserve their own behavior.
 // One first refresh handles a modal already open at module initialization.
 if(modal()?.classList.contains('open'))refresh();
})();
