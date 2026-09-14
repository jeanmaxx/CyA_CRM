/* Phase 6 · Separate archived/discarded prospects from active follow-up. */
(function installCollaboratorDiscardedProspects(){
  if(window.__caCollaboratorDiscardedProspectsInstalled)return;
  window.__caCollaboratorDiscardedProspectsInstalled=true;

  const DISCARDED_STATUSES=new Set(['archivado','descartado']);
  let discardedRequestToken=0;

  function isDiscardedProspect(p){return DISCARDED_STATUSES.has(String(p?.internalStatus||'').toLowerCase());}
  function activeProspects(){return Array.isArray(state?.prospects)?state.prospects.filter(p=>!isDiscardedProspect(p)):[];}
  function serviceName(id){return state?.bootstrap?.services?.find(s=>s.id===id)?.name||id||'Servicio';}

  async function loadDiscarded(){
    const {data,error}=await portalClient.functions.invoke('collaborator-discarded',{body:{action:'list'}});
    if(error){
      let message=error.message||'No se pudieron consultar los descartados';
      try{if(error.context){const payload=await error.context.json();message=payload?.error||message;}}catch(_){ }
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return Array.isArray(data?.items)?data.items:[];
  }

  function discardedCard(item){
    const reason=String(item.reason||'Archivado por el asesor').trim();
    const detail=String(item.archiveNotes||'').trim();
    const noteText=`Motivo registrado por el asesor: ${reason}${detail?`. Detalle: ${detail}`:'.'}`;
    const previous=String(item.originalNotes||'').trim();
    return `<article class="discarded-card">
      <div class="discarded-card-head"><div><span class="discarded-chip">Descartado</span><h4>${esc(item.name||'Prospecto')}</h4></div><span class="discarded-date">${dateMX(item.date)}</span></div>
      <div class="discarded-data">
        <div><small>CURP</small><strong>${esc(item.curp||'Sin dato')}</strong></div>
        <div><small>Teléfono</small><strong>${esc(item.phone||'Sin dato')}</strong></div>
        <div><small>Servicio</small><strong>${esc(serviceName(item.serviceId))}</strong></div>
      </div>
      <div class="discarded-reason"><small>Razón de descarte</small><strong>${esc(reason)}</strong>${detail?`<span>${esc(detail)}</span>`:''}</div>
      <div class="discarded-notes"><small>Notas</small><p>${esc(noteText)}</p></div>
      ${previous?`<details class="discarded-previous"><summary>Ver notas previas del prospecto</summary><p>${esc(previous)}</p></details>`:''}
    </article>`;
  }

  function ensureDiscardedHost(){
    const boardWrap=document.querySelector('.phase-board-wrap');
    if(!boardWrap)return null;
    let section=document.getElementById('discarded-prospects-section');
    if(section)return section;
    section=document.createElement('section');
    section.id='discarded-prospects-section';section.className='discarded-section';
    section.innerHTML='<div class="discarded-section-head"><div><span class="eyebrow">HISTORIAL</span><h2>Descartados</h2><p>Prospectos que el asesor o administración archivó. Se conservan aquí para que conozcas el resultado y la razón registrada.</p></div><span class="discarded-count">…</span></div><div class="discarded-grid"><div class="discarded-loading">Consultando descartados…</div></div>';
    boardWrap.insertAdjacentElement('afterend',section);
    return section;
  }

  async function renderDiscardedSection(){
    if(state?.page!=='prospectos')return;
    const section=ensureDiscardedHost();if(!section)return;
    const grid=section.querySelector('.discarded-grid'),count=section.querySelector('.discarded-count');
    const token=++discardedRequestToken;
    if(grid)grid.innerHTML='<div class="discarded-loading">Consultando descartados…</div>';
    try{
      const items=await loadDiscarded();
      if(token!==discardedRequestToken||state?.page!=='prospectos')return;
      if(count)count.textContent=String(items.length);
      if(grid)grid.innerHTML=items.length?items.map(discardedCard).join(''):'<div class="discarded-empty">No tienes prospectos descartados.</div>';
    }catch(error){
      if(token!==discardedRequestToken)return;
      if(count)count.textContent='—';
      if(grid)grid.innerHTML=`<div class="discarded-error">${esc(error.message||'No se pudieron consultar los descartados.')}</div>`;
    }
  }

  function installStyles(){
    if(document.getElementById('ca-phase6-styles'))return;
    const style=document.createElement('style');style.id='ca-phase6-styles';style.textContent=`
      .discarded-section{margin-top:22px;border:1px solid rgba(239,107,115,.18);background:linear-gradient(180deg,rgba(239,107,115,.035),rgba(14,25,41,.75));border-radius:16px;overflow:hidden}
      .discarded-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--border)}
      .discarded-section-head h2{font:700 20px var(--display);margin:3px 0 2px;color:#f3c3c6}.discarded-section-head p{margin:0;color:var(--muted);font-size:9px;line-height:1.5;max-width:780px}
      .discarded-count{min-width:32px;height:28px;border-radius:999px;padding:0 10px;display:grid;place-items:center;background:rgba(239,107,115,.1);border:1px solid rgba(239,107,115,.2);color:#f1a6ac;font-size:10px;font-weight:700}
      .discarded-grid{padding:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .discarded-card{border:1px solid var(--border);background:var(--card);border-radius:12px;padding:12px;min-width:0}.discarded-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.discarded-card h4{font-size:11px;line-height:1.35;margin:5px 0 0}.discarded-chip{display:inline-flex;border-radius:999px;padding:3px 7px;background:rgba(239,107,115,.09);border:1px solid rgba(239,107,115,.2);color:#f0a0a7;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.55px}.discarded-date{font-size:8px;color:var(--muted);white-space:nowrap}
      .discarded-data{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.discarded-data>div:last-child{grid-column:1/-1}.discarded-data small,.discarded-reason small,.discarded-notes small{display:block;color:#74869a;font-size:7.5px;text-transform:uppercase;letter-spacing:.45px}.discarded-data strong{display:block;color:#d7dee6;font-size:8.5px;margin-top:3px;overflow-wrap:anywhere}
      .discarded-reason{margin-top:10px;border-left:3px solid var(--danger);background:rgba(239,107,115,.055);border-radius:7px;padding:8px 9px}.discarded-reason strong{display:block;color:#f0b2b7;font-size:9px;margin-top:3px}.discarded-reason span{display:block;color:#c7aeb1;font-size:8.5px;line-height:1.45;margin-top:4px}
      .discarded-notes{margin-top:9px}.discarded-notes p,.discarded-previous p{margin:4px 0 0;color:#b9c4cf;font-size:8.5px;line-height:1.55;white-space:pre-wrap}.discarded-previous{margin-top:8px;border-top:1px solid var(--border);padding-top:8px}.discarded-previous summary{cursor:pointer;color:var(--muted);font-size:8px}.discarded-loading,.discarded-empty,.discarded-error{grid-column:1/-1;padding:22px;text-align:center;color:var(--muted);font-size:9px}.discarded-error{color:var(--danger)}
      @media(max-width:1050px){.discarded-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:780px){.discarded-section{margin-top:16px}.discarded-section-head{padding:13px;align-items:center}.discarded-section-head h2{font-size:18px}.discarded-grid{grid-template-columns:1fr;padding:9px}.discarded-card{padding:11px}}
    `;document.head.appendChild(style);
  }

  installStyles();
  const baseNavigate=window.navigate;
  window.navigate=function(page,silent=false){
    let result;
    if((page==='prospectos'||page==='inicio')&&Array.isArray(state?.prospects)){
      const all=state.prospects;state.prospects=activeProspects();
      try{result=baseNavigate(page,silent);}finally{state.prospects=all;}
    }else result=baseNavigate(page,silent);
    if(page==='prospectos')requestAnimationFrame(renderDiscardedSection);
    return result;
  };

  if(state?.page==='prospectos')window.navigate('prospectos',true);
})();
