/* Stage 2 client profile overview for C&A CRM. Additive; no data/schema changes. */
(function installClientProfileStage2(){
  if(window.__cyaClientProfileStage2Installed)return;
  window.__cyaClientProfileStage2Installed=true;
  let busy=false,scheduled=false;

  const e=v=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=v=>String(v??'').trim();
  const activeClient=()=>{try{return (store?.clientes||[]).find(c=>String(c.id)===String(perfilClienteActivo))||null;}catch(_){return null;}};
  const date=v=>{if(!v)return'Por definir';try{return fmtDate(v)||'Por definir';}catch(_){const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v);}};
  const stage=c=>{try{return stageLabel(c.etapa,c.servicio)||c.etapa||'—';}catch(_){try{return stagesFor(c.servicio).find(s=>s.id===c.etapa)?.label||c.etapa||'—';}catch(__){return c.etapa||'—';}}};
  const docs=c=>{try{const list=docsFor(c.servicio),d=c.docs||{};return {ok:list.filter(x=>d[x.id]).length,total:list.length};}catch(_){return {ok:0,total:0};}};

  function css(){
    if(document.getElementById('cya-stage2-styles'))return;
    const s=document.createElement('style');s.id='cya-stage2-styles';s.textContent=`
      #modal-perfil .cya2{margin-bottom:12px}.cya2-box{border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);padding:12px;margin-bottom:10px}
      .cya2-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}.cya2-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.85px;color:var(--text-muted)}.cya2-note{font-size:10px;color:var(--text-muted)}
      .cya2-ops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.cya2-data{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .cya2-card{position:relative;min-width:0;min-height:70px;padding:10px 11px;border:1px solid var(--border);border-radius:9px;background:var(--bg-secondary);display:flex;flex-direction:column;justify-content:center;text-align:left;overflow:hidden}
      button.cya2-card{width:100%;font:inherit;color:inherit;cursor:pointer}button.cya2-card:hover{border-color:var(--accent-blue)}.cya2-card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--border-strong)}
      .cya2-card.blue:before{background:var(--accent-blue)}.cya2-card.green:before{background:var(--success)}.cya2-card.amber:before{background:var(--warning)}
      .cya2-l{font-size:9px;text-transform:uppercase;letter-spacing:.65px;color:var(--text-muted);margin-bottom:5px}.cya2-v{font-size:13px;font-weight:650;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cya2-v.blue{color:var(--accent-blue)}.cya2-v.green{color:var(--success)}.cya2-v.amber{color:var(--warning)}
      .cya2-m{font-size:9px;color:var(--text-muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cya2-go{font-size:9px;color:var(--accent-blue);font-weight:600;margin-top:4px}.cya2-wide{grid-column:span 2}.cya2-wide .cya2-v{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      #cya2-pending{border:1px solid color-mix(in srgb,var(--warning) 35%,var(--border));border-radius:var(--radius-md);background:color-mix(in srgb,var(--warning) 4%,var(--bg-card));padding:11px;margin-bottom:10px}
      #cya2-pending-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#cya2-pending .alerta-firma,#cya2-pending .alerta-afore-urgente,#cya2-pending .alerta-afore-proxima{margin:0!important;min-height:36px!important;padding:8px 10px!important;border-radius:8px!important;font-size:11px!important}.cya2-ok{font-size:11px;color:var(--success)}
      #cya2-stage-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.85px;color:var(--text-muted);margin:2px 0 7px}.profile-summary-grid{display:none!important}#modal-perfil .profile-stage-wrap{margin-bottom:9px!important}#modal-perfil .profile-stage-number{width:20px!important;height:20px!important;font-size:10px!important}#modal-perfil .profile-stage-label{font-size:9px!important}#modal-perfil .profile-stage-current{font-size:10px!important;margin-top:2px!important}
      @media(min-width:761px){#modal-perfil .profile-header{display:grid!important;grid-template-columns:minmax(250px,1fr) auto!important;align-items:center!important;gap:16px!important;padding:13px 18px 12px 20px!important}#modal-perfil .profile-header-copy{grid-column:1!important;width:auto!important;min-width:0!important;margin:0!important}#modal-perfil #perfil-title{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:17px!important}#modal-perfil .profile-header-actions{grid-column:2!important;position:static!important;width:auto!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:nowrap!important;gap:7px!important}#modal-perfil .profile-header-actions .btn{height:36px!important;min-height:36px!important;padding:0 11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}#modal-perfil .profile-header-actions .profile-close{position:static!important;top:auto!important;right:auto!important;width:36px!important;min-width:36px!important;padding:0!important;order:99!important}}
      @media(max-width:980px){.cya2-ops,.cya2-data{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.cya2-ops,.cya2-data{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.cya2-wide{grid-column:span 2}#cya2-pending-list{grid-template-columns:1fr}.cya2-box{padding:10px}}
      @media(max-width:430px){.cya2-ops,.cya2-data{grid-template-columns:1fr}.cya2-wide{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function card(label,value,meta='',tone='',panel='',wide=false){
    const tag=panel?'button':'div',cls=`cya2-card ${tone} ${wide?'cya2-wide':''}`;
    const act=panel?` type="button" onclick="cyaPerfilIrASeccion('${e(panel)}')"`:'';
    return `<${tag} class="${cls}"${act}><div class="cya2-l">${e(label)}</div><div class="cya2-v ${tone}">${e(value||'—')}</div>${meta?`<div class="cya2-m" title="${e(meta)}">${e(meta)}</div>`:''}${panel?'<div class="cya2-go">Abrir sección →</div>':''}</${tag}>`;
  }

  function overview(c){
    const d=docs(c),hist=Array.isArray(c.historialContratos)?c.historialContratos:[],created=hist.length>0,signed=Boolean(c.contratoFirmado),hasCita=Boolean(c.fechaBiometrica);
    const contractMeta=created?(signed?`Firmado ${date(c.fechaFirmaContrato)}`:`${hist.length} contrato${hist.length===1?'':'s'} en historial`):'Sin contratos generados desde el sistema';
    return `<div class="cya2" id="cya2-overview">
      <section class="cya2-box"><div class="cya2-head"><div class="cya2-title">Resumen operativo</div><div class="cya2-note">Lo más importante del trámite</div></div><div class="cya2-ops">
        ${card('Etapa actual',stage(c),'','blue')}
        ${card('Fecha de firma',signed?date(c.fechaFirmaContrato):'Pendiente',signed?'Contrato firmado':'Aún no se registra firma',signed?'green':'amber','pd-contratos')}
        ${card('Cobro probable',c.fechaRetiroEstimada?date(c.fechaRetiroEstimada):'Por definir','Fecha estimada de retiro / cobro','','pd-finanzas')}
        ${card('Contrato',created?'Contrato creado':'Crear contrato',contractMeta,created?'green':'blue','pd-contratos')}
        ${card('Cita AFORE',hasCita?date(c.fechaBiometrica):'Sin cita',hasCita?(text(c.horaBiometrica)||'Hora por confirmar'):'Captura la cita cuando se programe',hasCita?'green':'amber','pd-cita-afore')}
        ${card('Documentos',d.total?`${d.ok}/${d.total} recibidos`:'Sin checklist',d.total&&d.ok===d.total?'Documentación completa':'Revisar documentación',d.total&&d.ok===d.total?'green':'amber','pd-docs')}
      </div></section>
      <section class="cya2-box"><div class="cya2-head"><div class="cya2-title">Datos del cliente</div><div class="cya2-note">Consulta rápida</div></div><div class="cya2-data">
        ${card('CURP',text(c.curp)||'Sin CURP')}${card('Teléfono',text(c.telefono)||'Sin teléfono')}${card('Ciudad',text(c.ciudad)||'Sin ciudad')}${card('AFORE',text(c.afore)||'Sin AFORE')}
        ${card('Dirección',text(c.domicilio)||'Sin domicilio capturado','','','',true)}${card('Banco',text(c.banco)||'Pendiente','',text(c.banco)?'':'amber')}
      </div></section>
    </div>`;
  }

  function alertNode(n){return n?.classList?.contains('alerta-firma')||n?.classList?.contains('alerta-afore-urgente')||n?.classList?.contains('alerta-afore-proxima');}
  function directAlerts(body){return [...body.children].filter(n=>alertNode(n)&&!(n.classList.contains('alerta-roja')&&/DESCARTADO/i.test(n.textContent||'')));}

  function pendingSection(body,stageWrap){
    let sec=document.getElementById('cya2-pending');
    if(!sec){sec=document.createElement('section');sec.id='cya2-pending';sec.innerHTML='<div class="cya2-head"><div class="cya2-title">Seguimiento y pendientes</div><div class="cya2-note" id="cya2-pending-count"></div></div><div id="cya2-pending-list"></div>';stageWrap?body.insertBefore(sec,stageWrap):body.appendChild(sec);}
    const list=sec.querySelector('#cya2-pending-list');
    for(const n of directAlerts(body)){if(n.classList.contains('alerta-verde')&&/Contrato firmado/i.test(n.textContent||'')){n.remove();continue;}list.appendChild(n);}
    const items=[...list.children].filter(alertNode);sec.querySelector('#cya2-pending-count').textContent=items.length?`${items.length} punto${items.length===1?'':'s'} por revisar`:'Sin pendientes operativos visibles';
    let empty=list.querySelector('.cya2-ok');if(!items.length&&!empty){empty=document.createElement('div');empty.className='cya2-ok';empty.textContent='✓ No hay pendientes operativos visibles en este expediente.';list.appendChild(empty);}if(items.length&&empty)empty.remove();return sec;
  }

  function decorate(){
    if(busy)return;
    const modal=document.getElementById('modal-perfil'),body=document.getElementById('perfil-body'),c=activeClient();
    if(!modal?.classList.contains('open')||!body||!c)return;
    const hasOverview=Boolean(body.querySelector('#cya2-overview'));if(hasOverview&&directAlerts(body).length===0)return;
    busy=true;
    try{
      const stageWrap=body.querySelector('.profile-stage-wrap'),tabs=body.querySelector('#perfil-tabs');
      if(!hasOverview){const holder=document.createElement('div');holder.innerHTML=overview(c);const ov=holder.firstElementChild;const discarded=[...body.children].find(n=>n.classList?.contains('alerta-roja')&&/DESCARTADO/i.test(n.textContent||''));if(discarded?.nextSibling)body.insertBefore(ov,discarded.nextSibling);else if(stageWrap)body.insertBefore(ov,stageWrap);else body.prepend(ov);}
      const sec=pendingSection(body,stageWrap);
      if(stageWrap){if(tabs)body.insertBefore(stageWrap,tabs);body.insertBefore(sec,stageWrap);if(!body.querySelector('#cya2-stage-label')){const l=document.createElement('div');l.id='cya2-stage-label';l.textContent='Etapas del trámite';body.insertBefore(l,stageWrap);}}
      body.querySelector('.profile-summary-grid')?.style.setProperty('display','none','important');
    }finally{busy=false;}
  }

  function outsideClose(){
    const o=document.getElementById('modal-perfil');if(!o||o.dataset.cya2Outside==='1')return;o.dataset.cya2Outside='1';
    o.addEventListener('click',ev=>{if(ev.target===o&&o.classList.contains('open')){if(typeof closeModal==='function')closeModal('modal-perfil');else o.classList.remove('open');}});
  }

  window.cyaPerfilIrASeccion=function(id){
    const panel=document.getElementById(id),tab=[...document.querySelectorAll('#perfil-tabs .tab')].find(t=>(t.getAttribute('onclick')||'').includes(id));
    if(panel&&tab&&typeof pTab==='function'){pTab(id,tab);requestAnimationFrame(()=>{tab.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});});}
  };

  css();outsideClose();decorate();
  new MutationObserver(()=>{if(busy||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;outsideClose();decorate();});}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
