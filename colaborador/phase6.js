/* Portal Colaboradores: archivo contraíble, agrupado por causa y expediente de consulta. */
(function installCollaboratorDiscardedProspects(){
 'use strict';
 if(window.__caCollaboratorDiscardedProspectsInstalled)return;
 window.__caCollaboratorDiscardedProspectsInstalled=true;
 const DISCARDED_STATUSES=new Set(['archivado','descartado']);
 let discardedRequestToken=0,discardedItems=[],expanded=false,loaded=false;
 const $=id=>document.getElementById(id);
 const sanitize=v=>String(v??'').replace(/[&<>"']/g,ch=>ch==='&'?'&amp;':ch==='<'?'&lt;':ch==='>'?'&gt;':ch==='"'?'&quot;':'&#39;');
 function isDiscardedProspect(p){return DISCARDED_STATUSES.has(String(p?.internalStatus||'').toLowerCase());}
 function activeProspects(){return Array.isArray(state?.prospects)?state.prospects.filter(p=>!isDiscardedProspect(p)):[];}
 function serviceName(id){return state?.bootstrap?.services?.find(s=>s.id===id)?.name||id||'Servicio';}
 async function loadDiscarded(){
  const {data,error}=await portalClient.functions.invoke('collaborator-discarded',{body:{action:'list',tenantSlug:window.ALVA_TENANT_ROUTE?.tenantSlug||undefined}});
  if(error){
   let message=error.message||'No se pudieron consultar los descartados';
   try{if(error.context){const payload=await error.context.json();message=payload?.error||message;}}catch(_){}
   throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return Array.isArray(data?.items)?data.items:[];
 }
 function reasonOf(item){return String(item.reason||'Sin causa especificada').trim()||'Sin causa especificada';}
 function groupedCards(items){
  const groups=new Map();
  for(const item of items){
   const label=reasonOf(item),key=label.toLocaleLowerCase('es-MX');
   if(!groups.has(key))groups.set(key,{label,items:[]});
   groups.get(key).items.push(item);
  }
  return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label,'es-MX')).map(group=>
   '<section class="ca-archive-group"><header class="ca-archive-group-head"><h3>'+sanitize(group.label)+'</h3><span>'+group.items.length+'</span></header><div class="ca-archive-group-items">'+
   group.items.map(item=>'<button class="ca-archive-person" type="button" data-archive-id="'+sanitize(item.id)+'" aria-label="Ver expediente archivado de '+sanitize(item.name||'Prospecto')+'"><strong>'+sanitize(item.name||'Prospecto')+'</strong><span>'+sanitize(reasonOf(item))+'</span></button>').join('')+
   '</div></section>'
  ).join('');
 }
 function ensureDiscardedHost(){
  const board=document.querySelector('.phase-board-wrap');
  if(!board)return null;
  let section=$('discarded-prospects-section');
  if(section)return section;
  section=document.createElement('section');
  section.id='discarded-prospects-section';section.className='discarded-section';
  section.innerHTML='<div class="discarded-section-head"><button type="button" class="ca-archive-toggle" aria-expanded="false" aria-controls="discarded-prospects-content"><span class="ca-archive-toggle-intro"><span class="eyebrow">HISTORIAL</span><strong>Descartados</strong><small>Prospectos archivados por el asesor, agrupados según la causa registrada.</small></span><span class="ca-archive-toggle-meta"><span class="discarded-count">…</span><span class="ca-archive-chevron" aria-hidden="true">▸</span></span></button></div><div id="discarded-prospects-content" class="discarded-grid" hidden></div>';
  board.insertAdjacentElement('afterend',section);
  section.querySelector('.ca-archive-toggle').addEventListener('click',()=>{expanded=!expanded;repaint();});
  section.querySelector('.discarded-grid').addEventListener('click',e=>{
   const button=e.target.closest('button[data-archive-id]');
   if(button)window.caOpenDiscardedExpediente(button.dataset.archiveId);
  });
  return section;
 }
 function repaint(){
  const section=$('discarded-prospects-section');if(!section)return;
  const toggle=section.querySelector('.ca-archive-toggle'),grid=section.querySelector('.discarded-grid');
  toggle.setAttribute('aria-expanded',String(expanded));
  section.classList.toggle('is-expanded',expanded);
  section.querySelector('.ca-archive-chevron').textContent=expanded?'▾':'▸';
  grid.hidden=!expanded;
  if(!expanded)return;
  grid.innerHTML=!loaded?'<div class="discarded-loading">Consultando descartados…</div>':
   discardedItems.length?groupedCards(discardedItems):'<div class="discarded-empty">No tienes prospectos descartados.</div>';
 }
 async function renderDiscardedSection(){
  if(state?.page!=='prospectos')return;
  const section=ensureDiscardedHost();if(!section)return;
  const count=section.querySelector('.discarded-count'),token=++discardedRequestToken;
  loaded=false;discardedItems=[];repaint();
  try{
   const items=await loadDiscarded();
   if(token!==discardedRequestToken||state?.page!=='prospectos')return;
   discardedItems=items;loaded=true;
   count.textContent=String(items.length);
   repaint();
  }catch(error){
   if(token!==discardedRequestToken||state?.page!=='prospectos')return;
   loaded=true;discardedItems=[];count.textContent='—';
   section.querySelector('.discarded-grid').innerHTML='<div class="discarded-error">'+sanitize(error?.message||'No se pudieron consultar los descartados.')+'</div>';
  }
 }
 function ensureArchiveModal(){
  if($('ca-archived-prospect-modal'))return;
  const root=document.createElement('div');root.id='ca-archived-prospect-modal';root.className='modal-overlay';root.hidden=true;
  root.innerHTML='<section class="modal ca-archived-expediente" role="dialog" aria-modal="true" aria-labelledby="ca-archived-expediente-title"><header class="modal-head"><div><span class="eyebrow">EXPEDIENTE ARCHIVADO · SOLO CONSULTA</span><h3 id="ca-archived-expediente-title">Prospecto descartado</h3></div><button type="button" class="icon-button" id="ca-archived-close" aria-label="Cerrar expediente">×</button></header><div class="ca-archived-expediente-body" id="ca-archived-expediente-body"></div><div class="modal-actions ca-archived-expediente-actions"><button class="btn" type="button" id="ca-archived-dismiss">Cerrar</button></div></section>';
  document.body.appendChild(root);
  const close=()=>root.hidden=true;
  $('ca-archived-close').addEventListener('click',close);
  $('ca-archived-dismiss').addEventListener('click',close);
  root.addEventListener('click',e=>{if(e.target===root)close();});
 }
 function info(label,value){
  return '<div class="ca-archived-field"><small>'+sanitize(label)+'</small><strong>'+sanitize(value||'Sin dato')+'</strong></div>';
 }
 window.caOpenDiscardedExpediente=function(id){
  const item=discardedItems.find(x=>String(x.id)===String(id));if(!item)return;
  ensureArchiveModal();
  $('ca-archived-expediente-title').textContent=item.name||'Prospecto descartado';
  const reason=reasonOf(item);
  $('ca-archived-expediente-body').innerHTML=
   '<div class="ca-archived-fields">'+info('Nombre',item.name)+info('CURP',item.curp)+info('Teléfono',item.phone)+info('Servicio',serviceName(item.serviceId))+info('Fecha del archivo',typeof dateMX==='function'?dateMX(item.date):item.date)+'</div>'+
   '<section class="ca-archived-reason"><h4>Causa de descarte</h4><p>'+sanitize(reason)+'</p></section>'+
   (item.archiveNotes?'<section class="ca-archived-notes"><h4>Observaciones del archivo</h4><p>'+sanitize(item.archiveNotes)+'</p></section>':'')+
   (item.originalNotes?'<section class="ca-archived-notes"><h4>Notas del prospecto</h4><p>'+sanitize(item.originalNotes)+'</p></section>':'')+
   '<p class="ca-archived-readonly">Este expediente está archivado y se presenta en modo de consulta. Su estado no cambiará al abrirlo.</p>';
  $('ca-archived-prospect-modal').hidden=false;
 };
 const baseNavigate=window.navigate;
 window.navigate=function(page,silent=false){
  const prevPage=state?.page;
  let result;
  if((page==='prospectos'||page==='inicio')&&Array.isArray(state?.prospects)){
   const all=state.prospects;state.prospects=activeProspects();
   try{result=baseNavigate(page,silent);}finally{state.prospects=all;}
  }else result=baseNavigate(page,silent);
  if(page==='prospectos'){
   if(prevPage!=='prospectos')expanded=false;
   requestAnimationFrame(renderDiscardedSection);
  }else{
   ++discardedRequestToken;
   const archived=$('ca-archived-prospect-modal');
   if(archived)archived.hidden=true;
  }
  return result;
 };
 if(state?.page==='prospectos')window.navigate('prospectos',true);
})();
