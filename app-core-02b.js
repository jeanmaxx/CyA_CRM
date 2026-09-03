function renderPipeline(){
  const _clVista=(clientesVistaActual()||[]).filter(c=>!c.descartado&&!c.archivado);
  const retiro=_clVista.filter(c=>c.servicio==='retiro_desempleo');
  const otros=_clVista.filter(c=>c.servicio!=='retiro_desempleo');
  const pensiones=otros.filter(c=>c.servicio==='asesoria_pension');
  const correcciones=otros.filter(c=>c.servicio==='correccion_imss');
  const restantes=otros.filter(c=>!['asesoria_pension','correccion_imss'].includes(c.servicio));

  // Todas las etapas permanecen visibles; cada columna desplaza internamente después de 3 tarjetas.
  const fila1=STAGES_RETIRO.slice(0,5);
  const fila2=STAGES_RETIRO.slice(5);

  function renderKanbanCol(st,clientes,servicio){
    const cards=clientes.filter(c=>c.etapa===st.id);
    return `<div class="kanban-col">
      <div class="kanban-col-header">
        <div class="kanban-col-title">${st.label}</div>
        <div class="kanban-count">${cards.length}</div>
      </div>
      <div class="kanban-cards">
        ${cards.length===0
          ?'<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px 0">—</div>'
          :cards.map(c=>`<div class="kanban-card" role="button" tabindex="0" onclick="openPerfil('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPerfil('${c.id}');}">
            <div class="kanban-card-name">${c.nombre}</div>
            <div class="kanban-card-info">${c.telefono||'—'}</div>
            ${servicio==='retiro_desempleo'&&c.montoAfore?`<div class="kanban-card-info">AFORE: $${Number(c.montoAfore).toLocaleString('es-MX')}</div>`:''}
            <div class="kanban-card-date">${fmtDate(c.fechaRegistro)}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function renderServicioPipeline(titulo,servicio,clientes){
    const etapas=stagesFor(servicio);
    return `<div class="pipeline-service-block">
      <div class="pipeline-service-header"><div>${titulo}</div><span class="chip chip-gray">${clientes.length} cliente${clientes.length!==1?'s':''}</span></div>
      <div class="pipeline-scroll-wrap" tabindex="0" aria-label="Etapas de ${titulo}. Desliza horizontalmente para recorrerlas."><div class="pipeline-service-grid" style="--pipeline-cols:${etapas.length};">${etapas.map(st=>renderKanbanCol(st,clientes,servicio)).join('')}</div></div>
    </div>`;
  }

  return `
  <div class="module-toolbar pipeline-toolbar">
    <div><div class="section-title">Pipeline</div><div class="section-sub" style="margin-bottom:0;">Retiro por desempleo — ${retiro.length} cliente${retiro.length!==1?'s':''} activos</div></div>
    <div class="module-view-selector pipeline-view-selector">${getSelectorVistaHTML(true)}</div>
  </div>

  <div class="mobile-scroll-hint" aria-hidden="true">Desliza para recorrer las etapas →</div>
  <!-- FILA 1 -->
  <div class="pipeline-scroll-wrap" tabindex="0" aria-label="Primeras etapas del pipeline. Desliza horizontalmente para recorrerlas.">
    <div class="pipeline-grid pipeline-grid-primary">
      ${fila1.map(st=>renderKanbanCol(st,retiro,'retiro_desempleo')).join('')}
    </div>
  </div>
  <!-- FILA 2 -->
  <div class="pipeline-scroll-wrap" tabindex="0" aria-label="Etapas finales del pipeline. Desliza horizontalmente para recorrerlas.">
    <div class="pipeline-grid pipeline-grid-secondary">
      ${fila2.map(st=>renderKanbanCol(st,retiro,'retiro_desempleo')).join('')}
    </div>
  </div>

  <div class="archivados-section" style="margin-top:20px;">
    <div class="archivados-header" onclick="toggleOtrosServiciosPipeline()">
      <span>${otrosServiciosPipelineAbierto?'▾':'▸'} OTROS SERVICIOS</span>
      <span style="font-size:10px;color:var(--text-muted);">${otros.length} cliente${otros.length!==1?'s':''}</span>
    </div>
    <div style="padding:0 14px 14px;${otrosServiciosPipelineAbierto?'':'display:none;'}">
      ${renderServicioPipeline('Pensiones','asesoria_pension',pensiones)}
      ${renderServicioPipeline('Corrección ante IMSS','correccion_imss',correcciones)}
      ${restantes.length?`<div style="margin-top:16px;"><div style="font-size:13px;font-weight:600;margin-bottom:8px;">Otros</div><div class="card" style="overflow:hidden;"><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Servicio</th><th>Etapa</th><th>Teléfono</th></tr></thead><tbody>${restantes.map(c=>`<tr><td><span class="td-link" onclick="openPerfil('${c.id}')">${c.nombre}</span></td><td><span class="chip chip-gray">${getSvcLabel(c.servicio)}</span></td><td><span class="stage-badge stage-1">${stageLabel(c.etapa,c.servicio)}</span></td><td class="td-muted">${c.telefono||'—'}</td></tr>`).join('')}</tbody></table></div></div></div>`:''}
    </div>
  </div>
  <div class="module-export pipeline-export">
    <button class="btn" onclick="exportarClientesPorEtapa()">⬇ Exportar pipeline</button>
  </div>`;
}

// ---- PERFIL ----
function openPerfil(id){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  const colaboradorFinanzas=colaboradorDeCliente(c);
  const esRetiro=c.servicio==='retiro_desempleo';
  const finanzasConfiguradas=c.finanzasConfiguradas===true;
  const finMontoValor=finanzasConfiguradas?(c.montoRetiro??c.montoAfore??''):(c.montoRetiro||c.montoAfore||(esRetiro?35190:''));
  const finHonorariosValor=finanzasConfiguradas?(c.honorarios??''):(c.honorarios||c.honorariosCalc||(esRetiro?8000:''));
  const finComisionValor=finanzasConfiguradas?(tieneMontoFinanciero(c.comision)?comisionEfectiva(c):''):(c.comision||c.comisionCalc||(esRetiro?comisionDefaultParaAsesor(c.asesorId):''));
  const estadoPagoPerfil=estadoPagoEfectivo(c);
  perfilClienteActivo=id;
  perfilDirty=false;
  const stages=stagesFor(c.servicio);
  const si=stages.findIndex(s=>s.id===c.etapa);
  const docs=c.docs||{};
  const docList=docsFor(c.servicio);
  const docOk=docList.filter(d=>docs[d.id]).length;

  document.getElementById('perfil-title').textContent=c.nombre+(c.descartado?' [DESCARTADO]':'');
  document.getElementById('perfil-sub').textContent=`${getSvcLabel(c.servicio)} · ${FUENTES[c.fuente]||'—'} · Registrado ${fmtDate(c.fechaRegistro)}`;
  document.getElementById('perfil-edit-btn').onclick=()=>{ closeModal('modal-perfil'); editCliente(id); };
  // Ocultar botón descartar si ya está descartado o concluido
  const btnDesc=document.getElementById('perfil-descartar-btn');
  if(btnDesc) btnDesc.style.display=(c.descartado||c.etapa==='concluido')?'none':'';
  const btnRegresar=document.getElementById('perfil-regresar-prospecto-btn');
  if(btnRegresar) btnRegresar.style.display=(c.descartado||c.archivado||c.devueltoAProspectos)?'none':'';

  document.getElementById('perfil-body').innerHTML=`
    ${renderAlertasAFORE(c)}
    ${c.descartado?`<div class="alerta-firma alerta-roja" style="margin-bottom:12px;">🚫 DESCARTADO: ${c.causaDescarte||'—'}${c.fechaElegibleNuevo?' · Podría ser elegible: '+fmtDate(c.fechaElegibleNuevo):''}</div>`:''}
    <!-- ETAPAS CON CHECKBOXES -->
    <div class="profile-stage-wrap">
      <div class="profile-stage-track" tabindex="0" aria-label="Etapas del trámite. Desliza horizontalmente para recorrerlas.">
        ${stages.map((s,i)=>{
          const done=i<si; const active=i===si; const futuro=i>si;
          const color=done?'var(--success)':active?'var(--accent-blue)':'var(--border-strong)';
          const siguiente=futuro&&i===si+1;
          return `<div class="profile-stage-step ${done?'done':active?'active':siguiente?'next':'future'}" style="--stage-color:${color};" ${siguiente?'role="button" tabindex="0"':active?'aria-current="step"':''}
            onclick="${futuro&&i===si+1?`avanzarEtapa('${c.id}')`:''}"
            onkeydown="${siguiente?`if(event.key==='Enter'||event.key===' '){event.preventDefault();avanzarEtapa('${c.id}');}`:''}"
            title="${futuro&&i===si+1?'Click para avanzar a: '+s.label:''}">
            <div class="profile-stage-number">${done?'✓':i+1}</div>
            <div class="profile-stage-label">${s.short||s.label}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="profile-stage-current">
        Etapa actual: <strong style="color:var(--accent-blue);">${stages[si]?.label||'—'}</strong>
        ${si<stages.length-1?`<span style="color:var(--text-muted);"> · Click en la siguiente etapa para avanzar</span>`:''}
      </div>
    </div>
    <!-- ALERTAS DE ESTADO -->
    ${(()=>{
      let alertas='';
      if(c.servicio==='retiro_desempleo'){
        if(!c.contratoFirmado){
          alertas+=`<div class="alerta-firma alerta-roja">🔴 Contrato pendiente de firma — requerido para avanzar en el proceso</div>`;
          if(c.autorizadoSinFirma) alertas+=`<div class="alerta-firma alerta-amarilla">⚠ Avance sin firma autorizado para la siguiente etapa</div>`;
        } else {
          alertas+=`<div class="alerta-firma alerta-verde">✓ Contrato firmado el ${fmtDate(c.fechaFirmaContrato||'')}</div>`;
        }
        const docList=docsFor(c.servicio);
        const docs=c.docs||{};
        const docOkCount=docList.filter(d=>docs[d.id]).length;
        if(docOkCount < docList.length){
          const faltantes=docList.filter(d=>!docs[d.id]).map(d=>d.label);
          alertas+=`<div class="alerta-firma alerta-amarilla" style="align-items:flex-start;">⚠ <span><strong>Documentos pendientes:</strong> ${faltantes.join(', ')}</span></div>`;
        }
        if(!c.banco||!c.clabe) alertas+=`<div class="alerta-firma alerta-amarilla">⚠ Falta cuenta bancaria completa</div>`;
        if(!c.fechaBiometrica) alertas+=`<div class="alerta-firma alerta-amarilla">⚠ Falta cita de actualización de datos en AFORE</div>`;
      }
      return alertas;
    })()}

    <div class="profile-summary-grid">
      <div class="card" style="padding:12px;"><div class="kpi-label">Etapa</div><div style="font-size:14px;font-weight:600;color:var(--accent-blue);margin-top:4px;">${stageLabel(c.etapa,c.servicio)}</div></div>
      <div class="card" style="padding:12px;"><div class="kpi-label">Servicio</div><div style="margin-top:4px;font-size:13px;font-weight:600;">${getSvcLabel(c.servicio)}</div></div>
      <div class="card" style="padding:12px;"><div class="kpi-label">Documentos</div><div style="font-size:14px;font-weight:600;margin-top:4px;">${docOk}/${docList.length} <span style="font-size:11px;color:var(--text-muted)">recibidos</span></div><div class="progress-bar-wrap" style="margin-top:6px;"><div class="progress-bar" style="width:${docList.length>0?Math.round(docOk/docList.length*100):0}%;${docOk===docList.length&&docList.length>0?'background:var(--success)':''}"></div></div></div>
    </div>
    <div class="tabs profile-tabs" id="perfil-tabs" aria-label="Secciones del expediente">
      <div class="tab active" onclick="pTab('pd-contacto',this)">Contacto</div>
      <div class="tab" onclick="pTab('pd-datos',this)">Datos adicionales</div>
      <div class="tab" onclick="pTab('pd-docs',this)">Documentos</div>
      <div class="tab" onclick="pTab('pd-contratos',this)">Contratos</div>
      <div class="tab" onclick="pTab('pd-historial',this)">Historial</div>
      <div class="tab" onclick="pTab('pd-finanzas',this)">Finanzas</div>
    </div>
    <!-- CONTACTO -->
    <div class="tab-panel active" id="pd-contacto">
      <div class="info-rows">
        ${[['Nombre',c.nombre],['Teléfono',c.telefono||'—'],['Correo',c.email||'—'],['Ciudad',c.ciudad||'—'],['Servicio',getSvcLabel(c.servicio)],['Fuente',FUENTES[c.fuente]||'—'],['Registro',fmtDate(c.fechaRegistro)]].map(([l,v])=>`<div class="info-row"><span class="ir-label">${l}</span><span class="ir-value">${v}</span></div>`).join('')}
        ${c.notas?`<div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);">${c.notas}</div>`:''}
      </div>
    </div>
    <!-- DATOS ADICIONALES -->
    <div class="tab-panel" id="pd-datos">
      <div class="info-rows">
        ${[['NSS',c.nss||'—'],['CURP',c.curp||'—'],['RFC',c.rfc||'—'],['Domicilio',c.domicilio||'—'],['Banco',c.banco||'—'],['CLABE',c.clabe||'—'],['Cita actualización AFORE',c.fechaBiometrica?fmtDate(c.fechaBiometrica):'—'],['Cantidad a retirar de AFORE',c.montoAfore?'$'+Number(c.montoAfore).toLocaleString('es-MX'):'—']].map(([l,v])=>`<div class="info-row"><span class="ir-label">${l}</span><span class="ir-value">${v}</span></div>`).join('')}
      </div>
    </div>
    <!-- DOCS -->
    <div class="tab-panel" id="pd-docs">
      <div class="docs-checklist">
        ${docList.map(d=>`<div class="doc-item">
          <div class="doc-check ${docs[d.id]?'checked':''}" onclick="toggleDoc('${c.id}','${d.id}',this)">${docs[d.id]?'✓':''}</div>
          <div class="doc-name">${d.label}</div>
          <div class="doc-status-text">${docs[d.id]?'Recibido':'Pendiente'}</div>
        </div>`).join('')}
        ${(c.docsExtra||[]).map(de=>`<div class="doc-item">
          <div class="doc-check ${docs['extra_'+de.replace(/\s/g,'_')]?'checked':''}" onclick="toggleDoc('${c.id}','extra_${de.replace(/\s/g,'_')}',this)">${docs['extra_'+de.replace(/\s/g,'_')]?'✓':''}</div>
          <div class="doc-name">${de} <span style="font-size:10px;color:var(--text-muted)">(adicional)</span></div>
          <div class="doc-status-text">${docs['extra_'+de.replace(/\s/g,'_')]?'Recibido':'Pendiente'}</div>
        </div>`).join('')}
      </div>
      <div class="profile-add-doc">
        <input class="form-input" id="extra-doc-perfil-${c.id}" placeholder="Agregar documento..." style="font-size:12px;">
        <button class="btn" onclick="addExtraDocPerfil('${c.id}')" style="font-size:12px;flex-shrink:0;">+ Agregar</button>
      </div>
    </div>
    <!-- CONTRATOS -->
    <div class="tab-panel" id="pd-contratos">
      <!-- Estado firma -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Estado del contrato</div>
        <div class="profile-contract-status">
          <div>
            <div style="font-size:13px;font-weight:600;">${c.contratoFirmado?'Contrato firmado':'Contrato pendiente de firma'}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:3px;">El estado se actualiza al avanzar a la etapa 3 · Firmado</div>
          </div>
          ${c.contratoFirmado?`<span class="chip chip-green">✓ Firmado</span>`:`<span class="chip chip-red">✗ Pendiente</span>`}
        </div>
        ${c.contratoFirmado?`
        <div style="margin-top:10px;">
          <label class="form-label">Fecha de firma</label>
          <input class="form-input" type="date" id="fecha-firma-${c.id}" value="${c.fechaFirmaContrato||''}"
            onchange="guardarFechaFirma('${c.id}',this.value)" style="max-width:200px;font-size:12px;">
        </div>`:''}
        ${!c.contratoFirmado && isAdmin()?`
        <div style="margin-top:12px;padding:10px;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.2);border-radius:var(--radius-sm);">
          <div style="font-size:11px;color:#a78bfa;font-weight:600;margin-bottom:6px;">AUTORIZACIÓN DE ADMINISTRADOR</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Autoriza el avance sin firma para este cliente (una sola vez).</div>
          <button class="btn" onclick="openPinAutorizacion('${c.id}')" style="font-size:12px;">
            🔑 Autorizar avance sin firma
          </button>
          ${c.autorizadoSinFirma?`<span class="chip chip-purple" style="margin-left:8px;">✓ Autorizado</span>`:''}
        </div>`:''}
      </div>
      <hr class="divider">
      <!-- Historial de contratos generados -->
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Historial de contratos generados</div>
      ${!(c.historialContratos||[]).length?
        `<div style="font-size:12px;color:var(--text-muted);padding:12px 0;">Sin contratos generados desde el sistema</div>`:
        (c.historialContratos||[]).slice().reverse().map(h=>`
        <div class="hist-contrato-item">
          <div class="hist-contrato-icon">▤</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:500;">${h.servicio||'—'}</div>
            <div style="font-size:11px;color:var(--text-muted);">Generado el ${h.fecha} · Por ${h.generadoPor||'—'}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <span class="chip chip-gray" style="font-size:10px;">${h.estado||'Generado'}</span>
            ${h.htmlSnapshot?`<button class="btn" style="font-size:10px;padding:3px 8px;" onclick="verVersionContrato('${c.id}','${h.id}')">Ver</button>`:''}
          </div>
        </div>`).join('')}
      <div style="margin-top:12px;">
        <button class="btn" onclick="closeModal('modal-perfil');navigate('contratos',document.querySelector('[data-page=contratos]'));setTimeout(()=>preseleccionarCliente('${c.id}'),150);" style="font-size:12px;">
          + Generar nuevo contrato
        </button>
      </div>
    </div>

    <!-- HISTORIAL -->
    <div class="tab-panel" id="pd-historial">
      <div class="timeline">
        ${!(c.historial||[]).length?'<div style="font-size:12px;color:var(--text-muted)">Sin actividad registrada</div>':
          [...(c.historial||[])].reverse().map(h=>`<div class="tl-item"><div class="tl-dot ${h.tipo==='etapa'?'tl-dot-blue':h.tipo==='doc'?'tl-dot-green':'tl-dot-gray'}"></div><div class="tl-date">${fmtFechaHistorial(h.fecha)}</div><div class="tl-text">${h.texto}</div></div>`).join('')}
      </div>
    </div>
    <!-- FINANZAS -->
    <div class="tab-panel" id="pd-finanzas">
      ${esRetiro&&c.montoAfore?`
      <div class="profile-finance-auto">
        <div style="font-size:11px;color:var(--accent-blue);font-weight:600;margin-bottom:8px;">CÁLCULO AUTOMÁTICO — Monto AFORE: $${Number(c.montoAfore).toLocaleString('es-MX')}</div>
        <div class="profile-finance-auto-grid">
          <div><div style="font-size:10px;color:var(--text-muted)">Honorarios empresa</div><div style="font-size:14px;font-weight:600;">$${Number(c.honorariosCalc||0).toLocaleString('es-MX')}</div></div>
          <div><div style="font-size:10px;color:var(--text-muted)">Comisión automática de referencia</div><div style="font-size:14px;font-weight:600;color:var(--warning);">${formatoMoneda(c.comisionCalc||0)}</div></div>
          <div><div style="font-size:10px;color:var(--text-muted)">Retiro est.</div><div style="font-size:13px;font-weight:600;">${fmtDate(c.fechaRetiroEstimada)}</div></div>
        </div>
      </div>`:''}
      <div class="info-rows" style="margin-bottom:14px;">
        <div class="info-row"><span class="ir-label">Cantidad a retirar de AFORE</span><span class="ir-value">${(c.montoRetiro||c.montoAfore)?'$'+Number(c.montoRetiro||c.montoAfore).toLocaleString('es-MX'):'— (pendiente)'}</span></div>
        <div class="info-row"><span class="ir-label">Honorarios empresa</span><span class="ir-value">${c.honorarios?'$'+Number(c.honorarios).toLocaleString('es-MX'):'—'}</span></div>
        <div class="info-row"><span class="ir-label">Comisión aplicada</span><span class="ir-value" style="color:var(--success);font-size:15px;">${comisionEfectiva(c)>0?formatoMoneda(comisionEfectiva(c))+(tieneMontoFinanciero(c.comision)?'':' (estimada)'):'—'}</span></div>
        ${colaboradorFinanzas&&comisionEfectiva(c)>0?`<div class="info-row"><span class="ir-label">Distribución de comisión</span><span class="ir-value">Asesor ${formatoMoneda(comisionDelAsesor(c,colaboradorFinanzas))} · ${escapeHTMLBasico(colaboradorFinanzas.nombre)} ${formatoMoneda(comisionDelColaborador(c,colaboradorFinanzas))}</span></div>`:''}
        <div class="info-row"><span class="ir-label">Estado de pago</span><span class="ir-value" style="${estadoPagoPerfil==='Cobrado'?'color:var(--success)':estadoPagoPerfil==='Pendiente'?'color:var(--warning)':''}">${estadoPagoPerfil||'—'}</span></div>
      </div>
      <hr class="divider">
      <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">Editar / confirmar datos de cobro</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Cantidad a retirar de AFORE</label><input class="form-input" id="fin-monto-${c.id}" value="${finMontoValor}" type="number" style="font-size:12px;"></div>
        <div class="form-group"><label class="form-label">Honorarios <span style="color:var(--text-muted);font-weight:400">(editable)</span></label><input class="form-input" id="fin-hon-${c.id}" value="${finHonorariosValor}" type="number" style="font-size:12px;"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${colaboradorFinanzas?'Comisión total a repartir':'Comisión'} <span style="color:var(--text-muted);font-weight:400">(editable)</span></label><input class="form-input" id="fin-com-${c.id}" value="${finComisionValor}" type="number" style="font-size:12px;"></div>
        <div class="form-group"><label class="form-label">Fecha retiro estimada <span style="color:var(--text-muted);font-weight:400">(editable)</span></label><input class="form-input" id="fin-fecha-${c.id}" value="${c.fechaRetiroEstimada||''}" type="date" style="font-size:12px;"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Estado de pago</label>
          <select class="form-select" id="fin-estado-${c.id}" style="font-size:12px;">
            <option value="">— Seleccionar —</option>
            ${['Pendiente','Cobrado','Pagará con pagaré'].map(o=>`<option value="${o}" ${estadoPagoPerfil===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary profile-finance-save" onclick="guardarFinanzas('${c.id}')" style="font-size:12px;">Guardar datos de cobro</button>
    </div>
  `;
  document.getElementById('modal-perfil').classList.add('open');
}

function pTab(id, el){
  document.querySelectorAll('#perfil-tabs .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#perfil-body .tab-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ---- MODAL CLIENTE ----
function openModalCliente(origenLeadId=null){
  leadConversionPendienteId=origenLeadId||null;
  editingId=null;
  extraDocsModal=[];
  clearModalCliente();
  // Poblar servicios desde store
  const sel=document.getElementById('fc-servicio');
  sel.innerHTML='<option value="">— Seleccionar —</option>'
    +store.servicios.filter(s=>s.activo!==false).map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('');
  document.getElementById('modal-cliente-title').textContent='Nuevo cliente';
  switchTab('tab-contacto',0);
  document.getElementById('modal-cliente').classList.add('open');
  clienteFormDirty=false;
  activarSeguimientoFormularioCliente();
}

function editCliente(id){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  leadConversionPendienteId=null;
  editingId=id;
  extraDocsModal=[...(c.docsExtra||[])];
  document.getElementById('modal-cliente-title').textContent='Editar cliente';
  // Poblar servicios
  const sel=document.getElementById('fc-servicio');
  sel.innerHTML='<option value="">— Seleccionar —</option>'
    +store.servicios.filter(s=>s.activo!==false).map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('');
  setVal('fc-nombre',c.nombre);setVal('fc-telefono',c.telefono);setVal('fc-email',c.email);
  setVal('fc-ciudad',c.ciudad);setVal('fc-servicio',c.servicio);setVal('fc-etapa',c.etapa);
  setVal('fc-fuente',c.fuente);setVal('fc-notas',c.notas);
  poblarSelectColaborador();
  setVal('fc-colaborador',c.colaboradorId||'');
  setVal('fc-col-pct',c.colPct||50);
  setVal('el-semanas',c.el_semanas);setVal('el-imss',c.el_imss);
  setVal('el-retiro',c.el_retiro);setVal('el-fecha',c.el_fecha);
  setVal('fc-nss',c.nss);setVal('fc-curp',c.curp);setVal('fc-rfc',c.rfc);
  setVal('fc-monto',c.montoAfore);setVal('fc-domicilio',c.domicilio);
  setVal('fc-banco',c.banco||'');setVal('fc-clabe',c.clabe||'');
  setFechaMX('fc-fecha-biometrica',c.fechaBiometrica||'');
  setFechaMX('fc-fecha-solicitud-manual',c.fechaSolicitudManual||'');
  setVal('fc-honorarios',c.honorarios||c.honorariosCalc||'');
  setVal('fc-comision',comisionEfectiva(c)||'');
  // Re-validar indicadores
  const nssEl=document.getElementById('fc-nss');
  if(nssEl&&nssEl.value) validateNSS(nssEl);
  const curpEl=document.getElementById('fc-curp');
  if(curpEl&&curpEl.value) validateAlphaNum(curpEl,'curp-indicator',18);
  const rfcEl=document.getElementById('fc-rfc');
  if(rfcEl&&rfcEl.value) validateAlphaNum(rfcEl,'rfc-indicator',13);
  onServicioChange(c.docs);
  checkElegibilidad();
  switchTab('tab-contacto',0);
  document.getElementById('modal-cliente').classList.add('open');
  clienteFormDirty=false;
  activarSeguimientoFormularioCliente();
}

function clearModalCliente(){
  ['fc-nombre','fc-telefono','fc-email','fc-ciudad','fc-nss','fc-curp','fc-rfc','fc-monto','fc-honorarios','fc-comision','fc-domicilio','fc-notas','el-semanas','el-fecha','fc-prox-fecha','fc-prox-nota','fc-prox-hora','fc-banco','fc-clabe','fc-col-pct','fc-fecha-biometrica','fc-fecha-solicitud-manual'].forEach(id=>setVal(id,''));
  ['fc-servicio','fc-fuente','el-imss','el-retiro','fc-prox-tipo','fc-colaborador'].forEach(id=>setVal(id,''));
  setVal('fc-etapa','perfilamiento');
  setVal('fc-prox-hora','10:00');
  poblarSelectColaborador();
  document.getElementById('docs-checklist-container').innerHTML='<div style="font-size:12px;color:var(--text-muted);">Selecciona un servicio en la pestaña Contacto para ver los documentos requeridos.</div>';
  document.getElementById('el-result').classList.remove('show','er-eligible','er-not-eligible','er-pending','er-almost');
  const fechaWrap=document.getElementById('el-fecha-wrap');
  if(fechaWrap) fechaWrap.style.display='none';
  setVal('extra-doc-new','');
}

function actualizarDocsChecklist(svc, existingDocs){
  if(!svc) svc=document.getElementById('fc-servicio')?.value||'';
  const stages=stagesFor(svc);
  const etapaEl=document.getElementById('fc-etapa');
  const currentEtapa=etapaEl.value;
  etapaEl.innerHTML=stages.map(s=>`<option value="${s.id}">${s.label}</option>`).join('');
  if(currentEtapa&&stages.find(s=>s.id===currentEtapa)) etapaEl.value=currentEtapa;
  if(!svc){ document.getElementById('docs-checklist-container').innerHTML='<div style="font-size:12px;color:var(--text-muted);">Selecciona un servicio para ver los documentos requeridos.</div>'; return; }
  const docs=docsFor(svc);
  const ed=existingDocs||{};
  let html=`<div class="docs-checklist" id="modal-docs-list">
    ${docs.map(d=>`<div class="doc-item">
      <div class="doc-check ${ed[d.id]?'checked':''}" onclick="toggleModalDoc(this)" data-doc="${d.id}">${ed[d.id]?'✓':''}</div>
      <div class="doc-name">${d.label}</div>
    </div>`).join('')}
    ${extraDocsModal.map(de=>`<div class="doc-item">
      <div class="doc-check ${ed['extra_'+de.replace(/\s/g,'_')]?'checked':''}" onclick="toggleModalDoc(this)" data-doc="extra_${de.replace(/\s/g,'_')}">${ed['extra_'+de.replace(/\s/g,'_')]?'✓':''}</div>
      <div class="doc-name">${de} <span style="font-size:10px;color:var(--text-muted)">(adicional)</span></div>
    </div>`).join('')}
  </div>`;
  document.getElementById('docs-checklist-container').innerHTML=html;
}

function addExtraDocModal(){
  const input=document.getElementById('extra-doc-new');
  const val=input.value.trim();
  if(!val) return;
  extraDocsModal.push(val);
  input.value='';
  onServicioChange();
}

function toggleModalDoc(el){
  el.classList.toggle('checked');
  el.textContent=el.classList.contains('checked')?'✓':'';
}

function switchTab(id,idx){
  const tabs=document.querySelectorAll('#modal-tabs .tab');
  const panels=document.querySelectorAll('#modal-cliente .tab-panel');
  tabs.forEach((t,i)=>t.classList.toggle('active',i===idx));
  panels.forEach(p=>p.classList.toggle('active',p.id===id));
}

function guardarCliente(){
  const nombre=(document.getElementById('fc-nombre').value||'').trim();
  const tel=(document.getElementById('fc-telefono').value||'').trim();
  const svc=document.getElementById('fc-servicio').value;
  if(!nombre){showToast('El nombre es obligatorio','warn');return;}
  if(!tel){showToast('El teléfono es obligatorio','warn');return;}
  if(!svc){showToast('Selecciona un servicio','warn');switchTab('tab-contacto',0);return;}
  const docs={};
  document.querySelectorAll('#modal-docs-list .doc-check').forEach(el=>{ docs[el.dataset.doc]=el.classList.contains('checked'); });
  const oldCliente=editingId?store.clientes.find(c=>c.id===editingId):null;
  const leadOrigenConversion=!editingId&&leadConversionPendienteId?store.leads.find(l=>l.id===leadConversionPendienteId):null;
  const montoFin=getVal('fc-monto').trim();
  const honorariosFin=getVal('fc-honorarios').trim();
  const comisionFin=getVal('fc-comision').trim();
  const fechaBiometrica=leerFechaMX('fc-fecha-biometrica');
  if(fechaBiometrica===null){switchTab('tab-datos-extra',1);return;}
  const fechaSolicitudManual=leerFechaMX('fc-fecha-solicitud-manual');
  if(fechaSolicitudManual===null){switchTab('tab-datos-extra',1);return;}
  const cliente={...(oldCliente||{}),
    nombre,telefono:tel,email:getVal('fc-email'),ciudad:getVal('fc-ciudad'),
    servicio:svc,etapa:stagesFor(svc).some(s=>s.id===getVal('fc-etapa'))?getVal('fc-etapa'):stagesFor(svc)[0].id,fuente:getVal('fc-fuente'),notas:getVal('fc-notas'),
    nss:getVal('fc-nss'),curp:getVal('fc-curp'),rfc:getVal('fc-rfc'),
    montoAfore:montoFin===''?'':Number(montoFin),domicilio:getVal('fc-domicilio'),
    el_semanas:getVal('el-semanas'),el_imss:getVal('el-imss'),
    el_retiro:getVal('el-retiro'),el_fecha:getVal('el-fecha'),
    elegible:'si',fechaSeguimiento:oldCliente?.fechaSeguimiento||null,
    docs,docsExtra:[...extraDocsModal],
    // Nuevos campos
    colaboradorId:getVal('fc-colaborador')||null,
    colPct:Number(getVal('fc-col-pct'))||50,
    banco:getVal('fc-banco')||'',
    clabe:getVal('fc-clabe')||'',
    fechaBiometrica,
    fechaSolicitudManual,
    honorarios:honorariosFin===''?'':Number(honorariosFin),
    comision:comisionFin===''?'':Number(comisionFin),
    finanzasConfiguradas:editingId?true:[montoFin,honorariosFin,comisionFin].some(v=>v!==''),
  };
  // Calcular comisión automática si hay monto
  const asesorCalculoId=oldCliente?.asesorId||leadOrigenConversion?.asesorId||asesorDestinoVista();
  const calc=calcComision(Number(cliente.montoAfore)||0, cliente.servicio, asesorCalculoId);
  cliente.honorariosCalc=calc.honorarios;
  cliente.comisionCalc=calc.comision;
  cliente.comisionManual=comisionFin!==''&&(
    oldCliente?.comisionManual===true||
    Math.abs(Number(comisionFin)-Number(calc.comision||0))>0.009
  );
  if(comisionEfectiva(cliente)>0&&!String(cliente.estadoPago||'').trim()) cliente.estadoPago='Pendiente';
  if(cliente.servicio==='retiro_desempleo'){
    const etapas=stagesFor(cliente.servicio);
    const indiceFirma=etapas.findIndex(s=>s.id==='contrato_firmado');
    const indiceActual=etapas.findIndex(s=>s.id===cliente.etapa);
    if(indiceFirma>=0&&indiceActual>=indiceFirma&&!cliente.contratoFirmado){
      cliente.contratoFirmado=true;
      cliente.fechaFirmaContrato=cliente.fechaFirmaContrato||new Date().toISOString().split('T')[0];
    }
    if(cliente.etapa==='dado_alta'){
      if(!oldCliente||oldCliente.etapa!=='dado_alta') cliente.fechaAltaAfore=fechaISOLocal(new Date());
      else if(!cliente.fechaAltaAfore){
        const baseAlta=parseFechaFlexible(fechaEntradaEtapaDadoAlta(oldCliente));
        cliente.fechaAltaAfore=fechaISOLocal(baseAlta||new Date());
      }
    }
  }

  if(editingId){
    const idx=store.clientes.findIndex(c=>c.id===editingId);
    if(idx>=0){
      const old=store.clientes[idx];
      cliente.id=editingId;
      cliente.fechaRegistro=old.fechaRegistro;
      cliente.historial=old.historial||[];
      cliente.montoRetiro=cliente.montoAfore;
      cliente.estadoPago=old.estadoPago||(comisionEfectiva(cliente)>0?'Pendiente':'');
      // Fecha retiro: si ya existe y fue editada manualmente, preservar; si no, calcular
      cliente.fechaRetiroEstimada=old.fechaRetiroEstimadaManual
        ? old.fechaRetiroEstimada
        : calcFechaRetiro(old.fechaRegistro||new Date().toISOString());
      cliente.fechaRetiroEstimadaManual=old.fechaRetiroEstimadaManual||false;
      // Si etapa cambió a espera_45 y no estaba antes, autocompletar finanzas
      if(cliente.etapa==='espera_45'&&old.etapa!=='espera_45'&&cliente.montoAfore&&!old.estadoPago){
        cliente.honorarios=calc.honorarios;
        cliente.comision=calc.comision;
        cliente.estadoPago='Pendiente';
        addHist(cliente,'finanzas',`Cálculo automático: honorarios $${calc.honorarios.toLocaleString('es-MX')}, comisión $${calc.comision.toLocaleString('es-MX')}`);
      }
      addHist(cliente,'edicion','Datos actualizados');
      store.clientes[idx]=cliente;
      showToast('Cliente actualizado','success');
    }
  } else {
    cliente.id='c_'+Date.now();
    cliente.fechaRegistro=new Date().toISOString();
    cliente.historial=[];
    cliente.asesorId=leadOrigenConversion?.asesorId||asesorDestinoVista();
    cliente.asesorNombre=(store.asesores.find(a=>a.id===cliente.asesorId)||sesionActiva||{}).nombre||'';
    cliente.fechaRetiroEstimada=calcFechaRetiro(cliente.fechaRegistro);
    cliente.fechaRetiroEstimadaManual=false;
    cliente.origenProspecto=Boolean(leadOrigenConversion);
    if(leadOrigenConversion){
      cliente.origenLeadId=leadOrigenConversion.id;
      cliente.prospectoOrigen=JSON.parse(JSON.stringify(leadOrigenConversion));
      addHist(cliente,'registro','Prospecto convertido a cliente');
    }
    // Si se registra directo en espera_45 con monto, calcular
    if(cliente.etapa==='espera_45'&&cliente.montoAfore){
      cliente.honorarios=calc.honorarios;
      cliente.comision=calc.comision;
      cliente.estadoPago='Pendiente';
      addHist(cliente,'finanzas',`Cálculo automático: honorarios $${calc.honorarios.toLocaleString('es-MX')}, comisión $${calc.comision.toLocaleString('es-MX')}`);
    }
    addHist(cliente,'registro',leadOrigenConversion?'Cliente creado desde Prospectos':'Cliente directo registrado en el sistema');
    store.clientes.push(cliente);
    // Crear próxima acción en agenda si se especificó
    const proxTipo=getVal('fc-prox-tipo');
    const proxFecha=getVal('fc-prox-fecha');
    if(proxTipo&&proxFecha){
      if(!store.agenda) store.agenda=[];
      const proxNota=getVal('fc-prox-nota');
      const proxHora=getVal('fc-prox-hora')||'10:00';
      store.agenda.push({
        id:'ev_'+Date.now(),
        titulo:(proxNota||getSvcLabel(cliente.servicio)||'Seguimiento')+' — '+cliente.nombre,
        tipo:proxTipo, fecha:proxFecha, hora:proxHora,
        notas:proxNota, clienteId:cliente.id, completado:false,
        asesorId:cliente.asesorId||sesionActiva?.id||null,
      });
      addHist(cliente,'agenda','Próxima acción agendada: '+proxFecha);
    }
    if(leadOrigenConversion){
      // El expediente del prospecto ya quedó preservado dentro del cliente.
      // Sus eventos pasan al cliente antes de retirar el registro de Prospectos.
      (store.agenda||[]).forEach(evento=>{
        if(evento.leadId!==leadOrigenConversion.id) return;
        evento.clienteId=cliente.id;
        evento.leadId=null;
        evento.asesorId=cliente.asesorId||evento.asesorId||null;
      });
      store.leads=store.leads.filter(l=>l.id!==leadOrigenConversion.id);
      leadConversionPendienteId=null;
    }
    showToast('Cliente agregado correctamente','success');
  }
  clienteFormDirty=false;
  saveStore();
  closeModal('modal-cliente');
  renderPage(currentPage);
}

function eliminar(id){
  if(!confirm('¿Eliminar este cliente? No se puede deshacer.')) return;
  store.clientes=store.clientes.filter(c=>c.id!==id);
  saveStore();
  showToast('Cliente eliminado','info');
  renderPage(currentPage);
}
