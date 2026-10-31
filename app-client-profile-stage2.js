/* Stage 2 client-profile overview for C&A CRM.
   Additive UI layer: reorganizes the first view without changing client data or workflow logic. */
(function installClientProfileStage2(){
  if(window.__cyaClientProfileStage2Installed)return;
  window.__cyaClientProfileStage2Installed=true;

  const STYLE_ID='cya-client-profile-stage2-styles';
  let decorating=false;
  let scheduled=false;

  const esc=value=>{
    if(typeof escapeHTMLBasico==='function')return escapeHTMLBasico(String(value??''));
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  };
  const clean=value=>String(value??'').trim();
  const missing=value=>!clean(value);
  const clientByActiveProfile=()=>{
    try{
      const id=typeof perfilClienteActivo!=='undefined'?perfilClienteActivo:null;
      return (store?.clientes||[]).find(c=>String(c.id)===String(id))||null;
    }catch(_){return null;}
  };
  const dateLabel=value=>{
    if(!value)return 'Por definir';
    try{
      if(typeof fmtDate==='function')return fmtDate(value)||'Por definir';
    }catch(_){}
    const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match?`${match[3]}/${match[2]}/${match[1]}`:String(value);
  };
  const stageName=client=>{
    try{
      if(typeof stageLabel==='function')return stageLabel(client?.etapa,client?.servicio)||client?.etapa||'—';
    }catch(_){}
    try{
      const stages=typeof stagesFor==='function'?stagesFor(client?.servicio):[];
      return stages.find(s=>s.id===client?.etapa)?.label||client?.etapa||'—';
    }catch(_){return client?.etapa||'—';}
  };
  const docsProgress=client=>{
    try{
      const list=typeof docsFor==='function'?docsFor(client?.servicio):[];
      const docs=client?.docs||{};
      const received=list.filter(item=>docs[item.id]).length;
      return {received,total:list.length};
    }catch(_){return {received:0,total:0};}
  };
  const contractInfo=client=>{
    const history=Array.isArray(client?.historialContratos)?client.historialContratos:[];
    const latest=history.length?history[history.length-1]:null;
    return {created:history.length>0,count:history.length,latest};
  };

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #modal-perfil .cya-stage2-overview{margin-bottom:14px;}
      #modal-perfil .cya-stage2-section{border:1px solid var(--border);border-radius:var(--radius-md);background:color-mix(in srgb,var(--bg-card) 94%,transparent);padding:13px;margin-bottom:12px;}
      #modal-perfil .cya-stage2-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;}
      #modal-perfil .cya-stage2-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--text-muted);}
      #modal-perfil .cya-stage2-section-note{font-size:10px;color:var(--text-muted);}
      #modal-perfil .cya-stage2-ops-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}
      #modal-perfil .cya-stage2-data-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;}
      #modal-perfil .cya-stage2-card{min-width:0;position:relative;display:flex;flex-direction:column;justify-content:center;min-height:74px;padding:11px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-secondary);overflow:hidden;text-align:left;}
      #modal-perfil button.cya-stage2-card{width:100%;font:inherit;color:inherit;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease;}
      #modal-perfil button.cya-stage2-card:hover{border-color:var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 7%,var(--bg-secondary));transform:translateY(-1px);}
      #modal-perfil button.cya-stage2-card:focus-visible{outline:2px solid var(--accent-blue);outline-offset:2px;}
      #modal-perfil .cya-stage2-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--border-strong);}
      #modal-perfil .cya-stage2-card.is-primary::before{background:var(--accent-blue);}
      #modal-perfil .cya-stage2-card.is-success::before{background:var(--success);}
      #modal-perfil .cya-stage2-card.is-warning::before{background:var(--warning);}
      #modal-perfil .cya-stage2-card.is-danger::before{background:var(--danger);}
      #modal-perfil .cya-stage2-card-label{font-size:9px;line-height:1.2;text-transform:uppercase;letter-spacing:.75px;color:var(--text-muted);margin-bottom:6px;}
      #modal-perfil .cya-stage2-card-value{min-width:0;font-size:13px;line-height:1.28;font-weight:650;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #modal-perfil .cya-stage2-card-value.is-blue{color:var(--accent-blue);}
      #modal-perfil .cya-stage2-card-value.is-green{color:var(--success);}
      #modal-perfil .cya-stage2-card-value.is-amber{color:var(--warning);}
      #modal-perfil .cya-stage2-card-meta{min-width:0;font-size:9px;line-height:1.3;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #modal-perfil .cya-stage2-card.is-wide{grid-column:span 2;}
      #modal-perfil .cya-stage2-card.is-wide .cya-stage2-card-value{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
      #modal-perfil .cya-stage2-open-hint{font-size:9px;color:var(--accent-blue);margin-top:5px;font-weight:600;}
      #modal-perfil .cya-stage2-pending{border:1px solid color-mix(in srgb,var(--warning) 34%,var(--border));border-radius:var(--radius-md);padding:12px;margin:0 0 12px;background:color-mix(in srgb,var(--warning) 4%,var(--bg-card));}
      #modal-perfil .cya-stage2-pending-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      #modal-perfil .cya-stage2-pending .alerta-firma,#modal-perfil .cya-stage2-pending .alerta-afore-urgente,#modal-perfil .cya-stage2-pending .alerta-afore-proxima{margin:0!important;min-height:38px!important;border-radius:8px!important;padding:9px 11px!important;font-size:11px!important;}
      #modal-perfil .cya-stage2-pending-empty{font-size:11px;color:var(--success);padding:3px 1px;}
      #modal-perfil .cya-stage2-stage-label{margin:4px 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--text-muted);}
      #modal-perfil .profile-stage-wrap{margin-bottom:10px!important;}
      #modal-perfil .profile-stage-track{padding-bottom:2px!important;}
      #modal-perfil .profile-stage-step{padding-top:4px!important;padding-bottom:4px!important;}
      #modal-perfil .profile-stage-number{width:20px!important;height:20px!important;font-size:10px!important;}
      #modal-perfil .profile-stage-label{font-size:9px!important;}
      #modal-perfil .profile-stage-current{margin-top:2px!important;font-size:10px!important;}
      #modal-perfil .profile-summary-grid{display:none!important;}
      #modal-perfil .profile-tabs{margin-top:4px!important;}
      @media(min-width:761px){
        #modal-perfil .profile-header{display:grid!important;grid-template-columns:minmax(260px,1fr) auto!important;align-items:center!important;gap:18px!important;padding:14px 18px 13px 20px!important;}
        #modal-perfil .profile-header-copy{grid-column:1!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important;}
        #modal-perfil #perfil-title{font-size:17px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        #modal-perfil .profile-header-actions{grid-column:2!important;position:static!important;width:auto!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:nowrap!important;gap:7px!important;}
        #modal-perfil .profile-header-actions .btn{min-height:36px!important;height:36px!important;padding:0 12px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}
        #modal-perfil .profile-header-actions .profile-close{position:static!important;top:auto!important;right:auto!important;width:36px!important;height:36px!important;min-width:36px!important;padding:0!important;order:99!important;}
      }
      @media(max-width:980px){#modal-perfil .cya-stage2-ops-grid{grid-template-columns:repeat(2,minmax(0,1fr));}#modal-perfil .cya-stage2-data-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
      @media(max-width:760px){#modal-perfil .cya-stage2-section{padding:10px;}#modal-perfil .cya-stage2-ops-grid,#modal-perfil .cya-stage2-data-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}#modal-perfil .cya-stage2-card{min-height:68px;padding:9px 10px;}#modal-perfil .cya-stage2-card.is-wide{grid-column:span 2;}#modal-perfil .cya-stage2-pending-list{grid-template-columns:1fr;}}
      @media(max-width:430px){#modal-perfil .cya-stage2-ops-grid,#modal-perfil .cya-stage2-data-grid{grid-template-columns:1fr;}#modal-perfil .cya-stage2-card.is-wide{grid-column:auto;}}
    `;
    document.head.appendChild(style);
  }

  function cardHTML({label,value,meta='',tone='',panel='',wide=false,valueClass=''}){
    const tag=panel?'button':'div';
    const panelAttrs=panel?` type="button" onclick="cyaPerfilIrASeccion('${esc(panel)}')" aria-label="${esc(label)}: ${esc(value)}. Abrir sección."`:'';
    const hint=panel?'<div class="cya-stage2-open-hint">Abrir sección →</div>':'';
    return `<${tag} class="cya-stage2-card ${tone?`is-${tone}`:''} ${wide?'is-wide':''}"${panelAttrs}><div class="cya-stage2-card-label">${esc(label)}</div><div class="cya-stage2-card-value ${valueClass}">${esc(value||'—')}</div>${meta?`<div class="cya-stage2-card-meta" title="${esc(meta)}">${esc(meta)}</div>`:''}${hint}</${tag}>`;
  }

  function buildOverview(client){
    const docs=docsProgress(client);
    const contract=contractInfo(client);
    const hasAppointment=Boolean(client?.fechaBiometrica);
    const signed=Boolean(client?.contratoFirmado);
    const firmaValue=signed?dateLabel(client.fechaFirmaContrato):'Pendiente';
    const cobroValue=client?.fechaRetiroEstimada?dateLabel(client.fechaRetiroEstimada):'Por definir';
    const appointmentValue=hasAppointment?dateLabel(client.fechaBiometrica):'Sin cita';
    const appointmentMeta=hasAppointment?(clean(client.horaBiometrica)||'Hora por confirmar'):'Captura la cita cuando se programe';
    const contractValue=contract.created?'Contrato creado':'Crear contrato';
    const contractMeta=contract.created?(signed?`Firmado ${dateLabel(client.fechaFirmaContrato)}`:`${contract.count} contrato${contract.count===1?'':'s'} en historial`):'Sin contratos generados desde el sistema';
    const docsValue=docs.total?`${docs.received}/${docs.total} recibidos`:'Sin checklist';
    const docsMeta=docs.total&&docs.received===docs.total?'Documentación completa':'Revisar documentación';
    const bank=clean(client?.banco)||'Pendiente';
    const address=clean(client?.domicilio)||'Sin domicilio capturado';
    return `<div class="cya-stage2-overview" id="cya-stage2-overview"><section class="cya-stage2-section"><div class="cya-stage2-section-head"><div class="cya-stage2-section-title">Resumen operativo</div><div class="cya-stage2-section-note">Lo más importante del trámite, de un vistazo</div></div><div class="cya-stage2-ops-grid">${cardHTML({label:'Etapa actual',value:stageName(client),tone:'primary',valueClass:'is-blue'})}${cardHTML({label:'Fecha de firma',value:firmaValue,meta:signed?'Contrato firmado':'Aún no se registra firma',tone:signed?'success':'warning',valueClass:signed?'is-green':'is-amber',panel:'pd-contratos'})}${cardHTML({label:'Cobro probable',value:cobroValue,meta:'Fecha estimada de retiro / cobro',panel:'pd-finanzas'})}${cardHTML({label:'Contrato',value:contractValue,meta:contractMeta,tone:contract.created?'success':'primary',valueClass:contract.created?'is-green':'is-blue',panel:'pd-contratos'})}${cardHTML({label:'Cita AFORE',value:appointmentValue,meta:appointmentMeta,tone:hasAppointment?'success':'warning',valueClass:hasAppointment?'is-green':'is-amber',panel:'pd-cita-afore'})}${cardHTML({label:'Documentos',value:docsValue,meta:docsMeta,tone:docs.total&&docs.received===docs.total?'success':'warning',valueClass:docs.total&&docs.received===docs.total?'is-green':'is-amber',panel:'pd-docs'})}</div></section><section class="cya-stage2-section"><div class="cya-stage2-section-head"><div class="cya-stage2-section-title">Datos del cliente</div><div class="cya-stage2-section-note">Información de consulta rápida</div></div><div class="cya-stage2-data-grid">${cardHTML({label:'CURP',value:clean(client?.curp)||'Sin CURP'})}${cardHTML({label:'Teléfono',value:clean(client?.telefono)||'Sin teléfono'})}${cardHTML({label:'Ciudad',value:clean(client?.ciudad)||'Sin ciudad'})}${cardHTML({label:'AFORE',value:clean(client?.afore)||'Sin AFORE'})}${cardHTML({label:'Dirección',value:address,wide:true})}${cardHTML({label:'Banco',value:bank,tone:missing(client?.banco)?'warning':'',valueClass:missing(client?.banco)?'is-amber':''})}</div></section></div>`;
  }

  function installOutsideClose(){
    const overlay=document.getElementById('modal-perfil');
    if(!overlay||overlay.dataset.cyaStage2OutsideClose==='1')return;
    overlay.dataset.cyaStage2OutsideClose='1';
    overlay.addEventListener('click',event=>{
      if(event.target!==overlay||!overlay.classList.contains('open'))return;
      if(typeof closeModal==='function')closeModal('modal-perfil');
      else overlay.classList.remove('open');
    });
  }

  function pendingCandidates(body){
    return [...body.children].filter(node=>{
      if(node.id==='cya-stage2-overview'||node.id==='cya-stage2-pending'||node.id==='cya-stage2-stage-label')return false;
      return node.classList?.contains('alerta-firma')||node.classList?.contains('alerta-afore-urgente')||node.classList?.contains('alerta-afore-proxima');
    });
  }

  function rebuildPending(body,overview,stageWrap){
    body.querySelector('#cya-stage2-pending')?.remove();
    const pending=[];
    for(const node of pendingCandidates(body)){
      const text=(node.textContent||'').trim();
      if(node.classList.contains('alerta-verde')&&/Contrato firmado/i.test(text)){node.remove();continue;}
      if(node.classList.contains('alerta-roja')&&/DESCARTADO/i.test(text))continue;
      pending.push(node);
    }
    const section=document.createElement('section');
    section.id='cya-stage2-pending';section.className='cya-stage2-pending';
    section.innerHTML=`<div class="cya-stage2-section-head"><div class="cya-stage2-section-title">Seguimiento y pendientes</div><div class="cya-stage2-section-note">${pending.length?`${pending.length} punto${pending.length===1?'':'s'} por revisar`:'Sin pendientes operativos visibles'}</div></div><div class="cya-stage2-pending-list"></div>`;
    const list=section.querySelector('.cya-stage2-pending-list');
    if(pending.length){for(const node of pending)list.appendChild(node);}else list.innerHTML='<div class="cya-stage2-pending-empty">✓ No hay pendientes operativos visibles en este expediente.</div>';
    if(stageWrap)body.insertBefore(section,stageWrap);else if(overview?.nextSibling)body.insertBefore(section,overview.nextSibling);else body.appendChild(section);
    return section;
  }

  function ensureStageLabel(body,stageWrap){
    body.querySelector('#cya-stage2-stage-label')?.remove();
    if(!stageWrap)return;
    const label=document.createElement('div');label.id='cya-stage2-stage-label';label.className='cya-stage2-stage-label';label.textContent='Etapas del trámite';body.insertBefore(label,stageWrap);
  }

  function decorateProfile(){
    if(decorating)return;
    const modal=document.getElementById('modal-perfil');
    const body=document.getElementById('perfil-body');
    const client=clientByActiveProfile();
    if(!modal||!body||!client||!modal.classList.contains('open'))return;
    decorating=true;
    try{
      body.querySelector('#cya-stage2-overview')?.remove();
      body.querySelector('#cya-stage2-stage-label')?.remove();
      const summary=body.querySelector('.profile-summary-grid');if(summary)summary.style.setProperty('display','none','important');
      const holder=document.createElement('div');holder.innerHTML=buildOverview(client);const overviewNode=holder.firstElementChild;
      const stageWrap=body.querySelector('.profile-stage-wrap');
      const tabs=body.querySelector('#perfil-tabs');
      const discarded=[...body.children].find(node=>node.classList?.contains('alerta-roja')&&/DESCARTADO/i.test(node.textContent||''));
      if(discarded&&discarded.nextSibling)body.insertBefore(overviewNode,discarded.nextSibling);else if(stageWrap)body.insertBefore(overviewNode,stageWrap);else body.prepend(overviewNode);
      const pendingSection=rebuildPending(body,overviewNode,stageWrap);
      if(stageWrap){if(tabs)body.insertBefore(stageWrap,tabs);else body.appendChild(stageWrap);body.insertBefore(pendingSection,stageWrap);ensureStageLabel(body,stageWrap);}
      modal.dataset.cyaStage2ClientId=String(client.id||'');
    }finally{decorating=false;}
  }

  window.cyaPerfilIrASeccion=function(panelId){
    const panel=document.getElementById(panelId);
    const tabs=[...document.querySelectorAll('#perfil-tabs .tab')];
    const tab=tabs.find(item=>{const onclick=item.getAttribute('onclick')||'';return onclick.includes(`'${panelId}'`)||onclick.includes(`"${panelId}"`);});
    if(panel&&tab&&typeof pTab==='function'){
      pTab(panelId,tab);
      requestAnimationFrame(()=>{tab.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});});
    }
  };

  ensureStyles();installOutsideClose();
  const observer=new MutationObserver(()=>{if(decorating||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;installOutsideClose();decorateProfile();});});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  let attempts=0;
  const timer=setInterval(()=>{attempts++;ensureStyles();installOutsideClose();decorateProfile();if(attempts>1200)clearInterval(timer);},50);
})();
