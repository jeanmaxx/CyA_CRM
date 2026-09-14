/* Advisor reassignment requests.
   Advisors can request a transfer; administrators approve or reject it.
   Requests live inside the client payload, so no schema migration is required. */
(function installClientAdvisorRequests(){
  if(window.__cyaClientAdvisorRequestsInstalled)return;
  window.__cyaClientAdvisorRequestsInstalled=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const same=(a,b)=>String(a||'')===String(b||'');
  let knownPendingRequestIds=new Set();
  let requestPollTimer=null;
  let requestPollRunning=false;

  function isAdminUser(){
    return Boolean((typeof isAdmin==='function'&&isAdmin())||(typeof isTechnicalAdmin==='function'&&isTechnicalAdmin()));
  }
  function advisorById(id){return (store?.asesores||[]).find(a=>same(a.id,id));}
  function advisorName(id,fallback='Sin asignar'){
    const a=advisorById(id);
    if(!a)return fallback;
    return typeof asesorNombreCompleto==='function'?(asesorNombreCompleto(a)||a.nombre||fallback):(a.nombre||fallback);
  }
  function advisorsForRequest(currentId){
    return (store?.asesores||[])
      .filter(a=>a&&a.rol!=='tech_admin'&&a.activo!==false&&!same(a.id,currentId))
      .slice().sort((a,b)=>advisorName(a.id,'').localeCompare(advisorName(b.id,''),'es'));
  }
  function requestOf(client){return client?.solicitudCambioAsesor||null;}
  function pendingRequests(){return (store?.clientes||[]).filter(c=>requestOf(c)?.estado==='pendiente');}
  function ownsClient(client){return Boolean(client&&sesionActiva&&same(client.asesorId,sesionActiva.id));}

  function cleanClientPayload(client){
    return typeof cloudCleanObject==='function'?cloudCleanObject(client):JSON.parse(JSON.stringify(client));
  }
  async function persistPayloadOnly(client){
    if(!client)throw new Error('Cliente no disponible');
    if(typeof supabaseClient==='undefined'||typeof CA_ORG_ID==='undefined'){
      if(typeof cloudSyncNow==='function'){await cloudSyncNow({throwOnError:true});return;}
      throw new Error('Sin conexión de guardado');
    }
    const {error}=await supabaseClient.from('clients')
      .update({payload:cleanClientPayload(client)})
      .eq('organization_id',CA_ORG_ID).eq('id',client.id);
    if(error)throw error;
  }
  function reassignAgenda(clientId,newAdvisorId){
    for(const event of (store?.agenda||[]))if(same(event.clienteId,clientId))event.asesorId=newAdvisorId;
  }
  async function persistApprovedTransfer(client){
    if(typeof supabaseClient==='undefined'||typeof CA_ORG_ID==='undefined'){
      if(typeof cloudSyncNow==='function'){await cloudSyncNow({throwOnError:true});return;}
      throw new Error('Sin conexión de guardado');
    }
    const cloudId=typeof cloudIsUuid==='function'&&cloudIsUuid(client.asesorId)?client.asesorId:null;
    const legacyId=cloudId?null:(client.asesorId||null);
    const {error}=await supabaseClient.from('clients').update({
      advisor_id:cloudId,
      legacy_advisor_id:legacyId,
      payload:cleanClientPayload(client),
    }).eq('organization_id',CA_ORG_ID).eq('id',client.id);
    if(error)throw error;

    if(typeof cloudEventRows==='function'){
      const relatedIds=new Set((store?.agenda||[]).filter(e=>same(e.clienteId,client.id)).map(e=>String(e.id)));
      const rows=cloudEventRows().filter(r=>relatedIds.has(String(r.id)));
      if(rows.length){
        const {error:eventError}=await supabaseClient.from('agenda_events').upsert(rows,{onConflict:'organization_id,id'});
        if(eventError)throw eventError;
      }
    }
  }

  function closeRequestModal(){document.getElementById('modal-cya-advisor-request')?.remove();}
  window.cyaCerrarSolicitudCambioAsesor=closeRequestModal;

  window.cyaAbrirSolicitudCambioAsesor=function(clientId){
    const client=(store?.clientes||[]).find(c=>same(c.id,clientId));
    if(!client)return showToast?.('Cliente no disponible','warn');
    if(isAdminUser())return showToast?.('Como administrador puedes reasignar directamente desde Editar cliente','info');
    if(!ownsClient(client))return showToast?.('Solo el asesor responsable puede solicitar el cambio','warn');
    if(requestOf(client)?.estado==='pendiente')return showToast?.('Este cliente ya tiene una solicitud de cambio pendiente','info');
    const options=advisorsForRequest(client.asesorId);
    if(!options.length)return showToast?.('No hay otro asesor activo disponible','warn');
    closeRequestModal();
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="modal-cya-advisor-request">
      <div class="modal cya-advisor-request-modal">
        <div class="modal-header"><div><div class="modal-title">Solicitar cambio de asesor</div><div class="cya-request-client">${safe(client.nombre||'Cliente')}</div></div><button class="btn btn-icon" type="button" onclick="cyaCerrarSolicitudCambioAsesor()">✕</button></div>
        <div class="modal-body">
          <div class="cya-request-current"><span>Asesor actual</span><strong>${safe(advisorName(client.asesorId,client.asesorNombre||'Sin asignar'))}</strong></div>
          <div class="form-group"><label class="form-label" for="cya-request-target">Nuevo asesor solicitado</label><select class="form-select" id="cya-request-target"><option value="">— Seleccionar —</option>${options.map(a=>`<option value="${safe(a.id)}">${safe(advisorName(a.id))}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="cya-request-reason">Motivo del cambio <span>*</span></label><textarea class="form-textarea" id="cya-request-reason" maxlength="300" placeholder="Ej. El cliente fue registrado por error en mi sesión."></textarea><div class="form-helper">La solicitud y su motivo quedarán registrados en el historial del cliente.</div></div>
        </div>
        <div class="modal-footer"><button class="btn" type="button" onclick="cyaCerrarSolicitudCambioAsesor()">Cancelar</button><button class="btn btn-primary" type="button" onclick="cyaEnviarSolicitudCambioAsesor('${safe(client.id)}')">Enviar solicitud</button></div>
      </div></div>`);
  };

  window.cyaEnviarSolicitudCambioAsesor=async function(clientId){
    const client=(store?.clientes||[]).find(c=>same(c.id,clientId));
    if(!client||!ownsClient(client)||isAdminUser())return;
    const targetId=String(document.getElementById('cya-request-target')?.value||'').trim();
    const reason=String(document.getElementById('cya-request-reason')?.value||'').trim();
    if(!targetId)return showToast?.('Selecciona el asesor solicitado','warn');
    if(!reason)return showToast?.('Indica brevemente el motivo del cambio','warn');
    if(same(targetId,client.asesorId))return showToast?.('Selecciona un asesor diferente','warn');
    const target=advisorById(targetId);
    if(!target||target.activo===false||target.rol==='tech_admin')return showToast?.('El asesor seleccionado ya no está disponible','warn');
    const backup=JSON.parse(JSON.stringify(client));
    const request={
      id:'acr_'+Date.now(),estado:'pendiente',
      deAsesorId:client.asesorId||null,deAsesorNombre:advisorName(client.asesorId,client.asesorNombre||'Sin asignar'),
      paraAsesorId:targetId,paraAsesorNombre:advisorName(targetId),
      solicitadoPorId:sesionActiva?.id||null,solicitadoPorNombre:sesionActiva?.nombre||'Asesor',
      motivo:reason,fechaSolicitud:new Date().toISOString(),
    };
    client.solicitudCambioAsesor=request;
    addHist?.(client,'asesor',`Solicitud de cambio de asesor: ${request.deAsesorNombre} → ${request.paraAsesorNombre}. Motivo: ${reason}`);
    try{
      await persistPayloadOnly(client);
      closeRequestModal();
      showToast?.('Solicitud enviada a administración','success');
      if(typeof openPerfil==='function')openPerfil(client.id);
    }catch(error){
      const idx=(store?.clientes||[]).findIndex(c=>same(c.id,client.id));if(idx>=0)store.clientes[idx]=backup;
      showToast?.('No se pudo enviar la solicitud: '+error.message,'warn');
    }
  };

  function requestStatusHtml(client){
    const req=requestOf(client);
    if(!req)return '';
    if(req.estado==='pendiente')return `<div class="cya-request-status pending"><strong>Solicitud de cambio pendiente</strong><span>${safe(req.deAsesorNombre||advisorName(req.deAsesorId))} → ${safe(req.paraAsesorNombre||advisorName(req.paraAsesorId))}</span><small>${safe(req.motivo||'Sin motivo registrado')}</small></div>`;
    if(req.estado==='rechazado')return `<div class="cya-request-status rejected"><strong>Última solicitud rechazada</strong><span>${safe(req.paraAsesorNombre||advisorName(req.paraAsesorId))}${req.resueltoPorNombre?' · por '+safe(req.resueltoPorNombre):''}</span>${req.motivoResolucion?`<small>${safe(req.motivoResolucion)}</small>`:''}</div>`;
    if(req.estado==='aprobado')return `<div class="cya-request-status approved"><strong>Cambio de asesor aprobado</strong><span>${safe(req.paraAsesorNombre||advisorName(req.paraAsesorId))}</span></div>`;
    return '';
  }

  function decorateClientProfile(client){
    const panel=document.getElementById('pd-contacto');
    const rows=panel?.querySelector('.info-rows');
    if(!panel||!rows)return;
    panel.querySelector('[data-cya-advisor-request-actions]')?.remove();
    const req=requestOf(client);
    const box=document.createElement('div');
    box.dataset.cyaAdvisorRequestActions='1';
    box.className='cya-advisor-request-actions';
    const status=requestStatusHtml(client);
    if(isAdminUser()){
      if(req?.estado!=='pendiente'){if(!status)return;box.innerHTML=status;}
      else box.innerHTML=`${status}<div class="cya-request-actions"><button class="btn" type="button" onclick="cyaResolverSolicitudCambioAsesor('${safe(client.id)}','rechazar')">Rechazar</button><button class="btn btn-primary" type="button" onclick="cyaResolverSolicitudCambioAsesor('${safe(client.id)}','aprobar')">Aprobar cambio</button></div>`;
    }else if(ownsClient(client)){
      box.innerHTML=`${status}${req?.estado==='pendiente'?'':`<button class="btn cya-request-button" type="button" onclick="cyaAbrirSolicitudCambioAsesor('${safe(client.id)}')">Solicitar cambio de asesor</button>`}`;
    }else if(status){box.innerHTML=status;}else return;
    rows.insertAdjacentElement('afterend',box);
  }

  window.cyaResolverSolicitudCambioAsesor=async function(clientId,action){
    if(!isAdminUser())return showToast?.('Acceso reservado a administración','warn');
    const client=(store?.clientes||[]).find(c=>same(c.id,clientId));
    const req=requestOf(client);
    if(!client||req?.estado!=='pendiente')return showToast?.('La solicitud ya no está pendiente','info');
    if(action==='aprobar'&&!confirm(`¿Aprobar el cambio de ${req.deAsesorNombre||advisorName(req.deAsesorId)} a ${req.paraAsesorNombre||advisorName(req.paraAsesorId)}?`))return;
    let rejectionReason='';
    if(action==='rechazar'){
      if(!confirm('¿Rechazar esta solicitud de cambio de asesor?'))return;
      rejectionReason=prompt('Motivo del rechazo (opcional):','')||'';
    }
    const clientBackup=JSON.parse(JSON.stringify(client));
    const agendaBackup=(store?.agenda||[]).filter(e=>same(e.clienteId,client.id)).map(e=>JSON.parse(JSON.stringify(e)));
    const adminName=sesionActiva?.nombre||'Administración';
    try{
      if(action==='aprobar'){
        const oldId=client.asesorId;
        const newId=req.paraAsesorId;
        client.asesorId=newId;
        client.asesorNombre=advisorName(newId,req.paraAsesorNombre||'Asesor');
        req.estado='aprobado';req.fechaResolucion=new Date().toISOString();req.resueltoPorId=sesionActiva?.id||null;req.resueltoPorNombre=adminName;
        reassignAgenda(client.id,newId);
        addHist?.(client,'asesor',`Solicitud aprobada por ${adminName}: ${advisorName(oldId,req.deAsesorNombre||'Sin asignar')} → ${advisorName(newId,req.paraAsesorNombre||'Asesor')}. Motivo original: ${req.motivo||'—'}`);
        await persistApprovedTransfer(client);
        showToast?.(`Cliente reasignado a ${advisorName(newId)}`,'success');
      }else{
        req.estado='rechazado';req.fechaResolucion=new Date().toISOString();req.resueltoPorId=sesionActiva?.id||null;req.resueltoPorNombre=adminName;req.motivoResolucion=rejectionReason;
        addHist?.(client,'asesor',`Solicitud de cambio rechazada por ${adminName}${rejectionReason?': '+rejectionReason:''}.`);
        await persistPayloadOnly(client);
        showToast?.('Solicitud rechazada','info');
      }
      knownPendingRequestIds.delete(req.id);
      updateAdminBadge();
      if(document.getElementById('modal-perfil')?.classList.contains('open'))closeModal?.('modal-perfil');
      if(typeof renderPage==='function'&&typeof currentPage!=='undefined')renderPage(currentPage);
    }catch(error){
      const idx=(store?.clientes||[]).findIndex(c=>same(c.id,client.id));if(idx>=0)store.clientes[idx]=clientBackup;
      for(const oldEvent of agendaBackup){const pos=(store?.agenda||[]).findIndex(e=>same(e.id,oldEvent.id));if(pos>=0)store.agenda[pos]=oldEvent;}
      showToast?.('No se pudo resolver la solicitud: '+error.message,'warn');
    }
  };

  function adminRequestsHtml(){
    if(!isAdminUser())return '';
    const items=pendingRequests();
    if(!items.length)return '';
    return `<section class="card cya-admin-requests-card"><div class="card-header"><div><div class="card-title">Solicitudes de cambio de asesor</div><div class="section-sub" style="margin:2px 0 0;">${items.length} solicitud${items.length!==1?'es':''} pendiente${items.length!==1?'s':''} de autorización</div></div><span class="chip chip-amber">${items.length}</span></div><div class="card-body cya-admin-requests-list">${items.map(client=>{
      const req=requestOf(client);return `<div class="cya-admin-request-row"><div class="cya-admin-request-copy"><button class="dashboard-person-link" type="button" onclick="openPerfil('${safe(client.id)}')">${safe(client.nombre||'Cliente')}</button><span>${safe(req.deAsesorNombre||advisorName(req.deAsesorId))} → <strong>${safe(req.paraAsesorNombre||advisorName(req.paraAsesorId))}</strong></span><small>${safe(req.motivo||'Sin motivo')}</small></div><div class="cya-request-actions"><button class="btn" type="button" onclick="cyaResolverSolicitudCambioAsesor('${safe(client.id)}','rechazar')">Rechazar</button><button class="btn btn-primary" type="button" onclick="cyaResolverSolicitudCambioAsesor('${safe(client.id)}','aprobar')">Aprobar</button></div></div>`;
    }).join('')}</div></section>`;
  }

  const openProfileBase=window.openPerfil;
  if(typeof openProfileBase==='function')window.openPerfil=function(id){
    const result=openProfileBase.apply(this,arguments);
    const client=(store?.clientes||[]).find(c=>same(c.id,id));
    if(client){decorateClientProfile(client);setTimeout(()=>decorateClientProfile(client),0);}
    return result;
  };

  const renderDashboardBase=window.renderDashboard;
  if(typeof renderDashboardBase==='function')window.renderDashboard=function(){
    const html=String(renderDashboardBase.apply(this,arguments));
    return isAdminUser()?adminRequestsHtml()+html:html;
  };

  function updateAdminBadge(){
    const nav=document.querySelector('[data-page="dashboard"]');
    nav?.querySelector('.cya-admin-request-nav-badge')?.remove();
    if(!nav||!isAdminUser())return;
    const count=pendingRequests().length;
    if(!count)return;
    const badge=document.createElement('span');badge.className='cya-admin-request-nav-badge';badge.textContent=String(count);badge.title='Solicitudes de cambio de asesor pendientes';nav.appendChild(badge);
  }

  async function refreshRequestsFromCloud(notify=true){
    if(!isAdminUser()||requestPollRunning||typeof supabaseClient==='undefined'||typeof CA_ORG_ID==='undefined'||typeof cloudReady!=='undefined'&&!cloudReady)return;
    requestPollRunning=true;
    try{
      const {data,error}=await supabaseClient.from('clients').select('id,payload').eq('organization_id',CA_ORG_ID);
      if(error)throw error;
      let changed=false;
      for(const row of (data||[])){
        const local=(store?.clientes||[]).find(c=>same(c.id,row.id));if(!local)continue;
        const remote=row.payload?.solicitudCambioAsesor||null;
        const before=JSON.stringify(local.solicitudCambioAsesor||null),after=JSON.stringify(remote);
        if(before!==after){local.solicitudCambioAsesor=remote;changed=true;}
      }
      const pending=pendingRequests();
      const ids=new Set(pending.map(c=>requestOf(c)?.id).filter(Boolean));
      const newcomers=[...ids].filter(id=>!knownPendingRequestIds.has(id));
      knownPendingRequestIds=ids;
      updateAdminBadge();
      if(notify&&newcomers.length)showToast?.(`Nueva solicitud de cambio de asesor (${newcomers.length})`,'info');
      if(changed&&typeof currentPage!=='undefined'&&currentPage==='dashboard'&&typeof renderPage==='function')renderPage('dashboard');
    }catch(error){console.warn('No se pudieron actualizar solicitudes de asesor',error);}
    finally{requestPollRunning=false;}
  }

  if(!document.getElementById('cya-client-advisor-request-styles')){
    const style=document.createElement('style');style.id='cya-client-advisor-request-styles';style.textContent=`
      .cya-advisor-request-actions{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:grid;gap:10px}.cya-request-button{justify-self:start}
      .cya-request-status{padding:10px 12px;border-radius:var(--radius-sm);display:grid;gap:3px;border-left:3px solid var(--warning);background:rgba(245,158,11,.07)}.cya-request-status strong{font-size:11px}.cya-request-status span{font-size:11px;color:var(--text-secondary)}.cya-request-status small{font-size:10px;color:var(--text-muted);line-height:1.4}.cya-request-status.rejected{border-left-color:var(--danger);background:rgba(239,68,68,.06)}.cya-request-status.approved{border-left-color:var(--success);background:rgba(16,185,129,.06)}
      .cya-request-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.cya-advisor-request-modal{max-width:560px}.cya-request-client{font-size:10px;color:var(--text-muted);margin-top:2px}.cya-request-current{display:flex;justify-content:space-between;gap:15px;padding:10px 12px;margin-bottom:14px;background:var(--bg-secondary);border-radius:var(--radius-sm)}.cya-request-current span{font-size:10px;color:var(--text-muted);text-transform:uppercase}.cya-request-current strong{font-size:11px}
      .cya-admin-requests-card{margin-bottom:16px;border-left:3px solid var(--warning)}.cya-admin-requests-list{display:grid;gap:8px}.cya-admin-request-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--border)}.cya-admin-request-row:last-child{border-bottom:0}.cya-admin-request-copy{display:flex;flex-direction:column;gap:3px;min-width:0}.cya-admin-request-copy span{font-size:11px;color:var(--text-secondary)}.cya-admin-request-copy small{font-size:10px;color:var(--text-muted)}
      .cya-admin-request-nav-badge{margin-left:auto;min-width:19px;height:19px;padding:0 5px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--warning);color:#111827;font-size:9px;font-weight:800}
      @media(max-width:700px){.cya-admin-request-row{align-items:flex-start;flex-direction:column}.cya-request-actions{width:100%;justify-content:flex-start}.cya-request-actions .btn{flex:1}.cya-request-button{width:100%}}
    `;document.head.appendChild(style);
  }

  updateAdminBadge();
  refreshRequestsFromCloud(true);
  if(isAdminUser())requestPollTimer=setInterval(()=>refreshRequestsFromCloud(true),60000);
  window.addEventListener('focus',()=>refreshRequestsFromCloud(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshRequestsFromCloud(true);});
  if(typeof currentPage!=='undefined'&&currentPage==='dashboard'&&typeof renderPage==='function')renderPage('dashboard');
})();