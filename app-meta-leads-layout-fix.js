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

    kanban.querySelectorAll('.lead-col').forEach(updateStageCounter);

    const meta=document.getElementById('cya-meta-new-column');
    if(meta){
      meta.style.flex='0 0 270px';
      meta.style.minWidth='270px';
      meta.style.width='270px';
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
    .cya-special-leads-stack .lead-col-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;}
    .cya-special-leads-stack .lead-col-header>span:first-child{min-width:0;flex:1 1 auto;}
    .cya-special-leads-stack .lead-col-header>.cya-stage-count{margin-left:auto!important;flex:0 0 auto!important;}
    .cya-special-leads-stack .lead-col-header::after{flex:0 0 auto;margin-left:0!important;}
    #cya-meta-new-column{flex:0 0 270px!important;min-width:270px!important;width:270px!important;}
    #cya-meta-new-column .lead-col-body{padding-left:10px;padding-right:10px;}
    @media(max-width:700px){#cya-meta-new-column{flex-basis:240px!important;min-width:240px!important;width:240px!important;}}
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
