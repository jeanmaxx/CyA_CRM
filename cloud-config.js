window.CA_CLOUD_CONFIG = Object.freeze({
  supabaseUrl: 'https://ibhgisndtaclvwznqugu.supabase.co',
  supabasePublishableKey: 'sb_publishable_grQYYOgYg0WR9gmn3QBHpg_UyieIrZ8',
  organizationId: 'ca000000-0000-4000-8000-000000000001',
  siteUrl: 'https://jeanmaxx.github.io/CyA_CRM/',
});

// Branding is public, so the login screen can use the same company logo
// before authentication and after logout. This avoids two different logos
// depending on whether app settings have already been loaded in the session.
(function installSessionConsistencyFixes(){
  const cfg=window.CA_CLOUD_CONFIG;
  const brandingUrl=`${cfg.supabaseUrl}/storage/v1/object/public/crm-branding/${cfg.organizationId}/logo.png`;

  function setLoginBranding(){
    const el=document.getElementById('login-logo-wrap');
    if(!el)return;
    const img=el.querySelector('img');
    if(img&&img.src===brandingUrl)return;
    el.innerHTML=`<img src="${brandingUrl}" alt="Casillas & Asociados" style="width:100%;height:100%;object-fit:contain;background:#fff;">`;
  }
  window.cyaSetLoginBranding=setLoginBranding;
  setLoginBranding();

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    setLoginBranding();
    if(typeof cloudPrepareLogin!=='function'||typeof sincronizarCitaAfore!=='function'||typeof completarEvento!=='function'||typeof cloudRepairOperationalOwnership!=='function'){
      if(attempts>120)clearInterval(installer);
      return;
    }
    if(window.__cyaSessionConsistencyInstalled){clearInterval(installer);return;}
    window.__cyaSessionConsistencyInstalled=true;
    clearInterval(installer);

    const prepareLoginBase=cloudPrepareLogin;
    cloudPrepareLogin=function(){
      const result=prepareLoginBase.apply(this,arguments);
      setLoginBranding();
      return result;
    };
    mostrarLogin=cloudPrepareLogin;
    volverLoginGrid=cloudPrepareLogin;

    const syncCitaBase=sincronizarCitaAfore;
    sincronizarCitaAfore=function(cliente){
      const result=syncCitaBase.apply(this,arguments);
      if(!cliente||cliente.servicio!=='retiro_desempleo')return result;
      const evento=(store?.agenda||[]).find(e=>e.id==='ev_cita_afore_'+cliente.id);
      if(!evento)return result;
      const etapas=stagesFor(cliente.servicio);
      const etapaActual=etapas.findIndex(s=>s.id===cliente.etapa);
      const etapaActualizada=etapas.findIndex(s=>s.id==='afore_actualizada');
      if(etapaActualizada>=0&&etapaActual>=etapaActualizada){
        evento.completado=true;
        evento.completadoEn=evento.completadoEn||new Date().toISOString();
        evento.cancelarRecordatorio=false;
      }
      return result;
    };

    const repairBase=cloudRepairOperationalOwnership;
    cloudRepairOperationalOwnership=function(){
      const before=JSON.stringify(store?.agenda||[]);
      const originalChanged=repairBase.apply(this,arguments);
      for(const cliente of (store?.clientes||[]))sincronizarCitaAfore(cliente);
      return Boolean(originalChanged||before!==JSON.stringify(store?.agenda||[]));
    };

    const completarBase=completarEvento;
    completarEvento=async function(id){
      const result=await Promise.resolve(completarBase.apply(this,arguments));
      const evento=(store?.agenda||[]).find(e=>e.id===id);
      if(evento?.completado&&cloudReady&&typeof cloudSyncNow==='function'){
        try{await cloudSyncNow({throwOnError:true});}
        catch(error){showToast?.('El evento se marcó como hecho, pero la sincronización quedó pendiente.','warn');}
      }
      return result;
    };
  },25);
})();

// Visual SLA for priority contract steps shown in Dashboard.
// Day of entry counts as day 1: 1-2 green, 3-4 amber, 5+ red.
(function installContractStagePriorityTrafficLight(){
  if(typeof agendaPrioritariaDashboard!=='function'||typeof renderDashboardAgendaPrioritaria!=='function')return;
  const REGLAS_CONTRATO=new Set(['flujo_enviar_firma','flujo_confirmar_firma','flujo_confirmar_alta']);

  function estadoSeguimientoContrato(evento,referencia){
    if(!REGLAS_CONTRATO.has(evento?.regla)||!evento?.fecha)return null;
    const transcurridos=diasTranscurridosDesde(evento.fecha,referencia);
    const dia=Math.max(1,transcurridos+1);
    if(dia<=2)return {clave:'en_tiempo',etiqueta:'En tiempo',clase:'is-on-time',color:'var(--success)',dia};
    if(dia<=4)return {clave:'pendiente',etiqueta:'Pendiente',clase:'is-pending',color:'var(--warning)',dia};
    return {clave:'vencido',etiqueta:'Vencido',clase:'is-overdue',color:'var(--danger)',dia};
  }

  agendaPrioritariaDashboard=function(){
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const fin=new Date(hoy);fin.setDate(fin.getDate()+6);
    const hoyISO=fechaISOLocal(hoy),finISO=fechaISOLocal(fin);
    return eventosVistaActual().filter(e=>{
      if(e.completado||e.cancelarRecordatorio||!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha||''))return false;
      return e.fecha<=finISO;
    }).sort((a,b)=>`${a.fecha} ${a.hora||'23:59'}`.localeCompare(`${b.fecha} ${b.hora||'23:59'}`)).map(e=>{
      const seguimientoContrato=estadoSeguimientoContrato(e,hoy);
      return {
        ...e,
        seguimientoContrato,
        vencido:seguimientoContrato?seguimientoContrato.clave==='vencido':e.fecha<hoyISO,
        hoy:e.fecha===hoyISO,
      };
    });
  };

  renderDashboardAgendaPrioritaria=function(){
    const eventos=agendaPrioritariaDashboard();
    const vencidos=eventos.filter(e=>e.vencido).length;
    const TIPO_LABELS={llamada:'Llamada',whatsapp:'WhatsApp',meet:'Meet',cita:'Cita',recordatorio:'Recordatorio',vencimiento:'Vencimiento',otro:'Otro'};
    const TIPO_COLORS={llamada:'#3b82f6',whatsapp:'#25d366',meet:'#8b5cf6',cita:'#0ea5e9',recordatorio:'#10b981',vencimiento:'#ef4444',otro:'#64748b'};
    return `<section class="card dashboard-priority-card dashboard-agenda-card">
      <div class="card-header dashboard-priority-header" role="button" tabindex="0" aria-expanded="${dashboardAgendaAbierta}" onclick="toggleDashboardPanel('agenda')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDashboardPanel('agenda');}">
        <div class="dashboard-priority-title">
          <span class="dashboard-collapse-icon">${dashboardAgendaAbierta?'▾':'▸'}</span>
          <div><div class="card-title">Agenda prioritaria</div><div class="dashboard-priority-sub">Vencidos y próximos 7 días naturales</div></div>
          <span class="chip ${vencidos?'chip-red':'chip-blue'}">${eventos.length}</span>
        </div>
        <button class="btn dashboard-panel-link" onclick="event.stopPropagation();navigate('agenda',document.querySelector('[data-page=agenda]'))">Ver agenda completa</button>
      </div>
      ${dashboardAgendaAbierta?`<div class="card-body dashboard-priority-body">
        ${eventos.length?`<div class="dashboard-priority-scroll">${eventos.map(e=>{
          const cliente=e.clienteId?(store.clientes||[]).find(c=>c.id===e.clienteId):null;
          const seguimiento=e.seguimientoContrato;
          const etiqueta=seguimiento?.etiqueta||(e.vencido?'Vencido':e.hoy?'Hoy':fmtDate(e.fecha));
          const claseFecha=seguimiento?.clase||(e.vencido?'is-overdue':e.hoy?'is-today':'');
          const colorMarcador=seguimiento?.color||(TIPO_COLORS[e.tipo]||TIPO_COLORS.otro);
          return `<div class="dashboard-agenda-row ${e.vencido?'dashboard-row-danger':''}">
            <div class="dashboard-event-date ${claseFecha}">${etiqueta}</div>
            <div class="dashboard-event-marker" style="background:${colorMarcador}"></div>
            <div class="dashboard-event-copy">
              <div class="dashboard-event-title">${escapeHTMLBasico(e.titulo)}</div>
              <div class="dashboard-event-meta">${escapeHTMLBasico(TIPO_LABELS[e.tipo]||e.tipo||'Evento')}${e.hora?' · '+escapeHTMLBasico(e.hora):''}${cliente?.nombre?' · '+escapeHTMLBasico(cliente.nombre):''}</div>
            </div>
            <button class="btn dashboard-agenda-action" onclick="event.stopPropagation();completarEvento('${e.id}')">${escapeHTMLBasico(botonEventoAgenda(e))}</button>
          </div>`;
        }).join('')}</div>`:`<div class="dashboard-priority-empty">✓ No tienes actividades vencidas ni pendientes para el resto de esta semana.</div>`}
      </div>`:''}
    </section>`;
  };

  if(!document.getElementById('cya-contract-stage-priority-styles')){
    const style=document.createElement('style');
    style.id='cya-contract-stage-priority-styles';
    style.textContent=`
      .dashboard-event-date.is-on-time{color:var(--success);background:rgba(16,185,129,.11);font-weight:600;}
      .dashboard-event-date.is-pending{color:var(--warning);background:rgba(245,158,11,.11);font-weight:600;}
      .dashboard-event-date.is-overdue{font-weight:600;}
    `;
    document.head.appendChild(style);
  }
})();

// SLA for the advisor-controlled "Solicitar cita AFORE" action in the
// Siguientes acciones card. This installer waits until app-operations.js has
// wrapped obtenerSiguienteAccion, so it always runs on the final workflow.
(function installAforeAppointmentActionTrafficLight(){
  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof datosFlujoInicial!=='function'||typeof obtenerSiguienteAccion!=='function'||typeof diasTranscurridosDesde!=='function'){
      if(attempts>160)clearInterval(installer);
      return;
    }
    if(window.__cyaAforeAppointmentTrafficLightInstalled){clearInterval(installer);return;}
    window.__cyaAforeAppointmentTrafficLightInstalled=true;
    clearInterval(installer);

    const obtenerBase=obtenerSiguienteAccion;
    obtenerSiguienteAccion=function(cliente,referencia=new Date()){
      const accion=obtenerBase(cliente,referencia);
      if(!accion||accion.clave!=='solicitar_cita')return accion;
      const fechaBase=cliente?.fechaAltaAfore||(typeof fechaEntradaEtapaDadoAlta==='function'?fechaEntradaEtapaDadoAlta(cliente):null);
      if(!fechaBase)return accion;
      const dia=Math.max(1,diasTranscurridosDesde(fechaBase,referencia)+1);
      let estado;
      if(dia<=5)estado={etiqueta:'En tiempo',tono:'verde'};
      else if(dia<=10)estado={etiqueta:'Pendiente',tono:'amarillo'};
      else if(dia<=15)estado={etiqueta:'Urgente',tono:'naranja'};
      else estado={etiqueta:'Vencido',tono:'rojo'};
      return {...accion,tono:estado.tono,estadoSemaforo:estado.etiqueta,diaSemaforo:dia,detalle:`${estado.etiqueta} · Día ${dia} desde el alta`};
    };

    if(!document.getElementById('cya-afore-action-priority-styles')){
      const style=document.createElement('style');
      style.id='cya-afore-action-priority-styles';
      style.textContent=`
        .dashboard-action-row.action-tone-verde{border-left-color:var(--success);background:rgba(16,185,129,.055);}
        .dashboard-action-row.action-tone-verde .dashboard-action-person span{color:var(--success);font-weight:600;}
        .dashboard-action-row.action-tone-amarillo{border-left-color:var(--warning);background:rgba(245,158,11,.055);}
        .dashboard-action-row.action-tone-amarillo .dashboard-action-person span{color:var(--warning);font-weight:600;}
        .dashboard-action-row.action-tone-naranja .dashboard-action-person span,
        .dashboard-action-row.action-tone-rojo .dashboard-action-person span{font-weight:600;}
      `;
      document.head.appendChild(style);
    }
  },25);
})();
