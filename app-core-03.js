// ==================== BLOQUEO FIRMA / PIN ====================
let pinCallbackClienteId = null;

function closePopup(id){
  document.getElementById(id).classList.remove('open');
}

function openPinAutorizacion(clienteId){
  pinCallbackClienteId = clienteId;
  document.getElementById('pin-input-field').value='';
  document.getElementById('pin-error').style.display='none';
  document.getElementById('popup-pin').classList.add('open');
}

async function verificarPinAdmin(){
  const password = document.getElementById('pin-input-field').value;
  const administradores=(store.asesores||[]).filter(a=>a.rol==='admin'&&a.activo!==false);
  let administradorAutorizador=null;
  for(const admin of administradores){
    if(await verificarPin(admin,password)){ administradorAutorizador=admin; break; }
  }
  if(!administradorAutorizador){
    document.getElementById('pin-error').style.display='block';
    document.getElementById('pin-input-field').value='';
    return;
  }
  closePopup('popup-pin');
  // Autorizar este cliente específico
  const c = store.clientes.find(x=>x.id===pinCallbackClienteId);
  if(c){
    c.autorizadoSinFirma = true;
    c.autorizadoSinFirmaBy = administradorAutorizador.nombre||'Administrador';
    c.autorizadoSinFirmaFecha = fmtDateTime(new Date());
    addHist(c,'autorizacion','⚠ Avance sin firma autorizado por '+c.autorizadoSinFirmaBy+' — '+c.autorizadoSinFirmaFecha);
    saveStore();
    showToast('Autorización concedida. Puedes avanzar la etapa.','success');
    openPerfil(pinCallbackClienteId);
  }
}

async function guardarPinAdmin(){
  const nuevo = document.getElementById('pin-nuevo').value;
  const confirmar = document.getElementById('pin-confirmar').value;
  const err = document.getElementById('pin-config-error');
  if(!passwordValida(nuevo)){ if(err){err.textContent='Debe incluir 8 caracteres, mayúscula, minúscula, número y símbolo';err.style.display='block';} return; }
  if(nuevo !== confirmar){ if(err){err.textContent='Las contraseñas no coinciden';err.style.display='block';} return; }
  // Hashear la contraseña y guardarla en el asesor activo
  const hash = await hashPin(nuevo);
  if(sesionActiva){
    sesionActiva.pin = hash;
    const a = store.asesores.find(x=>x.id===sesionActiva.id);
    if(a) a.pin = hash;
  }
  saveStore();
  closePopup('popup-pin-config');
  showToast('Contraseña actualizada correctamente','success');
}

async function avanzarEtapa(id){
  const c = store.clientes.find(x=>x.id===id);
  if(!c) return;
  const stages = stagesFor(c.servicio);
  const idx = stages.findIndex(s=>s.id===c.etapa);
  if(idx >= stages.length-1){ showToast('Ya está en la etapa final','info'); return; }
  const next = stages[idx+1];

  // BLOQUEO 4->5: requiere cita biométrica
  if(c.etapa==='dado_alta' && next.id==='afore_actualizada' && !c.fechaBiometrica){
    showToast('⚠ Registra la fecha de cita biométrica AFORE antes de avanzar','warn');
    return;
  }
  // BLOQUEO contrato firmado
  const etapasPostFirma=['contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos'];
  if(etapasPostFirma.includes(next.id) && c.servicio==='retiro_desempleo' && !c.contratoFirmado && !c.autorizadoSinFirma && store.configuracion.bloqueo_firma){
    document.getElementById('popup-bloqueo').classList.add('open');
    return;
  }
  if(c.autorizadoSinFirma && next.id==='contrato_firmado') c.autorizadoSinFirma=false;

  // Al pasar a contrato_firmado
  if(next.id==='contrato_firmado' && !c.contratoFirmado){
    c.contratoFirmado=true;
    if(!c.fechaFirmaContrato) c.fechaFirmaContrato=new Date().toISOString().split('T')[0];
    addHist(c,'contrato','✅ Contrato marcado como firmado');
  }
  // Al pasar a dado_alta: iniciar 45 días
  if(next.id==='dado_alta'){
    if(!c.fechaAltaAfore) c.fechaAltaAfore=new Date().toISOString().split('T')[0];
    if(c.servicio==='retiro_desempleo') await agendarRecordatorio45(c);
    addHist(c,'etapa','Dado de alta — inicia conteo de 45 días');
  }
  // Al llegar a honorarios_recibidos: popup de cierre
  if(next.id==='honorarios_recibidos'){
    mostrarPopupCierre(id);
    return;
  }
  // Auto-calcular comisión al llegar a deposito_recibido
  if(next.id==='deposito_recibido' && c.montoAfore && !c.estadoPago){
    const calc=calcComision(Number(c.montoAfore),c.servicio);
    c.honorarios=calc.honorarios; c.comision=calc.comision; c.comisionCalc=calc.comision;
    c.estadoPago='Pendiente';
    addHist(c,'finanzas','Cálculo automático: $'+calc.honorarios.toLocaleString('es-MX')+' hon / $'+calc.comision.toLocaleString('es-MX')+' comisión');
  }
  c.etapa=next.id;
  addHist(c,'etapa','Avanzó a: '+next.label);
  await supaGuardarCliente(c);
  showToast('Etapa: '+next.label,'success');
  closeModal('modal-perfil');
  renderPage(currentPage);
}

function mostrarPopupCierre(clienteId){
  const c=store.clientes.find(x=>x.id===clienteId);
  const nombre=c?c.nombre:'Cliente';
  const now=fmtDateTime(new Date());
  const textoEl=document.getElementById('popup-cierre-texto');
  const fechaEl=document.getElementById('popup-cierre-fecha');
  const notaEl=document.getElementById('cierre-nota');
  const saveBtn=document.getElementById('cierre-save-btn');
  if(textoEl) textoEl.innerHTML='Expediente de <strong>'+nombre+'</strong>';
  if(fechaEl) fechaEl.textContent='Fecha: '+now;
  if(notaEl) notaEl.value='';
  if(saveBtn) saveBtn.onclick=function(){ confirmarCierre(clienteId); };
  document.getElementById('popup-cierre').classList.add('open');
}

async function confirmarCierre(clienteId){
  const c=store.clientes.find(x=>x.id===clienteId);
  if(!c) return;
  const nota=document.getElementById('cierre-nota')?.value||'';
  const now=fmtDateTime(new Date());
  if(nota) addHist(c,'cierre','📝 Nota final ('+now+'): '+nota);
  c.etapa='honorarios_recibidos'; c.archivado=true;
  c.fechaCierre=new Date().toISOString().split('T')[0];
  c.estadoPago='Cobrado';
  addHist(c,'etapa','✅ Expediente cerrado — Honorarios recibidos');
  await supaGuardarCliente(c);
  document.getElementById('popup-cierre').classList.remove('open');
  closeModal('modal-perfil');
  showToast('Expediente cerrado correctamente','success');
  renderPage(currentPage);
}

function updateRolUI(){
  if(!sesionActiva) return;
  const badge=document.getElementById('sidebar-rol-badge');
  if(badge){
    badge.textContent=sesionActiva.rol==='admin'?'Admin':'Asesor';
    badge.className='rol-badge '+(sesionActiva.rol==='admin'?'rol-admin':'rol-asesor');
  }
  const adminSection=document.getElementById('nav-admin-section');
  if(adminSection) adminSection.style.display=sesionActiva.rol==='admin'?'':'none';
}

async function toggleContratoFirmado(id, checkbox){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  c.contratoFirmado=checkbox.checked;
  if(checkbox.checked){
    if(!c.fechaFirmaContrato) c.fechaFirmaContrato=new Date().toISOString().split('T')[0];
    addHist(c,'contrato','✅ Contrato marcado como firmado');
    if(!c.fechaRetiroEstimadaManual) c.fechaRetiroEstimada=calcFechaRetiro(c.fechaFirmaContrato+'T12:00:00');
    if(c.servicio==='retiro_desempleo') await agendarRecordatorio45(c);
    showToast('Contrato marcado como firmado','success');
  } else {
    c.fechaFirmaContrato='';
    addHist(c,'contrato','Contrato desmarcado como firmado');
    showToast('Contrato desmarcado','info');
  }
  saveStore();
  const alertaEl=document.getElementById('perfil-alerta-firma');
  if(alertaEl) alertaEl.style.display=(!c.contratoFirmado&&c.servicio==='retiro_desempleo')?'':'none';
}

async function guardarFechaFirma(id, fecha){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  c.fechaFirmaContrato=fecha;
  if(!c.fechaRetiroEstimadaManual) c.fechaRetiroEstimada=calcFechaRetiro(fecha+'T12:00:00');
  addHist(c,'contrato','Fecha de firma actualizada: '+fmtDate(fecha));
  saveStore();
  showToast('Fecha de firma guardada','success');
}
function guardarFechaFirma(id, fecha){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  c.fechaFirmaContrato=fecha;
  if(!c.fechaRetiroEstimadaManual) c.fechaRetiroEstimada=calcFechaRetiro(fecha+'T12:00:00');
  addHist(c,'contrato','Fecha de firma actualizada: '+fmtDate(fecha));
  saveStore();
  showToast('Fecha de firma guardada','success');
}

function preseleccionarCliente(clienteId){
  const input=document.getElementById('ct-cliente-input');
  const c=store.clientes.find(x=>x.id===clienteId);
  if(input&&c){
    input.value=c.nombre;
    selectedClienteId=clienteId;
    // Precargar servicio
    const svcSelect=document.getElementById('ct-servicio');
    if(svcSelect&&c.servicio){
      svcSelect.value=c.servicio;
      onContratoServicioChange();
    }
    onContratoClienteChange();
  }
}

function toggleDoc(cid,docId,el){
  const c=store.clientes.find(x=>x.id===cid);
  if(!c) return;
  if(!c.docs) c.docs={};
  c.docs[docId]=!c.docs[docId];
  el.classList.toggle('checked',c.docs[docId]);
  el.textContent=c.docs[docId]?'✓':'';
  el.nextElementSibling.nextElementSibling.textContent=c.docs[docId]?'Recibido':'Pendiente';
  addHist(c,'doc','Doc '+(c.docs[docId]?'recibido':'pendiente')+': '+docId);
  saveStore();
}

function addExtraDocPerfil(cid){
  const c=store.clientes.find(x=>x.id===cid);
  if(!c) return;
  const input=document.getElementById('extra-doc-perfil-'+cid);
  const val=input.value.trim();
  if(!val) return;
  if(!c.docsExtra) c.docsExtra=[];
  c.docsExtra.push(val);
  saveStore();
  input.value='';
  openPerfil(cid);
  showToast('Documento agregado','success');
}

function guardarFinanzas(id){
  const c=store.clientes.find(x=>x.id===id);
  if(!c) return;
  const montoRetiro=(document.getElementById('fin-monto-'+id)?.value||'').trim();
  const comisionManual=(document.getElementById('fin-com-'+id)?.value||'').trim();
  const honorariosManual=(document.getElementById('fin-hon-'+id)?.value||'').trim();
  const estadoPago=document.getElementById('fin-estado-'+id)?.value;
  const fechaEst=(document.getElementById('fin-fecha-'+id)?.value||'').trim();
  c.montoRetiro=montoRetiro===''?'':Number(montoRetiro);
  c.montoAfore=c.montoRetiro;
  c.honorarios=honorariosManual===''?'':Number(honorariosManual);
  c.comision=comisionManual===''?'':Number(comisionManual);
  c.honorariosCalc='';
  c.comisionCalc='';
  c.estadoPago=estadoPago||'';
  c.fechaRetiroEstimada=fechaEst;
  c.fechaRetiroEstimadaManual=true;
  c.finanzasConfiguradas=true;
  addHist(c,'finanzas',`Financiero actualizado. Comisión: $${Number(c.comision||0).toLocaleString('es-MX')} · Estado: ${estadoPago||'—'}`);
  saveStore();
  showToast('Datos financieros guardados','success');
  openPerfil(id);
}

// ==================== ELEGIBILIDAD ====================
// ---- ELEGIBILIDAD DINÁMICA POR SERVICIO ----
function renderElegContainer(svc){
  const cont=document.getElementById('eleg-container');
  if(!cont) return;
  if(!svc){
    cont.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:16px;text-align:center;">Selecciona un servicio para ver los criterios de elegibilidad.</div>';
    return;
  }
  if(svc==='retiro_desempleo'){
    cont.innerHTML=`
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid var(--accent-blue);">
        <strong>Retiro por desempleo</strong> — Mín. 105 semanas, sin IMSS activo. Si retiró antes, puede iniciar 60 días previos a cumplir 5 años.
      </div>
      <div class="form-group">
        <label class="form-label">Semanas cotizadas</label>
        <input class="form-input" id="el-semanas" type="number" placeholder="Número de semanas" oninput="checkElegibilidad()">
        <div class="form-helper">Mínimo requerido: 105 semanas</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">¿Tiene alta activa en IMSS?</label>
          <select class="form-select" id="el-imss" onchange="checkElegibilidad()">
            <option value="">— Seleccionar —</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">¿Retiró en últimos 5 años?</label>
          <select class="form-select" id="el-retiro" onchange="checkElegibilidad()">
            <option value="">— Seleccionar —</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </div>
      </div>
      <div id="el-fecha-wrap" class="form-group" style="display:none;">
        <label class="form-label">Fecha del último retiro</label>
        <input class="form-input" id="el-fecha" type="date" oninput="checkElegibilidad()">
        <div class="form-helper">Puede iniciar proceso 60 días antes de cumplir 5 años desde esta fecha</div>
      </div>`;
  } else if(svc==='asesoria_pension'){
    cont.innerHTML=`
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid var(--accent-blue);">
        <strong>Pensión por vejez</strong> — Mín. 58 años, mín. 500 semanas cotizadas. La ley determina el tipo de pensión pero no cambia los requisitos de elegibilidad.
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha de nacimiento</label>
          <input class="form-input" id="el-fecha-nac" type="date" oninput="checkElegibilidadPension()">
          <div class="form-helper">Mínimo: 58 años</div>
        </div>
        <div class="form-group">
          <label class="form-label">Semanas cotizadas</label>
          <input class="form-input" id="el-semanas" type="number" placeholder="Número de semanas" oninput="checkElegibilidadPension()">
          <div class="form-helper">Mínimo requerido: 500 semanas</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ley a la que pertenece</label>
        <select class="form-select" id="el-ley" onchange="checkElegibilidadPension()">
          <option value="">— Seleccionar —</option>
          <option value="73">Ley 73 (antes de julio 1997)</option>
          <option value="97">Ley 97 (julio 1997 en adelante)</option>
        </select>
        <div class="form-helper">Referencia interna — no cambia requisitos de elegibilidad</div>
      </div>
      <div class="form-group">
        <label class="form-label">¿Tiene alta activa en IMSS?</label>
        <select class="form-select" id="el-imss" onchange="checkElegibilidadPension()">
          <option value="">— Seleccionar —</option>
          <option value="no">No / No aplica</option>
          <option value="si">Sí</option>
        </select>
      </div>`;
  } else {
    cont.innerHTML=`
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid var(--border-strong);">
        <strong>${getSvcLabel(svc)}</strong> — Captura las semanas cotizadas como referencia.
      </div>
      <div class="form-group">
        <label class="form-label">Semanas cotizadas (referencia)</label>
        <input class="form-input" id="el-semanas" type="number" placeholder="Número de semanas" oninput="">
      </div>
      <div class="form-group">
        <label class="form-label">Notas de elegibilidad</label>
        <textarea class="form-textarea" id="el-notas-gen" placeholder="Observaciones..."></textarea>
      </div>`;
  }
  // Restaurar valores si existen en el form al editar
  setTimeout(()=>{
    if(editingId){
      const c=store.clientes.find(x=>x.id===editingId);
      if(c){
        const esSems=document.getElementById('el-semanas');
        if(esSems) esSems.value=c.el_semanas||'';
        const esImss=document.getElementById('el-imss');
        if(esImss) esImss.value=c.el_imss||'';
        const esRetiro=document.getElementById('el-retiro');
        if(esRetiro) esRetiro.value=c.el_retiro||'';
        const esFecha=document.getElementById('el-fecha');
        if(esFecha) esFecha.value=c.el_fecha||'';
        const esFechaNac=document.getElementById('el-fecha-nac');
        if(esFechaNac) esFechaNac.value=c.el_fecha_nac||'';
        const esLey=document.getElementById('el-ley');
        if(esLey) esLey.value=c.el_ley||'';
      }
    }
  },50);
}

// Hook: cuando cambia el servicio en el modal, re-renderizar elegibilidad
function onServicioChange(existingDocs){
  const svc=getVal('fc-servicio');
  renderElegContainer(svc);
  // Actualizar checklist de docs
  actualizarDocsChecklist(svc,existingDocs);
  const defaults=document.getElementById('fc-finanzas-defaults');
  if(defaults) defaults.style.display=svc==='retiro_desempleo'?'':'none';
  if(svc==='retiro_desempleo'){
    const clienteEditado=editingId?store.clientes.find(c=>c.id===editingId):null;
    const cargarDefaults=!clienteEditado||clienteEditado.finanzasConfiguradas!==true;
    if(cargarDefaults&&!getVal('fc-monto')) setVal('fc-monto',35190);
    if(cargarDefaults&&!getVal('fc-honorarios')) setVal('fc-honorarios',8000);
    if(cargarDefaults&&!getVal('fc-comision')) setVal('fc-comision',3000);
    previewCalculo();
  } else if(svc==='correccion_imss'){
    // La corrección ante IMSS se cotiza al concluir; retirar únicamente valores automáticos heredados de Retiro.
    if(String(getVal('fc-monto'))==='35190') setVal('fc-monto','');
    if(String(getVal('fc-honorarios'))==='8000') setVal('fc-honorarios','');
    if(String(getVal('fc-comision'))==='3000') setVal('fc-comision','');
  }
}

function checkElegibilidad(){
  // Retiro por desempleo
  const sem=parseInt(document.getElementById('el-semanas')?.value)||0;
  const imss=document.getElementById('el-imss')?.value;
  const retiro=document.getElementById('el-retiro')?.value;
  const fechaWrap=document.getElementById('el-fecha-wrap');
  const result=document.getElementById('el-result');
  if(!result) return;
  if(retiro==='si'&&fechaWrap) fechaWrap.style.display='block';
  else if(fechaWrap) fechaWrap.style.display='none';
  result.className='eligibility-result show';
  let titulo='',texto='',cls='';
  if(!sem&&!imss&&!retiro){ result.classList.remove('show'); return; }
  if(sem>0&&sem<105){
    cls='er-not-eligible';titulo='No elegible';texto='Tiene '+sem+' semanas. Se requieren mínimo 105. Faltan '+(105-sem)+' semanas.';
  } else if(imss==='si'){
    cls='er-not-eligible';titulo='No elegible';texto='Tiene alta activa en IMSS. Debe estar dado de baja para tramitar el retiro.';
  } else if(retiro==='si'){
    const fecha=document.getElementById('el-fecha')?.value;
    if(fecha){
      const fRet=new Date(fecha+'T12:00:00');
      const fEleg=new Date(fRet); fEleg.setFullYear(fEleg.getFullYear()+5);
      const fInicio=new Date(fEleg); fInicio.setDate(fInicio.getDate()-60);
      const hoy=new Date();
      if(hoy>=fEleg){
        cls='er-eligible';titulo='✓ Elegible';texto='Han pasado más de 5 años desde el último retiro. Puede iniciar el trámite.';
      } else if(hoy>=fInicio){
        const dias=Math.ceil((fEleg-hoy)/(1000*60*60*24));
        cls='er-almost';titulo='⬡ Próximo — iniciar alta IMSS';texto='Faltan '+dias+' día'+(dias!==1?'s':'')+' para cumplir los 5 años. Está dentro del margen de 60 días para iniciar el proceso.';
      } else {
        const diasFalta=Math.ceil((fInicio-hoy)/(1000*60*60*24));
        cls='er-pending';titulo='⏳ Pendiente';texto='Puede iniciar en '+diasFalta+' día'+(diasFalta!==1?'s':'')+'. Fecha de 5 años: '+fmtDate(fEleg.toISOString().split('T')[0]);
      }
    } else {
      cls='er-pending';titulo='Captura la fecha del último retiro';texto='Necesitamos la fecha para calcular cuándo será elegible.';
    }
  } else if(sem>=105&&imss==='no'&&retiro==='no'){
    cls='er-eligible';titulo='✓ Elegible';texto=sem+' semanas cotizadas, sin IMSS activo, sin retiro previo. Puede iniciar el trámite.';
  } else { result.classList.remove('show'); return; }
  result.classList.add(cls);
  document.getElementById('el-result-title').textContent=titulo;
  document.getElementById('el-result-text').textContent=texto;
}

function checkElegibilidadPension(){
  const result=document.getElementById('el-result');
  if(!result) return;
  const fechaNac=document.getElementById('el-fecha-nac')?.value;
  const sem=parseInt(document.getElementById('el-semanas')?.value)||0;
  const ley=document.getElementById('el-ley')?.value||'';
  const imss=document.getElementById('el-imss')?.value||'';
  if(!fechaNac&&!sem){ result.classList.remove('show'); return; }
  result.className='eligibility-result show';
  let titulo='',texto='',cls='';

  // Calcular edad
  let edadOk=false; let edad=0;
  if(fechaNac){
    const hoy=new Date(); const nac=new Date(fechaNac+'T12:00:00');
    edad=hoy.getFullYear()-nac.getFullYear();
    const m=hoy.getMonth()-nac.getMonth();
    if(m<0||(m===0&&hoy.getDate()<nac.getDate())) edad--;
    edadOk=edad>=58;
  }

  const semanasOk=sem>=500;
  const leyLabel=ley==='73'?'Ley 73':ley==='97'?'Ley 97':'Sin ley seleccionada';

  if(fechaNac&&!edadOk){
    cls='er-not-eligible';titulo='No elegible por edad';
    texto='Tiene '+edad+' años. Mínimo requerido: 58 años para pensión.';
  } else if(sem>0&&!semanasOk){
    cls='er-not-eligible';titulo='Semanas insuficientes';
    texto='Tiene '+sem+' semanas. Se requieren mínimo 500 semanas para pensión. Faltan '+(500-sem)+'.';
  } else if(edadOk&&semanasOk){
    cls='er-eligible';titulo='✓ Elegible para pensión';
    texto=edad+' años, '+sem+' semanas cotizadas.'+(ley?' '+leyLabel+'.':'')+(imss==='si'?' Tiene IMSS activo — validar modalidad de pensión.':'');
  } else {
    result.classList.remove('show'); return;
  }
  result.classList.add(cls);
  document.getElementById('el-result-title').textContent=titulo;
  document.getElementById('el-result-text').textContent=texto;
}

function calcElegible(){
  const sem=parseInt(document.getElementById('el-semanas')?.value)||0;
  const imss=document.getElementById('el-imss')?.value;
  const retiro=document.getElementById('el-retiro')?.value;
  const fecha=document.getElementById('el-fecha')?.value;
  let estado='',fechaSeg='';
  if(sem>=105&&imss==='no'&&retiro==='no') estado='si';
  else if(retiro==='si'&&fecha){
    const fRet=new Date(fecha+'T12:00:00');
    const fEleg=new Date(fRet);fEleg.setFullYear(fEleg.getFullYear()+5);
    const fInicio=new Date(fEleg);fInicio.setDate(fInicio.getDate()-60);
    const hoy=new Date();
    if(hoy>=fEleg) estado='si';
    else if(hoy>=fInicio){ estado='casi'; fechaSeg=fEleg.toISOString().split('T')[0]; }
    else { estado='pendiente'; fechaSeg=fInicio.toISOString().split('T')[0]; }
  } else if(imss==='si'||(sem>0&&sem<105)) estado='no';
  return {estado,fechaSeg};
}

// ==================== CONFIG ====================
let configOrdenMenuAbierto=false;

function toggleConfigOrdenMenu(){
  configOrdenMenuAbierto=!configOrdenMenuAbierto;
  renderPage('configuracion');
}

function renderCardAcceso(){
  return `<div class="card">
    <div class="card-header"><div class="card-title">Mi acceso</div></div>
    <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div><div style="font-size:13px;font-weight:500;">Contraseña de acceso</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${sesionActiva?.nombre||'Usuario actual'} puede cambiar aquí su propia contraseña.</div></div>
      <button class="btn" onclick="document.getElementById('popup-pin-config').classList.add('open')" style="font-size:12px;flex-shrink:0;">🔑 Cambiar contraseña</button>
    </div>
  </div>`;
}

function renderCardApariencia(cfg){
  return `<div class="card"><div class="card-header"><div class="card-title">Apariencia</div></div><div class="card-body"><div style="display:flex;align-items:center;justify-content:space-between;"><div><div style="font-size:13px;font-weight:500;">Modo oscuro</div><div style="font-size:12px;color:var(--text-muted)">Alterna entre modo día y noche</div></div><label class="toggle" onclick="toggleTheme()"><div class="toggle-track ${cfg.tema==='dark'?'on':''}" id="cfg-track"><div class="toggle-thumb"></div></div></label></div></div></div>`;
}

function renderCardOrdenMenu(){
  return `<div class="card">
    <div class="card-header" style="cursor:pointer;" onclick="toggleConfigOrdenMenu()">
      <div class="card-title">${configOrdenMenuAbierto?'▾':'▸'} Orden del menú lateral</div>
      <button class="btn" style="font-size:11px;${configOrdenMenuAbierto?'':'display:none;'}" onclick="event.stopPropagation();navOrder=[...NAV_DEFAULT];saveNavOrder();renderPage('configuracion');">Restablecer</button>
    </div>
    <div class="card-body" style="${configOrdenMenuAbierto?'':'display:none;'}">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">Usa las flechas para cambiar el orden de las pestañas en el menú lateral.</div>
      ${renderOrdenPestañas()}
    </div>
  </div>`;
}

function renderConfiguracion(){
  const cfg=store.configuracion;
  if(!isAdmin()) return `<div class="section-title">Configuración</div><div class="section-sub">Cuenta y preferencias personales</div><div style="max-width:560px;display:flex;flex-direction:column;gap:16px;">${renderCardAcceso()}${renderCardApariencia(cfg)}</div>`;
  return `
  <div class="section-title">Configuración</div>
  <div class="section-sub">Ajustes generales del sistema</div>
  <div style="max-width:560px;display:flex;flex-direction:column;gap:16px;">
    <div class="card">
      <div class="card-header"><div class="card-title">General</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre del sistema</label>
            <input class="form-input" id="cfg-nombre" value="${cfg.nombre_app||'C&A CRM Suite'}">
          </div>
          <div class="form-group">
            <label class="form-label">Nombre del asesor</label>
            <input class="form-input" id="cfg-asesor" value="${cfg.asesor||'Emmanuel Álvarez'}">
          </div>
        </div>
        <button class="btn btn-primary" onclick="guardarConfig()">Guardar cambios</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Datos de la empresa (para contratos)</div></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre de la empresa</label>
            <input class="form-input" id="cfg-empresa-nombre" value="${cfg.empresa_nombre||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Representante legal</label>
            <input class="form-input input-upper" id="cfg-empresa-rep" value="${cfg.empresa_representante||''}"
              oninput="this.value=this.value.toUpperCase()">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Domicilio de la empresa</label>
          <input class="form-input" id="cfg-empresa-dom" value="${cfg.empresa_domicilio||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Ciudad (para firma del contrato)</label>
          <input class="form-input" id="cfg-ciudad" value="${cfg.ciudad_contrato||''}">
        </div>
        <button class="btn btn-primary" onclick="guardarConfigEmpresa()">Guardar datos empresa</button>
      </div>
    </div>
        <div class="card">
      <div class="card-header"><div class="card-title">Logo de la empresa</div></div>
      <div class="card-body" style="display:flex;align-items:center;gap:16px;">
        <div id="cfg-logo-preview" style="width:60px;height:60px;border-radius:var(--radius-sm);overflow:hidden;background:linear-gradient(135deg,#2563eb,#1e40af);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-family:var(--font-display);font-weight:700;font-size:16px;color:#fff;">C&amp;A</span>
        </div>
        <div>
          <div style="font-size:13px;font-weight:500;margin-bottom:4px;">Logo de empresa</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Se muestra en el sidebar y pantalla de login</div>
          <button class="btn" onclick="document.getElementById('modal-logo').classList.add('open')">Cambiar logo</button>
        </div>
      </div>
    </div>
    ${renderCardAcceso()}
    <div class="card">
      <div class="card-header"><div class="card-title">Seguridad y control de firma</div></div>
      <div class="card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:13px;font-weight:500;">Bloqueo por contrato sin firmar</div>
            <div style="font-size:12px;color:var(--text-muted)">Impide avanzar etapas sin contrato firmado</div>
          </div>
          <label class="toggle" onclick="toggleBloqueoFirma()">
            <div class="toggle-track ${cfg.bloqueo_firma?'on':''}" id="bloqueo-track"><div class="toggle-thumb"></div></div>
          </label>
        </div>
        <div style="margin-bottom:14px;">
          <div style="font-size:13px;font-weight:500;margin-bottom:4px;">Rol actual</div>
          <select class="form-select" id="cfg-rol" style="font-size:13px;max-width:200px;">
            <option value="admin" ${cfg.rol==='admin'?'selected':''}>Administrador</option>
            <option value="asesor" ${cfg.rol==='asesor'?'selected':''}>Asesor</option>
          </select>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Solo el Admin puede autorizar avances sin firma</div>
        </div>
        <div style="margin-top:14px;">
          <button class="btn btn-primary" onclick="guardarConfigSeguridad()">Guardar seguridad</button>
        </div>
      </div>
    </div>
    ${renderCardApariencia(cfg)}
    ${renderCardOrdenMenu()}
    <div class="card">
      <div class="card-header"><div class="card-title">Datos del sistema</div></div>
      <div class="card-body">
        <div class="info-row"><span class="ir-label">Total de clientes</span><span class="ir-value">${store.clientes.length}</span></div>
        <div class="info-row"><span class="ir-label">Servicios configurados</span><span class="ir-value">${store.servicios.length}</span></div>
        <div class="info-row"><span class="ir-label">Versión</span><span class="ir-value">CA CRM Suite v23</span></div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn" onclick="exportar()">⬇ Exportar datos</button>
          <button class="btn" onclick="importar()">⬆ Importar backup</button>
          <input type="file" id="importar-input" accept=".json" style="display:none" onchange="procesarImport(this)">
        </div>
      </div>
    </div>
  </div>`;
}

function renderFinanzas(){
  const cl=(clientesVistaActual()||[]).filter(c=>!c.descartado&&!c.archivado);
  // Cobradas
  const cobradas=cl.filter(c=>c.comision&&c.estadoPago==='Cobrado');
  const totalCobrado=cobradas.reduce((s,c)=>s+Number(c.comision||0),0);
  // Próximas (calculadas, no cobradas)
  const proximas=cl.filter(c=>c.comisionCalc&&c.estadoPago!=='Cobrado'&&c.fechaRetiroEstimada);
  const totalProximo=proximas.reduce((s,c)=>s+Number(c.comisionCalc||0),0);

  // Comisiones de colaboradores
  const misColabs=colaboradoresVistaActual();
  const resumenColabs=misColabs.map(col=>{
    const clCol=cl.filter(c=>c.colaboradorId===col.id);
    const cobradoCol=clCol.filter(c=>c.estadoPago==='Cobrado').reduce((s,c)=>{
      const pct=(c.colPct||col.pctComision||50)/100;
      return s+Number(c.comision||0)*pct;
    },0);
    const pendienteCol=clCol.filter(c=>c.estadoPago!=='Cobrado').reduce((s,c)=>{
      const pct=(c.colPct||col.pctComision||50)/100;
      return s+Number(c.comisionCalc||0)*pct;
    },0);
    const miParteCol=clCol.filter(c=>c.estadoPago==='Cobrado').reduce((s,c)=>{
      const pct=1-(c.colPct||col.pctComision||50)/100;
      return s+Number(c.comision||0)*pct;
    },0);
    return {col,clientes:clCol.length,cobradoCol,pendienteCol,miParteCol};
  });
  const totalColaboradoresCobrado=resumenColabs.reduce((s,r)=>s+r.cobradoCol,0);
  const totalColaboradoresPendiente=resumenColabs.reduce((s,r)=>s+r.pendienteCol,0);
  const totalColaboradores=totalColaboradoresCobrado+totalColaboradoresPendiente;
  const totalProximoReal=Math.max(0,totalProximo-totalColaboradoresPendiente);
  const totalComisiones=totalCobrado+totalProximo;

  // Agrupar próximas por mes
  const porMes={};
  proximas.forEach(c=>{
    const fecha=new Date(c.fechaRetiroEstimada+'T12:00:00');
    const key=`${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
    const label=fecha.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    if(!porMes[key]) porMes[key]={label,clientes:[],total:0};
    porMes[key].clientes.push(c);
    const col=c.colaboradorId?(store.colaboradores||[]).find(x=>x.id===c.colaboradorId):null;
    const pctCol=col?(Number(c.colPct||col.pctComision||50)/100):0;
    porMes[key].total+=Number(c.comisionCalc||0)*(1-pctCol);
  });
  const mesesOrdenados=Object.keys(porMes).sort();

  return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div><div class="section-title">Finanzas</div><div class="section-sub" style="margin-bottom:0;">Control de comisiones y proyección de ingresos</div></div>
    <div style="margin-left:auto;">${getSelectorVistaHTML(true)}</div>
  </div>

  <div class="kpi-grid" style="margin-bottom:24px;">
    <div class="kpi-card kpi-accent-green">
      <div class="kpi-label">Total cobrado</div>
      <div class="kpi-value">$${totalCobrado.toLocaleString('es-MX')}</div>
      <div class="kpi-sub">${cobradas.length} trámite${cobradas.length!==1?'s':''} cobrado${cobradas.length!==1?'s':''}</div>
    </div>
    <div class="kpi-card kpi-accent-amber">
      <div class="kpi-label">Próximas comisiones reales</div>
      <div class="kpi-value">$${totalProximoReal.toLocaleString('es-MX')}</div>
      <div class="kpi-sub">Después de colaboraciones</div>
    </div>
    <div class="kpi-card kpi-accent-purple">
      <div class="kpi-label">Comisiones de colaboradores</div>
      <div class="kpi-value">$${totalColaboradores.toLocaleString('es-MX')}</div>
      <div class="kpi-sub">Cobradas + pendientes compartidas</div>
    </div>
    <div class="kpi-card kpi-accent-blue">
      <div class="kpi-label">Comisiones totales</div>
      <div class="kpi-value">$${totalComisiones.toLocaleString('es-MX')}</div>
      <div class="kpi-sub">Total bruto cobrado + por cobrar</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Próximas comisiones — por mes</div>
        <span style="font-size:12px;color:var(--text-muted)">Fecha estimada de retiro</span>
      </div>
      ${mesesOrdenados.length===0?`
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <div class="empty-title">Sin proyecciones aún</div>
          <div class="empty-sub">Las comisiones aparecen aquí cuando el monto AFORE es capturado y la etapa avanza a Espera</div>
        </div>
      `:mesesOrdenados.map(key=>`
        <div class="comision-mes">
          <div class="comision-mes-header">
            <span class="comision-mes-label">${porMes[key].label}</span>
            <span class="comision-mes-total">$${porMes[key].total.toLocaleString('es-MX')}</span>
          </div>
          ${porMes[key].clientes.map(c=>`
            <div class="comision-item" onclick="openPerfil('${c.id}')">
              <div class="comision-avatar">${initials(c.nombre)}</div>
              <div class="comision-info">
                <div class="comision-nombre">${c.nombre}</div>
                <div class="comision-fecha">Retiro est. ${fmtDate(c.fechaRetiroEstimada)} · ${c.etapa==='espera_45'?'En espera':stageLabel(c.etapa,c.servicio)}</div>
              </div>
              ${(()=>{const col=c.colaboradorId?(store.colaboradores||[]).find(x=>x.id===c.colaboradorId):null;const pct=col?Number(c.colPct||col.pctComision||50)/100:0;return `<div class="comision-monto">$${(Number(c.comisionCalc||0)*(1-pct)).toLocaleString('es-MX')}</div>`;})()}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Comisiones cobradas</div>
        <span style="font-size:12px;color:var(--success);font-weight:600">$${totalCobrado.toLocaleString('es-MX')}</span>
      </div>
      ${cobradas.length===0?`
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <div class="empty-title">Sin cobros registrados</div>
          <div class="empty-sub">Aparecen aquí cuando el estado de pago cambia a "Cobrado"</div>
        </div>
      `:cobradas.map(c=>`
        <div class="comision-item" onclick="openPerfil('${c.id}')">
          <div class="comision-avatar">${initials(c.nombre)}</div>
          <div class="comision-info">
            <div class="comision-nombre">${c.nombre}</div>
            <div class="comision-fecha">${getSvcLabel(c.servicio)} · Monto retirado: $${Number(c.montoRetiro||0).toLocaleString('es-MX')}</div>
          </div>
          <div class="comision-monto" style="color:var(--success)">$${Number(c.comision||0).toLocaleString('es-MX')}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ${resumenColabs.length>0?`
  <div class="card" style="margin-top:20px;">
    <div class="card-header"><div class="card-title">Colaboradores — comisiones compartidas</div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Colaborador</th><th>Zona</th><th>Clientes</th><th>Su comisión cobrada</th><th>Su comisión pendiente</th><th>Mi parte cobrada</th></tr></thead>
      <tbody>${resumenColabs.map(({col,clientes,cobradoCol,pendienteCol,miParteCol})=>`<tr><td style="font-weight:500;">${col.nombre}</td><td class="td-muted">${col.ciudad||'—'}</td><td>${clientes}</td><td style="color:var(--success);">$${cobradoCol.toLocaleString('es-MX')}</td><td style="color:var(--warning);">$${pendienteCol.toLocaleString('es-MX')}</td><td style="color:var(--success);font-weight:600;">$${miParteCol.toLocaleString('es-MX')}</td></tr>`).join('')}</tbody>
    </table></div>
  </div>`:''}`;
}

// ==================== SERVICIOS ====================
function renderServicios(){
  const svcs=store.servicios||[];
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
    <div>
      <div class="section-title">Servicios</div>
      <div class="section-sub">Catálogo de servicios, documentos requeridos y plantillas de contrato</div>
    </div>
    <button class="btn btn-primary" onclick="openModalServicio()">+ Nuevo servicio</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">
    ${svcs.map(s=>`
      <div class="card" style="overflow:visible;">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">◧</div>
            <div style="min-width:0;">
              <div class="card-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
              <div style="font-size:11px;color:${s.activo?'var(--success)':'var(--text-muted)'};">${s.activo?'● Activo':'○ Inactivo'}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="action-btn" onclick="openModalServicio('${s.id}')" title="Editar">✎</button>
          </div>
        </div>
        <div class="card-body" style="padding:14px;">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">${s.descripcion||'Sin descripción'}</div>
          <div style="margin-bottom:10px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Documentos requeridos</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${(s.docs||[]).map(docId=>{
                const d=DOCS_CATALOGO.find(x=>x.id===docId);
                return `<span class="chip chip-gray" style="font-size:10px;">${d?d.label:docId}</span>`;
              }).join('')}
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Esquema de honorarios</div>
            <div style="font-size:12px;color:var(--text-secondary);">${renderEsquemaLabel(s)}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn" style="font-size:11px;padding:5px 10px;flex:1;" onclick="openVisorPlantilla('${s.id}')">Ver plantilla</button>
            <button class="btn btn-primary" style="font-size:11px;padding:5px 10px;flex:1;" onclick="navigate('contratos',null);setTimeout(()=>preseleccionarServicio('${s.id}'),100)">Generar contrato</button>
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderEsquemaLabel(s){
  if(s.esquema==='mixto') return `≥ $${Number(s.umbralFijo||0).toLocaleString('es-MX')}: honorarios $${Number(s.honorariosFijo||0).toLocaleString('es-MX')} / comisión $${Number(s.comisionFija||0).toLocaleString('es-MX')} · < umbral: ${s.honorariosPct||0}% honorarios / ${s.comisionPct||0}% de honorarios`;
  if(s.esquema==='porcentaje') return `Honorarios: ${s.honorariosPct||0}% del monto · Comisión asesor: ${s.comisionPct||0}%`;
  return 'Definir manualmente en cada caso';
}

function renderMarcadores(texto, showVarsBlue){
  if(showVarsBlue){
    const ob='{{'; const cb='}}';
    texto=texto.split(ob).join('<span style="color:#3b82f6;font-weight:600;">'+ob)
               .split(cb).join(cb+'</span>');
  }
  const lineas=texto.split('\n');
  return lineas.map(function(l){
    const lt=l.trim();
    if(lt.startsWith('[CENTRO]')&&lt.endsWith('[/CENTRO]')){
      return '<div style="text-align:center;font-weight:700;font-size:13px;margin:8px 0;display:block;">'+lt.slice(8,lt.length-9)+'</div>';
    }
    if(lt.startsWith('[NEGRITA]')&&lt.endsWith('[/NEGRITA]')){
      return '<strong style="font-weight:700;">'+lt.slice(9,lt.length-10)+'</strong>';
    }
    if(lt==='[SEPARADOR]') return '<hr style="border:none;border-top:1px solid #888;margin:14px 0;display:block;">';
    if(lt.startsWith('[FIRMA]')&&lt.endsWith('[/FIRMA]')){
      const inner=lt.slice(7,lt.length-8);
      const cols=inner.split('|').map(function(p){
        const parts=p.trim().split(' - ');
        const rol=parts[0]||'';
        const nombre=parts.slice(1).join(' - ')||'';
        return '<div style="text-align:center;flex:1;min-width:0;">'
          +'<div style="font-size:11px;color:#888;margin-bottom:36px;font-weight:600;">'+rol+'</div>'
          +'<div style="border-top:1px solid currentColor;padding-top:8px;font-size:12px;font-weight:700;">'+nombre+'</div>'
          +'</div>';
      });
      return '<div style="display:flex;gap:48px;margin-top:28px;margin-bottom:16px;page-break-inside:avoid;">'+cols.join('')+'</div>';
    }
    if(l.trim()==='') return '<div style="height:6px;"></div>';
    return '<div style="margin-bottom:2px;">'+l+'</div>';
  }).join('');
}

function openVisorPlantilla(servicioId){
  const s=store.servicios.find(x=>x.id===servicioId);
  if(!s) return;
  const htmlRendered=renderMarcadores(s.plantilla||'Sin plantilla definida', true);
  document.getElementById('visor-contrato-titulo').textContent='Plantilla: '+s.nombre;
  document.getElementById('visor-contrato-body').innerHTML=
    '<div style="font-family:var(--font-body);font-size:12px;line-height:1.8;color:var(--text-secondary);">'+htmlRendered+'</div>';
  document.getElementById('modal-visor').classList.add('open');
}

let editingServicioDocsSelected=[];
function openModalServicio(id){
  editingServicioId=id||null;
  const s=id?store.servicios.find(x=>x.id===id):null;
  editingServicioDocsSelected=s?[...(s.docs||[])]:['ine','nss','curp'];
  document.getElementById('modal-servicio-title').textContent=id?'Editar servicio':'Nuevo servicio';
  setVal('sv-nombre',s?.nombre||'');
  setVal('sv-descripcion',s?.descripcion||'');
  setVal('sv-esquema',s?.esquema||'manual');
  setVal('sv-umbral',s?.umbralFijo||35000);
  setVal('sv-hon-fijo',s?.honorariosFijo||8000);
  setVal('sv-com-fija',s?.comisionFija||2000);
  setVal('sv-hon-pct',s?.honorariosPct||25);
  setVal('sv-com-pct',s?.comisionPct||40);
  setVal('sv-plantilla',s?.plantilla||'');
  const activo=document.getElementById('sv-activo');
  if(activo) activo.checked=s?s.activo!==false:true;
  renderServicioEsquema();
  renderServicioDocs();
  document.getElementById('modal-servicio').classList.add('open');
}

function renderServicioEsquema(){
  const esq=document.getElementById('sv-esquema')?.value;
  const wMixto=document.getElementById('sv-esquema-mixto');
  const wPct=document.getElementById('sv-esquema-pct');
  if(wMixto) wMixto.style.display=esq==='mixto'?'block':'none';
  if(wPct) wPct.style.display=esq==='porcentaje'?'block':'none';
}

function renderServicioDocs(){
  const container=document.getElementById('sv-docs-container');
  if(!container) return;
  container.innerHTML=DOCS_CATALOGO.map(d=>`
    <div class="doc-item" style="cursor:pointer;" onclick="toggleServicioDoc('${d.id}',this)">
      <div class="doc-check ${editingServicioDocsSelected.includes(d.id)?'checked':''}">${editingServicioDocsSelected.includes(d.id)?'✓':''}</div>
      <div class="doc-name">${d.label}</div>
    </div>
  `).join('');
}

function toggleServicioDoc(docId, rowEl){
  const check=rowEl.querySelector('.doc-check');
  const idx=editingServicioDocsSelected.indexOf(docId);
  if(idx>=0){ editingServicioDocsSelected.splice(idx,1); check.classList.remove('checked'); check.textContent=''; }
  else { editingServicioDocsSelected.push(docId); check.classList.add('checked'); check.textContent='✓'; }
}

function guardarServicio(){
  const nombre=(document.getElementById('sv-nombre')?.value||'').trim();
  if(!nombre){showToast('El nombre del servicio es obligatorio','warn');return;}
  const esq=document.getElementById('sv-esquema')?.value||'manual';
  const servicio={
    id:editingServicioId||'svc_'+Date.now(),
    nombre,
    descripcion:getVal('sv-descripcion'),
    activo:document.getElementById('sv-activo')?.checked!==false,
    esquema:esq,
    umbralFijo:Number(getVal('sv-umbral'))||35000,
    honorariosFijo:Number(getVal('sv-hon-fijo'))||0,
    comisionFija:Number(getVal('sv-com-fija'))||0,
    honorariosPct:Number(getVal('sv-hon-pct'))||0,
    comisionPct:Number(getVal('sv-com-pct'))||0,
    docs:[...editingServicioDocsSelected],
    plantilla:getVal('sv-plantilla'),
  };
  if(editingServicioId){
    const idx=store.servicios.findIndex(s=>s.id===editingServicioId);
    if(idx>=0) store.servicios[idx]=servicio;
    showToast('Servicio actualizado','success');
  } else {
    store.servicios.push(servicio);
    showToast('Servicio creado','success');
  }
  saveStore();
  closeModal('modal-servicio');
  renderPage('servicios');
}

let selectedClienteId = null;
