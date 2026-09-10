/* Prospect form, search and sorting updates. Commercial templates stay in the existing core file. */
function irAProspecto(id){
  const lead=leadsVistaActual().find(l=>String(l.id)===String(id));
  if(!lead){ showToast('El prospecto ya no está disponible en esta vista','warn'); return; }
  cerrarResultadosBusquedaProspectos();
  if(lead.estado==='archivado'){
    archiveCollapsed[archiveGroupKey(lead)]=false; archiveCollapsed.definitivos=false;
    archivadosLeadsAbiertos=true;
    renderPage('leads');
  }
  setTimeout(()=>{
    cerrarResultadosBusquedaProspectos();
    const tarjeta=[...document.querySelectorAll('.lead-card[data-lead-id]')].find(el=>String(el.dataset.leadId)===String(id));
    if(!tarjeta){ showToast(`Prospecto encontrado en ${LEAD_ESTADOS[lead.estado]?.label||'su etapa'}`,'success'); return; }
    document.querySelectorAll('.lead-card-encontrado').forEach(el=>el.classList.remove('lead-card-encontrado'));
    clearTimeout(leadSearchHighlightTimer);
    tarjeta.classList.add('lead-card-encontrado');
    tarjeta.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
    tarjeta.focus({preventScroll:true});
    leadSearchHighlightTimer=setTimeout(()=>tarjeta.classList.remove('lead-card-encontrado'),4200);
  },40);
}

function renderLeads(){
  procesarRecontactosLeads();
  const vistaLeads=leadsVistaActual();
  const leads=vistaLeads.filter(l=>l.estado!=='archivado');
  const archivados=vistaLeads.filter(l=>l.estado==='archivado');
  const temporales=archivados.filter(l=>l.archivoTipo==='temporal');
  const definitivos=archivados.filter(l=>l.archivoTipo!=='temporal');
  const hoy=new Date();

  const colsActivos=['pensiones','correccion_imss','semanas','sindos','aprobado'];

  return `
  <div class="leads-toolbar">
    <div><div class="section-title">Prospectos</div><div class="section-sub">Seguimiento y evaluación de prospectos</div></div>
    ${renderBuscadorProspectos()}
    <div class="leads-toolbar-actions">${getSelectorVistaHTML(true)}<button class="btn btn-primary" onclick="openModalLead()">+ Nuevo prospecto</button></div>
  </div>
  <div class="mobile-scroll-hint" aria-hidden="true">Desliza para recorrer las etapas →</div>
  <div class="leads-scroll-wrap" tabindex="0" aria-label="Etapas de prospectos. Desliza horizontalmente para recorrerlas.">
    <div class="leads-kanban">
      ${colsActivos.map(estado=>{
        const cfg=LEAD_ESTADOS[estado];
        const tarjetas=ordenarProspectos(leads.filter(l=>l.estado===estado),estado);
        return `<div class="lead-col ${cfg.cls}">
          <div class="lead-col-header">
            <span>${cfg.label} <button class="lead-order" onclick="alternarOrdenProspectos('${estado}')" title="Orden por fecha de registro: ${leadOrder[estado]==='desc'?'más recientes primero':'más antiguos primero'}" aria-label="Invertir orden de ${cfg.label}">${leadOrder[estado]==='desc'?'↓':'↑'}</button></span>
            <span style="background:rgba(0,0,0,.2);padding:2px 8px;border-radius:10px;font-size:11px;">${tarjetas.length}</span>
          </div>
          <div class="lead-col-body">
            ${tarjetas.length===0?`<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px 0;">Sin prospectos</div>`
            :tarjetas.map(l=>{
              const dias=Math.floor((hoy-new Date(l.fechaInicio))/(1000*60*60*24));
              const limite=cfg.dias;
              const urgente=limite&&dias>=limite;
              const diasCls=urgente?'lead-dias-urgente':dias>1?'lead-dias-normal':'lead-dias-ok';
              const colabNombre=l.colaboradorId?(store.colaboradores.find(c=>c.id===l.colaboradorId)||{}).nombre:'';
              const primeraNota=(l.notas||'').split(/\r?\n/)[0]||'Sin notas';
              return `<div class="lead-card" data-lead-id="${escapeLeadText(l.id)}" role="button" tabindex="0" onclick="openModalLead('${l.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModalLead('${l.id}');}">
                <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;"><div class="lead-card-nombre">${l.nombre}</div>${l.recontactar?`<span class="lead-recontactar ${l.recontactoVencido?'vencido':''}">RECONTACTAR</span>`:''}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">
                  <span style="font-size:10px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.curp||'CURP pendiente'}</span>
                  <span class="lead-card-dias ${diasCls}" style="margin:0;flex-shrink:0;">${dias}d${urgente?' ⚠':''}</span>
                </div>
                <div class="lead-card-nota" title="${primeraNota.replace(/"/g,'&quot;')}">${primeraNota}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${getSvcLabel(l.servicio)}${colabNombre?' · Vía: '+colabNombre:''}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div class="archivados-section">
    <div class="archivados-header" onclick="toggleArchivadosLeads()">
      <span>${archivadosLeadsAbiertos?'▾':'▸'} Archivados (${archivados.length})</span>
      <span style="font-size:10px;color:var(--text-muted);">${temporales.length} no elegibles por ahora · ${definitivos.length} definitivos</span>
    </div>
    <div class="archivados-body ${archivadosLeadsAbiertos?'':'oculto'}">
      ${renderGrupoArchivados('No elegibles por el momento',temporales,true)}
      ${renderArchivadosPorCausa(definitivos)}
    </div>
  </div>
  <div class="leads-export"><button class="btn" onclick="exportarLeadsPorEtapa()">⬇ Exportar prospectos</button></div>`;
}

function openModalLead(id){
  editingLeadId=id||null;
  const l=id?store.leads.find(x=>x.id===id):null;
  document.getElementById('modal-lead-title').textContent=id?'Editar prospecto':'Nuevo prospecto';
  // Poblar colaboradores
  const sel=document.getElementById('lead-colaborador');
  const misColabs=colaboradoresVistaActual().filter(c=>c.activo!==false);
  sel.innerHTML='<option value="">— Directo —</option>'+misColabs.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
  const svcSel=document.getElementById('lead-servicio');
  svcSel.innerHTML=store.servicios.filter(s=>s.activo!==false).map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('');
  const estadoSel=document.getElementById('lead-estado');
  estadoSel.querySelectorAll('option[value="archivado"]').forEach(o=>o.remove());
  estadoSel.disabled=false;
  setVal('lead-nombre',l?l.nombre:'');
  setVal('lead-tel',l?l.telefono:'');
  setVal('lead-curp',l?l.curp:'');
  setVal('lead-servicio',l?l.servicio||'retiro_desempleo':'retiro_desempleo');
  if(l?.estado==='archivado'){
    estadoSel.insertAdjacentHTML('beforeend','<option value="archivado">📦 Archivado</option>');
    setVal('lead-estado','archivado');
  } else {
    setVal('lead-estado',l?l.estado:'semanas');
  }
  setVal('lead-colaborador',l?l.colaboradorId||'':'');
  setVal('lead-notas',l?l.notas:'');
  leadEligibilityDraft=JSON.parse(JSON.stringify(l?.elegibilidad||{}));
  leadEligibilityService=l?.servicio||'retiro_desempleo';
  renderLeadElegibilidad(leadEligibilityDraft);
  prepararFechasProspecto(l);
  validarCurpLead();
  // Botones condicionales
  const btnArchivar=document.getElementById('lead-btn-archivar');
  const btnConvertir=document.getElementById('lead-btn-convertir');
  const btnEliminar=document.getElementById('lead-btn-eliminar');
  if(btnArchivar){ btnArchivar.style.display=id?'':'none'; btnArchivar.textContent=l?.estado==='archivado'?'Cambiar causa de archivo':'Archivar'; }
  if(btnEliminar) btnEliminar.style.display=id?'':'none';
  if(btnConvertir) btnConvertir.style.display=id&&l?.estado==='aprobado'?'':'none';
  document.getElementById('modal-lead').classList.add('open');
}

function onLeadServicioChange(){
  guardarBorradorElegibilidad();
  const svc=getVal('lead-servicio');
  if(svc==='asesoria_pension') setVal('lead-estado','pensiones');
  else if(svc==='correccion_imss') setVal('lead-estado','correccion_imss');
  else if(['pensiones','correccion_imss'].includes(getVal('lead-estado'))) setVal('lead-estado','semanas');
  leadEligibilityService=svc;
  renderLeadElegibilidad(leadEligibilityDraft.porServicio?.[svc]||{});
}

async function guardarLead(){
  const nombre=(getVal('lead-nombre')||'').trim();
  if(!nombre){showToast('El nombre es obligatorio','warn');return;}
  const fechaRegistroLead=leerFechaMX('lead-fecha-registro');
  if(!fechaRegistroLead||fechaRegistroLead>fechaISOLocal(new Date())) return showToast('Revisa la fecha de registro','warn');
  if(!validarFechasElegibilidad()) return;
  const fechaRetiroElegibilidad=leerFechaMX('lead-el-fecha-retiro');
  if(fechaRetiroElegibilidad===null) return;
  const curp=getVal('lead-curp').toUpperCase();
  const validacion=validarCurpEstructura(curp,nombre);
  const leadAnterior=editingLeadId?store.leads.find(l=>l.id===editingLeadId):null;
  const lead={
    id:editingLeadId||'lead_'+Date.now(),
    nombre, telefono:getVal('lead-tel'), curp,
    servicio:getVal('lead-servicio')||'retiro_desempleo',
    estado:getVal('lead-estado')||'semanas',
    colaboradorId:getVal('lead-colaborador')||null,
    notas:getVal('lead-notas'),
    elegibilidad:{...recogerElegibilidadLead(),fechaRetiro:fechaRetiroElegibilidad},
    curpAdvertencias:validacion.errores,
    fechaInicio:leadAnterior?.fechaInicio||new Date().toISOString(),
    fechaRegistro:fechaRegistroLead,
    fechaCaptura:leadAnterior?.fechaCaptura||new Date().toISOString(),
    asesorId:leadAnterior?.asesorId||asesorDestinoVista(),
  };
  if(editingLeadId){
    const idx=store.leads.findIndex(l=>l.id===editingLeadId);
    if(idx>=0){
      const actualizado={...store.leads[idx],...lead};
      if(leadAnterior?.estado==='archivado'&&lead.estado!=='archivado'){
        delete actualizado.archivoTipo;
        delete actualizado.causaArchivo;
        delete actualizado.causaArchivoId;
        delete actualizado.notasArchivo;
        delete actualizado.fechaArchivo;
        delete actualizado.fechaUltimoRetiro;
        delete actualizado.fechaRecontacto;
        actualizado.recontactar=false;
        actualizado.recontactoVencido=false;
        const notaReactivado='REACTIVADO MANUALMENTE: '+fmtDateTime(new Date());
        actualizado.notas=((actualizado.notas||'')+'\n'+notaReactivado).trim();
        store.agenda=(store.agenda||[]).filter(e=>e.id!=='ev_recontacto_'+actualizado.id);
      }
      registrarCambioFecha(actualizado,'fechaRegistro',leadAnterior.fechaRegistro||leadAnterior.fechaInicio,fechaRegistroLead,'Registro');
      store.leads[idx]=actualizado;
    }

  } else {
    store.leads.push(lead);

  }
  editingLeadId=lead.id;
  try{await cloudSyncNow({throwOnError:true});}catch(e){showToast('Prospecto pendiente de guardar. Conservamos la captura para reintentar.','warn');return;}
  showToast('Prospecto guardado en la nube','success');
  closeModal('modal-lead');
  renderPage('leads');
}
