/* Personnel administration and advisor performance workspace. */
(function installPersonnelWorkspace(){
  if(window.__cyaPersonnelWorkspaceModuleLoaded)return;
  window.__cyaPersonnelWorkspaceModuleLoaded=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  let personalOpen=true;
  let metricsOpen=true;
  let reportsOpen=false;
  let expandedAdvisorId=null;
  let collaboratorAdvisorFilter=null;
  let advisorMutationFromPersonal=false;

  try{
    const saved=JSON.parse(localStorage.getItem('cya_personnel_workspace')||'{}');
    if(typeof saved.personalOpen==='boolean')personalOpen=saved.personalOpen;
    if(typeof saved.metricsOpen==='boolean')metricsOpen=saved.metricsOpen;
    if(typeof saved.reportsOpen==='boolean')reportsOpen=saved.reportsOpen;
  }catch(e){}

  function persist(){
    try{localStorage.setItem('cya_personnel_workspace',JSON.stringify({personalOpen,metricsOpen,reportsOpen}));}catch(e){}
  }

  function roleLabel(advisor){
    const role=String(advisor?.rol||advisor?.role||'advisor');
    if(role==='tech_admin')return 'Administrador técnico';
    if(role==='admin')return 'Administrador';
    return 'Asesor';
  }

  function roleClass(advisor){
    const role=String(advisor?.rol||advisor?.role||'advisor');
    return role==='tech_admin'?'is-tech':role==='admin'?'is-admin':'is-advisor';
  }

  function advisorAvatar(advisor,small=false){
    const cls=small?'cya-person-avatar is-small':'cya-person-avatar';
    return `<div class="${cls}">${advisor?.foto?`<img src="${safe(advisor.foto)}" alt="Foto de ${safe(advisor.nombre||'asesor')}">`:`<span>${safe(typeof initials==='function'?initials(advisor?.nombre||'?'):'?')}</span>`}</div>`;
  }

  function fmt(value){return typeof formatoMoneda==='function'?formatoMoneda(value||0):'$'+Number(value||0).toLocaleString('es-MX');}

  function collaboratorMetrics(col){
    const conversion=metricasConversion({colaboradorId:col.id});
    const clients=(store.clientes||[]).filter(c=>c.colaboradorId===col.id);
    const collected=redondearMoneda(clients.filter(comisionEstaCobrada).reduce((sum,c)=>sum+comisionDelColaborador(c,col),0));
    const receivable=redondearMoneda(clients.filter(comisionEstaPendiente).reduce((sum,c)=>sum+comisionDelColaborador(c,col),0));
    return {conversion,collected,receivable};
  }

  function collaboratorPanel(advisor){
    const collaborators=(store.colaboradores||[]).filter(c=>c.asesorId===advisor.id);
    return `<div class="cya-person-collaborators">
      <div class="cya-person-collab-head">
        <div><strong>Colaboradores de ${safe(advisor.nombre)}</strong><span>${collaborators.length} registrado${collaborators.length===1?'':'s'}</span></div>
        <button class="btn" type="button" onclick="cyaAbrirColaboradoresAsesor('${safe(advisor.id)}')">Ver en Colaboradores</button>
      </div>
      ${collaborators.length?`<div class="cya-person-collab-table-wrap"><table class="cya-person-collab-table">
        <thead><tr><th>Colaborador</th><th>Oportunidades</th><th>Clientes</th><th>Efectividad</th><th>Cobrado</th><th>Por cobrar</th></tr></thead>
        <tbody>${collaborators.map(col=>{
          const m=collaboratorMetrics(col);
          return `<tr><td><strong>${safe(col.nombre)}</strong><small>${safe(col.ciudad||'')}</small></td><td>${m.conversion.oportunidades}</td><td>${m.conversion.clientes}</td><td>${safe(formatoTasaConversion(m.conversion.tasa))}</td><td class="money-collected">${safe(fmt(m.collected))}</td><td>${safe(fmt(m.receivable))}</td></tr>`;
        }).join('')}</tbody>
      </table></div>`:`<div class="cya-person-empty">Este integrante todavía no tiene colaboradores registrados.</div>`}
    </div>`;
  }

  function personRow(advisor){
    const active=advisor.activo!==false;
    const expanded=expandedAdvisorId===advisor.id;
    const location=String(advisor.ciudad||'SIN OFICINA / CIUDAD').trim();
    const joined=advisor.fechaAlta?fmtDate(advisor.fechaAlta):'—';
    const collaborators=(store.colaboradores||[]).filter(c=>c.asesorId===advisor.id).length;
    return `<article class="cya-person-row ${expanded?'is-expanded':''}">
      <div class="cya-person-main">
        <div class="cya-person-identity">${advisorAvatar(advisor)}<div class="cya-person-copy"><div class="cya-person-name-line"><strong>${safe(advisor.nombre)}</strong><span class="cya-role-chip ${roleClass(advisor)}">${safe(roleLabel(advisor))}</span><span class="cya-status-dot ${active?'is-active':'is-inactive'}">${active?'Activo':'Inactivo'}</span></div><div class="cya-person-meta">${safe(location)} · Alta: ${safe(joined)}</div></div></div>
        <div class="cya-person-actions"><button class="btn" type="button" onclick="cyaTogglePersonalCollaborators('${safe(advisor.id)}')">${expanded?'Ocultar':'Colaboradores'} <span class="cya-action-count">${collaborators}</span></button><button class="btn btn-icon" type="button" onclick="cyaEditarPersonal('${safe(advisor.id)}')" title="Editar">✎</button></div>
      </div>
      ${expanded?collaboratorPanel(advisor):''}
    </article>`;
  }

  function renderPersonal(){
    const advisors=[...(store.asesores||[])].sort((a,b)=>{
      const activeDiff=Number(b.activo!==false)-Number(a.activo!==false);
      if(activeDiff)return activeDiff;
      return String(a.nombre||'').localeCompare(String(b.nombre||''),'es');
    });
    return `<div class="cya-personnel-page">
      <div class="module-toolbar cya-personnel-toolbar"><div><div class="section-title">Personal</div><div class="section-sub">Usuarios, roles, oficinas y colaboradores del equipo</div></div><button class="btn btn-primary" type="button" onclick="cyaNuevoPersonal()">+ Nuevo asesor</button></div>
      <section class="card cya-fold-card">
        <button class="cya-fold-head" type="button" onclick="cyaTogglePersonnelList()" aria-expanded="${personalOpen}"><span><b>${personalOpen?'▾':'▸'}</b><span><strong>Personal</strong><small>${advisors.length} usuario${advisors.length===1?'':'s'} registrado${advisors.length===1?'':'s'}</small></span></span><span class="cya-fold-hint">${personalOpen?'Minimizar':'Mostrar'}</span></button>
        ${personalOpen?`<div class="cya-fold-body cya-person-list">${advisors.length?advisors.map(personRow).join(''):'<div class="cya-person-empty">No hay personal registrado.</div>'}</div>`:''}
      </section>
    </div>`;
  }

  function advisorOpportunityMetrics(advisorId){
    const convertedLead=lead=>lead?.causaArchivoId==='convertido_cliente'||lead?.causaArchivo==='Convertido a cliente';
    const prospects=(store.leads||[]).filter(lead=>lead.asesorId===advisorId&&!convertedLead(lead));
    const clients=(store.clientes||[]).filter(client=>client.asesorId===advisorId);
    const opportunities=[...prospects,...clients];
    const fromCollaborators=opportunities.filter(item=>Boolean(item.colaboradorId)).length;
    const active=clients.filter(c=>c.etapa!=='concluido').length;
    const concluded=clients.filter(c=>c.etapa==='concluido').length;
    const commissions=clients.filter(comisionEstaCobrada).reduce((sum,c)=>sum+comisionEfectiva(c),0);
    return {opportunities:opportunities.length,fromCollaborators,direct:Math.max(0,opportunities.length-fromCollaborators),clients:clients.length,active,concluded,commissions};
  }

  function performanceTable(){
    const advisors=(store.asesores||[]).filter(a=>String(a.rol||a.role||'')!=='tech_admin');
    return `<div class="cya-advisor-table-wrap"><table class="cya-advisor-table">
      <thead><tr><th>Asesor</th><th>Oportunidades</th><th>De colaboradores</th><th>Directos</th><th>Clientes</th><th>Activos</th><th>Concluidos</th><th>Comisiones</th><th>Efectividad</th></tr></thead>
      <tbody>${advisors.map(advisor=>{
        const m=advisorOpportunityMetrics(advisor.id);
        const conversion=metricasConversion({asesorId:advisor.id});
        return `<tr><td><div class="cya-advisor-name">${advisorAvatar(advisor,true)}<span><strong>${safe(advisor.nombre)}</strong>${advisor.activo===false?'<small>Inactivo</small>':''}</span></div></td><td>${m.opportunities}</td><td>${m.fromCollaborators}</td><td>${m.direct}</td><td>${m.clients}</td><td>${m.active}</td><td>${m.concluded}</td><td class="money-collected">${safe(fmt(m.commissions))}</td><td><div class="cya-effectiveness"><span class="cya-effectiveness-track"><i style="width:${Math.min(100,Math.max(0,conversion.tasa))}%"></i></span><strong>${safe(formatoTasaConversion(conversion.tasa))}</strong></div></td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function renderAdvisorMetrics(){
    return `<div class="cya-advisors-page">
      <div class="module-toolbar"><div><div class="section-title">Asesores</div><div class="section-sub">Rendimiento, conversión y reportes del equipo</div></div></div>
      <section class="card cya-fold-card cya-report-shell">
        <button class="cya-fold-head" type="button" onclick="cyaToggleAdvisorReports()" aria-expanded="${reportsOpen}"><span><b>${reportsOpen?'▾':'▸'}</b><span><strong>Reportes semanales y mensuales</strong><small>Espacio preparado para los criterios y formato final del reporte de dirección</small></span></span><span class="chip">En definición</span></button>
        ${reportsOpen?`<div class="cya-fold-body"><div class="cya-report-placeholder"><div><strong>Motor de reportes preparado</strong><p>Aquí se incorporarán periodos semanales, mensuales y personalizados cuando definamos qué se considera contrato cerrado, venta y fecha de corte.</p></div><div class="cya-report-periods"><span>Semanal</span><span>Mensual</span><span>Personalizado</span></div></div></div>`:''}
      </section>
      <section class="card cya-fold-card">
        <button class="cya-fold-head" type="button" onclick="cyaToggleAdvisorMetrics()" aria-expanded="${metricsOpen}"><span><b>${metricsOpen?'▾':'▸'}</b><span><strong>Comparativa de rendimiento</strong><small>Métricas consolidadas por integrante del equipo comercial</small></span></span><span class="cya-fold-hint">${metricsOpen?'Minimizar':'Mostrar'}</span></button>
        ${metricsOpen?`<div class="cya-fold-body no-pad">${performanceTable()}</div>`:''}
      </section>
    </div>`;
  }

  function filteredCollaboratorsHtml(baseRender){
    if(!collaboratorAdvisorFilter)return baseRender();
    const advisor=(store.asesores||[]).find(a=>a.id===collaboratorAdvisorFilter);
    if(!advisor){collaboratorAdvisorFilter=null;return baseRender();}
    const original=store.colaboradores;
    store.colaboradores=(original||[]).filter(c=>c.asesorId===collaboratorAdvisorFilter);
    let html='';
    try{html=baseRender();}finally{store.colaboradores=original;}
    return `<div class="cya-collab-filter"><div><strong>Colaboradores de ${safe(advisor.nombre)}</strong><span>Vista filtrada desde Personal</span></div><button class="btn" type="button" onclick="cyaQuitarFiltroColaboradores()">Ver todos</button></div>${html}`;
  }

  window.cyaTogglePersonnelList=function(){personalOpen=!personalOpen;persist();renderPage('personal');};
  window.cyaToggleAdvisorMetrics=function(){metricsOpen=!metricsOpen;persist();renderPage('asesores');};
  window.cyaToggleAdvisorReports=function(){reportsOpen=!reportsOpen;persist();renderPage('asesores');};
  window.cyaTogglePersonalCollaborators=function(id){expandedAdvisorId=expandedAdvisorId===id?null:id;renderPage('personal');};
  window.cyaNuevoPersonal=function(){openModalAsesor();};
  window.cyaEditarPersonal=function(id){openModalAsesor(id);};
  window.cyaAbrirColaboradoresAsesor=function(id){collaboratorAdvisorFilter=id;window.__cyaOpeningCollaboratorFilter=true;navigate('colaboradores',document.querySelector('[data-page="colaboradores"]'));window.__cyaOpeningCollaboratorFilter=false;};
  window.cyaQuitarFiltroColaboradores=function(){collaboratorAdvisorFilter=null;renderPage('colaboradores');};

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=typeof renderAsesores==='function'&&typeof renderColaboradores==='function'&&typeof renderPage==='function'&&typeof navigate==='function'&&typeof openModalAsesor==='function'&&typeof guardarAsesor==='function'&&typeof eliminarAsesor==='function'&&typeof metricasConversion==='function'&&typeof formatoTasaConversion==='function'&&typeof redondearMoneda==='function'&&typeof comisionEstaCobrada==='function'&&typeof comisionEstaPendiente==='function'&&typeof comisionDelColaborador==='function'&&typeof comisionEfectiva==='function'&&window.__cyaRecoveredCRMRefinementsInstalled;
    if(!ready){if(attempts>500)clearInterval(installer);return;}
    if(window.__cyaPersonnelWorkspaceInstalled){clearInterval(installer);return;}
    window.__cyaPersonnelWorkspaceInstalled=true;
    clearInterval(installer);

    const advisorsNav=document.querySelector('[data-page="asesores"]');
    if(advisorsNav&&!document.querySelector('[data-page="personal"]')){
      advisorsNav.insertAdjacentHTML('beforebegin','<div class="nav-item" data-page="personal" onclick="navigate(\'personal\',this)"><span class="nav-icon">◫</span><span class="nav-label">Personal</span></div>');
    }

    const renderPageBase=renderPage;
    renderPage=function(page){
      if(page==='personal'||(page==='asesores'&&advisorMutationFromPersonal)){
        const content=document.getElementById('main-content');
        if(content)content.innerHTML=renderPersonal();
        return;
      }
      return renderPageBase.apply(this,arguments);
    };

    const navigateBase=navigate;
    navigate=function(page,el){
      if(page==='personal'){
        if(!isAdmin())return showToast?.('Acceso reservado a administración','warn');
        currentPage='personal';
        if(typeof closeMobileSidebar==='function')closeMobileSidebar(false);
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        (el||document.querySelector('[data-page="personal"]'))?.classList.add('active');
        const title=document.getElementById('topbar-title'),sub=document.getElementById('topbar-sub'),cta=document.getElementById('topbar-cta');
        if(title)title.textContent='Personal';
        if(sub)sub.textContent='Usuarios, roles y estructura del equipo';
        if(cta)cta.style.display='none';
        renderPage('personal');
        return;
      }
      if(page==='colaboradores'&&!window.__cyaOpeningCollaboratorFilter)collaboratorAdvisorFilter=null;
      const result=navigateBase.apply(this,arguments);
      if(page==='asesores'){
        const sub=document.getElementById('topbar-sub');if(sub)sub.textContent='Rendimiento y reportes del equipo';
      }
      return result;
    };

    renderAsesores=renderAdvisorMetrics;

    const renderCollaboratorsBase=renderColaboradores;
    renderColaboradores=function(){return filteredCollaboratorsHtml(()=>renderCollaboratorsBase.apply(this,arguments));};

    const guardarAsesorBase=guardarAsesor;
    guardarAsesor=async function(){
      const returnToPersonal=currentPage==='personal';
      advisorMutationFromPersonal=returnToPersonal;
      try{return await guardarAsesorBase.apply(this,arguments);}
      finally{
        if(returnToPersonal){advisorMutationFromPersonal=false;currentPage='personal';renderPage('personal');}
      }
    };

    const eliminarAsesorBase=eliminarAsesor;
    eliminarAsesor=function(){
      const returnToPersonal=currentPage==='personal';
      advisorMutationFromPersonal=returnToPersonal;
      const result=eliminarAsesorBase.apply(this,arguments);
      if(returnToPersonal){advisorMutationFromPersonal=false;currentPage='personal';renderPage('personal');}
      return result;
    };

    if(currentPage==='asesores')renderPage('asesores');
  },30);
})();
