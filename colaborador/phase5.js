/* Phase 5 · Eligible-to-continue visual lane + internal NSS support image. */
(function installCollaboratorEligibleLaneAndNssImage(){
  if(window.__caCollaboratorEligibleLaneInstalled)return;
  window.__caCollaboratorEligibleLaneInstalled=true;

  const ELIGIBLE_STATUS='aprobado';
  const NSS_IMAGE='assets/nss-estructura-interna.jpg';

  function isEligibleWaiting(p){
    return String(p?.internalStatus||'')===ELIGIBLE_STATUS&&Number(p?.phase||1)===1;
  }

  function eligibleProspects(){
    return Array.isArray(state?.prospects)?state.prospects.filter(isEligibleWaiting):[];
  }

  function eligibleCard(p){
    return `<article class="prospect-card eligible-prospect-card">
      <div class="prospect-card-head"><div><h4>${esc(p.name)}</h4><div class="curp">${esc(p.curp)}</div></div><button class="icon-button" style="width:28px;height:28px;font-size:11px" onclick="openProspectModal('${esc(p.id)}')" title="Editar">✎</button></div>
      <div class="prospect-meta">${prospectDetails(p)}</div>
      <div class="eligibility-confirmed">✓ Elegibilidad confirmada por asesor / administración.</div>
      <div class="eligibility-note">Contacta al prospecto para continuar con la documentación.</div>
      <div class="prospect-actions"><button class="btn" onclick="openProspectModal('${esc(p.id)}')">Ver datos</button><button class="btn btn-primary" onclick="completePhase('${esc(p.id)}',1)">Continuar a documentación</button></div>
    </article>`;
  }

  function injectEligibleLane(){
    const board=document.querySelector('.phase-board');
    if(!board||board.querySelector('[data-eligible-column]'))return;
    const columns=board.querySelectorAll(':scope > .phase-column');
    const first=columns[0];if(!first)return;
    const eligible=eligibleProspects();

    if(eligible.length){
      const eligibleCurps=new Set(eligible.map(p=>String(p.curp||'').trim().toUpperCase()).filter(Boolean));
      first.querySelectorAll('.prospect-card').forEach(card=>{
        const curp=String(card.querySelector('.curp')?.textContent||'').trim().toUpperCase();
        if(eligibleCurps.has(curp))card.remove();
      });
      const firstCards=first.querySelector('.phase-cards');
      if(firstCards&&!firstCards.querySelector('.prospect-card')&&!firstCards.querySelector('.empty-state'))firstCards.innerHTML='<div class="empty-state">Sin prospectos en esta fase.</div>';
      const firstCount=first.querySelector('.phase-count');if(firstCount)firstCount.textContent=String(first.querySelectorAll('.prospect-card').length);
    }

    const lane=document.createElement('div');lane.className='phase-column eligible-column';lane.dataset.eligibleColumn='1';
    lane.innerHTML=`<header class="phase-head"><div class="phase-title-row"><span class="phase-num">✓</span><div><h3>Elegible para continuar</h3><p>Validación confirmada por asesor o administración. Ya puedes contactar al prospecto para reunir documentación.</p></div><span class="phase-count">${eligible.length}</span></div></header><div class="phase-cards">${eligible.length?eligible.map(eligibleCard).join(''):'<div class="empty-state">Sin prospectos elegibles pendientes de continuar.</div>'}</div>`;
    first.insertAdjacentElement('afterend',lane);
  }

  function injectNssImage(){
    const guideItems=Array.isArray(state?.bootstrap?.guideContent)?state.bootstrap.guideContent:[];
    const nss=guideItems.find(x=>x.slug==='nss');if(!nss)return;
    const cards=[...document.querySelectorAll('.guide-card')];
    const card=cards.find(el=>String(el.querySelector('.guide-card-copy strong')?.textContent||'').trim()===String(nss.title||'').trim());
    const body=card?.querySelector('.guide-card-body');if(!body||body.querySelector('[data-nss-internal-image]'))return;
    const source=body.querySelector('.guide-source');
    const figure=document.createElement('figure');figure.className='guide-media guide-media-internal';figure.dataset.nssInternalImage='1';
    figure.innerHTML=`<div class="guide-media-label">Material interno · no oficial</div><img src="${NSS_IMAGE}" alt="Infografía interna sobre la estructura del Número de Seguridad Social (NSS)" loading="lazy"><figcaption>Apoyo visual interno para explicar la estructura del NSS. No sustituye la información ni los criterios oficiales del IMSS.</figcaption>`;
    if(source)body.insertBefore(figure,source);else body.appendChild(figure);
  }

  function installStyles(){
    if(document.getElementById('ca-phase5-styles'))return;
    const style=document.createElement('style');style.id='ca-phase5-styles';style.textContent=`
      .phase-board{grid-template-columns:repeat(6,minmax(240px,1fr));min-width:1480px}
      .eligible-column{border-color:rgba(51,196,141,.28);background:linear-gradient(180deg,rgba(51,196,141,.045),#0d1828 28%)}
      .eligible-column .phase-head{background:rgba(51,196,141,.055)}
      .eligible-column .phase-num{background:var(--success);color:#071910}
      .eligible-column .phase-head h3{color:#83dfba}
      .eligible-prospect-card{border-color:rgba(51,196,141,.25)}
      .eligibility-confirmed{margin-top:8px;border-left:3px solid var(--success);background:rgba(51,196,141,.07);border-radius:7px;padding:8px 9px;color:#8ee1bf;font-size:8.5px;font-weight:600;line-height:1.45}
      .eligibility-note{margin-top:6px;color:var(--muted);font-size:8px;line-height:1.45}
      .guide-media{margin:14px 0 2px;max-width:980px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0a1524}
      .guide-media img{display:block;width:100%;height:auto;background:#fff}
      .guide-media-label{padding:7px 10px;border-bottom:1px solid var(--border);font-size:8px;font-weight:700;letter-spacing:.55px;text-transform:uppercase;color:var(--warning);background:rgba(240,184,96,.06)}
      .guide-media figcaption{padding:9px 11px;color:var(--muted);font-size:8.5px;line-height:1.5}
      @media(max-width:780px){.phase-board{grid-template-columns:repeat(6,82vw);min-width:max-content}.guide-media{margin-top:12px}}
      @media(max-width:430px){.phase-board{grid-template-columns:repeat(6,86vw)}}
    `;document.head.appendChild(style);
  }

  installStyles();
  const baseNavigate=window.navigate;
  window.navigate=function(page,silent=false){
    const result=baseNavigate(page,silent);
    if(page==='prospectos')requestAnimationFrame(injectEligibleLane);
    if(page==='guia')requestAnimationFrame(injectNssImage);
    return result;
  };

  const observer=new MutationObserver(()=>{
    if(state?.page==='prospectos')injectEligibleLane();
    if(state?.page==='guia')injectNssImage();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
