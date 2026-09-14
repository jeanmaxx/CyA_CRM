/* Transactional persistence fix for advisor reassignment requests.
   Database writes must go through crm_save_changes/cloudSyncNow; direct table
   updates are intentionally blocked by require_transactional_save. */
(function installAdvisorRequestTransactionalFix(){
  if(window.__cyaAdvisorRequestTransactionalFixInstalled)return;
  window.__cyaAdvisorRequestTransactionalFixInstalled=true;

  const same=(a,b)=>String(a||'')===String(b||'');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const isAdminUser=()=>Boolean((typeof isAdmin==='function'&&isAdmin())||(typeof isTechnicalAdmin==='function'&&isTechnicalAdmin()));
  const advisorById=id=>(store?.asesores||[]).find(a=>same(a.id,id));
  const advisorName=(id,fallback='Sin asignar')=>{
    const a=advisorById(id);
    if(!a)return fallback;
    return typeof asesorNombreCompleto==='function'?(asesorNombreCompleto(a)||a.nombre||fallback):(a.nombre||fallback);
  };
  const ownsClient=client=>Boolean(client&&sesionActiva&&same(client.asesorId,sesionActiva.id));

  function repairJournalAfterRollback(){
    try{
      if(typeof syncDiff==='function'&&typeof syncJournal==='function'){
        const pending=syncDiff();
        syncJournal(pending);
        if(!pending.length&&typeof syncBanner==='function')syncBanner('');
      }
    }catch(error){console.warn('No se pudo reconstruir el borrador tras revertir la solicitud',error);}
  }

  function refreshAdminBadge(){
    const nav=document.querySelector('[data-page="dashboard"]');
    if(!nav)return;
    nav.querySelector('.cya-admin-request-nav-badge')?.remove();
    if(!isAdminUser())return;
    const count=(store?.clientes||[]).filter(c=>c?.solicitudCambioAsesor?.estado==='pendiente').length;
    if(!count)return;
    const badge=document.createElement('span');
    badge.className='cya-admin-request-nav-badge';
    badge.textContent=String(count);
    badge.title='Solicitudes de cambio de asesor pendientes';
    nav.appendChild(badge);
  }

  window.cyaEnviarSolicitudCambioAsesor=async function(clientId){
    const client=(store?.clientes||[]).find(c=>same(c.id,clientId));
    if(!client||!ownsClient(client)||isAdminUser())return;
    if(client.solicitudCambioAsesor?.estado==='pendiente'){
      if(typeof showToast==='function')showToast('Este cliente ya tiene una solicitud de cambio pendiente','info');
      return;
    }
    const targetId=String(document.getElementById('cya-request-target')?.value||'').trim();
    const reason=String(document.getElementById('cya-request-reason')?.value||'').trim();
    if(!targetId){if(typeof showToast==='function')showToast('Selecciona el asesor solicitado','warn');return;}
    if(!reason){if(typeof showToast==='function')showToast('Indica brevemente el motivo del cambio','warn');return;}
    if(same(targetId,client.asesorId)){if(typeof showToast==='function')showToast('Selecciona un asesor diferente','warn');return;}
    const target=advisorById(targetId);
    if(!target||target.activo===false||target.rol==='tech_admin'){
      if(typeof showToast==='function')showToast('El asesor seleccionado ya no está disponible','warn');
      return;
    }
    if(typeof cloudSyncNow!=='function'){
      if(typeof showToast==='function')showToast('El guardado seguro todavía no está disponible. Actualiza la página.','warn');
      return;
    }

    const backup=clone(client);
    const request={
      id:'acr_'+Date.now(),estado:'pendiente',
      deAsesorId:client.asesorId||null,
      deAsesorNombre:advisorName(client.asesorId,client.asesorNombre||'Sin asignar'),
      paraAsesorId:targetId,
      paraAsesorNombre:advisorName(targetId),
      solicitadoPorId:sesionActiva?.id||null,
      solicitadoPorNombre:sesionActiva?.nombre||'Asesor',
      motivo:reason,
      fechaSolicitud:new Date().toISOString(),
    };
    client.solicitudCambioAsesor=request;
    if(typeof addHist==='function')addHist(client,'asesor',`Solicitud de cambio de asesor: ${request.deAsesorNombre} → ${request.paraAsesorNombre}. Motivo: ${reason}`);

    try{
      await cloudSyncNow({throwOnError:true});
      if(typeof cyaCerrarSolicitudCambioAsesor==='function')cyaCerrarSolicitudCambioAsesor();
      if(typeof showToast==='function')showToast('Solicitud enviada a administración','success');
      if(typeof openPerfil==='function')openPerfil(client.id);
    }catch(error){
      const idx=(store?.clientes||[]).findIndex(c=>same(c.id,client.id));
      if(idx>=0)store.clientes[idx]=backup;
      repairJournalAfterRollback();
      const message=/Conflicto en|otro usuario cambió/i.test(String(error?.message||''))
        ?'El cliente cambió en otra sesión. Actualiza el CRM y vuelve a enviar la solicitud.'
        :'No se pudo enviar la solicitud: '+(error?.message||'Error de guardado');
      if(typeof showToast==='function')showToast(message,'warn');
    }
  };

  window.cyaResolverSolicitudCambioAsesor=async function(clientId,action){
    if(!isAdminUser()){
      if(typeof showToast==='function')showToast('Acceso reservado a administración','warn');
      return;
    }
    const client=(store?.clientes||[]).find(c=>same(c.id,clientId));
    const req=client?.solicitudCambioAsesor;
    if(!client||req?.estado!=='pendiente'){
      if(typeof showToast==='function')showToast('La solicitud ya no está pendiente','info');
      return;
    }
    if(action==='aprobar'&&!confirm(`¿Aprobar el cambio de ${req.deAsesorNombre||advisorName(req.deAsesorId)} a ${req.paraAsesorNombre||advisorName(req.paraAsesorId)}?`))return;
    let rejectionReason='';
    if(action==='rechazar'){
      if(!confirm('¿Rechazar esta solicitud de cambio de asesor?'))return;
      rejectionReason=prompt('Motivo del rechazo (opcional):','')||'';
    }
    if(typeof cloudSyncNow!=='function'){
      if(typeof showToast==='function')showToast('El guardado seguro todavía no está disponible. Actualiza la página.','warn');
      return;
    }

    const clientBackup=clone(client);
    const agendaBackup=(store?.agenda||[]).filter(e=>same(e.clienteId,client.id)).map(clone);
    const adminName=sesionActiva?.nombre||'Administración';

    try{
      if(action==='aprobar'){
        const oldId=client.asesorId;
        const newId=req.paraAsesorId;
        client.asesorId=newId;
        client.asesorNombre=advisorName(newId,req.paraAsesorNombre||'Asesor');
        req.estado='aprobado';
        req.fechaResolucion=new Date().toISOString();
        req.resueltoPorId=sesionActiva?.id||null;
        req.resueltoPorNombre=adminName;
        for(const event of (store?.agenda||[]))if(same(event.clienteId,client.id))event.asesorId=newId;
        if(typeof addHist==='function')addHist(client,'asesor',`Solicitud aprobada por ${adminName}: ${advisorName(oldId,req.deAsesorNombre||'Sin asignar')} → ${advisorName(newId,req.paraAsesorNombre||'Asesor')}. Motivo original: ${req.motivo||'—'}`);
        await cloudSyncNow({throwOnError:true});
        if(typeof showToast==='function')showToast(`Cliente reasignado a ${advisorName(newId)}`,'success');
      }else{
        req.estado='rechazado';
        req.fechaResolucion=new Date().toISOString();
        req.resueltoPorId=sesionActiva?.id||null;
        req.resueltoPorNombre=adminName;
        req.motivoResolucion=rejectionReason;
        if(typeof addHist==='function')addHist(client,'asesor',`Solicitud de cambio rechazada por ${adminName}${rejectionReason?': '+rejectionReason:''}.`);
        await cloudSyncNow({throwOnError:true});
        if(typeof showToast==='function')showToast('Solicitud rechazada','info');
      }
      refreshAdminBadge();
      if(document.getElementById('modal-perfil')?.classList.contains('open')&&typeof closeModal==='function')closeModal('modal-perfil');
      if(typeof renderPage==='function'&&typeof currentPage!=='undefined')renderPage(currentPage);
    }catch(error){
      const idx=(store?.clientes||[]).findIndex(c=>same(c.id,client.id));
      if(idx>=0)store.clientes[idx]=clientBackup;
      for(const oldEvent of agendaBackup){
        const pos=(store?.agenda||[]).findIndex(e=>same(e.id,oldEvent.id));
        if(pos>=0)store.agenda[pos]=oldEvent;
      }
      repairJournalAfterRollback();
      const message=/Conflicto en|otro usuario cambió/i.test(String(error?.message||''))
        ?'La solicitud llegó después de abrir esta sesión. Actualiza el CRM antes de aprobarla o rechazarla.'
        :'No se pudo resolver la solicitud: '+(error?.message||'Error de guardado');
      if(typeof showToast==='function')showToast(message,'warn');
    }
  };
})();
