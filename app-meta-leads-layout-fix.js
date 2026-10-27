/* Final layout/count alignment for Meta Leads prospect board. */
(function installMetaLeadsLayoutFix(){
  if(window.__cyaMetaLeadsLayoutFixInstalled)return;
  window.__cyaMetaLeadsLayoutFixInstalled=true;

  function visibleCardCount(col){
    const body=col?.querySelector(':scope > .lead-col-body');
    return body?body.querySelectorAll(':scope > .lead-card').length:0;
  }

  function updateStageCounter(col){
    if(!col||col.id==='cya-meta-new-column')return;
    const header=col.querySelector(':scope > .lead-col-header');
    if(!header)return;
    const spans=[...header.querySelectorAll(':scope > span')];
    if(spans.length<2)return;
    const counter=spans[spans.length-1];
    if(!/^\d+$/.test(String(counter.textContent||'').trim()))return;
    counter.textContent=String(visibleCardCount(col));
    counter.classList.add('cya-stage-count');
  }

  function apply(){
    const kanban=document.querySelector('.leads-kanban');
    if(!kanban)return;

    /* The base board is CSS grid with five equal columns. Override the grid itself
       so the Meta intake lane can actually be wider than the operational lanes. */
    kanban.classList.add('cya-meta-board-grid');
    kanban.style.gridTemplateColumns='190px minmax(290px,1.35fr) repeat(3,minmax(205px,1fr))';

    kanban.querySelectorAll('.lead-col').forEach(updateStageCounter);

    const meta=document.getElementById('cya-meta-new-column');
    if(meta){
      meta.style.width='auto';
      meta.style.minWidth='0';
      meta.style.maxWidth='none';
    }

    kanban.querySelectorAll('.cya-special-leads-stack > .lead-col').forEach(col=>{
      const header=col.querySelector(':scope > .lead-col-header');
      if(!header)return;
      const spans=[...header.querySelectorAll(':scope > span')];
      if(spans.length>1)spans[spans.length-1].classList.add('cya-stage-count');
    });
  }

  const style=document.createElement('style');
  style.id='cya-meta-leads-layout-fix-styles';
  style.textContent=`
    .leads-kanban.cya-meta-board-grid{grid-template-columns:190px minmax(290px,1.35fr) repeat(3,minmax(205px,1fr))!important;align-items:start!important;}
    .cya-special-leads-stack{width:190px!important;min-width:190px!important;max-width:190px!important;}
    .cya-special-leads-stack .lead-col-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;}
    .cya-special-leads-stack .lead-col-header>span:first-child{min-width:0;flex:1 1 auto;}
    .cya-special-leads-stack .lead-col-header>.cya-stage-count{margin-left:auto!important;flex:0 0 auto!important;}
    .cya-special-leads-stack .lead-col-header::after{flex:0 0 auto;margin-left:0!important;}
    #cya-meta-new-column{width:auto!important;min-width:0!important;max-width:none!important;}
    #cya-meta-new-column .lead-col-body{padding-left:10px;padding-right:10px;}
    #cya-meta-new-column .lead-card{width:100%;box-sizing:border-box;}
    @media(max-width:1100px){
      .leads-kanban.cya-meta-board-grid{grid-template-columns:180px minmax(270px,1.3fr) repeat(3,minmax(200px,1fr))!important;}
      .cya-special-leads-stack{width:180px!important;min-width:180px!important;max-width:180px!important;}
    }
    @media(max-width:700px){
      .leads-kanban.cya-meta-board-grid{grid-template-columns:180px 250px repeat(3,220px)!important;}
      #cya-meta-new-column{width:auto!important;min-width:0!important;}
    }
  `;
  document.head.appendChild(style);

  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply();});
  }).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(apply,0);
  setTimeout(apply,150);
})();
