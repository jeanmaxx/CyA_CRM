// ==================== PLANTILLAS DE MENSAJES ====================
const PLANTILLAS_DEFAULT = [
  {
    id:'pl_bienvenida', nombre:'Bienvenida / Primer contacto', etapa:'perfilamiento',
    tipo:'whatsapp', icono:'💬',
    texto:'Hola {{NOMBRE}}, soy {{ASESOR}} de Casillas & Asociados. Me da gusto contactarte. Te comento que podemos apoyarte a recuperar tu saldo AFORE por desempleo. ¿Tienes unos minutos para que te explique cómo funciona el proceso?',
  },
  {
    id:'pl_documentos', nombre:'Solicitar documentación', etapa:'documentacion',
    tipo:'whatsapp', icono:'📋',
    texto:'Hola {{NOMBRE}}, para continuar con tu trámite de retiro por desempleo necesitamos los siguientes documentos:\n✅ INE (ambos lados)\n✅ CURP actualizada\n✅ Acta de nacimiento actualizada\n✅ Comprobante de domicilio (no mayor a 3 meses)\n✅ RFC\n\n¿Puedes enviármelos por este medio o prefieres que nos veamos en persona?',
  },
  {
    id:'pl_contrato', nombre:'Aviso de contrato listo', etapa:'pendiente_firma',
    tipo:'whatsapp', icono:'📝',
    texto:'Hola {{NOMBRE}}, tu contrato está listo para firma. El monto que podrás retirar es de {{MONTO}}. Los honorarios del servicio son {{HONORARIOS}}. ¿Cuándo podemos vernos para firmarlo y comenzar el proceso?',
  },
  {
    id:'pl_espera', nombre:'Inicio de espera 45 días', etapa:'espera_45',
    tipo:'whatsapp', icono:'⏳',
    texto:'Hola {{NOMBRE}}, ya quedó registrado tu proceso. A partir de hoy comenzamos los 45 días de espera requeridos. La fecha estimada para hacer la solicitud de retiro en AFORE Móvil es aproximadamente el {{FECHA_RETIRO}}. Cualquier duda estoy a tus órdenes.',
  },
  {
    id:'pl_solicitud', nombre:'Solicitud AFORE', etapa:'solicitud_afore',
    tipo:'whatsapp', icono:'📱',
    texto:'Hola {{NOMBRE}}, hoy es el día de hacer la solicitud de retiro en tu aplicación AFORE Móvil. Por favor descarga la app si aún no la tienes y avísame cuando estés listo para guiarte en el proceso. Recuerda que el depósito llega entre 24 horas y 5 días hábiles.',
  },
  {
    id:'pl_deposito', nombre:'Aviso de depósito recibido', etapa:'deposito',
    tipo:'whatsapp', icono:'💰',
    texto:'Hola {{NOMBRE}}, ¡excelente noticia! El monto de {{MONTO}} ya fue depositado en tu cuenta. Recuerda que tienes hasta 24 horas para realizar el pago de honorarios de {{HONORARIOS}} a la cuenta de Casillas & Asociados. Cualquier duda con gusto te atiendo.',
  },
  {
    id:'pl_cobro', nombre:'Recordatorio de pago', etapa:'cobro_honorarios',
    tipo:'whatsapp', icono:'🔔',
    texto:'Hola {{NOMBRE}}, te recuerdo que el pago de honorarios de {{HONORARIOS}} debe realizarse antes de que se cumpla el plazo de 24 horas acordado en el contrato. ¿Tienes alguna duda sobre cómo realizar el pago?',
  },
  {
    id:'pl_seguimiento_gen', nombre:'Seguimiento general', etapa:'',
    tipo:'whatsapp', icono:'📞',
    texto:'Hola {{NOMBRE}}, soy {{ASESOR}} de Casillas & Asociados. Te contacto para saber cómo estás y si tienes alguna duda sobre el proceso de tu trámite. Estoy a tus órdenes.',
  },
];

let plantillaClienteActivo = null;
let plantillaNombreManual = '';

function renderPlantillas(){
  const plantillas = store.plantillas||PLANTILLAS_DEFAULT;
  return `
  <div class="module-toolbar templates-toolbar">
    <div><div class="section-title">Plantillas de mensajes</div><div class="section-sub">Mensajes predefinidos listos para copiar y enviar por WhatsApp</div></div>
    <button class="btn btn-primary" onclick="crearPlantilla()">+ Nueva plantilla</button>
  </div>
  <div class="card template-name-card"><div class="card-body"><div class="form-group" style="margin:0;"><label class="form-label">Nombre</label><input class="form-input" id="pl-nombre-manual" value="${plantillaNombreManual}" placeholder="Ej. Emmanuel" oninput="plantillaNombreManual=this.value;actualizarPreviewPlantilla()"><div class="form-helper">Escribe solo el nombre con el que deseas saludar al cliente. Sustituye la variable {{NOMBRE}} en el mensaje.</div></div></div></div>
  <div class="templates-layout">
    <!-- Lista de plantillas -->
    <div class="templates-list" tabindex="0" aria-label="Plantillas disponibles. Desliza para recorrerlas.">
      ${plantillas.map(p=>`
        <div class="card plantilla-list-card ${plantillaActivaId===p.id?'plantilla-card-activa':''}" data-plantilla-id="${p.id}" role="button" tabindex="0" style="cursor:pointer;border-left:3px solid ${p.etapa?'var(--accent-blue)':'var(--border-strong)'};"
          onclick="seleccionarPlantilla('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();seleccionarPlantilla('${p.id}');}">
          <div class="card-body" style="padding:10px 12px;">
            <div style="font-size:13px;font-weight:500;">${p.icono} ${p.nombre}</div>
            ${p.etapa?`<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${stageLabel(p.etapa,'retiro_desempleo')}</div>`:'<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">General</div>'}
          </div>
        </div>
      `).join('')}
    </div>
    <!-- Preview y uso -->
    <div class="template-preview-column">
      <div class="card template-preview-card">
        <div class="card-header">
          <div class="card-title">Vista previa del mensaje</div>
          <div class="template-actions" id="pl-acciones">
            <button class="btn" id="pl-btn-editar" style="font-size:12px;display:none;" onclick="editarPlantillaActiva()">✎ Editar</button>
            <button class="btn" id="pl-btn-cancelar" style="font-size:12px;display:none;" onclick="cancelarEdicionPlantilla()">Cancelar edición</button>
            <button class="btn" id="pl-btn-guardar" style="font-size:12px;display:none;" onclick="guardarPlantillaActiva()">Guardar plantilla</button>
            <button class="btn" id="pl-btn-eliminar" style="font-size:12px;display:none;color:var(--danger);" onclick="eliminarPlantillaActiva()">Eliminar</button>
            <button class="btn btn-primary" id="pl-btn-copiar" style="font-size:12px;display:none;" onclick="copiarPlantilla()">📋 Copiar mensaje</button>
            <a id="pl-btn-wa" href="#" target="_blank" style="display:none;">
              <button class="btn" style="font-size:12px;background:#25d366;border-color:#25d366;color:#fff;">💬 Abrir en WhatsApp</button>
            </a>
          </div>
        </div>
        <div class="card-body" id="pl-preview-body">
          <div class="empty-state" style="padding:32px 0;">
            <div class="empty-icon">💬</div>
            <div class="empty-title">Selecciona una plantilla</div>
            <div class="empty-sub">Elige una plantilla de la lista para ver el mensaje y personalizarlo</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

let plantillaActivaId = null;
let mensajePersonalizado = '';
let plantillaEditando = false;

function seleccionarPlantilla(id){
  const plantillas=store.plantillas||PLANTILLAS_DEFAULT;
  const p=plantillas.find(x=>x.id===id);
  if(!p) return;
  plantillaActivaId=id;
  plantillaClienteActivo=null;
  plantillaEditando=false;
  mensajePersonalizado=p.texto;
  document.querySelectorAll('.plantilla-list-card').forEach(card=>card.classList.toggle('plantilla-card-activa',card.dataset.plantillaId===id));
  renderDetallePlantilla();
}

function renderDetallePlantilla(){
  const plantillas=store.plantillas||PLANTILLAS_DEFAULT;
  const p=plantillas.find(x=>x.id===plantillaActivaId);
  if(!p) return;
  const body=document.getElementById('pl-preview-body');
  const btnCopiar=document.getElementById('pl-btn-copiar');
  const btnWa=document.getElementById('pl-btn-wa');
  const btnEditar=document.getElementById('pl-btn-editar');
  const btnCancelar=document.getElementById('pl-btn-cancelar');
  const btnGuardar=document.getElementById('pl-btn-guardar');
  const btnEliminar=document.getElementById('pl-btn-eliminar');

  if(body){
    body.innerHTML=plantillaEditando?`
      <div style="background:var(--bg-secondary);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px;">
        <div class="form-group"><label class="form-label">Nombre de la plantilla</label><input class="form-input" id="pl-titulo-edit" value="${p.nombre.replace(/"/g,'&quot;')}"></div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Variables: <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px;">{{NOMBRE}}</code> <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px;">{{MONTO}}</code> <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px;">{{HONORARIOS}}</code> <code style="background:var(--bg-hover);padding:1px 5px;border-radius:3px;">{{ASESOR}}</code></div>
        <textarea id="pl-texto-edit" class="form-textarea" style="min-height:140px;font-size:13px;" oninput="mensajePersonalizado=this.value;actualizarPreviewPlantilla()">${p.texto}</textarea>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Vista previa final</div>
      <div id="pl-msg-final" class="template-message-preview template-message-preview-edit"></div>`:
      `<div id="pl-msg-final" class="template-message-preview"></div>`;
  }
  if(btnCopiar) btnCopiar.style.display='';
  if(btnWa) btnWa.style.display='';
  if(btnEditar) btnEditar.style.display=plantillaEditando?'none':'';
  if(btnCancelar) btnCancelar.style.display=plantillaEditando?'':'none';
  if(btnGuardar) btnGuardar.style.display=plantillaEditando?'':'none';
  if(btnEliminar) btnEliminar.style.display=plantillaEditando?'':'none';
  actualizarPreviewPlantilla();
  actualizarWaLink();
}

function editarPlantillaActiva(){
  if(!plantillaActivaId) return;
  plantillaEditando=true;
  renderDetallePlantilla();
}

function cancelarEdicionPlantilla(){
  const p=(store.plantillas||PLANTILLAS_DEFAULT).find(x=>x.id===plantillaActivaId);
  if(!p) return;
  mensajePersonalizado=p.texto;
  plantillaEditando=false;
  renderDetallePlantilla();
}

function filtrarClientesPlantilla(q){
  const list=document.getElementById('pl-cliente-list');
  if(!list) return;
  if(!q||q.length<2){list.classList.remove('open');return;}
  const f=clientesVisibles().filter(c=>c.nombre.toUpperCase().includes(q.toUpperCase()));
  if(!f.length){list.classList.remove('open');return;}
  list.innerHTML=f.slice(0,6).map(c=>{
    const n=c.nombre.replace(/'/g,'&apos;');
    return `<div class="autocomplete-item" onclick="seleccionarClientePlantilla('${c.id}','${n}')">
      <div>${c.nombre}</div><div class="autocomplete-item-sub">${getSvcLabel(c.servicio)} · ${stageLabel(c.etapa,c.servicio)}</div>
    </div>`;
  }).join('');
  list.classList.add('open');
}

function seleccionarClientePlantilla(id, nombre){
  plantillaClienteActivo=id;
  const input=document.getElementById('pl-cliente-input');
  if(input) input.value=nombre;
  document.getElementById('pl-cliente-list').classList.remove('open');
  actualizarPreviewPlantilla();
}

function actualizarPreviewPlantilla(){
  const c=plantillaClienteActivo?store.clientes.find(x=>x.id===plantillaClienteActivo):null;
  const asesor=sesionActiva?asesorNombreCompleto(sesionActiva):(store.configuracion.asesor||'su asesor');
  let texto=mensajePersonalizado||document.getElementById('pl-texto-edit')?.value||'';
  if(c){
    const nombre=plantillaNombreManual.trim()||c.nombre.split(' ')[0];
    const monto=c.montoAfore?'$'+Number(c.montoAfore).toLocaleString('es-MX'):'[MONTO]';
    const hon=c.honorarios?'$'+Number(c.honorarios).toLocaleString('es-MX'):(c.honorariosCalc?'$'+Number(c.honorariosCalc).toLocaleString('es-MX'):'[HONORARIOS]');
    const fechaRet=c.fechaRetiroEstimada?fmtDate(c.fechaRetiroEstimada):'[FECHA ESTIMADA]';
    texto=texto
      .replace(/{{NOMBRE}}/g,nombre)
      .replace(/{{MONTO}}/g,monto)
      .replace(/{{HONORARIOS}}/g,hon)
      .replace(/{{ASESOR}}/g,asesor)
      .replace(/{{FECHA_RETIRO}}/g,fechaRet);
  } else {
    const nombre=plantillaNombreManual.trim()||'{{NOMBRE}}';
    texto=texto.replace(/{{NOMBRE}}/g,nombre).replace(/{{ASESOR}}/g,asesor);
  }
  const preview=document.getElementById('pl-msg-final');
  if(preview) preview.innerHTML=texto.replace(/\n/g,'<br>');
  mensajePersonalizado=document.getElementById('pl-texto-edit')?.value||mensajePersonalizado;
  actualizarWaLink(texto,c);
}

function asegurarPlantillasEditables(){ if(!store.plantillas) store.plantillas=PLANTILLAS_DEFAULT.map(p=>({...p})); return store.plantillas; }
function crearPlantilla(){
  const arr=asegurarPlantillasEditables(); const p={id:'pl_'+Date.now(),nombre:'Nueva plantilla',etapa:'',tipo:'whatsapp',icono:'▤',texto:'Hola {{NOMBRE}}, espero que estés bien.'}; arr.push(p); saveStore(); plantillaActivaId=p.id; renderPage('plantillas'); setTimeout(()=>{seleccionarPlantilla(p.id);editarPlantillaActiva();},30);
}
function guardarPlantillaActiva(){
  if(!plantillaActivaId) return; const arr=asegurarPlantillasEditables(); const p=arr.find(x=>x.id===plantillaActivaId); if(!p) return; const titulo=getVal('pl-titulo-edit').trim(); const texto=getVal('pl-texto-edit'); if(!titulo||!texto){showToast('Nombre y mensaje son obligatorios','warn');return;} p.nombre=titulo;p.texto=texto;saveStore();showToast('Plantilla guardada','success');renderPage('plantillas');setTimeout(()=>seleccionarPlantilla(p.id),30);
}
function eliminarPlantillaActiva(){
  if(!plantillaActivaId||!confirm('¿Eliminar esta plantilla?')) return; const arr=asegurarPlantillasEditables(); store.plantillas=arr.filter(p=>p.id!==plantillaActivaId); plantillaActivaId=null; mensajePersonalizado=''; saveStore(); renderPage('plantillas'); showToast('Plantilla eliminada','info');
}

function actualizarWaLink(texto, c){
  const btnWa=document.getElementById('pl-btn-wa');
  if(!btnWa) return;
  const preview=document.getElementById('pl-msg-final');
  const msg=preview?preview.innerText||preview.textContent:'';
  const tel=c?c.telefono:'';
  const encoded=encodeURIComponent(msg);
  const url=tel?`https://wa.me/52${tel.replace(/\D/g,'')}?text=${encoded}`:`https://wa.me/?text=${encoded}`;
  btnWa.href=url;
}

function copiarPlantilla(){
  const preview=document.getElementById('pl-msg-final');
  const texto=preview?preview.innerText||preview.textContent:'';
  if(!texto) return;
  navigator.clipboard.writeText(texto).then(()=>{
    showToast('Mensaje copiado al portapapeles','success');
  }).catch(()=>{
    // Fallback
    const ta=document.createElement('textarea');
    ta.value=texto; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('Mensaje copiado','success');
  });
}

// ==================== SEGUIMIENTO AUTOMÁTICO ====================
// Días límite por etapa antes de mostrar alerta
const DIAS_ALERTA_ETAPA = {
  perfilamiento: 3,
  documentacion: 7,
  pendiente_firma: 5,
  contrato_firmado: 3,
  espera_45: 50,       // más generoso, es espera real
  solicitud_afore: 2,
  deposito: 2,
  cobro_honorarios: 2,
};

function calcularDiasSinMovimiento(c){
  if(!c.historial||c.historial.length===0){
    // Usar fecha de registro
    const reg=new Date(c.fechaRegistro||Date.now());
    return Math.floor((Date.now()-reg.getTime())/(1000*60*60*24));
  }
  // Última actividad relevante (etapa o edición)
  const relevantes=c.historial.filter(h=>h.tipo==='etapa'||h.tipo==='registro'||h.tipo==='edicion');
  if(!relevantes.length) return 0;
  const ultimo=relevantes[relevantes.length-1];
  // Parsear fecha del historial (formato "07 ago 2026, 10:30")
  try{
    const d=new Date(ultimo.fecha);
    if(!isNaN(d.getTime())) return Math.floor((Date.now()-d.getTime())/(1000*60*60*24));
  }catch(e){}
  return 0;
}

function alertasSeguimiento(clientes){
  const alertas=[];
  clientes.forEach(c=>{
    if(c.etapa==='concluido') return;
    const limite=DIAS_ALERTA_ETAPA[c.etapa];
    if(!limite) return;
    const dias=calcularDiasSinMovimiento(c);
    if(dias>=limite){
      alertas.push({cliente:c, dias, limite, etapa:stageLabel(c.etapa,c.servicio)});
    }
  });
  return alertas.sort((a,b)=>b.dias-a.dias);
}

// ==================== ORDENAMIENTO TABLA CLIENTES ====================
let clientesOrden = { campo:'fechaRegistro', dir:'desc' };

function ordenarClientes(campo){
  if(clientesOrden.campo===campo){
    clientesOrden.dir=clientesOrden.dir==='asc'?'desc':'asc';
  } else {
    clientesOrden.campo=campo;
    clientesOrden.dir=campo==='nombre'?'asc':'desc';
  }
  renderPage('clientes');
}

function aplicarOrden(clientes){
  const {campo,dir}=clientesOrden;
  const mult=dir==='asc'?1:-1;
  return [...clientes].sort((a,b)=>{
    let va='',vb='';
    if(campo==='nombre'){ va=a.nombre||''; vb=b.nombre||''; }
    else if(campo==='fechaRegistro'){ va=a.fechaRegistro||''; vb=b.fechaRegistro||''; }
    else if(campo==='etapa'){
      const stages=STAGES_RETIRO.map(s=>s.id);
      va=stages.indexOf(a.etapa); vb=stages.indexOf(b.etapa);
      return (va-vb)*mult;
    }
    else if(campo==='elegible'){ va=a.elegible||''; vb=b.elegible||''; }
    else if(campo==='servicio'){ va=getSvcLabel(a.servicio)||''; vb=getSvcLabel(b.servicio)||''; }
    if(va<vb) return -1*mult;
    if(va>vb) return 1*mult;
    return 0;
  });
}

function flechaOrden(campo){
  if(clientesOrden.campo!==campo) return '<span style="color:var(--border-strong);font-size:10px;"> ⇅</span>';
  return clientesOrden.dir==='asc'
    ?'<span style="color:var(--accent-blue);font-size:10px;"> ↑</span>'
    :'<span style="color:var(--accent-blue);font-size:10px;"> ↓</span>';
}

// ==================== COLABORADORES ====================
let editingColaboradorId = null;

function renderColaboradores(){
  const cols = isAdmin()?(store.colaboradores||[]):(store.colaboradores||[]).filter(c=>c.asesorId===sesionActiva?.id);
  const datos=cols.map(col=>{
    const asesor=store.asesores.find(a=>a.id===col.asesorId);
    const clientes=store.clientes.filter(c=>c.colaboradorId===col.id);
    const conversion=metricasConversion({colaboradorId:col.id});
    const comisionTotal=clientes.filter(c=>c.estadoPago==='Cobrado').reduce((s,c)=>{
      const pct=(c.colPct||col.pctComision||50)/100;
      return s+Number(c.comision||0)*pct;
    },0);
    const pendiente=clientes.filter(c=>c.estadoPago==='Pendiente').reduce((s,c)=>{
      const pct=(c.colPct||col.pctComision||50)/100;
      return s+Number(c.comisionCalc||0)*pct;
    },0);
    return {col,asesor,conversion,comisionTotal,pendiente};
  });
  const filas=datos.map(({col,asesor,conversion,comisionTotal,pendiente})=>{
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px;min-width:150px;">
          <div class="user-avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0;">${initials(col.nombre)}</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-weight:600;">${col.nombre}</span><span class="chip ${col.activo?'chip-green':'chip-red'}" style="font-size:9px;">${col.activo?'Activo':'Inactivo'}</span></div>
            <div style="font-size:10px;color:var(--text-muted);">${col.ciudad||'—'}</div>
          </div>
        </div>
      </td>
      <td><div style="min-width:110px;">${asesor?asesor.nombre:'—'}<div style="font-size:10px;color:var(--text-muted);">${col.pctComision||50}% de comisión</div></div></td>
      <td>${conversion.oportunidades}</td>
      <td>${conversion.desdeProspecto}</td>
      <td>${conversion.directos}</td>
      <td>${conversion.clientes}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar-wrap" style="width:58px;margin:0;"><div class="progress-bar" style="width:${Math.min(conversion.tasa,100)}%;"></div></div>
          <span style="font-size:11px;min-width:38px;">${formatoTasaConversion(conversion.tasa)}</span>
        </div>
      </td>
      <td style="color:var(--success);">$${comisionTotal.toLocaleString('es-MX')}</td>
      <td>$${pendiente.toLocaleString('es-MX')}</td>
      <td><button class="btn btn-icon" onclick="openModalColaborador('${col.id}')" title="Editar">✎</button></td>
    </tr>`;
  }).join('');
  const tarjetas=datos.map(({col,asesor,conversion,comisionTotal,pendiente})=>`
    <article class="collaborator-mobile-card">
      <div class="collaborator-mobile-head">
        <div class="user-avatar">${initials(col.nombre)}</div>
        <div class="collaborator-mobile-identity">
          <div class="collaborator-mobile-name">${col.nombre}</div>
          <div class="collaborator-mobile-place">${col.ciudad||'—'}</div>
        </div>
        <span class="chip ${col.activo?'chip-green':'chip-red'}">${col.activo?'Activo':'Inactivo'}</span>
        <button class="btn btn-icon" onclick="openModalColaborador('${col.id}')" title="Editar ${col.nombre}" aria-label="Editar ${col.nombre}">✎</button>
      </div>
      <div class="collaborator-mobile-advisor">Reporta a <strong>${asesor?asesor.nombre:'—'}</strong> · ${col.pctComision||50}% de comisión</div>
      <div class="collaborator-mobile-metrics">
        <div><strong>${conversion.oportunidades}</strong><span>Oportunidades</span></div>
        <div><strong>${conversion.clientes}</strong><span>Clientes</span></div>
        <div><strong>${formatoTasaConversion(conversion.tasa)}</strong><span>Conversión</span></div>
      </div>
      <div class="collaborator-mobile-breakdown"><span>Desde prospecto: <strong>${conversion.desdeProspecto}</strong></span><span>Directos: <strong>${conversion.directos}</strong></span></div>
      <div class="collaborator-mobile-money"><span><small>Cobrado</small><strong>$${comisionTotal.toLocaleString('es-MX')}</strong></span><span><small>Pendiente</small><strong>$${pendiente.toLocaleString('es-MX')}</strong></span></div>
    </article>`).join('');
  return `
  <div class="module-toolbar collaborators-toolbar">
    <div><div class="section-title">Colaboradores</div><div class="section-sub">Red de colaboradores y comisiones compartidas</div></div>
    <button class="btn btn-primary" onclick="openModalColaborador()">+ Nuevo colaborador</button>
  </div>
  ${cols.length===0?`<div class="empty-state"><div class="empty-icon">◐</div><div class="empty-title">Sin colaboradores</div><div class="empty-sub">Agrega tus colaboradores externos</div><button class="btn btn-primary" onclick="openModalColaborador()">+ Nuevo</button></div>`:`
  <div class="card collaborators-table-card"><div class="table-wrap"><table>
    <thead><tr><th>Colaborador</th><th>Asesor</th><th>Oportunidades</th><th>Desde prospecto</th><th>Directos</th><th>Clientes</th><th>Conversión</th><th>Cobrado</th><th>Pendiente</th><th></th></tr></thead>
    <tbody>${filas}</tbody>
  </table></div></div>
  <div class="collaborators-mobile-list">${tarjetas}</div>`}`;
}

function openModalColaborador(id){
  editingColaboradorId=id||null;
  const col=id?store.colaboradores.find(x=>x.id===id):null;
  if(col&&!isAdmin()&&col.asesorId!==sesionActiva?.id){showToast('No puedes editar colaboradores de otro asesor','warn');return;}
  document.getElementById('modal-col-title').textContent=id?'Editar colaborador':'Nuevo colaborador';
  document.getElementById('col-btn-eliminar').style.display=id?'':'none';
  setVal('col-nombre',col?col.nombre:'');
  setVal('col-ciudad',col?col.ciudad:'');
  setVal('col-pct',col?col.pctComision:50);
  setVal('col-activo',col?(col.activo===false?'false':'true'):'true');
  // Poblar select de asesores
  const sel=document.getElementById('col-asesor');
  const asesoresDisponibles=isAdmin()?store.asesores.filter(a=>a.activo!==false):store.asesores.filter(a=>a.id===sesionActiva?.id);
  sel.innerHTML=asesoresDisponibles.map(a=>`<option value="${a.id}"${col&&col.asesorId===a.id?' selected':''}>${a.nombre}</option>`).join('');
  if(!col&&sesionActiva) sel.value=sesionActiva.id;
  sel.disabled=!isAdmin();
  document.getElementById('modal-colaborador').classList.add('open');
}

function guardarColaborador(){
  const nombre=(getVal('col-nombre')||'').trim();
  if(!nombre){showToast('El nombre es obligatorio','warn');return;}
  const anterior=editingColaboradorId?store.colaboradores.find(c=>c.id===editingColaboradorId):null;
  if(anterior&&!isAdmin()&&anterior.asesorId!==sesionActiva?.id){showToast('No puedes modificar colaboradores de otro asesor','warn');return;}
  const col={
    id:editingColaboradorId||'col_'+Date.now(),
    nombre, ciudad:getVal('col-ciudad'),
    asesorId:isAdmin()?(getVal('col-asesor')||sesionActiva?.id):sesionActiva?.id,
    pctComision:Number(getVal('col-pct'))||50,
    activo:getVal('col-activo')!=='false',
    fechaAlta:editingColaboradorId?(store.colaboradores.find(c=>c.id===editingColaboradorId)||{}).fechaAlta||new Date().toISOString().split('T')[0]:new Date().toISOString().split('T')[0],
  };
  if(editingColaboradorId){
    const idx=store.colaboradores.findIndex(c=>c.id===editingColaboradorId);
    if(idx>=0) store.colaboradores[idx]=col;
    showToast('Colaborador actualizado','success');
  } else {
    store.colaboradores.push(col);
    showToast('Colaborador creado','success');
  }
  saveStore();
  closeModal('modal-colaborador');
  renderPage('colaboradores');
}

function eliminarColaborador(){
  if(!editingColaboradorId) return;
  const colaborador=store.colaboradores.find(c=>c.id===editingColaboradorId);
  if(!colaborador) return;
  if(!isAdmin()&&colaborador.asesorId!==sesionActiva?.id){showToast('No puedes eliminar colaboradores de otro asesor','warn');return;}
  if(!confirm('¿Eliminar este colaborador? Los clientes vinculados quedarán sin colaborador.')) return;
  store.colaboradores=store.colaboradores.filter(c=>c.id!==editingColaboradorId);
  (store.clientes||[]).forEach(c=>{if(c.colaboradorId===editingColaboradorId){c.colaboradorId=null;c.colPct=0;}});
  saveStore();
  closeModal('modal-colaborador');
  showToast('Colaborador eliminado','info');
  renderPage('colaboradores');
}

// Poblar select de colaboradores en modal cliente
function poblarSelectColaborador(){
  const sel=document.getElementById('fc-colaborador');
  if(!sel) return;
  const misColabs=colaboradoresVistaActual().filter(c=>c.activo!==false);
  sel.innerHTML='<option value="">— Sin colaborador —</option>'+misColabs.map(c=>`<option value="${c.id}">${c.nombre} (${c.ciudad||'—'})</option>`).join('');
  sel.onchange=function(){
    const col=store.colaboradores.find(x=>x.id===this.value);
    if(col) setVal('fc-col-pct',col.pctComision||50);
    else setVal('fc-col-pct','');
  };
}

// ==================== LEADS / PROSPECTOS ====================
let editingLeadId = null;
let leadParaArchivar = null;
let leadConversionPendienteId = null;
let archivadosLeadsAbiertos = true;

const LEAD_ESTADOS = {
  pensiones:  {label:'Pensiones',                    color:'#7c3aed', cls:'lead-pensiones',  dias:7},
  correccion_imss:{label:'Corrección ante IMSS',     color:'#0891b2', cls:'lead-correccion', dias:7},
  semanas:   {label:'En revisión de semanas / NSS', color:'#d97706', cls:'lead-semanas',  dias:5},
  sindos:    {label:'En revisión de SINDOs',  color:'#2563eb', cls:'lead-sindos',   dias:7},
  aprobado:  {label:'Aprobado',               color:'#16a34a', cls:'lead-aprobado', dias:null},
  archivado: {label:'Archivado',              color:'#475569', cls:'lead-archivado',dias:null},
};

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
    <div class="leads-toolbar-actions">${getSelectorVistaHTML(true)}<button class="btn btn-primary" onclick="openModalLead()">+ Nuevo prospecto</button></div>
  </div>
  <div class="mobile-scroll-hint" aria-hidden="true">Desliza para recorrer las etapas →</div>
  <div class="leads-scroll-wrap" tabindex="0" aria-label="Etapas de prospectos. Desliza horizontalmente para recorrerlas.">
    <div class="leads-kanban">
      ${colsActivos.map(estado=>{
        const cfg=LEAD_ESTADOS[estado];
        const tarjetas=leads.filter(l=>l.estado===estado);
        return `<div class="lead-col ${cfg.cls}">
          <div class="lead-col-header">
            <span>${cfg.label}</span>
            <span style="background:rgba(0,0,0,.2);padding:2px 8px;border-radius:10px;font-size:11px;">${tarjetas.length}</span>
          </div>
          <div class="lead-col-body">
            ${tarjetas.length===0?`<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px 0;">Sin prospectos</div>`
            :tarjetas.sort((a,b)=>a.fechaInicio>b.fechaInicio?1:-1).map(l=>{
              const dias=Math.floor((hoy-new Date(l.fechaInicio))/(1000*60*60*24));
              const limite=cfg.dias;
              const urgente=limite&&dias>=limite;
              const diasCls=urgente?'lead-dias-urgente':dias>1?'lead-dias-normal':'lead-dias-ok';
              const colabNombre=l.colaboradorId?(store.colaboradores.find(c=>c.id===l.colaboradorId)||{}).nombre:'';
              const primeraNota=(l.notas||'').split(/\r?\n/)[0]||'Sin notas';
              return `<div class="lead-card" role="button" tabindex="0" onclick="openModalLead('${l.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModalLead('${l.id}');}">
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

function renderGrupoArchivados(titulo,items,temporal){
  return `<div class="archivado-grupo"><div class="archivado-grupo-titulo">${titulo} (${items.length})</div><div class="archivado-lista">
    ${items.length?items.slice().reverse().map(l=>renderTarjetaArchivado(l,temporal)).join(''):'<div style="font-size:11px;color:var(--text-muted);padding:8px;">Sin prospectos</div>'}
  </div></div>`;
}

function renderArchivadosPorCausa(items){
  if(!items.length) return '<div class="archivado-grupo"><div class="archivado-grupo-titulo">Archivados definitivos (0)</div><div style="font-size:11px;color:var(--text-muted);padding:12px;">Sin prospectos</div></div>';
  const grupos={};
  items.forEach(l=>{ const causa=l.causaArchivo||'Sin causa especificada'; if(!grupos[causa]) grupos[causa]=[]; grupos[causa].push(l); });
  const columnas=Object.entries(grupos).sort((a,b)=>b[1].length-a[1].length).map(([causa,prospectos])=>`
    <div class="archivado-causa-col">
      <div class="archivado-causa-head"><span>${causa}</span><span>${prospectos.length}</span></div>
      <div class="archivado-causa-list">${prospectos.slice().reverse().map(l=>renderTarjetaArchivado(l,false)).join('')}</div>
    </div>`).join('');
  return `<div class="archivado-grupo"><div class="archivado-grupo-titulo">Archivados definitivos (${items.length}) · agrupados por causa</div><div class="archivado-causas-grid">${columnas}</div></div>`;
}

function renderTarjetaArchivado(l,temporal){
  const dias=Math.max(0,Math.floor((new Date()-new Date(l.fechaInicio||l.fechaArchivo||new Date()))/86400000));
  const nota=(l.notas||l.notasArchivo||'Sin notas').split(/\r?\n/)[0];
  return `<div class="lead-card" role="button" tabindex="0" onclick="openModalLead('${l.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModalLead('${l.id}');}"><div class="lead-card-nombre" style="opacity:.78;">${l.nombre}</div><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;"><span style="font-size:10px;color:var(--text-secondary);">${l.curp||'CURP pendiente'}</span><span class="lead-card-dias lead-dias-normal" style="margin:0;">${dias}d</span></div><div class="lead-card-nota">${nota}</div><div style="font-size:10px;color:var(--text-muted);margin-top:5px;"><strong>Causa:</strong> ${l.causaArchivo||'Sin causa especificada'}</div>${temporal&&l.fechaRecontacto?`<div style="font-size:10px;color:var(--warning);margin-top:4px;">Recontacto: ${fmtDate(l.fechaRecontacto)}</div>`:''}</div>`;
}

function toggleArchivadosLeads(){ archivadosLeadsAbiertos=!archivadosLeadsAbiertos; renderPage('leads'); }

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
  renderLeadElegibilidad(l?.elegibilidad||{});
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
  const svc=getVal('lead-servicio');
  if(svc==='asesoria_pension') setVal('lead-estado','pensiones');
  else if(svc==='correccion_imss') setVal('lead-estado','correccion_imss');
  else if(['pensiones','correccion_imss'].includes(getVal('lead-estado'))) setVal('lead-estado','semanas');
  renderLeadElegibilidad();
}

function guardarLead(){
  const nombre=(getVal('lead-nombre')||'').trim();
  if(!nombre){showToast('El nombre es obligatorio','warn');return;}
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
      store.leads[idx]=actualizado;
    }
    showToast('Prospecto actualizado','success');
  } else {
    store.leads.push(lead);
    showToast('Prospecto agregado','success');
  }
  saveStore();
  closeModal('modal-lead');
  renderPage('leads');
}

function archivarLead(){
  if(!editingLeadId) return;
  leadParaArchivar=editingLeadId;
  closeModal('modal-lead');
  const lead=store.leads.find(l=>l.id===editingLeadId);
  const causaActual=causaArchivoCodigo(lead);
  const titulo=document.getElementById('modal-archivar-lead-title');
  if(titulo) titulo.textContent=lead?.estado==='archivado'?'Cambiar causa de archivo':'Archivar prospecto';
  const btnConfirmar=document.getElementById('lead-confirmar-archivo-btn');
  if(btnConfirmar) btnConfirmar.textContent=lead?.estado==='archivado'?'Guardar causa':'Archivar';
  setVal('lead-causa-archivo',causaActual);
  setVal('lead-otros-texto',causaActual==='otros'?(lead?.causaArchivo||''):'');
  setVal('lead-archivo-notas',lead?.notasArchivo||'');
  setFechaMX('lead-fecha-ultimo-retiro',lead?.fechaUltimoRetiro||'');
  toggleLeadOtros();
  document.getElementById('modal-archivar-lead').classList.add('open');
}

function causaArchivoCodigo(lead){
  if(!lead) return 'docs_incompletos';
  if(lead.causaArchivoId) return lead.causaArchivoId;
  const porTexto={
    'No envió toda la documentación':'docs_incompletos','No contesta':'no_contesta',
    'Aprobado y no contesta':'aprobado_no_contesta','No quiso continuar':'no_quiso',
    'Tiene IMSS activo':'imss_activo','Inconsistencias de CURP / NSS':'inconsistencias_curp_nss','Retiró hace menos de 5 años':'retiro_menos_5',
  };
  return porTexto[lead.causaArchivo]||'otros';
}

function eliminarLeadDefinitivo(){
  const lead=store.leads.find(l=>l.id===editingLeadId);
  if(!lead) return;
  if(!confirm(`¿Eliminar definitivamente a ${lead.nombre}? Esta acción no se puede deshacer.`)) return;
  store.leads=store.leads.filter(l=>l.id!==lead.id);
  store.agenda=(store.agenda||[]).filter(e=>e.leadId!==lead.id&&e.id!=='ev_recontacto_'+lead.id);
  saveStore();
  closeModal('modal-lead');
  editingLeadId=null;
  showToast('Prospecto eliminado definitivamente','info');
  renderPage('leads');
}

function toggleLeadOtros(){
  const v=getVal('lead-causa-archivo');
  document.getElementById('lead-otros-wrap').style.display=v==='otros'?'':'none';
  document.getElementById('lead-fecha-retiro-wrap').style.display=v==='retiro_menos_5'?'':'none';
}

function notasRecontactoLead(lead){
  return `Nombre: ${lead?.nombre||'Sin nombre'}\nCURP: ${lead?.curp||'Pendiente'}\nTeléfono: ${lead?.telefono||'Pendiente'}\nMotivo: está por cumplir 5 años desde su último retiro por desempleo.`;
}

function confirmarArchivarLead(){
  if(!leadParaArchivar) return;
  const lead=store.leads.find(l=>l.id===leadParaArchivar);
  if(!lead) return;
  const causa=getVal('lead-causa-archivo');
  const otros=getVal('lead-otros-texto');
  const causaLabel={docs_incompletos:'No envió toda la documentación',no_contesta:'No contesta',aprobado_no_contesta:'Aprobado y no contesta',no_quiso:'No quiso continuar',imss_activo:'Tiene IMSS activo',inconsistencias_curp_nss:'Inconsistencias de CURP / NSS',retiro_menos_5:'Retiró hace menos de 5 años',otros:otros||'Otros'};
  if(causa==='otros'&&!otros.trim()){ showToast('Especifica la causa de archivo','warn'); return; }
  const fechaUltimoRetiro=causa==='retiro_menos_5'?leerFechaMX('lead-fecha-ultimo-retiro',true):'';
  if(causa==='retiro_menos_5'&&fechaUltimoRetiro===null) return;
  lead.estado='archivado';
  lead.causaArchivoId=causa;
  lead.causaArchivo=causaLabel[causa]||causa;
  lead.notasArchivo=getVal('lead-archivo-notas');
  lead.fechaArchivo=new Date().toISOString();
  lead.archivoTipo=causa==='retiro_menos_5'?'temporal':'definitivo';
  if(causa!=='retiro_menos_5'){
    delete lead.fechaUltimoRetiro;
    delete lead.fechaRecontacto;
    lead.recontactar=false;
    lead.recontactoVencido=false;
    store.agenda=(store.agenda||[]).filter(e=>e.id!=='ev_recontacto_'+lead.id);
  }
  if(causa==='retiro_menos_5'){
    lead.fechaUltimoRetiro=fechaUltimoRetiro;
    const d=new Date(lead.fechaUltimoRetiro+'T10:00:00'); d.setFullYear(d.getFullYear()+4); d.setMonth(d.getMonth()+11);
    lead.fechaRecontacto=d.toISOString().split('T')[0];
    const eventoId='ev_recontacto_'+lead.id;
    if(!(store.agenda||[]).some(e=>e.id===eventoId)) store.agenda.push({id:eventoId,titulo:'Recontactar prospecto — posible nuevo retiro por desempleo',tipo:'recordatorio',fecha:lead.fechaRecontacto,hora:'10:00',notas:notasRecontactoLead(lead),leadId:lead.id,completado:false,autoGenerado:true,asesorId:lead.asesorId||null});
  }
  saveStore();
  closeModal('modal-archivar-lead');
  leadParaArchivar=null;
  showToast('Causa de archivo guardada','success');
  renderPage('leads');
}

function convertirLeadACliente(){
  if(!editingLeadId) return;
  const l=store.leads.find(x=>x.id===editingLeadId);
  if(!l) return;
  const borrador={...l,
    nombre:(getVal('lead-nombre')||l.nombre||'').trim(),
    telefono:getVal('lead-tel')||l.telefono||'',
    curp:(getVal('lead-curp')||l.curp||'').toUpperCase(),
    servicio:getVal('lead-servicio')||l.servicio||'retiro_desempleo',
    colaboradorId:getVal('lead-colaborador')||l.colaboradorId||null,
    notas:getVal('lead-notas')||l.notas||'',
  };
  // La conversión también debe conservar cambios hechos en el prospecto
  // aunque el usuario no haya pulsado Guardar antes de convertirlo.
  Object.assign(l,borrador);
  closeModal('modal-lead');
  openModalCliente(l.id);
  // Precargar datos del lead
  setTimeout(()=>{
    setVal('fc-nombre',borrador.nombre);
    setVal('fc-telefono',borrador.telefono);
    setVal('fc-curp',borrador.curp);
    setVal('fc-servicio',borrador.servicio);
    onServicioChange();
    setVal('fc-etapa',stagesFor(borrador.servicio)[0].id);
    setVal('fc-notas','Convertido desde prospecto.'+(borrador.notas?' '+borrador.notas:''));
    setVal('fc-colaborador',borrador.colaboradorId||'');
    poblarSelectColaborador();
    if(borrador.colaboradorId) setVal('fc-colaborador',borrador.colaboradorId);
  },100);
}

function renderLeadElegibilidad(existing){
  const cont=document.getElementById('lead-elegibilidad-container'); if(!cont) return;
  const svc=getVal('lead-servicio'); const e=existing||{};
  if(svc==='asesoria_pension'){
    const fechaCurp=extraerFechaCurp(getVal('lead-curp'));
    cont.innerHTML=`<div class="form-row"><div class="form-group"><label class="form-label">Fecha de nacimiento / edad mínima 58</label><input class="form-input" id="lead-el-fecha-nac" type="date" value="${e.fechaNacimiento||fechaCurp||''}"></div><div class="form-group"><label class="form-label">Semanas cotizadas (mínimo 500)</label><input class="form-input" id="lead-el-semanas" type="number" value="${e.semanas||''}"></div></div><div class="form-row"><div class="form-group"><label class="form-label">Ley</label><select class="form-select" id="lead-el-ley"><option value="">— Seleccionar —</option><option value="73" ${e.ley==='73'?'selected':''}>Ley 73</option><option value="97" ${e.ley==='97'?'selected':''}>Ley 97</option></select></div><div class="form-group"><label class="form-label">¿Semanas con validez?</label><select class="form-select" id="lead-el-semanas-validas"><option value="">— Seleccionar —</option><option value="si" ${e.semanasValidas==='si'?'selected':''}>Sí</option><option value="no" ${e.semanasValidas==='no'?'selected':''}>No</option></select></div></div>`;
  } else if(svc==='retiro_desempleo'){
    cont.innerHTML=`<div class="form-row"><div class="form-group"><label class="form-label">Semanas cotizadas (referencia mínima 105)</label><input class="form-input" id="lead-el-semanas" type="number" value="${e.semanas||''}"></div><div class="form-group"><label class="form-label">¿Semanas con validez?</label><select class="form-select" id="lead-el-semanas-validas"><option value="">— Seleccionar —</option><option value="si" ${e.semanasValidas==='si'?'selected':''}>Sí</option><option value="no" ${e.semanasValidas==='no'?'selected':''}>No</option></select></div></div><div class="form-row"><div class="form-group"><label class="form-label">¿Retiró en los últimos 5 años?</label><select class="form-select" id="lead-el-retiro"><option value="">— Seleccionar —</option><option value="si" ${e.retiro5==='si'?'selected':''}>Sí</option><option value="no" ${e.retiro5==='no'?'selected':''}>No</option></select></div><div class="form-group"><label class="form-label">Fecha del último retiro</label><input class="form-input input-fecha-mx" id="lead-el-fecha-retiro" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" autocomplete="off" value="${fechaISOaMX(e.fechaRetiro||'')}" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)"><div class="form-helper">Formato: dd/mm/aaaa</div></div></div>`;
  } else {
    cont.innerHTML=`<div class="form-group"><label class="form-label">Resultado / observaciones de elegibilidad</label><textarea class="form-textarea" id="lead-el-notas" placeholder="Información opcional...">${e.notas||''}</textarea></div>`;
  }
}

function recogerElegibilidadLead(){
  return {semanas:getVal('lead-el-semanas'),semanasValidas:getVal('lead-el-semanas-validas'),fechaNacimiento:getVal('lead-el-fecha-nac'),ley:getVal('lead-el-ley'),retiro5:getVal('lead-el-retiro'),fechaRetiro:fechaMXaISO(getVal('lead-el-fecha-retiro')),notas:getVal('lead-el-notas')};
}

function procesarRecontactosLeads(){
  const hoy=new Date().toISOString().split('T')[0]; let cambio=false;
  (store.leads||[]).forEach(l=>{ if(l.estado==='archivado'&&l.archivoTipo==='temporal'&&l.fechaRecontacto&&l.fechaRecontacto<=hoy){ l.estado='semanas'; l.archivoTipo='reactivado'; l.recontactar=true; l.recontactoVencido=l.fechaRecontacto<hoy; l.fechaInicio=new Date().toISOString(); const nota='RECONTACTAR: está por cumplir 5 años desde su último retiro por desempleo.'; if(!(l.notas||'').includes(nota)) l.notas=((l.notas||'')+'\n'+nota).trim(); cambio=true; } });
  if(cambio) saveStore();
}

function extraerFechaCurp(curp){
  if(!curp||curp.length<17||!/^\d{6}$/.test(curp.slice(4,10))) return '';
  const yy=Number(curp.slice(4,6)),mm=curp.slice(6,8),dd=curp.slice(8,10); const siglo=/\d/.test(curp[16])?1900:2000; return String(siglo+yy)+'-'+mm+'-'+dd;
}

function normalizarNombreCurp(v){ return (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-ZÑ ]/g,' ').split(/\s+/).filter(Boolean).filter(x=>!['DE','DEL','LA','LAS','LOS','Y','MC','MAC','VAN','VON'].includes(x)); }
function vocalInterna(v){ const m=(v||'').slice(1).match(/[AEIOU]/); return m?m[0]:'X'; }
function inicialNombre(v){ const a=v||[]; const filtrada=a.length>1&&['JOSE','J','J.','MARIA','MA','MA.'].includes(a[0])?a.slice(1):a; return (filtrada[0]||'X')[0]; }
function clavesNombrePosibles(nombre){ const t=normalizarNombreCurp(nombre); if(t.length<3) return []; const a=t.slice(0,-2),ap=t[t.length-2],am=t[t.length-1]; const b=t.slice(2),bp=t[0],bm=t[1]; return [ap[0]+vocalInterna(ap)+(am?.[0]||'X')+inicialNombre(a),bp[0]+vocalInterna(bp)+(bm?.[0]||'X')+inicialNombre(b)]; }
function validarCurpEstructura(curp,nombre){
  const errores=[]; if(!curp) return {ok:true,errores:[]};
  if(curp.length!==18) errores.push('longitud (debe contener 18 caracteres)');
  if(!/^[A-ZÑ0-9]+$/.test(curp)) errores.push('caracteres permitidos');
  if(curp.length===18){
    if(!/^[A-Z][AEIOUX][A-Z]{2}/.test(curp.slice(0,4))) errores.push('letras del nombre');
    const fecha=extraerFechaCurp(curp); const d=fecha?new Date(fecha+'T12:00:00'):null; if(!d||isNaN(d)||d.toISOString().slice(0,10)!==fecha) errores.push('fecha de nacimiento');
    if(!/^[HM]$/.test(curp[10])) errores.push('sexo');
    const entidades=['AS','BC','BS','CC','CL','CM','CS','CH','DF','DG','GT','GR','HG','JC','MC','MN','MS','NT','NL','OC','PL','QT','QR','SP','SL','SR','TC','TS','TL','VZ','YN','ZS','NE']; if(!entidades.includes(curp.slice(11,13))) errores.push('entidad federativa');
    if(!/^[B-DF-HJ-NP-TV-Z]{3}$/.test(curp.slice(13,16))) errores.push('consonantes internas');
    if(!/^[A-Z0-9]$/.test(curp[16])) errores.push('diferenciador de homonimia');
    const dic='0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'; let suma=0; for(let i=0;i<17;i++){ const val=dic.indexOf(curp[i]); if(val<0){suma=NaN;break;} suma+=val*(18-i); } const dv=Number.isFinite(suma)?String((10-(suma%10))%10):''; if(dv!==curp[17]) errores.push('dígito verificador');
    const posibles=clavesNombrePosibles(nombre); if(posibles.length&&!posibles.includes(curp.slice(0,4))) errores.push('letras del nombre');
  }
  return {ok:errores.length===0,errores:[...new Set(errores)]};
}
function validarCurpLead(){
  const box=document.getElementById('lead-curp-warning'); if(!box) return; const curp=getVal('lead-curp'); const r=validarCurpEstructura(curp,getVal('lead-nombre'));
  if(!curp||r.ok){ box.classList.remove('show'); box.textContent=''; return; }
  box.textContent='⚠ Solicitar al cliente verificación de CURP. Formato incorrecto en: '+r.errores.join(', ')+'. El prospecto se puede guardar.'; box.classList.add('show');
}
