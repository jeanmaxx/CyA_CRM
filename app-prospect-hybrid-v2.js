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
 let current='identidad',dirty=false,lastLeadKey='';
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
  container.insertBefore(root,container.firstChild);
  root.querySelectorAll('[data-hybrid-lead-section]').forEach(btn=>btn.addEventListener('click',()=>{
   if(btn.dataset.hybridLeadSection===current)return;
   if(dirty&&!window.confirm('Hay cambios pendientes de guardar. ¿Deseas continuar a otra sección sin guardarlos todavía?'))return;
   current=btn.dataset.hybridLeadSection;showSelected();
  }));
  root.querySelector('#cya-hybrid-lead-whatsapp').addEventListener('click',()=>{
   if(typeof window.cyaAbrirCentroMensajesWhatsApp==='function')window.cyaAbrirCentroMensajesWhatsApp();
   else if(typeof window.cyaAbrirWhatsAppProspectoPorId==='function'&&currentLead())window.cyaAbrirWhatsAppProspectoPorId(currentLead().id);
  });
  return root;
 }
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
 function routeFields(){
  const container=body();if(!container)return;
  const rowFor=id=>$(id)?.closest('.form-row');
  const groupFor=id=>$(id)?.closest('.form-group');
  // Only the first category gets the approved compact, two-row layout.
  // Reuse live inputs/handlers; never mirror form state into a second form.
  for(const id of ['lead-nombre','lead-curp','lead-colaborador','lead-tel','lead-email','lead-domicilio','lead-ciudad']){
   appendTo('identidad',groupFor(id));
  }
  const registration=$('lead-registration-wrap'),registrationSlot=$('cya-hybrid-registration-slot');
  if(registration&&registrationSlot&&registration.parentElement!==registrationSlot)
   registrationSlot.appendChild(registration);
  arrangeIdentityActions();
  // Other categories retain their existing implementation until approved.
  appendTo('elegibilidad',container.querySelector('.form-section'));
  appendTo('elegibilidad',$('lead-elegibilidad-container'));
  appendTo('elegibilidad',groupFor('lead-nss'));
  appendTo('elegibilidad',groupFor('lead-afore'));
  appendTo('elegibilidad',groupFor('lead-banco'));
  const eleg=$('cya-hybrid-fields-elegibilidad');
  if(eleg)eleg.dataset.eligibilityService=$('lead-servicio')?.value||'retiro_desempleo';
  appendTo('origen',groupFor('lead-fuente'));
  appendTo('seguimiento',$('cya-prospect-stage-stepper'));
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
  const entries=arrays.flat().filter(v=>v&&typeof v==='object').slice(-30).reverse();
  target.innerHTML=entries.length?entries.map(v=>{
   const date=txt(v.fecha||v.createdAt||v.registradoEn||v.fechaISO||'');
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
  const result=baseOpen.apply(this,args);
  const key=args[0]||'new';lastLeadKey=key;current='identidad';dirty=false;
  setTimeout(refresh,120);
  return result;
 };
 // Maintain the approved continuity rule: after a successful save, keep the
 // expediente open on the same section without creating a second data record.
 const originalSave=window.guardarLead;
 if(typeof originalSave==='function')window.guardarLead=async function(...args){
  const openBefore=modal()?.classList.contains('open')===true,section=current;
  const response=await originalSave.apply(this,args);
  if(openBefore&&!modal()?.classList.contains('open')){
   const id=typeof editingLeadId!=='undefined'?editingLeadId:null;
   const persisted=id&&typeof store!=='undefined'&&store.leads?.some(l=>String(l.id)===String(id));
   if(persisted&&typeof window.openModalLead==='function'){
    window.openModalLead(id);
    current=section;dirty=false;
    setTimeout(()=>{refresh();current=section;showSelected();},160);
   }
  }
  return response;
 };
 // One first refresh handles a modal already open at module initialization.
 if(modal()?.classList.contains('open'))setTimeout(refresh,120);
})();
