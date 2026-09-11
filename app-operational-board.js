/* Dedicated operational board and supervisory UI refinements. */
(function installOperationalBoard(){
  if(window.__cyaOperationalBoardModuleLoaded)return;
  window.__cyaOperationalBoardModuleLoaded=true;

  const GOLD='#C9A96E';
  const NAVY='#0f2744';
  const ACTION_GROUPS=[
    {key:'solicitar_cita',label:'Solicitar cita en AFORE a'},
    {key:'cita_programada',label:'Dar seguimiento a cita AFORE de'},
    {key:'confirmar_afore',label:'Confirmar actualización AFORE de'},
    {key:'solicitar_retiro',label:'Solicitar retiro a'},
    {key:'revisar_deposito',label:'Revisar depósito de'},
    {key:'cobrar_honorarios',label:'Cobrar honorarios a'},
  ];
  const actionGroupsCollapsed={};

  function ensureOperationalNav(){
    const dashboard=document.querySelector('.nav-item[data-page="dashboard"]');
    if(!dashboard)return;
    let item=document.querySelector('[data-page="operativo"]');
    if(!item){
      item=document.createElement('div');
      item.className='nav-item';
      item.dataset.page='operativo';
      item.setAttribute('onclick',"navigate('operativo',this)");
      item.innerHTML='<span class="nav-icon">▦</span><span class="nav-label">Tablero Operativo</span>';
    }
    if(dashboard.nextElementSibling!==item)dashboard.insertAdjacentElement('afterend',item);
  }

  function operationalActions(){
    return typeof accionesSiguientesDashboard==='function'?accionesSiguientesDashboard():[];
  }

  function isOwnClient(cliente){
    return Boolean(cliente?.asesorId&&sesionActiva?.id&&cliente.asesorId===sesionActiva.id);
  }

  // A snooze is personal to the responsible advisor. When an administrator
  // supervises another advisor, personal snoozes must never hide that advisor's work.
  function actionSnoozedForCurrentView(cliente,accion){
    return isOwnClient(cliente)&&typeof accionDashboardPospuestaHoy==='function'&&accionDashboardPospuestaHoy(cliente,accion);
  }

  function operationalVisibleActions(items){
    return items.filter(({cliente,accion})=>!actionSnoozedForCurrentView(cliente,accion));
  }

  function actionSeverity(accion){
    return ({rojo:4,naranja:3,amarillo:2,verde:1,normal:0})[accion?.tono]??0;
  }

  function actionDays(accion){
    return Number(accion?.diaSemaforo??accion?.dias??accion?.retraso??0)||0;
  }

  function naturalActionDetail(accion){
    const dia=Number(accion?.diaSemaforo||0);
    if(dia&&accion?.estadoSemaforo)return `${accion.estadoSemaforo} · ${dia} día${dia===1?'':'s'} desde el alta`;
    return accion?.detalle||'Pendiente de seguimiento';
  }

  function orderedActionDefinitions(allItems){
    const known=new Set(ACTION_GROUPS.map(x=>x.key));
    const extras=[];
    for(const {accion} of allItems){
      if(!accion?.clave||known.has(accion.clave)||extras.some(x=>x.key===accion.clave))continue;
      extras.push({key:accion.clave,label:accion.grupo||accion.clave});
    }
    return [...ACTION_GROUPS,...extras];
  }

  function groupTone(items){
    const max=Math.max(0,...items.map(x=>actionSeverity(x.accion)));
    return max>=4?'overdue':max===3?'urgent':max===2?'pending':'';
  }

  window.toggleOperationalActionGroup=function(key){
    const all=operationalActions();
    const count=all.filter(x=>x.accion?.clave===key).length;
    const current=Object.prototype.hasOwnProperty.call(actionGroupsCollapsed,key)?actionGroupsCollapsed[key]:count===0;
    actionGroupsCollapsed[key]=!current;
    renderPage('operativo');
  };

  function renderOperationalNextActions(){
    const all=operationalActions();
    const visible=operationalVisibleActions(all);
    const definitions=orderedActionDefinitions(all);
    const totalPostponed=all.filter(({cliente,accion})=>actionSnoozedForCurrentView(cliente,accion)).length;

    return `<section class="card dashboard-priority-card dashboard-actions-card operational-actions-card">
      <div class="card-header dashboard-priority-header" role="button" tabindex="0" aria-expanded="${dashboardAccionesAbiertas}" onclick="toggleDashboardPanel('acciones')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDashboardPanel('acciones');}">
        <div class="dashboard-priority-title">
          <span class="dashboard-collapse-icon">${dashboardAccionesAbiertas?'▾':'▸'}</span>
          <div><div class="card-title">Siguientes acciones</div><div class="dashboard-priority-sub">Procesos que requieren intervención para que el expediente continúe avanzando</div></div>
        </div>
        ${totalPostponed?`<div class="operational-header-counts"><span class="dashboard-snoozed-count">${totalPostponed} pospuesta${totalPostponed!==1?'s':''} por hoy</span></div>`:''}
      </div>
      ${dashboardAccionesAbiertas?`<div class="card-body dashboard-priority-body operational-actions-body">
        <div class="dashboard-actions-list operational-actions-list">
          ${definitions.map(def=>{
            const groupAll=all.filter(x=>x.accion?.clave===def.key);
            const groupVisible=visible.filter(x=>x.accion?.clave===def.key).sort((a,b)=>actionSeverity(b.accion)-actionSeverity(a.accion)||actionDays(b.accion)-actionDays(a.accion)||String(a.cliente?.nombre||'').localeCompare(String(b.cliente?.nombre||''),'es'));
            const postponed=groupAll.filter(({cliente,accion})=>actionSnoozedForCurrentView(cliente,accion)).length;
            const collapsed=Object.prototype.hasOwnProperty.call(actionGroupsCollapsed,def.key)?actionGroupsCollapsed[def.key]:groupAll.length===0;
            const tone=groupTone(groupAll);
            return `<div class="dashboard-action-group operational-action-group ${tone?'group-'+tone:''}">
              <button class="operational-group-header" type="button" onclick="toggleOperationalActionGroup('${escapeHTMLBasico(def.key)}')" aria-expanded="${!collapsed}">
                <span class="operational-group-label"><span class="operational-group-arrow">${collapsed?'▸':'▾'}</span>${escapeHTMLBasico(def.label)}</span>
                <span class="operational-group-count ${groupAll.length?'':'is-zero'}">${groupAll.length}</span>
              </button>
              ${collapsed?'':`<div class="operational-group-body">
                ${groupVisible.map(({cliente,accion})=>`<div class="dashboard-action-row action-tone-${accion.tono||'normal'}">
                  <div class="dashboard-action-person">
                    <button class="dashboard-person-link" onclick="openPerfil('${cliente.id}')">${escapeHTMLBasico(cliente.nombre)}</button>
                    <span>${escapeHTMLBasico(naturalActionDetail(accion))}</span>
                  </div>
                  <div class="dashboard-action-buttons">
                    ${isOwnClient(cliente)?`<button class="btn dashboard-snooze-btn" onclick="posponerAccionDashboard('${cliente.id}','${accion.clave}',event)">Posponer por hoy</button>`:''}
                    <button class="btn btn-primary dashboard-do-btn" onclick="realizarAccionDashboard('${cliente.id}','${accion.clave}',event)">${escapeHTMLBasico(accion.boton)}</button>
                  </div>
                </div>`).join('')}
                ${postponed?`<div class="operational-group-note">${postponed} acción${postponed!==1?'es':''} pospuesta${postponed!==1?'s':''} por hoy.</div>`:''}
                ${!groupAll.length?'<div class="operational-group-empty">Sin pendientes en esta etapa.</div>':''}
              </div>`}
            </div>`;
          }).join('')}
        </div>
      </div>`:''}
    </section>`;
  }

  function renderOperationalBoard(){
    const events=typeof agendaPrioritariaDashboard==='function'?agendaPrioritariaDashboard():[];
    const all=operationalActions();
    const visible=operationalVisibleActions(all);
    const overdue=events.filter(e=>e.vencido).length+all.filter(x=>x.accion?.tono==='rojo').length;
    const urgent=all.filter(x=>x.accion?.tono==='naranja').length;
    const postponed=all.filter(({cliente,accion})=>actionSnoozedForCurrentView(cliente,accion)).length;
    const today=new Date();
    const summary=`<div class="operational-summary">
      <div class="operational-summary-item"><span class="operational-summary-number">${events.length+all.length}</span><span>pendientes operativos</span></div>
      <div class="operational-summary-item is-urgent"><span class="operational-summary-number">${urgent}</span><span>urgentes</span></div>
      <div class="operational-summary-item is-overdue"><span class="operational-summary-number">${overdue}</span><span>vencidos</span></div>
      ${postponed?`<div class="operational-summary-item is-muted"><span class="operational-summary-number">${postponed}</span><span>pospuestos hoy</span></div>`:''}
    </div>`;
    return `<div class="operational-board">
      <div class="dashboard-hero operational-hero">
        <div class="operational-hero-copy">
          <div style="margin-bottom:4px;font-size:12px;color:var(--text-muted)">${fmtDate(fechaISOLocal(today))}</div>
          <div class="section-title">Tablero Operativo</div>
          <div class="section-sub" style="margin-bottom:0;">Seguimiento diario para que ningún expediente se detenga.</div>
        </div>
        <div class="operational-hero-tools">
          ${summary}
          <div class="dashboard-view-selector operational-view-selector">${getSelectorVistaHTML(true)}</div>
        </div>
      </div>
      <div class="dashboard-priority-stack operational-priority-stack">
        ${renderDashboardAgendaPrioritaria()}
        ${renderOperationalNextActions()}
      </div>
    </div>`;
  }
  window.renderTableroOperativo=renderOperationalBoard;

  const agendaRenderer=renderDashboardAgendaPrioritaria;
  renderDashboardAgendaPrioritaria=function(){
    if(currentPage==='dashboard')return '';
    return agendaRenderer();
  };

  const actionsRenderer=renderDashboardSiguientesAcciones;
  renderDashboardSiguientesAcciones=function(){
    if(currentPage==='dashboard')return '';
    if(currentPage==='operativo')return renderOperationalNextActions();
    return actionsRenderer();
  };

  // Personal mini-header for Dashboard: photo/avatar, greeting and daily context.
  const dashboardRenderer=renderDashboard;
  renderDashboard=function(){
    let html=dashboardRenderer.apply(this,arguments);
    const a=sesionActiva||{};
    const today=new Date();
    const nombre=(typeof asesorNombres==='function'?asesorNombres(a):String(a.nombre||'Asesor').split(/\s+/)[0])||'Asesor';
    const greeting=typeof saludoDashboardActual==='function'?saludoDashboardActual(a,today):`¡Hola, ${nombre}!`;
    const avatar=a.foto?`<img src="${escapeHTMLBasico(a.foto)}" alt="Foto de ${escapeHTMLBasico(nombre)}">`:`<span>${escapeHTMLBasico(typeof initials==='function'?initials(a.nombre||nombre):nombre.slice(0,2).toUpperCase())}</span>`;
    const hero=`<div class="dashboard-hero dashboard-personal-hero">
      <div class="dashboard-personal-left">
        <div class="dashboard-personal-avatar">${avatar}</div>
        <div class="dashboard-personal-copy">
          <div class="dashboard-personal-date">${fmtDate(fechaISOLocal(today))}</div>
          <div class="section-title dashboard-greeting">${escapeHTMLBasico(greeting)}</div>
          <div class="section-sub dashboard-personal-sub">Resumen de tu cartera y prioridades del día.</div>
        </div>
      </div>
      <div class="dashboard-view-selector">${getSelectorVistaHTML(true)}</div>
    </div>`;
    return html.replace(/<div class="dashboard-hero">[\s\S]*?<div class="dashboard-priority-stack">/,hero+'\n\n  <div class="dashboard-priority-stack">');
  };

  const renderPageBase=renderPage;
  renderPage=function(page){
    const target=page==='dashboard'&&currentPage==='operativo'?'operativo':page;
    if(target==='operativo'){
      ensureOperationalNav();
      const el=document.getElementById('main-content');
      if(el)el.innerHTML=renderOperationalBoard();
      return;
    }
    return renderPageBase(page);
  };

  const navigateBase=navigate;
  navigate=function(page,el){
    if(page!=='operativo')return navigateBase(page,el);
    currentPage='operativo';
    closeMobileSidebar(false);
    ensureOperationalNav();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    (el||document.querySelector('[data-page="operativo"]'))?.classList.add('active');
    const title=document.getElementById('topbar-title');if(title)title.textContent='Tablero Operativo';
    const sub=document.getElementById('topbar-sub');if(sub)sub.textContent='Seguimiento y prioridades de clientes';
    const cta=document.getElementById('topbar-cta');if(cta)cta.style.display='none';
    destroyCharts();
    renderPage('operativo');
  };

  const brandingLogo=window.CA_CLOUD_CONFIG?`${window.CA_CLOUD_CONFIG.supabaseUrl}/storage/v1/object/public/crm-branding/${window.CA_CLOUD_CONFIG.organizationId}/logo.png`:'';
  if(!document.getElementById('cya-operational-board-styles')){
    const style=document.createElement('style');
    style.id='cya-operational-board-styles';
    style.textContent=`
      .dashboard-priority-stack:empty{display:none!important;}
      .operational-board{display:block;}
      .operational-hero{margin-bottom:14px;align-items:center;}
      .operational-hero-copy{min-width:230px;}
      .operational-hero-tools{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:9px;min-width:0;}
      .operational-summary{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin:0;}
      .operational-summary-item{display:flex;align-items:baseline;gap:6px;padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);font-size:10px;color:var(--text-muted);}
      .operational-summary-number{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text-primary);line-height:1;}
      .operational-summary-item.is-urgent{border-color:rgba(249,115,22,.42);}
      .operational-summary-item.is-urgent .operational-summary-number{color:#f97316;}
      .operational-summary-item.is-overdue{border-color:rgba(239,68,68,.42);}
      .operational-summary-item.is-overdue .operational-summary-number{color:var(--danger);}
      .operational-summary-item.is-muted .operational-summary-number{color:var(--text-muted);}
      .operational-view-selector{margin-left:0;}
      .operational-priority-stack{gap:14px;}
      .operational-board .dashboard-priority-header .card-title{text-transform:uppercase;letter-spacing:.55px;}
      .operational-board .dashboard-priority-scroll,.operational-board .dashboard-actions-list{max-height:none!important;overflow:visible!important;}
      .operational-actions-body{padding:8px 14px 14px;}
      .operational-actions-list{display:grid;gap:9px;padding:0;}
      .operational-action-group{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;position:relative;}
      .operational-action-group.group-pending{border-left:3px solid var(--warning);}
      .operational-action-group.group-urgent{border-left:3px solid #f97316;}
      .operational-action-group.group-overdue{border-left:3px solid var(--danger);}
      .operational-group-header{width:100%;border:0;background:var(--bg-secondary);color:var(--text-secondary);padding:9px 11px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;font-family:var(--font-body);}
      .operational-group-header:hover{background:var(--bg-hover);}
      .operational-group-label{display:flex;align-items:center;gap:8px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.45px;}
      .operational-group-arrow{width:13px;color:var(--text-muted);font-size:12px;}
      .operational-group-count{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:${GOLD};color:${NAVY};font-family:var(--font-display);font-size:13px;font-weight:700;line-height:1;box-shadow:0 0 0 1px rgba(201,169,110,.22);}
      .operational-group-count.is-zero{background:var(--bg-hover);color:var(--text-muted);box-shadow:none;}
      .operational-group-body .dashboard-action-row:first-child{border-top:0;}
      .operational-group-note,.operational-group-empty{padding:9px 11px;border-top:1px solid var(--border);font-size:10px;color:var(--text-muted);}
      .operational-header-counts{margin-left:auto;display:flex;align-items:center;gap:10px;}

      .dashboard-personal-hero{align-items:center;padding:14px 16px;border:1px solid rgba(201,169,110,.34);border-radius:var(--radius-lg);background:linear-gradient(135deg,rgba(15,39,68,.98),rgba(20,49,82,.93));box-shadow:0 10px 28px rgba(0,0,0,.12);}
      .dashboard-personal-left{display:flex;align-items:center;gap:14px;min-width:0;}
      .dashboard-personal-avatar{width:60px;height:60px;flex:0 0 60px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.08);border:2px solid ${GOLD};box-shadow:0 0 0 4px rgba(201,169,110,.10);font-family:var(--font-display);font-size:20px;font-weight:700;color:#fff;}
      .dashboard-personal-avatar img{width:100%;height:100%;object-fit:cover;}
      .dashboard-personal-copy{min-width:0;}
      .dashboard-personal-date{font-size:11px;color:rgba(255,255,255,.62);margin-bottom:2px;}
      .dashboard-personal-hero .dashboard-greeting{color:#fff;margin:0;font-size:20px;line-height:1.15;}
      .dashboard-personal-sub{color:rgba(255,255,255,.70)!important;margin:4px 0 0!important;}

      .account-card{position:relative!important;max-width:720px;overflow:hidden!important;background:linear-gradient(135deg,rgba(8,25,46,.98),rgba(15,39,68,.96) 58%,rgba(27,54,85,.94))!important;border-color:rgba(201,169,110,.38)!important;box-shadow:0 12px 32px rgba(0,0,0,.16);}
      .account-card::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 15% 0%,rgba(201,169,110,.16),transparent 34%)${brandingLogo?`,url("${brandingLogo}") right 28px center/150px auto no-repeat`:''};opacity:.72;}
      .account-card .card-body{position:relative;z-index:1;text-align:center;padding:30px 24px;}
      .account-profile{position:relative;z-index:1;flex-direction:column!important;justify-content:center!important;gap:12px!important;text-align:center;margin-bottom:22px!important;}
      .account-photo{width:106px!important;height:106px!important;margin:0 auto;border:3px solid ${GOLD};background:rgba(255,255,255,.10)!important;color:#fff!important;box-shadow:0 0 0 5px rgba(201,169,110,.10),0 8px 24px rgba(0,0,0,.22);}
      .account-profile strong{display:block;font-family:var(--font-display);font-size:22px;color:#fff;letter-spacing:.2px;}
      .account-profile p{color:rgba(255,255,255,.66)!important;margin:4px 0!important;}
      .account-profile span{color:${GOLD};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;}
      .account-card .form-helper{color:rgba(255,255,255,.58)!important;}
      .account-card .btn{margin:3px;}
      .account-ribbon,.profile-ribbon,.account-profile-ribbon{display:none!important;}

      @media(max-width:900px){
        .operational-hero{align-items:flex-start;}
        .operational-hero-tools{max-width:62%;}
      }
      @media(max-width:700px){
        .operational-hero{display:flex;flex-direction:column;align-items:stretch;}
        .operational-hero-tools{width:100%;max-width:none;align-items:stretch;margin-left:0;}
        .operational-summary{display:grid;grid-template-columns:1fr 1fr;justify-content:stretch;}
        .operational-summary-item{min-width:0;}
        .operational-view-selector{align-self:flex-end;}
        .operational-group-header{padding:9px;}
        .operational-group-count{min-width:21px;height:21px;font-size:12px;}
        .dashboard-personal-hero{display:flex;flex-direction:column;align-items:stretch;padding:13px;}
        .dashboard-personal-left{align-items:center;}
        .dashboard-personal-avatar{width:52px;height:52px;flex-basis:52px;}
        .dashboard-personal-hero .dashboard-view-selector{align-self:flex-end;margin-top:8px;}
        .account-card::before{background:radial-gradient(circle at 20% 0%,rgba(201,169,110,.16),transparent 42%);}
      }
    `;
    document.head.appendChild(style);
  }

  ensureOperationalNav();
  let navAttempts=0;
  const navGuard=setInterval(()=>{
    ensureOperationalNav();
    navAttempts++;
    if(navAttempts>=20)clearInterval(navGuard);
  },500);
})();
