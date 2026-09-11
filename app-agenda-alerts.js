/* Smart Agenda alerts: calendar deadlines stay in Agenda; operational SLA belongs to Tablero Operativo. */
(function installSmartAgendaAlerts(){
  if(window.__cyaSmartAgendaAlertsLoaded)return;
  window.__cyaSmartAgendaAlertsLoaded=true;

  const OPERATIONAL_FLOW_RULES=new Set([
    'flujo_enviar_firma',
    'flujo_confirmar_firma',
    'flujo_confirmar_alta',
  ]);

  function todayISO(){
    return typeof fechaISOLocal==='function'?fechaISOLocal(new Date()):new Date().toISOString().slice(0,10);
  }

  function visibleAgendaEvents(){
    if(typeof eventosVistaActual==='function')return eventosVistaActual()||[];
    return store?.agenda||[];
  }

  function isOpenEvent(event){
    return Boolean(event&&!event.completado&&!event.cancelarRecordatorio&&/^\d{4}-\d{2}-\d{2}$/.test(event.fecha||''));
  }

  function realAgendaOverdue(){
    const hoy=todayISO();
    return visibleAgendaEvents().filter(event=>
      isOpenEvent(event)&&event.fecha<hoy&&!OPERATIONAL_FLOW_RULES.has(event.regla)
    );
  }

  function operationalFlowOverdue(){
    const overdue=[];
    for(const event of visibleAgendaEvents()){
      if(!isOpenEvent(event)||!OPERATIONAL_FLOW_RULES.has(event.regla)||!event.fecha)continue;
      const day=Math.max(1,(typeof diasTranscurridosDesde==='function'?diasTranscurridosDesde(event.fecha,new Date()):0)+1);
      if(day>=5)overdue.push({key:'event:'+event.id,event,day});
    }
    return overdue;
  }

  function operationalActionOverdue(){
    if(typeof accionesSiguientesDashboard!=='function')return [];
    return (accionesSiguientesDashboard()||[])
      .filter(({accion})=>accion?.tono==='rojo')
      .map(({cliente,accion})=>({key:`action:${cliente?.id||''}:${accion?.clave||''}`,cliente,accion}));
  }

  function operationalOverdue(){
    const unique=new Map();
    for(const item of [...operationalFlowOverdue(),...operationalActionOverdue()])unique.set(item.key,item);
    return [...unique.values()];
  }

  function findLegacyAlert(root){
    if(!root)return null;
    const matches=[...root.querySelectorAll('div,section,aside')].filter(element=>
      /eventos?\s+vencidos?\s+sin\s+completar/i.test(element.textContent||'')
    );
    if(!matches.length)return null;
    matches.sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length);
    const candidate=matches[0];
    if(candidate.matches('div,section,aside'))return candidate;
    return candidate.parentElement;
  }

  function insertionAnchor(root){
    return root?.querySelector('.agenda-layout,.agenda-grid,.agenda-content,.calendar-layout,.agenda-main')||
      root?.querySelector('.card');
  }

  function createAlert(root){
    const alert=document.createElement('div');
    alert.className='cya-agenda-smart-alert';
    const anchor=insertionAnchor(root);
    if(anchor?.parentElement)anchor.parentElement.insertBefore(alert,anchor);
    else root?.prepend(alert);
    return alert;
  }

  function configureAlert(alert,{kind,count,onClick}){
    if(!alert)return;
    alert.classList.add('cya-agenda-smart-alert');
    alert.classList.toggle('is-operational',kind==='operational');
    const plural=count!==1;
    const text=kind==='operational'
      ?`${count} seguimiento${plural?'s':''} operativo${plural?'s':''} vencido${plural?'s':''}`
      :`${count} evento${plural?'s':''} de agenda vencido${plural?'s':''}`;
    const action=kind==='operational'?'Ir a Tablero Operativo':'Ver lista';
    alert.innerHTML=`<span class="cya-agenda-smart-alert-copy"><span class="cya-agenda-smart-dot" aria-hidden="true"></span>${text}</span><button type="button" class="cya-agenda-smart-link">${action}</button>`;
    const button=alert.querySelector('.cya-agenda-smart-link');
    if(button)button.onclick=onClick;
  }

  function goOperational(){
    if(typeof navigate==='function')navigate('operativo',document.querySelector('[data-page="operativo"]'));
  }

  function showAgendaList(){
    // Agenda is already the destination. Prefer the existing list-mode control so
    // we do not depend on a private variable name from the legacy renderer.
    const root=document.getElementById('main-content');
    const listButton=[...root.querySelectorAll('button')].find(button=>/^Lista$/i.test((button.textContent||'').trim()));
    if(listButton){listButton.click();return;}
    const target=root.querySelector('.agenda-list,.agenda-events,.agenda-main,.agenda-content');
    target?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function patchAgendaAlerts(){
    if(typeof currentPage!=='undefined'&&currentPage!=='agenda')return;
    const root=document.getElementById('main-content');
    if(!root)return;

    root.querySelectorAll('[data-cya-extra-agenda-alert]').forEach(node=>node.remove());
    const legacy=findLegacyAlert(root);
    const actual=realAgendaOverdue();
    const operational=operationalOverdue();

    if(!actual.length&&!operational.length){
      legacy?.remove();
      return;
    }

    let primary=legacy;
    if(actual.length){
      primary=primary||createAlert(root);
      configureAlert(primary,{kind:'agenda',count:actual.length,onClick:showAgendaList});
    }else if(primary){
      primary.remove();
      primary=null;
    }

    if(operational.length){
      const operationalAlert=createAlert(root);
      operationalAlert.dataset.cyaExtraAgendaAlert='operational';
      configureAlert(operationalAlert,{kind:'operational',count:operational.length,onClick:goOperational});
      if(primary?.parentElement&&operationalAlert.parentElement===primary.parentElement){
        primary.insertAdjacentElement('afterend',operationalAlert);
      }
    }
  }

  window.cyaAgendaRealOverdue=realAgendaOverdue;
  window.cyaOperationalOverdue=operationalOverdue;
  window.cyaPatchAgendaAlerts=patchAgendaAlerts;

  if(!document.getElementById('cya-smart-agenda-alert-styles')){
    const style=document.createElement('style');
    style.id='cya-smart-agenda-alert-styles';
    style.textContent=`
      .cya-agenda-smart-alert{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 16px;padding:9px 13px;border:1px solid rgba(239,68,68,.42);border-radius:var(--radius-sm);background:rgba(239,68,68,.10);color:var(--danger);font-size:12px;}
      .cya-agenda-smart-alert.is-operational{border-color:rgba(239,68,68,.48);background:rgba(239,68,68,.075);}
      .cya-agenda-smart-alert-copy{display:flex;align-items:center;gap:7px;min-width:0;}
      .cya-agenda-smart-dot{width:12px;height:12px;border-radius:50%;background:var(--danger);flex:0 0 auto;}
      .cya-agenda-smart-link{appearance:none;border:0;background:transparent;padding:0;color:inherit;font:inherit;font-weight:600;text-decoration:underline;cursor:pointer;white-space:nowrap;}
      .cya-agenda-smart-link:hover{color:var(--text-primary);}
      @media(max-width:600px){.cya-agenda-smart-alert{align-items:flex-start;}.cya-agenda-smart-link{white-space:normal;text-align:right;}}
    `;
    document.head.appendChild(style);
  }

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof renderAgenda!=='function'||typeof eventosVistaActual!=='function'||typeof diasTranscurridosDesde!=='function'){
      if(attempts>240)clearInterval(installer);
      return;
    }
    if(window.__cyaSmartAgendaAlertsInstalled){clearInterval(installer);return;}
    window.__cyaSmartAgendaAlertsInstalled=true;
    clearInterval(installer);

    const renderAgendaBase=renderAgenda;
    renderAgenda=function(){
      const html=renderAgendaBase.apply(this,arguments);
      setTimeout(patchAgendaAlerts,0);
      setTimeout(patchAgendaAlerts,80);
      return html;
    };

    if(typeof currentPage!=='undefined'&&currentPage==='agenda'&&typeof renderPage==='function')renderPage('agenda');
  },25);
})();

// Load the dedicated account workspace after the core account functions are available.
(function loadAccountWorkspace(){
  if(document.querySelector('script[data-cya-account-ui]'))return;
  const script=document.createElement('script');
  script.src='app-account-ui.js?v=20260911-mi-cuenta';
  script.async=false;
  script.dataset.cyaAccountUi='1';
  document.head.appendChild(script);
})();
