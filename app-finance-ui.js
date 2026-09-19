/* Finance section controls: chronological priority, manual ordering and collapsible cards. */
(function installFinanceSectionControls(){
  if(window.__cyaFinanceSectionControlsLoaded)return;
  window.__cyaFinanceSectionControlsLoaded=true;

  const financeSectionState={
    proximas:{collapsed:false,dir:'asc'},
    cobradas:{collapsed:false,dir:'asc'},
    colaboradores:{collapsed:false,dir:'asc'},
  };

  function timestamp(value){
    if(!value)return 0;
    if(typeof parseFechaFlexible==='function'){
      const parsed=parseFechaFlexible(value);
      if(parsed&&!Number.isNaN(parsed.getTime()))return parsed.getTime();
    }
    const direct=new Date(value);
    return Number.isNaN(direct.getTime())?0:direct.getTime();
  }

  function timestampFromFields(record,fields){
    for(const field of fields){
      const value=timestamp(record?.[field]);
      if(value)return value;
    }
    return 0;
  }

  function clientIdFromItem(item){
    const onclick=item?.getAttribute?.('onclick')||'';
    return onclick.match(/openPerfil\(['"]([^'"]+)['"]\)/)?.[1]||'';
  }

  function clientFromItem(item){
    const id=clientIdFromItem(item);
    return (store?.clientes||[]).find(client=>String(client.id)===String(id))||null;
  }

  function upcomingTimestamp(client){
    return timestampFromFields(client,[
      'fechaRetiroEstimada','fechaSolicitudManual','fechaSolicitudRealizada',
      'fechaAltaAfore','fechaFirmaContrato','fechaRegistro','fechaCaptura'
    ]);
  }

  function paidTimestamp(client){
    return timestampFromFields(client,[
      'fechaCierre','fechaHonorarios','fechaDeposito','fechaRetiroReal',
      'fechaRetiroEstimada','fechaSolicitudManual','fechaSolicitudRealizada',
      'fechaAltaAfore','fechaRegistro','fechaCaptura'
    ]);
  }

  function compareTimestamp(a,b,dir){
    const aMissing=!Number.isFinite(a)||a<=0;
    const bMissing=!Number.isFinite(b)||b<=0;
    if(aMissing&&bMissing)return 0;
    if(aMissing)return 1;
    if(bMissing)return -1;
    return dir==='desc'?b-a:a-b;
  }

  function directChildren(parent,className){
    return [...(parent?.children||[])].filter(node=>node.classList?.contains(className));
  }

  function sortItems(parent,dir,resolver){
    const items=directChildren(parent,'comision-item');
    items.sort((a,b)=>{
      const ca=clientFromItem(a),cb=clientFromItem(b);
      const byDate=compareTimestamp(resolver(ca),resolver(cb),dir);
      return byDate||String(ca?.nombre||'').localeCompare(String(cb?.nombre||''),'es');
    }).forEach(item=>parent.appendChild(item));
  }

  function sortUpcoming(card,dir){
    const months=directChildren(card,'comision-mes');
    const monthDates=new Map();
    months.forEach(month=>{
      sortItems(month,dir,upcomingTimestamp);
      const dates=directChildren(month,'comision-item').map(item=>upcomingTimestamp(clientFromItem(item))).filter(Boolean);
      monthDates.set(month,dates.length?Math.min(...dates):0);
    });
    months.sort((a,b)=>compareTimestamp(monthDates.get(a),monthDates.get(b),dir)).forEach(month=>card.appendChild(month));
  }

  function sortPaid(card,dir){
    sortItems(card,dir,paidTimestamp);
  }

  function collaboratorPriorityTimestamp(row){
    const name=String(row?.cells?.[0]?.textContent||'').trim();
    const collaborator=(store?.colaboradores||[]).find(item=>String(item.nombre||'').trim()===name);
    if(!collaborator)return 0;
    const clients=(store?.clientes||[]).filter(client=>String(client.colaboradorId||'')===String(collaborator.id));
    const upcoming=clients.map(upcomingTimestamp).filter(Boolean);
    if(upcoming.length)return Math.min(...upcoming);
    const financial=clients.map(paidTimestamp).filter(Boolean);
    if(financial.length)return Math.min(...financial);
    return timestamp(collaborator.fechaAlta);
  }

  function sortCollaborators(card,dir){
    const tbody=card.querySelector('tbody');
    if(!tbody)return;
    [...tbody.rows].sort((a,b)=>{
      const byDate=compareTimestamp(collaboratorPriorityTimestamp(a),collaboratorPriorityTimestamp(b),dir);
      return byDate||String(a.cells?.[0]?.textContent||'').localeCompare(String(b.cells?.[0]?.textContent||''),'es');
    }).forEach(row=>tbody.appendChild(row));
  }

  function cardFor(key){
    return document.querySelector(`[data-cya-finance-section="${key}"]`);
  }

  function applySort(key){
    const card=cardFor(key);
    if(!card)return;
    const dir=financeSectionState[key]?.dir||'asc';
    if(key==='proximas')sortUpcoming(card,dir);
    else if(key==='cobradas')sortPaid(card,dir);
    else if(key==='colaboradores')sortCollaborators(card,dir);
    updateControls(key,card);
  }

  function updateControls(key,card){
    const state=financeSectionState[key];
    if(!state||!card)return;
    card.classList.toggle('cya-finance-collapsed',state.collapsed);
    const toggle=card.querySelector('[data-finance-collapse-arrow]');
    if(toggle)toggle.textContent=state.collapsed?'▸':'▾';
    const titleButton=card.querySelector('.cya-finance-section-title');
    if(titleButton)titleButton.setAttribute('aria-expanded',String(!state.collapsed));
    const order=card.querySelector('.cya-finance-order');
    if(order){
      order.textContent=state.dir==='asc'?'↑':'↓';
      const isCollaborators=key==='colaboradores';
      order.title=isCollaborators
        ?(state.dir==='asc'?'Próxima comisión primero · cambiar a orden inverso':'Comisiones más lejanas primero · cambiar a próximas primero')
        :(state.dir==='asc'?'Más antiguas / próximas primero · cambiar a más recientes':'Más recientes / lejanas primero · cambiar a más antiguas');
      order.setAttribute('aria-label',order.title);
    }
  }

  window.toggleFinanceSection=function(key,event){
    event?.stopPropagation?.();
    if(!financeSectionState[key])return;
    financeSectionState[key].collapsed=!financeSectionState[key].collapsed;
    updateControls(key,cardFor(key));
  };

  window.toggleFinanceOrder=function(key,event){
    event?.stopPropagation?.();
    if(!financeSectionState[key])return;
    financeSectionState[key].dir=financeSectionState[key].dir==='asc'?'desc':'asc';
    applySort(key);
  };

  function identifyCard(title){
    const text=String(title||'').trim();
    if(/^Próximas comisiones/i.test(text))return 'proximas';
    if(/^Comisiones cobradas/i.test(text))return 'cobradas';
    if(/^Colaboradores\s+—\s+comisiones compartidas/i.test(text))return 'colaboradores';
    return '';
  }

  function decorateFinanceCard(card,key){
    if(!card||!key)return;
    card.dataset.cyaFinanceSection=key;
    const header=directChildren(card,'card-header')[0]||card.querySelector('.card-header');
    const title=header?.querySelector('.card-title');
    if(!header||!title)return;

    if(!header.querySelector('.cya-finance-section-title')){
      const text=title.textContent.trim();
      const button=document.createElement('button');
      button.type='button';
      button.className='card-title cya-finance-section-title';
      button.onclick=event=>window.toggleFinanceSection(key,event);
      const arrow=document.createElement('span');
      arrow.dataset.financeCollapseArrow='1';
      arrow.className='cya-finance-collapse-arrow';
      const label=document.createElement('span');
      label.textContent=text;
      button.append(arrow,label);
      title.replaceWith(button);
    }

    if(!header.querySelector('.cya-finance-order')){
      const order=document.createElement('button');
      order.type='button';
      order.className='btn cya-finance-order';
      order.onclick=event=>window.toggleFinanceOrder(key,event);
      header.appendChild(order);
    }
    updateControls(key,card);
  }

  function enhanceFinanceSections(){
    if(typeof currentPage!=='undefined'&&currentPage!=='finanzas')return;
    const cards=[...document.querySelectorAll('.finance-detail-card,.finance-collaborators-card')];
    cards.forEach(card=>{
      const title=card.querySelector('.card-title')?.textContent||card.querySelector('.cya-finance-section-title')?.textContent||'';
      const key=card.dataset.cyaFinanceSection||identifyCard(title);
      if(key)decorateFinanceCard(card,key);
    });
    Object.keys(financeSectionState).forEach(applySort);
  }

  if(!document.getElementById('cya-finance-section-styles')){
    const style=document.createElement('style');
    style.id='cya-finance-section-styles';
    style.textContent=`
      .cya-finance-collapsed > :not(.card-header){display:none!important;}
      .finance-detail-card > .card-header,.finance-collaborators-card > .card-header{gap:8px;}
      .cya-finance-section-title{appearance:none;border:0;background:transparent;color:inherit;padding:0;margin:0;display:flex;align-items:center;gap:7px;cursor:pointer;text-align:left;font:inherit;}
      .cya-finance-section-title:hover{color:var(--accent-blue);}
      .cya-finance-collapse-arrow{display:inline-flex;width:12px;justify-content:center;color:var(--text-muted);font-size:12px;}
      .cya-finance-order{margin-left:auto;min-width:28px;width:28px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;line-height:1;}
      .finance-detail-card > .card-header > span:not(.cya-finance-collapse-arrow){margin-left:auto;}
      .finance-detail-card > .card-header > span + .cya-finance-order{margin-left:0;}
      @media(max-width:700px){.cya-finance-section-title{font-size:12px;}.cya-finance-order{width:26px;min-width:26px;height:26px;}}
    `;
    document.head.appendChild(style);
  }

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof renderFinanzas!=='function'){
      if(attempts>240)clearInterval(installer);
      return;
    }
    if(window.__cyaFinanceSectionControlsInstalled){clearInterval(installer);return;}
    window.__cyaFinanceSectionControlsInstalled=true;
    clearInterval(installer);

    const renderFinanzasBase=renderFinanzas;
    renderFinanzas=function(){
      const html=renderFinanzasBase.apply(this,arguments);
      setTimeout(enhanceFinanceSections,0);
      return html;
    };

    if(typeof currentPage!=='undefined'&&currentPage==='finanzas'&&typeof renderPage==='function')renderPage('finanzas');
  },25);
})();

// Load Agenda alert intelligence from the already-versioned auxiliary UI module.
(function loadSmartAgendaAlerts(){
  if(document.querySelector('script[data-cya-agenda-alerts]'))return;
  const script=document.createElement('script');
  script.src='/app-agenda-alerts.js?v=20260919-routing1';
  script.async=false;
  script.dataset.cyaAgendaAlerts='1';
  document.head.appendChild(script);
})();
