/* Client advisor ownership + advisor-aware prospect search.
   Additive module: no migrations and no bulk rewrites. */
(function installClientAdvisorOwnership(){
  if(window.__cyaClientAdvisorOwnershipInstalled)return;
  window.__cyaClientAdvisorOwnershipInstalled=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('es-MX').trim();
  const digits=value=>String(value||'').replace(/\D/g,'');

  function canReassignClient(){
    return Boolean((typeof isAdmin==='function'&&isAdmin())||(typeof isTechnicalAdmin==='function'&&isTechnicalAdmin()));
  }

  function advisorById(id){
    return (store?.asesores||[]).find(a=>String(a.id)===String(id));
  }

  function advisorName(id,fallback='Sin asignar'){
    const advisor=advisorById(id);
    if(advisor){
      if(typeof asesorNombreCompleto==='function')return asesorNombreCompleto(advisor)||advisor.nombre||fallback;
      return advisor.nombre||fallback;
    }
    return fallback;
  }

  function assignableAdvisors(currentId){
    const items=(store?.asesores||[]).filter(a=>a&&a.rol!=='tech_admin'&&(a.activo!==false||String(a.id)===String(currentId||'')));
    return items.slice().sort((a,b)=>advisorName(a.id,'').localeCompare(advisorName(b.id,''),'es'));
  }

  function desiredAdvisorForForm(record,leadId){
    if(record?.asesorId)return record.asesorId;
    const lead=leadId?(store?.leads||[]).find(l=>String(l.id)===String(leadId)):null;
    if(lead?.asesorId)return lead.asesorId;
    if(typeof asesorDestinoVista==='function'){
      const target=asesorDestinoVista();
      if(target)return target;
    }
    return sesionActiva?.id||'';
  }

  function ensureAdvisorField(record=null,leadId=null){
    const serviceRow=document.getElementById('fc-servicio')?.closest('.form-row');
    const contact=document.getElementById('tab-contacto');
    if(!contact)return;
    document.getElementById('cya-client-advisor-row')?.remove();
    const current=desiredAdvisorForForm(record,leadId);
    const options=assignableAdvisors(current);
    const editable=canReassignClient();
    const row=document.createElement('div');
    row.className='form-row';
    row.id='cya-client-advisor-row';
    row.innerHTML=`<div class="form-group" style="grid-column:span 2;">
      <label class="form-label" for="fc-asesor">Asesor responsable <span>*</span></label>
      <select class="form-select" id="fc-asesor" ${editable?'':'disabled'}>
        ${options.map(a=>`<option value="${safe(a.id)}" ${String(a.id)===String(current)?'selected':''}>${safe(advisorName(a.id))}</option>`).join('')}
      </select>
      <div class="form-helper">${editable?'Si cambias el asesor, el CRM registrará el movimiento en el historial y trasladará sus recordatorios.':'El asesor responsable es visible para todos; solo un administrador puede reasignarlo.'}</div>
    </div>`;
    if(serviceRow)serviceRow.insertAdjacentElement('afterend',row);else contact.appendChild(row);
  }

  function profileAdvisorRow(client){
    const panel=document.getElementById('pd-contacto');
    const rows=panel?.querySelector('.info-rows');
    if(!rows)return;
    rows.querySelector('[data-cya-client-advisor]')?.remove();
    const row=document.createElement('div');
    row.className='info-row';
    row.dataset.cyaClientAdvisor='1';
    row.innerHTML=`<span class="ir-label">Asesor responsable</span><span class="ir-value cya-client-advisor-name">${safe(advisorName(client?.asesorId,client?.asesorNombre||'Sin asignar'))}</span>`;
    rows.insertBefore(row,rows.firstElementChild);
  }

  function reassignAgendaLocally(clientId,newAdvisorId){
    for(const event of (store?.agenda||[])){
      if(String(event.clienteId||'')!==String(clientId))continue;
      event.asesorId=newAdvisorId;
    }
  }

  async function persistOwnershipOnly(client){
    if(!client||typeof supabaseClient==='undefined'||typeof CA_ORG_ID==='undefined')return;
    const cloudId=typeof cloudIsUuid==='function'&&cloudIsUuid(client.asesorId)?client.asesorId:null;
    const legacyId=cloudId?null:(client.asesorId||null);
    const payload=typeof cloudCleanObject==='function'?cloudCleanObject(client):JSON.parse(JSON.stringify(client));
    const {error}=await supabaseClient.from('clients').update({advisor_id:cloudId,legacy_advisor_id:legacyId,payload}).eq('organization_id',CA_ORG_ID).eq('id',client.id);
    if(error)throw error;

    const related=(store?.agenda||[]).filter(e=>String(e.clienteId||'')===String(client.id));
    if(related.length&&typeof cloudEventRows==='function'){
      const ids=new Set(related.map(e=>String(e.id)));
      const rows=cloudEventRows().filter(r=>ids.has(String(r.id)));
      if(rows.length){
        const {error:eventError}=await supabaseClient.from('agenda_events').upsert(rows,{onConflict:'organization_id,id'});
        if(eventError)throw eventError;
      }
    }
  }

  async function applyAdvisorChange(client,newAdvisorId,oldAdvisorId,isNewClient=false){
    if(!client||!newAdvisorId||String(newAdvisorId)===String(oldAdvisorId||''))return false;
    const oldName=advisorName(oldAdvisorId,client.asesorNombre||'Sin asignar');
    const newName=advisorName(newAdvisorId,'Asesor');
    const requestedBy=sesionActiva?.nombre||'Usuario';
    client.asesorId=newAdvisorId;
    client.asesorNombre=newName;
    reassignAgendaLocally(client.id,newAdvisorId);
    if(typeof addHist==='function')addHist(client,'asesor',isNewClient?`Cliente registrado y asignado a ${newName} por ${requestedBy}.`:`Cliente registrado a ${oldName}. ${requestedBy} solicita cambio de asesor a ${newName}.`);
    try{
      await persistOwnershipOnly(client);
      if(typeof showToast==='function')showToast(`Asesor actualizado: ${newName}`,'success');
      return true;
    }catch(error){
      console.warn('Actualización puntual de asesor no disponible; se intentará sincronización general',error);
      try{
        if(typeof cloudSyncNow==='function')await cloudSyncNow({throwOnError:true});
        if(typeof showToast==='function')showToast(`Asesor actualizado: ${newName}`,'success');
        return true;
      }catch(syncError){
        console.error('No se pudo guardar el cambio de asesor',syncError);
        if(typeof showToast==='function')showToast('El cambio quedó pendiente de sincronizar: '+syncError.message,'warn');
        return false;
      }
    }
  }

  const openClientBase=window.openModalCliente;
  if(typeof openClientBase==='function')window.openModalCliente=function(origenLeadId=null){
    const result=openClientBase.apply(this,arguments);
    const install=()=>ensureAdvisorField(null,origenLeadId||window.leadConversionPendienteId||null);
    install();setTimeout(install,100);
    return result;
  };

  const editClientBase=window.editCliente;
  if(typeof editClientBase==='function')window.editCliente=function(id){
    const result=editClientBase.apply(this,arguments);
    const install=()=>ensureAdvisorField((store?.clientes||[]).find(c=>String(c.id)===String(id))||null,null);
    install();setTimeout(install,100);
    return result;
  };

  const openProfileBase=window.openPerfil;
  if(typeof openProfileBase==='function')window.openPerfil=function(id){
    const result=openProfileBase.apply(this,arguments);
    const client=(store?.clientes||[]).find(c=>String(c.id)===String(id));
    if(client){profileAdvisorRow(client);setTimeout(()=>profileAdvisorRow(client),0);}
    return result;
  };

  const saveClientBase=window.guardarCliente;
  if(typeof saveClientBase==='function')window.guardarCliente=async function(){
    const desired=String(document.getElementById('fc-asesor')?.value||'').trim();
    const editingBefore=typeof editingId!=='undefined'?editingId:null;
    const beforeIds=new Set((store?.clientes||[]).map(c=>String(c.id)));
    const oldClient=editingBefore?(store?.clientes||[]).find(c=>String(c.id)===String(editingBefore)):null;
    const oldAdvisorId=oldClient?.asesorId||null;
    const result=await saveClientBase.apply(this,arguments);
    const modalStillOpen=document.getElementById('modal-cliente')?.classList.contains('open');
    if(modalStillOpen||!desired||!canReassignClient())return result;

    let savedClient=editingBefore?(store?.clientes||[]).find(c=>String(c.id)===String(editingBefore)):null;
    if(!savedClient){
      savedClient=(store?.clientes||[]).find(c=>!beforeIds.has(String(c.id)))||((typeof editingId!=='undefined'&&editingId)?(store?.clientes||[]).find(c=>String(c.id)===String(editingId)):null);
    }
    if(!savedClient)return result;
    const previous=editingBefore?oldAdvisorId:(savedClient.asesorId||null);
    const changed=await applyAdvisorChange(savedClient,desired,previous,!editingBefore);
    if(changed&&typeof renderPage==='function'&&typeof currentPage!=='undefined')renderPage(currentPage);
    return result;
  };

  // Prospect search: keep the existing jump/highlight behavior but show ownership
  // instead of the notes preview.
  const closeSearchBase=window.cerrarResultadosBusquedaProspectos;
  window.cerrarResultadosBusquedaProspectos=function(){
    const panel=document.getElementById('cya-lead-search-results');
    if(panel){panel.hidden=true;panel.innerHTML='';}
    try{return typeof closeSearchBase==='function'?closeSearchBase.apply(this,arguments):undefined;}catch(_){return undefined;}
  };

  window.cyaBuscarProspectosResponsable=function(value){
    const panel=document.getElementById('cya-lead-search-results');
    if(!panel)return;
    const raw=String(value||'').trim();
    if(raw.length<2){panel.hidden=true;panel.innerHTML='';return;}
    const q=normalize(raw),qDigits=digits(raw);
    const matches=(typeof leadsVistaActual==='function'?leadsVistaActual():(store?.leads||[])).filter(lead=>{
      const name=normalize(lead.nombre),curp=normalize(lead.curp),phone=digits(lead.telefono);
      return name.includes(q)||curp.includes(q)||(qDigits.length>=2&&phone.includes(qDigits));
    }).slice(0,10);
    panel.innerHTML=matches.length?matches.map(lead=>{
      const owner=advisorName(lead.asesorId,lead.asesorNombre||'Sin asignar');
      return `<button class="cya-lead-search-result" type="button" onclick="cyaAbrirProspectoDesdeBusqueda('${safe(lead.id)}')">
        <span class="cya-lead-search-name">${safe(lead.nombre||'Sin nombre')}</span>
        <span class="cya-lead-search-meta"><b>CURP:</b> ${safe(lead.curp||'Pendiente')}</span>
        <span class="cya-lead-search-meta"><b>Servicio:</b> ${safe(typeof getSvcLabel==='function'?getSvcLabel(lead.servicio):lead.servicio||'—')}</span>
        <span class="cya-lead-search-meta"><b>Asesor:</b> ${safe(owner)}</span>
      </button>`;
    }).join(''):'<div class="cya-lead-search-empty">Sin coincidencias</div>';
    panel.hidden=false;
  };

  window.cyaAbrirProspectoDesdeBusqueda=function(id){
    window.cerrarResultadosBusquedaProspectos?.();
    if(typeof irAProspecto==='function')irAProspecto(id);
  };

  window.renderBuscadorProspectos=function(){
    return `<div class="cya-lead-search-wrap">
      <div class="cya-lead-search-input-wrap"><span aria-hidden="true">⌕</span><input id="cya-lead-search-input" type="search" autocomplete="off" placeholder="Buscar por nombre, teléfono o CURP..." oninput="cyaBuscarProspectosResponsable(this.value)" onfocus="if(this.value)cyaBuscarProspectosResponsable(this.value)"></div>
      <div class="cya-lead-search-results" id="cya-lead-search-results" hidden></div>
    </div>`;
  };

  // Clients list search also accepts CURP while preserving NSS compatibility.
  const renderClientsBase=window.renderClientes;
  if(typeof renderClientsBase==='function')window.renderClientes=function(){
    return String(renderClientsBase.apply(this,arguments)).replace('Buscar por nombre, teléfono o NSS...','Buscar por nombre, teléfono, CURP o NSS...');
  };
  const filterClientsBase=window.filtrarClientes;
  if(typeof filterClientsBase==='function')window.filtrarClientes=function(){
    const input=document.getElementById('search-cl');
    const raw=String(input?.value||'').trim();
    const q=raw.toLowerCase();
    if(!q)return filterClientsBase.apply(this,arguments);
    const originalVisible=window.clientesVisibles;
    if(typeof originalVisible!=='function')return filterClientsBase.apply(this,arguments);
    window.clientesVisibles=function(){
      return originalVisible().filter(c=>String(c.curp||'').toLowerCase().includes(q)||String(c.nombre||'').toLowerCase().includes(q)||String(c.telefono||'').includes(q)||String(c.nss||'').includes(q));
    };
    input.value='';
    try{return filterClientsBase.apply(this,arguments);}
    finally{input.value=raw;window.clientesVisibles=originalVisible;}
  };

  if(!document.getElementById('cya-client-advisor-styles')){
    const style=document.createElement('style');
    style.id='cya-client-advisor-styles';
    style.textContent=`
      .cya-client-advisor-name{font-weight:600;color:var(--accent-blue)}
      .cya-lead-search-wrap{position:relative;min-width:min(380px,42vw);max-width:460px;flex:1}
      .cya-lead-search-input-wrap{display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:var(--bg-card);border-radius:var(--radius-sm);padding:0 10px}
      .cya-lead-search-input-wrap>span{color:var(--text-muted)}
      .cya-lead-search-input-wrap input{width:100%;border:0;outline:0;background:transparent;color:var(--text-primary);padding:9px 0;font:inherit;font-size:12px}
      .cya-lead-search-results{position:absolute;z-index:80;top:calc(100% + 6px);left:0;right:0;max-height:420px;overflow:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:0 16px 34px rgba(0,0,0,.24);padding:6px}
      .cya-lead-search-result{width:100%;display:grid;gap:3px;border:0;border-bottom:1px solid var(--border);background:transparent;color:inherit;text-align:left;padding:10px 11px;cursor:pointer;border-radius:6px}
      .cya-lead-search-result:last-child{border-bottom:0}.cya-lead-search-result:hover,.cya-lead-search-result:focus{background:var(--bg-hover);outline:none}
      .cya-lead-search-name{font-size:12px;font-weight:700;color:var(--text-primary)}.cya-lead-search-meta{font-size:10px;color:var(--text-muted);line-height:1.35}.cya-lead-search-meta b{color:var(--text-secondary);font-weight:600}.cya-lead-search-empty{padding:14px;text-align:center;font-size:11px;color:var(--text-muted)}
      @media(max-width:900px){.cya-lead-search-wrap{order:3;min-width:100%;max-width:none;width:100%}.cya-lead-search-results{position:fixed;left:12px;right:12px;top:auto;max-height:50vh}}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.cya-lead-search-wrap'))window.cerrarResultadosBusquedaProspectos?.();
  });

  if(typeof currentPage!=='undefined'&&['leads','clientes'].includes(currentPage)&&typeof renderPage==='function')renderPage(currentPage);
})();