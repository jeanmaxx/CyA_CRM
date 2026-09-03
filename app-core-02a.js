// ==================== RENDER ====================
function renderPage(page){
  const el=document.getElementById('main-content');
  if(page==='dashboard')        el.innerHTML=renderDashboard();
  else if(page==='leads')       el.innerHTML=renderLeads();
  else if(page==='clientes')    el.innerHTML=renderClientes();
  else if(page==='pipeline')    el.innerHTML=renderPipeline();
  else if(page==='configuracion') el.innerHTML=renderConfiguracion();
  else if(page==='finanzas')    el.innerHTML=renderFinanzas();
  else if(page==='servicios')   el.innerHTML=renderServicios();
  else if(page==='contratos')   el.innerHTML=renderContratos();
  else if(page==='agenda')      el.innerHTML=renderAgenda();
  else if(page==='plantillas')  el.innerHTML=renderPlantillas();
  else if(page==='asesores')    el.innerHTML=renderAsesores();
  else if(page==='colaboradores') el.innerHTML=renderColaboradores();
  else                          el.innerHTML=renderComingSoon(page);
  if(page==='agenda')     setTimeout(renderCalMini,50);
  if(page==='dashboard')  setTimeout(initCharts,50);
}

// ---- DASHBOARD ----
let dashboardVistaElegibilidad='grafica';
let dashboardVistaDescarte='lista';
let dashboardAgendaAbierta=true;
let dashboardAccionesAbiertas=true;

function toggleDashboardCard(tipo){
  if(tipo==='elegibilidad') dashboardVistaElegibilidad=dashboardVistaElegibilidad==='lista'?'grafica':'lista';
  if(tipo==='descarte') dashboardVistaDescarte=dashboardVistaDescarte==='lista'?'grafica':'lista';
  renderPage('dashboard');
}

function toggleDashboardPanel(tipo){
  if(tipo==='agenda') dashboardAgendaAbierta=!dashboardAgendaAbierta;
  if(tipo==='acciones') dashboardAccionesAbiertas=!dashboardAccionesAbiertas;
  renderPage('dashboard');
}

function agendaPrioritariaDashboard(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const fin=new Date(hoy);fin.setDate(fin.getDate()+((7-fin.getDay())%7));
  const hoyISO=fechaISOLocal(hoy),finISO=fechaISOLocal(fin);
  return eventosVistaActual().filter(e=>{
    if(e.completado||e.cancelarRecordatorio||!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha||'')) return false;
    return e.fecha<=finISO;
  }).sort((a,b)=>`${a.fecha} ${a.hora||'23:59'}`.localeCompare(`${b.fecha} ${b.hora||'23:59'}`)).map(e=>({
    ...e,vencido:e.fecha<hoyISO,hoy:e.fecha===hoyISO,
  }));
}

function renderDashboardAgendaPrioritaria(){
  const eventos=agendaPrioritariaDashboard();
  const vencidos=eventos.filter(e=>e.vencido).length;
  const TIPO_LABELS={llamada:'Llamada',whatsapp:'WhatsApp',meet:'Meet',cita:'Cita',recordatorio:'Recordatorio',vencimiento:'Vencimiento',otro:'Otro'};
  const TIPO_COLORS={llamada:'#3b82f6',whatsapp:'#25d366',meet:'#8b5cf6',cita:'#0ea5e9',recordatorio:'#10b981',vencimiento:'#ef4444',otro:'#64748b'};
  return `<section class="card dashboard-priority-card dashboard-agenda-card">
    <div class="card-header dashboard-priority-header" role="button" tabindex="0" aria-expanded="${dashboardAgendaAbierta}" onclick="toggleDashboardPanel('agenda')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDashboardPanel('agenda');}">
      <div class="dashboard-priority-title">
        <span class="dashboard-collapse-icon">${dashboardAgendaAbierta?'▾':'▸'}</span>
        <div><div class="card-title">Agenda prioritaria</div><div class="dashboard-priority-sub">Vencidos y actividades pendientes hasta el domingo</div></div>
        <span class="chip ${vencidos?'chip-red':'chip-blue'}">${eventos.length}</span>
      </div>
      <button class="btn dashboard-panel-link" onclick="event.stopPropagation();navigate('agenda',document.querySelector('[data-page=agenda]'))">Ver agenda completa</button>
    </div>
    ${dashboardAgendaAbierta?`<div class="card-body dashboard-priority-body">
      ${eventos.length?`<div class="dashboard-priority-scroll">${eventos.map(e=>{
        const cliente=e.clienteId?(store.clientes||[]).find(c=>c.id===e.clienteId):null;
        const etiqueta=e.vencido?'Vencido':e.hoy?'Hoy':fmtDate(e.fecha);
        return `<div class="dashboard-agenda-row ${e.vencido?'dashboard-row-danger':''}">
          <div class="dashboard-event-date ${e.vencido?'is-overdue':e.hoy?'is-today':''}">${etiqueta}</div>
          <div class="dashboard-event-marker" style="background:${TIPO_COLORS[e.tipo]||TIPO_COLORS.otro}"></div>
          <div class="dashboard-event-copy">
            <div class="dashboard-event-title">${escapeHTMLBasico(e.titulo)}</div>
            <div class="dashboard-event-meta">${escapeHTMLBasico(TIPO_LABELS[e.tipo]||e.tipo||'Evento')}${e.hora?' · '+escapeHTMLBasico(e.hora):''}${cliente?.nombre?' · '+escapeHTMLBasico(cliente.nombre):''}</div>
          </div>
          <button class="btn dashboard-agenda-action" onclick="event.stopPropagation();completarEvento('${e.id}')">✓ Hecho</button>
        </div>`;
      }).join('')}</div>`:`<div class="dashboard-priority-empty">✓ No tienes actividades vencidas ni pendientes para el resto de esta semana.</div>`}
    </div>`:''}
  </section>`;
}

function fechaEntradaEtapaDadoAlta(cliente){
  if(cliente.fechaAltaAfore) return cliente.fechaAltaAfore;
  const historial=[...(cliente.historial||[])].reverse();
  const entrada=historial.find(h=>h.tipo==='etapa'&&/dado de alta/i.test(h.texto||''));
  return entrada?.fecha||cliente.fechaRegistro||new Date();
}

function obtenerSiguienteAccion(cliente,referencia=new Date()){
  if(!cliente||cliente.descartado||cliente.archivado||cliente.devueltoAProspectos||cliente.servicio!=='retiro_desempleo') return null;
  const base={clienteId:cliente.id,etapa:cliente.etapa,nombre:cliente.nombre||'Cliente'};
  if(cliente.etapa==='contrato_firmado') return {...base,clave:'dar_alta',grupo:'Dar de alta a',boton:'Marcar dado de alta',tipo:'avanzar',tono:'normal',detalle:'Contrato firmado'};
  if(cliente.etapa==='dado_alta'){
    if(!cliente.fechaBiometrica){
      const dias=diasTranscurridosDesde(fechaEntradaEtapaDadoAlta(cliente),referencia);
      const tono=dias>=25?'rojo':dias>=15?'naranja':'normal';
      return {...base,clave:'solicitar_cita',grupo:'Solicitar cita en AFORE a',boton:'Registrar cita',tipo:'cita',tono,dias,detalle:`${dias} día${dias!==1?'s':''} desde el alta`};
    }
    const hoyISO=fechaISOLocal(referencia);
    if(cliente.fechaBiometrica>hoyISO) return {...base,clave:'cita_programada',grupo:'Dar seguimiento a cita AFORE de',boton:'Abrir cliente',tipo:'abrir',tono:'normal',detalle:`Cita: ${fmtDate(cliente.fechaBiometrica)}`};
    const retraso=diasTranscurridosDesde(cliente.fechaBiometrica,referencia);
    return {...base,clave:'confirmar_afore',grupo:'Confirmar actualización AFORE de',boton:'Marcar AFORE actualizada',tipo:'avanzar',tono:retraso>0?'naranja':'normal',detalle:retraso?`Cita hace ${retraso} día${retraso!==1?'s':''}`:'Cita programada para hoy'};
  }
  if(cliente.etapa==='afore_actualizada') return {...base,clave:'solicitar_retiro',grupo:'Solicitar retiro a',boton:'Marcar solicitud realizada',tipo:'avanzar',tono:'normal',detalle:'AFORE actualizada'};
  if(cliente.etapa==='solicitud_realizada') return {...base,clave:'revisar_deposito',grupo:'Revisar depósito de',boton:'Confirmar depósito',tipo:'avanzar',tono:'normal',detalle:'Solicitud realizada'};
  if(cliente.etapa==='deposito_recibido') return {...base,clave:'cobrar_honorarios',grupo:'Cobrar honorarios a',boton:'Confirmar honorarios',tipo:'avanzar',tono:'normal',detalle:'Depósito recibido'};
  return null;
}

function accionDashboardPospuestaHoy(cliente,accion){
  const usuario=sesionActiva?.id||'local';
  const registro=cliente?.accionesDashboardPospuestas?.[usuario];
  return Boolean(registro&&registro.fecha===fechaISOLocal(new Date())&&registro.clave===accion.clave&&registro.etapa===cliente.etapa);
}

function accionesSiguientesDashboard(){
  return (clientesVistaActual()||[]).map(c=>({cliente:c,accion:obtenerSiguienteAccion(c)})).filter(x=>x.accion);
}

function renderDashboardSiguientesAcciones(){
  const todas=accionesSiguientesDashboard();
  const visibles=todas.filter(x=>!accionDashboardPospuestaHoy(x.cliente,x.accion));
  const pospuestas=todas.length-visibles.length;
  const orden=['dar_alta','solicitar_cita','cita_programada','confirmar_afore','solicitar_retiro','revisar_deposito','cobrar_honorarios'];
  const grupos=orden.map(clave=>visibles.filter(x=>x.accion.clave===clave)).filter(g=>g.length);
  return `<section class="card dashboard-priority-card dashboard-actions-card">
    <div class="card-header dashboard-priority-header" role="button" tabindex="0" aria-expanded="${dashboardAccionesAbiertas}" onclick="toggleDashboardPanel('acciones')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDashboardPanel('acciones');}">
      <div class="dashboard-priority-title">
        <span class="dashboard-collapse-icon">${dashboardAccionesAbiertas?'▾':'▸'}</span>
        <div><div class="card-title">Siguientes acciones</div><div class="dashboard-priority-sub">Pendientes derivados de la etapa actual de cada cliente</div></div>
        <span class="chip chip-blue">${visibles.length}</span>
      </div>
      ${pospuestas?`<span class="dashboard-snoozed-count">${pospuestas} pospuesta${pospuestas!==1?'s':''} por hoy</span>`:''}
    </div>
    ${dashboardAccionesAbiertas?`<div class="card-body dashboard-priority-body">
      ${grupos.length?`<div class="dashboard-actions-list">${grupos.map(grupo=>{
        const titulo=grupo[0].accion.grupo;
        return `<div class="dashboard-action-group">
          <div class="dashboard-action-group-title">${escapeHTMLBasico(titulo)} <span>${grupo.length}</span></div>
          ${grupo.map(({cliente,accion})=>`<div class="dashboard-action-row action-tone-${accion.tono}">
            <div class="dashboard-action-person">
              <button class="dashboard-person-link" onclick="openPerfil('${cliente.id}')">${escapeHTMLBasico(cliente.nombre)}</button>
              <span>${escapeHTMLBasico(accion.detalle)}</span>
            </div>
            <div class="dashboard-action-buttons">
              <button class="btn dashboard-snooze-btn" onclick="posponerAccionDashboard('${cliente.id}','${accion.clave}',event)">Posponer por hoy</button>
              <button class="btn btn-primary dashboard-do-btn" onclick="realizarAccionDashboard('${cliente.id}','${accion.clave}',event)">${escapeHTMLBasico(accion.boton)}</button>
            </div>
          </div>`).join('')}
        </div>`;
      }).join('')}</div>`:`<div class="dashboard-priority-empty">✓ No hay siguientes acciones pendientes${pospuestas?' visibles; las pendientes se pospusieron por hoy.':'.'}</div>`}
    </div>`:''}
  </section>`;
}

async function posponerAccionDashboard(clienteId,clave,event){
  event?.stopPropagation();
  const cliente=(store.clientes||[]).find(c=>c.id===clienteId);
  const accion=obtenerSiguienteAccion(cliente);
  if(!cliente||!accion||accion.clave!==clave) return renderPage('dashboard');
  const usuario=sesionActiva?.id||'local';
  const anterior=cliente.accionesDashboardPospuestas?.[usuario];
  cliente.accionesDashboardPospuestas={...(cliente.accionesDashboardPospuestas||{}),[usuario]:{clave,etapa:cliente.etapa,fecha:fechaISOLocal(new Date())}};
  try{
    await supaGuardarCliente(cliente);
    showToast('Acción pospuesta hasta mañana','info');
  }catch(error){
    if(anterior) cliente.accionesDashboardPospuestas[usuario]=anterior; else delete cliente.accionesDashboardPospuestas[usuario];
  }
  renderPage('dashboard');
}

async function realizarAccionDashboard(clienteId,clave,event){
  event?.stopPropagation();
  const cliente=(store.clientes||[]).find(c=>c.id===clienteId);
  const accion=obtenerSiguienteAccion(cliente);
  if(!cliente||!accion||accion.clave!==clave){ renderPage('dashboard'); return; }
  if(accion.tipo==='cita'){
    editCliente(clienteId);
    setTimeout(()=>{switchTab('tab-datos-extra',1);document.getElementById('fc-fecha-biometrica')?.focus();},30);
    return;
  }
  if(accion.tipo==='abrir'){ openPerfil(clienteId); return; }
  await avanzarEtapa(clienteId);
}

function renderDashboard(){
  const todosClientes=(clientesVistaActual()||[]).filter(c=>!c.descartado&&!c.devueltoAProspectos);
  const cl=todosClientes.filter(c=>!c.archivado);
  const etapaFinal=c=>c.etapa==='concluido'||c.etapa==='honorarios_recibidos';
  const activos=cl.filter(c=>c.contratoFirmado===true).length;
  const concluidos=todosClientes.filter(c=>etapaFinal(c)||(c.archivado&&!c.devueltoAProspectos)).length;
  const leads=leadsVistaActual();
  const enRevision=leads.filter(l=>l.estado==='semanas').length;
  const aprobados=leads.filter(l=>l.estado==='aprobado').length;
  const comisiones=cl.filter(comisionEstaCobrada).reduce((s,c)=>s+comisionEfectiva(c),0);
  const proximasComisiones=cl.filter(comisionEstaPendiente).reduce((s,c)=>s+comisionEfectiva(c),0);
  const hoyStr=new Date().toISOString().split('T')[0];

  const today=new Date();
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  return `
  <div class="dashboard-hero">
    <div>
      <div style="margin-bottom:4px;font-size:12px;color:var(--text-muted)">${dias[today.getDay()]}, ${fmtDate(fechaISOLocal(today))}</div>
      <div class="section-title dashboard-greeting">${escapeHTMLBasico(saludoDashboardActual(sesionActiva,today))}</div>
      <div class="section-sub" style="margin-bottom:0;">Resumen de tu cartera de clientes.</div>
    </div>
    <div class="dashboard-view-selector">${getSelectorVistaHTML(true)}</div>
  </div>

  <div class="dashboard-priority-stack">
    ${renderDashboardAgendaPrioritaria()}
    ${renderDashboardSiguientesAcciones()}
  </div>

  <div class="kpi-grid dashboard-kpis">
    <div class="kpi-card kpi-accent-blue">
      <div class="kpi-label">Clientes totales</div>
      <div class="kpi-value">${todosClientes.length}</div>
      <div class="kpi-sub">Registrados en sistema</div>
    </div>
    <div class="kpi-card kpi-accent-amber">
      <div class="kpi-label">Trámites activos (clientes)</div>
      <div class="kpi-value">${activos}</div>
      <div class="kpi-sub">Clientes con contrato firmado</div>
    </div>
    <div class="kpi-card kpi-accent-purple">
      <div class="kpi-label">Trámites en revisión</div>
      <div class="kpi-value">${enRevision}</div>
      <div class="kpi-sub">En revisión de semanas / NSS</div>
    </div>
    <div class="kpi-card kpi-accent-green">
      <div class="kpi-label">Aprobados</div>
      <div class="kpi-value">${aprobados}</div>
      <div class="kpi-sub">Pendientes de cierre</div>
    </div>
    <div class="kpi-card kpi-accent-red">
      <div class="kpi-label">Concluidos</div>
      <div class="kpi-value">${concluidos}</div>
      <div class="kpi-sub">Trámites cerrados</div>
    </div>
  </div>

  <div class="dash-grid">
    <div class="card">
      <div class="card-header"><div class="card-title">Fuente de clientes</div></div>
      <div class="card-body">
        <div class="chart-wrap" style="gap:20px;">
          <div class="chart-donut-wrap"><canvas id="chart-fuentes"></canvas></div>
          <div class="chart-legend" id="legend-fuentes"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Clientes por tipo de servicio</div></div>
      <div class="card-body" style="padding-right:8px;">
        <canvas id="chart-servicios" style="max-height:180px;"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Etapas activas</div></div>
      <div class="card-body">
        ${renderStageDistribution()}
      </div>
    </div>
  </div>

  <div class="dash-grid-wide">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Elegibilidad</div>
        <button class="btn" style="font-size:10px;padding:3px 8px;" onclick="toggleDashboardCard('elegibilidad')">${dashboardVistaElegibilidad==='lista'?'▥ Gráfica':'☷ Lista'}</button>
      </div>
      <div class="card-body">
        ${renderElegibilidadDist(dashboardVistaElegibilidad)}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Causas de descarte</div>
        <button class="btn" style="font-size:10px;padding:3px 8px;" onclick="toggleDashboardCard('descarte')">${dashboardVistaDescarte==='lista'?'▥ Gráfica':'☷ Lista'}</button>
      </div>
      <div class="card-body">
        ${renderCausasDescarte(dashboardVistaDescarte)}
      </div>
    </div>
  </div>`;
}

function renderStageDistribution(){
  const cl=clientesVisibles();
  if(!cl.length) return '<div style="font-size:12px;color:var(--text-muted)">Sin datos aún</div>';
  const counts={};
  cl.forEach(c=>{ counts[c.etapa]=(counts[c.etapa]||0)+1; });
  const stages=STAGES_RETIRO;
  return stages.filter(s=>counts[s.id]).map(s=>`
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text-secondary)">${s.label}</span>
        <span style="font-size:12px;font-weight:600">${counts[s.id]||0}</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${Math.round((counts[s.id]||0)/cl.length*100)}%"></div></div>
    </div>
  `).join('') || '<div style="font-size:12px;color:var(--text-muted)">Sin datos</div>';
}

function renderElegibilidadDist(modo='lista'){
  const leads=leadsVistaActual();
  const items=[
    {label:'Pensiones',short:'Pensiones',val:leads.filter(l=>l.estado==='pensiones').length,color:'#7c3aed'},
    {label:'Corrección ante IMSS',short:'Corrección',val:leads.filter(l=>l.estado==='correccion_imss').length,color:'#0891b2'},
    {label:'En revisión de semanas / NSS',short:'Semanas',val:leads.filter(l=>l.estado==='semanas').length,color:'#d97706'},
    {label:'En revisión de SINDOs',short:'SINDOs',val:leads.filter(l=>l.estado==='sindos').length,color:'#2563eb'},
    {label:'Aprobados',short:'Aprobados',val:leads.filter(l=>l.estado==='aprobado').length,color:'#16a34a'},
    {label:'No elegibles por el momento',short:'No elegibles',val:leads.filter(l=>l.estado==='archivado'&&l.archivoTipo==='temporal').length,color:'#a78bfa'},
    {label:'Archivados definitivos',short:'Archivados',val:leads.filter(l=>l.estado==='archivado'&&l.archivoTipo!=='temporal').length,color:'#64748b'},
  ];
  if(modo==='grafica') return renderMiniChart(items);
  return items.map(i=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${i.color};flex-shrink:0;"></div>
        <span style="font-size:12px;color:var(--text-secondary)">${i.label}</span>
      </div>
      <span style="font-size:13px;font-weight:600;color:${i.color}">${i.val}</span>
    </div>
  `).join('');
}

function getCausasDescarteItems(){
  const registros=[];
  leadsVistaActual().filter(l=>l.estado==='archivado'&&l.archivoTipo!=='temporal'&&l.causaArchivo!=='Convertido a cliente')
    .forEach(l=>registros.push(l.causaArchivo||'Sin causa especificada'));
  (clientesVistaActual()||[]).filter(c=>c.descartado)
    .forEach(c=>registros.push(c.causaDescarte||'Sin causa especificada'));
  const conteo={};
  registros.forEach(causa=>{ conteo[causa]=(conteo[causa]||0)+1; });
  return Object.entries(conteo).sort((a,b)=>b[1]-a[1]).map(([causa,cantidad],i)=>({label:causa,short:causa.split(' ').slice(0,2).join(' '),val:cantidad,color:['#ef4444','#f97316','#f59e0b','#8b5cf6','#64748b'][i%5]}));
}

function renderCausasDescarte(modo='lista'){
  const items=getCausasDescarteItems();
  if(!items.length) return '<div style="font-size:12px;color:var(--text-muted)">Sin descartes registrados</div>';
  if(modo==='grafica') return renderMiniChart(items);
  const max=Math.max(...items.map(i=>i.val),1);
  return items.map(i=>`
    <div style="padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:5px;">
        <span style="font-size:12px;color:var(--text-secondary);">${i.label}</span>
        <span style="font-size:13px;font-weight:600;color:${i.color};">${i.val}</span>
      </div>
      <div class="progress-bar-wrap" style="margin:0;height:5px;"><div class="progress-bar" style="width:${Math.round(i.val/max*100)}%;height:5px;background:${i.color};"></div></div>
    </div>`).join('');
}

function renderMiniChart(items){
  if(!items.length) return '<div style="font-size:12px;color:var(--text-muted)">Sin datos registrados</div>';
  const max=Math.max(...items.map(i=>i.val),1);
  return `<div class="mini-chart">${items.map(i=>`<div class="mini-chart-col" title="${i.label}: ${i.val}"><div class="mini-chart-value">${i.val}</div><div class="mini-chart-bar" style="height:${Math.max(4,Math.round(i.val/max*120))}px;background:${i.color};"></div><div class="mini-chart-label">${i.short||i.label}</div></div>`).join('')}</div>`;
}

function renderDocsDist(){
  const cl=clientesVisibles();
  if(!cl.length) return '<div style="font-size:12px;color:var(--text-muted)">Sin datos aún</div>';
  const completos=cl.filter(c=>{ const d=c.docs||{}; const docs=docsFor(c.servicio); return docs.length>0&&docs.every(doc=>d[doc.id]); }).length;
  const incompletos=cl.filter(c=>{ const d=c.docs||{}; const docs=docsFor(c.servicio); return docs.some(doc=>!d[doc.id]); }).length;
  const sinDocs=cl.filter(c=>{ const d=c.docs||{}; return Object.keys(d).length===0; }).length;
  const pct=cl.length>0?Math.round(completos/cl.length*100):0;
  return `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-family:var(--font-display);font-size:36px;font-weight:700;color:var(--success)">${pct}%</div>
      <div style="font-size:12px;color:var(--text-muted)">clientes con expediente completo</div>
    </div>
    <div class="progress-bar-wrap" style="height:10px;margin-bottom:16px;">
      <div class="progress-bar" style="width:${pct}%;background:var(--success);height:10px;"></div>
    </div>
    ${[{l:'Expediente completo',v:completos,c:'var(--success)'},{l:'Docs. incompletos',v:incompletos,c:'var(--warning)'},{l:'Sin documentos',v:sinDocs,c:'var(--text-muted)'}].map(i=>`
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:12px;color:var(--text-secondary)">${i.l}</span>
        <span style="font-size:13px;font-weight:600;color:${i.c}">${i.v}</span>
      </div>`).join('')}
  `;
}

function initCharts(){
  const cl=clientesVisibles();
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const textColor=isDark?'#94a3b8':'#475569';

  // DONUT - Fuentes
  const fuenteCounts={};
  cl.forEach(c=>{ const f=c.fuente||'otro'; fuenteCounts[f]=(fuenteCounts[f]||0)+1; });
  const fuenteKeys=Object.keys(fuenteCounts);
  const fuenteVals=fuenteKeys.map(k=>fuenteCounts[k]);
  const fuenteColors=fuenteKeys.map((_,i)=>FUENTE_COLORS[i%FUENTE_COLORS.length]);
  const ctxF=document.getElementById('chart-fuentes');
  if(ctxF){
    if(fuenteKeys.length===0){
      ctxF.parentElement.innerHTML='<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px 0;">Sin datos de fuente</div>';
    } else {
      chartInstances.fuentes=new Chart(ctxF,{
        type:'doughnut',
        data:{labels:fuenteKeys.map(k=>FUENTES[k]||k),datasets:[{data:fuenteVals,backgroundColor:fuenteColors,borderWidth:2,borderColor:isDark?'#1c2333':'#fff',hoverOffset:4}]},
        options:{responsive:true,maintainAspectRatio:true,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed}`}}}}
      });
      const legend=document.getElementById('legend-fuentes');
      if(legend) legend.innerHTML=fuenteKeys.map((k,i)=>`
        <div class="legend-item">
          <div class="legend-dot" style="background:${fuenteColors[i]}"></div>
          <span class="legend-label">${FUENTES[k]||k}</span>
          <span class="legend-val">${fuenteVals[i]}</span>
        </div>`).join('');
    }
  }

  // BARRAS HORIZONTALES - Servicios
  const svcCounts={};
  cl.forEach(c=>{ const s=c.servicio||'otro'; svcCounts[s]=(svcCounts[s]||0)+1; });
  const svcKeys=Object.keys(svcCounts);
  const ctxS=document.getElementById('chart-servicios');
  if(ctxS){
    if(svcKeys.length===0){
      ctxS.parentElement.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:20px 0;">Sin datos de servicio</div>';
    } else {
      chartInstances.servicios=new Chart(ctxS,{
        type:'bar',
        data:{
          labels:svcKeys.map(k=>getSvcLabel(k)),
          datasets:[{data:svcKeys.map(k=>svcCounts[k]),backgroundColor:'rgba(59,130,246,0.7)',borderColor:'rgba(59,130,246,1)',borderWidth:1,borderRadius:4}]
        },
        options:{
          indexAxis:'y',responsive:true,maintainAspectRatio:true,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.parsed.x} clientes`}}},
          scales:{
            x:{ticks:{color:textColor,font:{size:11},stepSize:1},grid:{color:isDark?'rgba(30,41,59,0.8)':'rgba(0,0,0,0.06)'},border:{color:'transparent'}},
            y:{ticks:{color:textColor,font:{size:11}},grid:{display:false},border:{color:'transparent'}}
          }
        }
      });
    }
  }
}

// ---- CLIENTES ----
function renderClientes(){
  const cl=clientesVisibles();  // clientes del asesor en sesión
  const descartados=cl.filter(c=>c.descartado);
  const activos=cl.filter(c=>!c.descartado);
  const alertas=alertasSeguimiento(activos);
  const misColabs=colaboradoresVistaActual().filter(c=>c.activo!==false);
  return `
  <div class="clients-toolbar">
    <div><div class="section-title">Clientes</div><div class="section-sub" style="margin-bottom:0;">Base de clientes y seguimiento de trámites</div></div>
    <div class="clients-view-selector">${getSelectorVistaHTML(true)}</div>
  </div>
  ${alertas.length>0?`
  <div class="clients-alerts">
    <div class="client-alerts-toggle" role="button" tabindex="0" aria-expanded="false" onclick="toggleAlertasClientes(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAlertasClientes(this);}">
      <div class="client-alerts-toggle-title"><span class="client-alerts-arrow">▸</span><span>Seguimientos atrasados</span><span class="chip chip-amber">${alertas.length}</span></div>
      <span class="client-alerts-toggle-sub">Contraído para mantener el espacio de trabajo despejado</span>
    </div>
    <div class="client-alerts-list" id="alertas-seguimiento-list" hidden>
      ${alertas.map(a=>`
        <div class="client-alert-item" role="button" tabindex="0" onclick="openPerfil('${a.cliente.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPerfil('${a.cliente.id}');}">
          <div class="client-avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(a.cliente.nombre)}</div>
          <div class="client-alert-main"><span style="font-weight:500;font-size:13px;">${a.cliente.nombre}</span> <span style="font-size:11px;color:var(--text-muted);">· ${a.etapa}</span></div>
          <span class="chip chip-amber" style="font-size:10px;">${a.dias} día${a.dias!==1?'s':''} sin movimiento</span>
        </div>`).join('')}
    </div>
  </div>`:''}
  <div class="filter-bar client-filter-bar">
    <div class="search-wrap">
      <span class="search-icon">⌕</span>
      <input placeholder="Buscar por nombre, teléfono o NSS..." oninput="filtrarClientes()" id="search-cl">
    </div>
    <select id="fil-svc" onchange="filtrarClientes()">
      <option value="">Todos los servicios</option>
      ${(store.servicios||[]).filter(s=>s.activo!==false).map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('')}
    </select>
    <select id="fil-etapa" onchange="filtrarClientes()">
      <option value="">Todas las etapas</option>
      ${STAGES_RETIRO.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}
    </select>
    <select id="fil-fuente" onchange="filtrarClientes()">
      <option value="">Todas las fuentes</option>
      ${Object.entries(FUENTES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
    </select>
    <button class="btn" onclick="exportarClientesExcel()" title="Exportar" style="flex-shrink:0;">⬇ Excel</button>
    <button class="btn" onclick="exportarClientesPorEtapa()" title="Exportar por etapa" style="flex-shrink:0;">⬇ Por etapa</button>
    ${misColabs.length>0?`<select id="fil-colaborador" onchange="filtrarClientes()" style="font-size:12px;">
      <option value="">Todos los colaboradores</option>
      <option value="directo">Solo directos</option>
      ${misColabs.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}
    </select>`:''}
    <button class="btn" onclick="toggleDescartadosView()" id="btn-toggle-descartados" style="font-size:12px;flex-shrink:0;">
      Descartados (${descartados.length})
    </button>
  </div>
  <div id="descartados-panel" class="discarded-clients-panel" style="display:none;">
    <div class="card" style="overflow:hidden;">
      <div class="card-header"><div class="card-title">Clientes descartados (${descartados.length})</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Cliente</th><th>Causa</th><th>Fecha</th><th>Seguimiento</th></tr></thead>
        <tbody>${descartados.map(c=>`<tr>
          <td><span class="td-link" onclick="openPerfil('${c.id}')">${c.nombre}</span></td>
          <td style="font-size:12px;">${c.causaDescarte||'—'}</td>
          <td class="td-muted">${fmtDate(c.fechaDescarte)}</td>
          <td>${c.fechaElegibleNuevo?`<span class="chip chip-amber" style="font-size:10px;">Elegible ~${fmtDate(c.fechaElegibleNuevo)}</span>`:'—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  </div>
  <div class="card clients-list-card">
    <div class="table-wrap clients-table-wrap">
      <table>
        <thead><tr>
          <th style="cursor:pointer;user-select:none;" onclick="ordenarClientes('nombre')">Cliente${flechaOrden('nombre')}</th>
          <th>Teléfono</th>
          <th style="cursor:pointer;user-select:none;" onclick="ordenarClientes('servicio')">Servicio${flechaOrden('servicio')}</th>
          <th>Fuente</th>
          <th style="cursor:pointer;user-select:none;" onclick="ordenarClientes('etapa')">Etapa${flechaOrden('etapa')}</th>
          <th>Docs</th>
          <th style="cursor:pointer;user-select:none;" onclick="ordenarClientes('fechaRegistro')">Registro${flechaOrden('fechaRegistro')}</th>
          <th></th>
        </tr></thead>
        <tbody id="tbody-cl">${renderClientesRows(aplicarOrden(cl))}</tbody>
      </table>
      ${cl.length===0?`
        <div class="empty-state">
          <div class="empty-icon">◎</div>
          <div class="empty-title">Sin clientes registrados</div>
          <div class="empty-sub">Agrega tu primer cliente para comenzar</div>
          <button class="btn btn-primary" onclick="openModalCliente()">+ Nuevo cliente</button>
        </div>`:''}
    </div>
    <div class="clients-mobile-list" id="clientes-mobile-list">${renderClientesCards(aplicarOrden(cl))}</div>
  </div>`;
}

function renderClientesRows(cl){
  if(!cl.length) return '';
  return cl.map(c=>{
    const docs=c.docs||{};
    const docList=docsFor(c.servicio);
    const docOk=docList.filter(d=>docs[d.id]).length;
    const docPct=docList.length>0?Math.round(docOk/docList.length*100):0;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="client-avatar" style="width:30px;height:30px;font-size:11px;">${initials(c.nombre)}</div>
          <span class="td-link" onclick="openPerfil('${c.id}')">${c.nombre}</span>
        </div>
      </td>
      <td class="td-muted">${c.telefono||'—'}</td>
      <td><span class="chip chip-gray" style="font-size:10px;">${getSvcLabel(c.servicio)}</span></td>
      <td class="td-muted">${FUENTES[c.fuente]||'—'}</td>
      <td><span class="stage-badge ${stageCls(c.etapa,c.servicio)}">${stageLabel(c.etapa,c.servicio)}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;min-width:80px;">
          <div class="progress-bar-wrap" style="flex:1;margin:0;"><div class="progress-bar" style="width:${docPct}%;${docPct===100?'background:var(--success)':''}"></div></div>
          <span style="font-size:11px;color:var(--text-muted);width:28px">${docOk}/${docList.length}</span>
        </div>
      </td>
      <td class="td-muted">${fmtDate(c.fechaRegistro)}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="action-btn" onclick="openPerfil('${c.id}')" title="Ver perfil">▤</button>
          <button class="action-btn" onclick="editCliente('${c.id}')" title="Editar">✎</button>
          <button class="action-btn" onclick="eliminar('${c.id}')" title="Eliminar" style="color:var(--danger)">⊗</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderClientesCards(cl){
  if(!cl.length) return '';
  return cl.map(c=>{
    const docs=c.docs||{};
    const docList=docsFor(c.servicio);
    const docOk=docList.filter(d=>docs[d.id]).length;
    const docPct=docList.length>0?Math.round(docOk/docList.length*100):0;
    return `<article class="client-mobile-card" onclick="openPerfil('${c.id}')">
      <div class="client-mobile-head">
        <div class="client-avatar">${initials(c.nombre)}</div>
        <div class="client-mobile-identity"><div class="client-mobile-name">${c.nombre}</div><div class="client-mobile-phone">${c.telefono||'Sin teléfono'}</div></div>
        <span class="stage-badge ${stageCls(c.etapa,c.servicio)}">${stageLabel(c.etapa,c.servicio)}</span>
      </div>
      <div class="client-mobile-meta"><span>${getSvcLabel(c.servicio)}</span><span>${FUENTES[c.fuente]||'Fuente pendiente'}</span><span>${fmtDate(c.fechaRegistro)}</span></div>
      <div class="client-mobile-docs">
        <span>Documentos ${docOk}/${docList.length}</span>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${docPct}%;${docPct===100?'background:var(--success)':''}"></div></div>
      </div>
      <div class="client-mobile-actions">
        <button class="btn" onclick="event.stopPropagation();openPerfil('${c.id}')">Ver expediente</button>
        <button class="action-btn" onclick="event.stopPropagation();editCliente('${c.id}')" title="Editar" aria-label="Editar ${c.nombre}">✎</button>
        <button class="action-btn" onclick="event.stopPropagation();eliminar('${c.id}')" title="Eliminar" aria-label="Eliminar ${c.nombre}" style="color:var(--danger)">⊗</button>
      </div>
    </article>`;
  }).join('');
}

function toggleAlertasClientes(el){
  const list=el?.nextElementSibling;
  if(!list) return;
  const abrir=list.hidden;
  list.hidden=!abrir;
  el.setAttribute('aria-expanded',String(abrir));
  const flecha=el.querySelector('.client-alerts-arrow');if(flecha) flecha.textContent=abrir?'▾':'▸';
}

function toggleDescartadosView(){
  const panel=document.getElementById('descartados-panel');
  if(panel) panel.style.display=panel.style.display==='none'?'block':'none';
}

function filtrarClientes(){
  const q=(document.getElementById('search-cl')?.value||'').toLowerCase();
  const svc=document.getElementById('fil-svc')?.value||'';
  const etapa=document.getElementById('fil-etapa')?.value||'';
  const fuente=document.getElementById('fil-fuente')?.value||'';
  const colab=document.getElementById('fil-colaborador')?.value||'';
  const filtered=clientesVisibles().filter(c=>{
    if(c.descartado) return false; // excluir descartados de la lista principal
    return (!q||c.nombre.toLowerCase().includes(q)||(c.telefono||'').includes(q)||(c.nss||'').includes(q))
      &&(!svc||c.servicio===svc)&&(!etapa||c.etapa===etapa)&&(!fuente||c.fuente===fuente)
      &&(!colab||(colab==='directo'?!c.colaboradorId:c.colaboradorId===colab));
  });
  const tb=document.getElementById('tbody-cl');
  if(tb) tb.innerHTML=renderClientesRows(aplicarOrden(filtered));
  const cards=document.getElementById('clientes-mobile-list');
  if(cards) cards.innerHTML=renderClientesCards(aplicarOrden(filtered));
}

function elegibleChip(e){
  if(e==='si') return '<span class="chip chip-green" style="font-size:10px;">✓ Elegible</span>';
  if(e==='no') return '<span class="chip chip-red" style="font-size:10px;">✗ No elegible</span>';
  if(e==='casi') return '<span class="chip chip-purple" style="font-size:10px;">⬡ Próximo</span>';
  if(e==='pendiente') return '<span class="chip chip-amber" style="font-size:10px;">⏳ Recontactar</span>';
  return '<span style="font-size:11px;color:var(--text-muted)">—</span>';
}

// ---- PIPELINE ----
let otrosServiciosPipelineAbierto=false;

function toggleOtrosServiciosPipeline(){
  otrosServiciosPipelineAbierto=!otrosServiciosPipelineAbierto;
  renderPage('pipeline');
}
