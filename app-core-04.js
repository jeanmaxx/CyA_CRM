// ==================== CONTRATOS ====================
let contratoGeneradoHtml = '';
let contratoGuardado = false;

function renderContratos(){
  const svcs=store.servicios.filter(s=>s.activo!==false);
  const hoy=new Date().toISOString().split('T')[0];
  return `
  <div class="section-title">Contratos</div>
  <div class="section-sub">Genera contratos y pagarés con los datos del cliente</div>
  <div style="display:grid;grid-template-columns:340px 1fr;gap:16px;">
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Datos del documento</div></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Tipo de servicio</label>
            <select class="form-select" id="ct-servicio" onchange="onContratoServicioChange()" style="font-size:13px;">
              <option value="">— Seleccionar —</option>
              ${svcs.map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Buscar cliente</label>
            <div class="autocomplete-wrap">
              <input class="form-input" id="ct-cliente-input" placeholder="Escribe el nombre del cliente..."
                oninput="filtrarClientesAuto(this.value)" autocomplete="off" style="font-size:13px;">
              <div class="autocomplete-list" id="ct-cliente-list"></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha del contrato</label>
            <input class="form-input" id="ct-fecha" type="date" value="${hoy}" style="font-size:13px;" onchange="actualizarFechaPagare()">
          </div>
          <div class="form-group">
            <label class="form-label">Monto de retiro</label>
            <input class="form-input" id="ct-monto" type="number" placeholder="$35,000.00" style="font-size:13px;">
          </div>
          <div class="form-group">
            <label class="form-label">Honorarios</label>
            <input class="form-input" id="ct-honorarios" type="number" placeholder="$8,000.00" style="font-size:13px;">
          </div>
          <hr class="divider">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Pagaré</div>
          <div class="form-group">
            <label class="form-label">Vencimiento del pagaré <span style="color:var(--text-muted);font-weight:400">(50 días desde firma)</span></label>
            <input class="form-input" id="ct-pagare-fecha" type="date" style="font-size:13px;">
          </div>
          <div class="form-group">
            <label class="form-label">Monto del pagaré <span style="color:var(--text-muted);font-weight:400">(honorarios + $5,000)</span></label>
            <input class="form-input" id="ct-pagare-monto" type="number" placeholder="$13,000.00" style="font-size:13px;">
            <div class="form-helper">Incluye $5,000 por cobranza externa en caso de requerirse</div>
          </div>
          <hr class="divider">
          <button class="btn btn-primary" style="width:100%;font-size:14px;" onclick="generarContrato()">👁 Vista previa</button>
        </div>
      </div>
      <div class="card" id="ct-datos-preview" style="display:none;">
        <div class="card-header"><div class="card-title">Datos del cliente</div></div>
        <div class="card-body" id="ct-preview-body" style="font-size:12px;"></div>
      </div>
    </div>
    <div class="card" style="min-height:500px;">
      <div class="card-header">
        <div class="card-title" id="ct-visor-title">Vista previa</div>
        <div style="display:flex;gap:8px;align-items:center;" id="ct-acciones-bar" style="display:none;">
          <span id="ct-guardado-badge" style="font-size:11px;color:var(--text-muted);display:none;">✓ Guardado en historial</span>
          <button class="btn" onclick="imprimirContrato()" id="btn-imprimir" style="display:none;font-size:12px;">🖨 Imprimir / PDF</button>
          <button class="btn btn-primary" onclick="guardarContratoHistorial()" id="btn-guardar-historial" style="display:none;font-size:12px;">💾 Guardar en historial</button>
        </div>
      </div>
      <div id="ct-visor" style="padding:20px;overflow-y:auto;max-height:calc(100vh - 200px);">
        <div class="empty-state">
          <div class="empty-icon">▤</div>
          <div class="empty-title">Selecciona servicio y cliente</div>
          <div class="empty-sub">Completa los datos y presiona "Vista previa" para generar el contrato con pagaré</div>
        </div>
      </div>
    </div>
  </div>`;
}

function actualizarFechaPagare(){
  const fechaContrato=document.getElementById('ct-fecha')?.value;
  if(!fechaContrato) return;
  const d=new Date(fechaContrato+'T12:00:00');
  d.setDate(d.getDate()+50);
  const el=document.getElementById('ct-pagare-fecha');
  if(el) el.value=d.toISOString().split('T')[0];
}

function guardarContratoHistorial(){
  if(!contratoGeneradoHtml||!selectedClienteId) return;
  const c=store.clientes.find(x=>x.id===selectedClienteId);
  const svcId=document.getElementById('ct-servicio')?.value;
  const s=store.servicios.find(x=>x.id===svcId);
  if(c&&s){
    guardarVersionContrato(c.id, s.nombre, contratoGeneradoHtml);
    contratoGuardado=true;
    const badge=document.getElementById('ct-guardado-badge');
    const btnGuardar=document.getElementById('btn-guardar-historial');
    if(badge){ badge.style.display=''; badge.textContent='✓ Guardado en historial'; }
    if(btnGuardar) btnGuardar.style.display='none';
    showToast('Contrato guardado en historial del cliente','success');
  }
}

function filtrarClientesAuto(q){
  const list=document.getElementById('ct-cliente-list');
  if(!list) return;
  if(!q||q.length<2){ list.classList.remove('open'); selectedClienteId=null; return; }
  const filtrados=store.clientes.filter(c=>c.nombre.toUpperCase().includes(q.toUpperCase()));
  if(!filtrados.length){ list.classList.remove('open'); return; }
  list.innerHTML=filtrados.slice(0,8).map(c=>{
    const nombre=c.nombre.replace(/'/g,"&apos;");
    return '<div class="autocomplete-item" onclick="seleccionarClienteAuto(\'' +c.id+ '\',\''+nombre+'\')"><div>'+c.nombre+'</div><div class="autocomplete-item-sub">'+getSvcLabel(c.servicio)+'&nbsp;&middot;&nbsp;'+(c.ciudad||'—')+'</div></div>';
  }).join('');
  list.classList.add('open');
}

function seleccionarClienteAuto(id, nombre){
  selectedClienteId=id;
  const input=document.getElementById('ct-cliente-input');
  if(input) input.value=nombre;
  const list=document.getElementById('ct-cliente-list');
  if(list) list.classList.remove('open');
  onContratoClienteChange();
}
function preseleccionarServicio(servicioId){
  const el=document.getElementById('ct-servicio');
  if(el){ el.value=servicioId; onContratoServicioChange(); }
}

function onContratoServicioChange(){
  const svcId=document.getElementById('ct-servicio')?.value;
  const s=store.servicios.find(x=>x.id===svcId);
  if(!s) return;
  // Pre-fill honorarios
  if(s.esquema==='mixto'){
    setVal('ct-honorarios',s.honorariosFijo||'');
  }
  // Filtrar clientes de ese servicio
  const clienteSelect=document.getElementById('ct-cliente');
  if(clienteSelect){
    const todos=store.clientes;
    const del_servicio=todos.filter(c=>c.servicio===svcId);
    const otros=todos.filter(c=>c.servicio!==svcId);
    clienteSelect.innerHTML='<option value="">— Seleccionar —</option>'
      +(del_servicio.length?'<optgroup label="De este servicio">'+del_servicio.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')+'</optgroup>':'')
      +(otros.length?'<optgroup label="Otros clientes">'+otros.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')+'</optgroup>':'');
  }
}

function onContratoClienteChange(){
  const cId=selectedClienteId;
  const c=store.clientes.find(x=>x.id===cId);
  const preview=document.getElementById('ct-datos-preview');
  const body=document.getElementById('ct-preview-body');
  if(!c||!preview||!body){ if(preview) preview.style.display='none'; return; }
  preview.style.display='block';
  const campos=[
    ['Nombre',(c.nombre||'').toUpperCase()],
    ['NSS',c.nss||'—'],['CURP',(c.curp||'').toUpperCase()],
    ['RFC',(c.rfc||'').toUpperCase()],
    ['Domicilio',(c.domicilio||'').toUpperCase()],
    ['Ciudad',(c.ciudad||'').toUpperCase()],
  ];
  body.innerHTML=campos.map(([l,v])=>`<div class="info-row" style="padding:6px 0;"><span class="ir-label">${l}</span><span class="ir-value" style="font-size:12px;">${v}</span></div>`).join('');

  // Precargar servicio si el cliente tiene uno asignado
  const svcSelect=document.getElementById('ct-servicio');
  if(svcSelect&&c.servicio&&!svcSelect.value){
    svcSelect.value=c.servicio;
    onContratoServicioChange();
  }

  // Precargar monto AFORE
  if(c.montoAfore) setVal('ct-monto',c.montoAfore);

  // Precargar honorarios calculados
  const svcId=svcSelect?.value||c.servicio;
  const s=store.servicios.find(x=>x.id===svcId);
  let honCalculado=0;
  if(s&&s.esquema==='mixto'&&c.montoAfore){
    const calc=calcComision(Number(c.montoAfore),svcId,c.asesorId);
    honCalculado=calc.honorarios;
    setVal('ct-honorarios',calc.honorarios);
  } else if(c.honorarios){
    honCalculado=Number(c.honorarios);
    setVal('ct-honorarios',c.honorarios);
  }

  // Precargar monto pagaré (honorarios + 5000)
  if(honCalculado>0) setVal('ct-pagare-monto', honCalculado+5000);

  // Precargar fecha pagaré (50 días desde fecha contrato)
  actualizarFechaPagare();

  // Reset estado guardado
  contratoGuardado=false;
  contratoGeneradoHtml='';
}

function generarContrato(){
  const svcId=document.getElementById('ct-servicio')?.value;
  const cId=selectedClienteId;
  if(!svcId){showToast('Selecciona un servicio','warn');return;}
  const s=store.servicios.find(x=>x.id===svcId);
  if(!s){showToast('Servicio no encontrado','warn');return;}
  const cfg=store.configuracion;
  const c=cId?store.clientes.find(x=>x.id===cId):null;
  const fecha=document.getElementById('ct-fecha')?.value||new Date().toISOString().split('T')[0];
  const monto=document.getElementById('ct-monto')?.value||(c&&c.montoAfore)||'35000';
  const honorarios=document.getElementById('ct-honorarios')?.value||s.honorariosFijo||'8000';
  const pagareFecha=document.getElementById('ct-pagare-fecha')?.value||'';
  const pagareMonto=document.getElementById('ct-pagare-monto')?.value||(Number(honorarios)+5000)||'13000';
  const fechaFormateada=fmtDate(fecha);
  const pagareFechaFmt=pagareFecha?fmtDate(pagareFecha):'__________';

  const vars={
    '{{EMPRESA_NOMBRE}}':cfg.empresa_nombre||'Casillas & Asociados',
    '{{EMPRESA_DOMICILIO}}':cfg.empresa_domicilio||'—',
    '{{EMPRESA_REPRESENTANTE}}':(cfg.empresa_representante||'').toUpperCase(),
    '{{CIUDAD_CONTRATO}}':cfg.ciudad_contrato||'Querétaro',
    '{{FECHA_CONTRATO}}':fechaFormateada,
    '{{CLIENTE_NOMBRE}}':c?(c.nombre||'').toUpperCase():'[NOMBRE DEL CLIENTE]',
    '{{CLIENTE_DOMICILIO}}':c?(c.domicilio||'').toUpperCase():'[DOMICILIO]',
    '{{CLIENTE_NSS}}':c?c.nss||'[NSS]':'[NSS]',
    '{{CLIENTE_CURP}}':c?(c.curp||'').toUpperCase():'[CURP]',
    '{{CLIENTE_RFC}}':c?(c.rfc||'').toUpperCase():'[RFC]',
    '{{MONTO_RETIRO}}':'$'+Number(monto).toLocaleString('es-MX'),
    '{{HONORARIOS}}':'$'+Number(honorarios).toLocaleString('es-MX'),
  };

  let texto=s.plantilla||'Sin plantilla definida';
  Object.entries(vars).forEach(([k,v])=>{ texto=texto.split(k).join(v); });
  const htmlContrato=renderMarcadores(texto,false);

  // Construir pagaré integrado
  const montoHon=Number(honorarios)||0;
  const montoPagare=Number(pagareMonto)||(montoHon+5000);
  const montoPagareStr='$'+montoPagare.toLocaleString('es-MX');
  const montoHonStr='$'+montoHon.toLocaleString('es-MX');
  const montoSubStr='$5,000.00';
  const clienteNombre=c?(c.nombre||'').toUpperCase():'[NOMBRE DEL CLIENTE]';
  const clienteDom=c?(c.domicilio||'').toUpperCase():'[DOMICILIO]';

  const htmlPagare=`
    <div style="page-break-before:always;margin-top:48px;border-top:3px double #888;padding-top:32px;">
      <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:24px;letter-spacing:2px;">P A G A R É</div>
      <div style="margin-bottom:16px;">
        <span style="font-weight:700;">BUENO POR: ${montoPagareStr}</span>
      </div>
      <div style="margin-bottom:16px;">
        <span style="font-weight:700;">FECHA DE VENCIMIENTO: ${pagareFechaFmt.toUpperCase()}</span>
      </div>
      <div style="margin-bottom:20px;line-height:1.8;text-align:justify;">
        Por medio del presente <strong>PAGARÉ</strong> reconozco (emos) deber y prometo (emos) pagar de forma solidaria e incondicionalmente por este <strong>PAGARÉ</strong> en el domicilio ubicado en ${(cfg.empresa_domicilio||'').toUpperCase()}, o en cualquier otro lugar donde se me (nos) requiera pago a la orden y en favor de <strong>${(cfg.empresa_representante||'JORGE CASILLAS AVILA').toUpperCase()}</strong>.
      </div>
      <div style="margin-bottom:20px;line-height:1.8;text-align:justify;">
        El día <strong>${pagareFechaFmt.toUpperCase()}</strong> la cantidad de: <strong>${montoPagareStr}</strong> en donde se contemplan <strong>${montoHonStr} como honorarios del servicio otorgado</strong> y <strong>${montoSubStr} como subsidio en caso de requerirse intervención externa para la gestión del pago que debe de realizar el deudor/obligado</strong>, valor recibido a mi (nuestra) entera satisfacción, acordando que a la <strong>falta de pago en la fecha de vencimiento</strong>, causará un interés moratorio a partir del incumplimiento al contrato firmado de prestación de servicios y hasta su total liquidación del <strong>8% (ocho por ciento) mensual</strong>, pagadero en esta ciudad conjuntamente con el principal, renunciando el (los) obligados expresamente desde este momento al beneficio del plazo a su favor.
      </div>
      <div style="margin-bottom:20px;"><strong>LUGAR Y FECHA DE SUSCRIPCIÓN:</strong></div>
      <div style="margin-bottom:32px;">${cfg.ciudad_contrato||'Tequisquiapan, Querétaro'}. A ${fechaFormateada}</div>
      <div style="border:2px solid #000;padding:20px;border-radius:4px;">
        <div style="font-weight:700;margin-bottom:12px;text-align:center;">OBLIGADO Y/O DEUDOR PRINCIPAL</div>
        <div style="margin-bottom:8px;"><strong>NOMBRE:</strong> ${clienteNombre}</div>
        <div style="margin-bottom:8px;"><strong>DOMICILIO:</strong> ${clienteDom}</div>
        ${c&&c.nss?`<div style="margin-bottom:16px;"><strong>NSS:</strong> ${c.nss}</div>`:'<div style="margin-bottom:16px;"><strong>NSS:</strong> ___________________</div>'}
        <div style="margin-top:32px;border-top:1px solid #000;padding-top:8px;text-align:center;">
          <div style="font-size:11px;font-weight:600;">FIRMA ACEPTACIÓN DE LA OBLIGACIÓN</div>
        </div>
      </div>
    </div>`;

  const htmlCompleto=htmlContrato+htmlPagare;
  contratoGeneradoHtml=htmlCompleto;
  contratoGuardado=false;

  const visor=document.getElementById('ct-visor');
  visor.innerHTML='<div id="contrato-imprimible" style="background:#fff;color:#000;border:1px solid #ccc;border-radius:8px;padding:40px 48px;max-width:740px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;line-height:1.8;">'+htmlCompleto+'</div>';

  // Mostrar botones de acción
  document.getElementById('btn-imprimir').style.display='';
  document.getElementById('btn-guardar-historial').style.display='';
  document.getElementById('ct-guardado-badge').style.display='none';

  showToast('Vista previa generada','success');
}

// ==================== EDITOR FORMATO PLANTILLA ====================
function insertarFormato(inicio, fin){
  const ta=document.getElementById('sv-plantilla');
  if(!ta) return;
  const start=ta.selectionStart, end=ta.selectionEnd;
  const sel=ta.value.substring(start,end);
  const antes=ta.value.substring(0,start);
  const despues=ta.value.substring(end);
  if(fin){
    ta.value=antes+inicio+sel+fin+despues;
    ta.selectionStart=start+inicio.length;
    ta.selectionEnd=start+inicio.length+sel.length;
  } else {
    // Sin cierre (ej SEPARADOR) — insertar en línea nueva
    const nl=antes.endsWith('\n')?'':'\n';
    ta.value=antes+nl+inicio+'\n'+despues;
    ta.selectionStart=ta.selectionEnd=start+nl.length+inicio.length+1;
  }
  ta.focus();
}

function insertarFirma(){
  const ta=document.getElementById('sv-plantilla');
  if(!ta) return;
  const firma='\n[FIRMA]LA EMPRESA - {{EMPRESA_REPRESENTANTE}} | EL CONTRATANTE DEL SERVICIO - {{CLIENTE_NOMBRE}}[/FIRMA]\n';
  const pos=ta.selectionStart;
  ta.value=ta.value.substring(0,pos)+firma+ta.value.substring(pos);
  ta.selectionStart=ta.selectionEnd=pos+firma.length;
  ta.focus();
}

function previewPlantillaEditor(){
  const texto=document.getElementById('sv-plantilla')?.value||'';
  if(!texto){ showToast('La plantilla está vacía','warn'); return; }
  const htmlRendered=renderMarcadores(texto,true);
  document.getElementById('visor-contrato-titulo').textContent='Vista previa de plantilla';
  document.getElementById('visor-contrato-body').innerHTML=
    '<div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.8;color:var(--text-secondary);padding:8px 0;">'+htmlRendered+'</div>';
  document.getElementById('modal-visor').classList.add('open');
}

function imprimirContrato(){
  const contenido=document.getElementById('contrato-imprimible');
  if(!contenido) return;
  // Construir CSS de impresión con centrado explícito
  const css=`
    body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.8;color:#000;margin:40px;padding:0;}
    div{margin-bottom:2px;}
    .ct-center, [style*="text-align:center"]{text-align:center !important;display:block;}
    .ct-bold, [style*="font-weight:700"]{font-weight:bold;}
    hr{border:none;border-top:1px solid #888;margin:12px 0;}
    .firma-cols,[style*="display:flex"]{display:flex !important;gap:40px;margin-top:20px;}
    .firma-col,[style*="text-align:center;flex:1"]{flex:1;text-align:center;}
    @page{margin:2cm;}
  `;
  // Extraer el innerHTML del contrato y limpiar estilos de tema oscuro
  let html=contenido.innerHTML;
  // Forzar texto negro y fondo blanco
  html=html.replace(/color:var\([^)]+\)/g,'color:#000')
           .replace(/background:[^;]+;/g,'');
  const ventana=window.open('','_blank','width=800,height=900');
  ventana.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrato</title><style>'+css+'</style></head><body>'+html+'</body></html>');
  ventana.document.close();
  ventana.focus();
  setTimeout(()=>{ ventana.print(); },300);
}

// ==================== VISOR PLANTILLA MODAL ====================
function openVisorModal(){} // placeholder, se usa openVisorPlantilla

// ==================== AGENDA ====================
let agendaFechaSeleccionada = fechaISOLocal(new Date());
let agendaVistaActual = 'lista'; // 'semana' | 'lista'
let agendaSemanaOffset = 0;
let agendaFuturosAbiertos = false;
let editingEventoId = null;
let agEventoClienteId = null;

const TIPO_LABELS = {llamada:'📞 Llamada',whatsapp:'💬 WhatsApp',meet:'🎥 Meet',cita:'📅 Cita',recordatorio:'🔔 Recordatorio',vencimiento:'⏰ Vencimiento',otro:'📌 Otro'};
const TIPO_COLORS = {llamada:'#3b82f6',whatsapp:'#25d366',meet:'#8b5cf6',cita:'#0ea5e9',recordatorio:'#10b981',vencimiento:'#ef4444',otro:'#64748b'};

function fechaISOLocal(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getVentanaAgenda(){
  const hoy=new Date();
  const inicio=new Date(hoy.getFullYear(),hoy.getMonth(),1);
  const limite=new Date(hoy.getFullYear(),hoy.getMonth()+2,1);
  return {inicio:fechaISOLocal(inicio),limite:fechaISOLocal(limite)};
}

function getInicioSemana(offset){
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=dom
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (dia===0?6:dia-1) + offset*7);
  lunes.setHours(0,0,0,0);
  return lunes;
}

function renderAgenda(){
  const hoy = new Date();
  const hoyStr = fechaISOLocal(hoy);
  const eventos = eventosVistaActual();
  const ventana=getVentanaAgenda();
  const vencidos = eventos.filter(e=>e.fecha>=ventana.inicio&&e.fecha<hoyStr&&!e.completado);

  return `
  <div class="module-toolbar agenda-toolbar">
    <div><div class="section-title">Agenda</div><div class="section-sub">Citas, seguimientos y recordatorios</div></div>
    <div class="agenda-toolbar-actions">
      <div class="module-view-selector agenda-view-selector">${getSelectorVistaHTML(true)}</div>
      <div class="agenda-view-toggle">
        <button class="btn" onclick="agendaSetVista('semana')" id="btn-vista-semana"
          style="border:none;border-radius:0;${agendaVistaActual==='semana'?'background:var(--accent-blue);color:#fff;':''}">Semana</button>
        <button class="btn" onclick="agendaSetVista('lista')" id="btn-vista-lista"
          style="border:none;border-radius:0;${agendaVistaActual==='lista'?'background:var(--accent-blue);color:#fff;':''}">Lista</button>
      </div>
      <button class="btn btn-primary" onclick="openModalAgenda()">+ Nuevo evento</button>
    </div>
  </div>

  ${vencidos.length>0?`<div class="alerta-firma alerta-roja" style="margin-bottom:16px;">🔴 ${vencidos.length} evento${vencidos.length!==1?'s':''} vencido${vencidos.length!==1?'s':''} sin completar — <span style="cursor:pointer;text-decoration:underline;" onclick="agendaSetVista('lista')">ver lista</span></div>`:''}

  <div id="agenda-content">
    ${agendaVistaActual==='semana'?renderAgendaSemana():renderAgendaLista()}
  </div>
  ${renderEventosFuturos()}`;
}

function toggleEventosFuturos(){ agendaFuturosAbiertos=!agendaFuturosAbiertos; renderPage('agenda'); }

function renderEventosFuturos(){
  const {limite}=getVentanaAgenda();
  const futuros=eventosVistaActual().filter(e=>e.fecha>=limite).sort((a,b)=>a.fecha===b.fecha?(a.hora||'').localeCompare(b.hora||''):a.fecha.localeCompare(b.fecha));
  const porFecha={}; futuros.forEach(e=>{ if(!porFecha[e.fecha]) porFecha[e.fecha]=[]; porFecha[e.fecha].push(e); });
  return `<div class="archivados-section" style="margin-top:16px;">
    <div class="archivados-header" onclick="toggleEventosFuturos()"><span>${agendaFuturosAbiertos?'▾':'▸'} EVENTOS FUTUROS</span><span style="font-size:10px;color:var(--text-muted);">${futuros.length} evento${futuros.length!==1?'s':''} después del próximo mes</span></div>
    <div style="padding:12px;${agendaFuturosAbiertos?'':'display:none;'}">
      ${futuros.length?Object.keys(porFecha).sort().map(fecha=>`<div class="agenda-day-header">${fmtDate(fecha)}</div>${porFecha[fecha].map(e=>renderEventoItem(e,false)).join('')}`).join(''):'<div style="font-size:12px;color:var(--text-muted);padding:8px;">Sin eventos futuros</div>'}
    </div>
  </div>`;
}

// ---- VISTA SEMANAL ----
function renderAgendaSemana(){
  const inicio = getInicioSemana(agendaSemanaOffset);
  const dias = [];
  for(let i=0;i<7;i++){
    const d = new Date(inicio);
    d.setDate(inicio.getDate()+i);
    dias.push(d);
  }
  const hoyStr = fechaISOLocal(new Date());
  const horas = [];
  for(let h=8;h<=18;h++) horas.push(h);
  const SLOT_H = 52; // px por hora
  const ventana=getVentanaAgenda();
  const eventos = eventosVistaActual().filter(e=>e.fecha>=ventana.inicio&&e.fecha<ventana.limite);
  const inicioLabel = fmtDate(fechaISOLocal(inicio));
  const fin = dias[6];
  const finLabel = fmtDate(fechaISOLocal(fin));

  // Construir mapa fecha -> eventos del día
  const eventosPorDia = {};
  dias.forEach(d=>{
    const ds = fechaISOLocal(d);
    eventosPorDia[ds] = eventos.filter(e=>e.fecha===ds);
  });

  const diasNombres = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  return `
  <div class="card" style="overflow:hidden;">
    <!-- NAV SEMANA -->
    <div class="agenda-week-nav">
      <button class="btn btn-icon" onclick="agendaSemana(-1)">‹</button>
      <div class="agenda-week-label">${inicioLabel} — ${finLabel}</div>
      <div class="agenda-week-actions">
        <button class="btn" onclick="agendaSemana(0,true)" style="font-size:12px;">Hoy</button>
        <button class="btn btn-icon" onclick="agendaSemana(1)">›</button>
      </div>
    </div>
    <!-- GRID SEMANAL -->
    <div class="mobile-scroll-hint agenda-scroll-hint" aria-hidden="true">Desliza para recorrer la semana →</div>
    <div class="agenda-week-scroll" tabindex="0" aria-label="Calendario semanal. Desliza horizontalmente para recorrer los días.">
      <div style="display:grid;grid-template-columns:48px repeat(7,1fr);min-width:700px;">
        <!-- HEADER DÍAS -->
        <div style="border-bottom:1px solid var(--border);"></div>
        ${dias.map((d,i)=>{
          const ds=fechaISOLocal(d);
          const esHoy=ds===hoyStr;
          return `<div style="text-align:center;padding:10px 4px;border-bottom:1px solid var(--border);border-left:1px solid var(--border);${esHoy?'background:rgba(59,130,246,.08);':''}">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">${diasNombres[i]}</div>
            <div style="font-family:var(--font-display);font-size:20px;font-weight:700;${esHoy?'color:var(--accent-blue);':''}">${d.getDate()}</div>
            ${eventosPorDia[ds].length>0?`<div style="font-size:10px;color:var(--accent-blue);">${eventosPorDia[ds].length} evento${eventosPorDia[ds].length!==1?'s':''}</div>`:''}
          </div>`;
        }).join('')}
        <!-- FILAS HORARIAS -->
        ${horas.map(h=>{
          const label = h===12?'12pm':h<12?h+'am':(h-12)+'pm';
          return `
          <div style="height:${SLOT_H}px;border-bottom:1px solid var(--border);padding:4px 6px 0;text-align:right;font-size:10px;color:var(--text-muted);vertical-align:top;">${label}</div>
          ${dias.map(d=>{
            const ds=fechaISOLocal(d);
            const esHoy=ds===hoyStr;
            const eventosHora=eventosPorDia[ds].filter(e=>{
              if(!e.hora) return false;
              const eh=parseInt(e.hora.split(':')[0]);
              return eh===h;
            });
            return `<div style="height:${SLOT_H}px;border-bottom:1px solid var(--border);border-left:1px solid var(--border);position:relative;padding:2px;${esHoy?'background:rgba(59,130,246,.03);':''}"
              onclick="openModalAgenda(null,'${ds}','${String(h).padStart(2,'0')}:00')">
              ${eventosHora.map(ev=>`
                <div onclick="event.stopPropagation();openModalAgenda('${ev.id}')"
                  style="background:${TIPO_COLORS[ev.tipo]||'#64748b'};color:#fff;border-radius:3px;padding:2px 5px;font-size:10px;font-weight:500;cursor:pointer;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${ev.completado?'opacity:.5;text-decoration:line-through;':''}"
                  title="${ev.titulo}">
                  ${TIPO_LABELS[ev.tipo]||ev.tipo} ${ev.titulo}
                </div>`).join('')}
              ${eventosHora.length===0&&h===8?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:.15s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><span style="font-size:10px;color:var(--text-muted);">+ Agregar</span></div>`:''}
            </div>`;
          }).join('')}`;
        }).join('')}
        <!-- EVENTOS SIN HORA -->
        <div style="padding:8px 6px;font-size:10px;color:var(--text-muted);">Sin hora</div>
        ${dias.map(d=>{
          const ds=fechaISOLocal(d);
          const sinHora=eventosPorDia[ds].filter(e=>!e.hora);
          return `<div style="border-left:1px solid var(--border);padding:4px;">
            ${sinHora.map(ev=>`<div onclick="openModalAgenda('${ev.id}')"
              style="background:${TIPO_COLORS[ev.tipo]||'#64748b'};color:#fff;border-radius:3px;padding:2px 5px;font-size:10px;cursor:pointer;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${ev.titulo}</div>`).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// ---- VISTA LISTA ----
function renderAgendaLista(){
  const hoyStr=fechaISOLocal(new Date());
  const ventana=getVentanaAgenda();
  const eventos=eventosVistaActual().filter(e=>e.fecha>=ventana.inicio&&e.fecha<ventana.limite);
  const dias={};
  eventos.forEach(e=>{ if(!dias[e.fecha]) dias[e.fecha]=[]; dias[e.fecha].push(e); });
  const fechasVisibles=Object.keys(dias).sort();

  if(!fechasVisibles.length){
    return '<div class="empty-state"><div class="empty-icon">◷</div>'
      +'<div class="empty-title">Sin eventos este mes ni el siguiente</div>'
      +'<div class="empty-sub">Los eventos posteriores aparecen en Eventos futuros</div>'
      +'<button class="btn btn-primary" onclick="openModalAgenda()">+ Nuevo evento</button></div>';
  }

  const resumen=[['Mes actual y siguiente',eventos.length],['Pendientes',eventos.filter(e=>!e.completado&&e.fecha>=hoyStr).length],['Vencidos del mes',eventos.filter(e=>e.fecha<hoyStr&&!e.completado).length],['Completados',eventos.filter(e=>e.completado).length]];
  let resumenHTML=resumen.map(function(r){ return '<div class="info-row"><span class="ir-label">'+r[0]+'</span><span class="ir-value">'+r[1]+'</span></div>'; }).join('');

  let proximasHTML='';
  fechasVisibles.forEach(function(fecha){
    const esHoy=fecha===hoyStr;
    const label=fmtFechaAgenda(fecha);
    const hoyBadge=esHoy?'<span class="agenda-hoy">HOY</span>':'';
    proximasHTML+='<div class="agenda-day-header">'+label+hoyBadge+'</div>';
    const sorted=dias[fecha].slice().sort(function(a,b){ return a.hora>b.hora?1:-1; });
    sorted.forEach(function(e){ proximasHTML+=renderEventoItem(e,false); });
  });

  return '<div class="agenda-list-layout">'
    +'<div class="agenda-list-sidebar">'
    +'<div class="card" style="margin-bottom:12px;">'
    +'<div class="card-header" style="justify-content:space-between;">'
    +'<button class="btn btn-icon" onclick="agendaMes(-1)" style="font-size:12px;">&#8249;</button>'
    +'<div class="card-title" id="ag-mes-label" style="font-size:13px;"></div>'
    +'<button class="btn btn-icon" onclick="agendaMes(1)" style="font-size:12px;">&#8250;</button>'
    +'</div><div class="card-body" style="padding:10px;"><div class="cal-mini" id="cal-mini-grid"></div></div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">Resumen</div></div>'
    +'<div class="card-body">'+resumenHTML+'</div></div></div>'
    +'<div class="agenda-list-events">'+proximasHTML+'</div>'
    +'</div>';
}

function renderEventoItem(e, pasado){
  const cliente=e.clienteId?store.clientes.find(c=>c.id===e.clienteId):null;
  return `<div class="agenda-event ${e.completado?'':''}${pasado&&!e.completado?'border-left-color:var(--danger);':''}"
    onclick="openModalAgenda('${e.id}')"
    style="${e.completado?'opacity:.55;':''}${pasado&&!e.completado?'border-color:rgba(239,68,68,.3);':''}">
    <div class="agenda-event-time">${e.hora||'—'}</div>
    <div class="agenda-event-bar" style="background:${TIPO_COLORS[e.tipo]||'#64748b'};"></div>
    <div class="agenda-event-body">
      <div class="agenda-event-title" style="${e.completado?'text-decoration:line-through;':''}">${e.titulo}</div>
      <div class="agenda-event-sub">${TIPO_LABELS[e.tipo]||e.tipo}${cliente?' · '+cliente.nombre:''}${e.notas?' · '+e.notas.substring(0,50)+(e.notas.length>50?'...':''):''}</div>
    </div>
    <div class="agenda-event-badge">
      ${e.completado
        ?'<span class="chip chip-green" style="font-size:10px;">✓ Listo</span>'
        :`<button class="btn" style="font-size:10px;padding:3px 8px;" onclick="event.stopPropagation();completarEvento('${e.id}')">Completar</button>`}
    </div>
  </div>`;
}

function agendaSetVista(vista){
  agendaVistaActual=vista;
  renderPage('agenda');
}

let agendaMesOffset = 0;
function agendaSemana(dir, goHoy){
  if(goHoy){ agendaSemanaOffset=0; }
  else { agendaSemanaOffset+=dir; }
  const content=document.getElementById('agenda-content');
  if(content) content.innerHTML=renderAgendaSemana();
}
function agendaMes(dir){ agendaMesOffset+=dir; renderCalMini(); }

function renderCalMini(){
  const hoy=new Date();
  const ref=new Date(hoy.getFullYear(),hoy.getMonth()+agendaMesOffset,1);
  const mes=ref.getMonth(); const anio=ref.getFullYear();
  const label=ref.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  const labelEl=document.getElementById('ag-mes-label');
  if(labelEl) labelEl.textContent=label.charAt(0).toUpperCase()+label.slice(1);
  const grid=document.getElementById('cal-mini-grid');
  if(!grid) return;
  const diasSem=['D','L','M','X','J','V','S'];
  let html=diasSem.map(d=>`<div class="cal-mini-head">${d}</div>`).join('');
  const primerDia=new Date(anio,mes,1).getDay();
  const ultimoDia=new Date(anio,mes+1,0).getDate();
  const hoyStr=fechaISOLocal(hoy);
  const eventFechas=new Set(eventosVistaActual().map(e=>e.fecha));
  for(let i=0;i<primerDia;i++) html+=`<div class="cal-mini-day otro-mes"></div>`;
  for(let d=1;d<=ultimoDia;d++){
    const fs=`${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    html+=`<div class="cal-mini-day${fs===hoyStr?' hoy':''}${eventFechas.has(fs)?' con-evento':''}${fs===agendaFechaSeleccionada&&fs!==hoyStr?' seleccionado':''}"
      onclick="agendaSelFecha('${fs}')">${d}</div>`;
  }
  grid.innerHTML=html;
}

function agendaSelFecha(fecha){
  agendaFechaSeleccionada=fecha;
  renderCalMini();
  openModalAgenda(null,fecha);
}

function fmtFechaAgenda(fechaStr){
  return fmtDate(fechaStr);
}

// MODAL AGENDA
function openModalAgenda(id, fechaPre, horaPre){
  editingEventoId=id||null;
  agEventoClienteId=null;
  document.getElementById('modal-agenda-title').textContent=id?'Editar evento':'Nuevo evento';
  const elimBtn=document.getElementById('ag-btn-eliminar');
  if(elimBtn) elimBtn.style.display=id?'':'none';
  if(id){
    const e=store.agenda.find(x=>x.id===id);
    if(e){
      setVal('ag-titulo',e.titulo); setVal('ag-tipo',e.tipo);
      setVal('ag-fecha',e.fecha); setVal('ag-hora',e.hora||'10:00');
      setVal('ag-notas',e.notas||'');
      agEventoClienteId=e.clienteId||null;
      const ci=document.getElementById('ag-cliente-input');
      if(ci&&e.clienteId){ const c=store.clientes.find(x=>x.id===e.clienteId); if(c) ci.value=c.nombre; }
      else if(ci) ci.value='';
    }
  } else {
    setVal('ag-titulo',''); setVal('ag-tipo','llamada');
    setVal('ag-fecha',fechaPre||new Date().toISOString().split('T')[0]);
    setVal('ag-hora',horaPre||'10:00'); setVal('ag-notas','');
    const ci=document.getElementById('ag-cliente-input'); if(ci) ci.value='';
  }
  document.getElementById('modal-agenda').classList.add('open');
  setTimeout(()=>{ const t=document.getElementById('ag-titulo'); if(t&&!id) t.focus(); },100);
}

function filtrarClientesAgenda(q){
  const list=document.getElementById('ag-cliente-list');
  if(!list) return;
  if(!q||q.length<2){ list.classList.remove('open'); return; }
  const f=clientesVistaActual().filter(c=>c.nombre.toUpperCase().includes(q.toUpperCase()));
  if(!f.length){ list.classList.remove('open'); return; }
  list.innerHTML=f.slice(0,6).map(c=>{
    const n=c.nombre.replace(/'/g,'&apos;');
    return '<div class="autocomplete-item" onclick="selAgCliente(\''+c.id+'\',\''+n+'\')"><div>'+c.nombre+'</div><div class="autocomplete-item-sub">'+getSvcLabel(c.servicio)+'</div></div>';
  }).join('');
  list.classList.add('open');
}

function selAgCliente(id,nombre){
  agEventoClienteId=id;
  const input=document.getElementById('ag-cliente-input');
  if(input) input.value=nombre;
  document.getElementById('ag-cliente-list').classList.remove('open');
}

function guardarEvento(){
  const titulo=(getVal('ag-titulo')||'').trim();
  const fecha=getVal('ag-fecha');
  if(!titulo){showToast('El título es obligatorio','warn');return;}
  if(!fecha){showToast('La fecha es obligatoria','warn');return;}
  const eventoAnterior=editingEventoId?store.agenda.find(x=>x.id===editingEventoId):null;
  const clienteEvento=agEventoClienteId?store.clientes.find(c=>c.id===agEventoClienteId):null;
  const evento={
    titulo,tipo:getVal('ag-tipo')||'llamada',
    fecha,hora:getVal('ag-hora')||'',
    notas:getVal('ag-notas')||'',
    clienteId:agEventoClienteId||null,
    completado:false,
    asesorId:eventoAnterior?.asesorId||clienteEvento?.asesorId||asesorDestinoVista(),
  };
  if(editingEventoId){
    const idx=store.agenda.findIndex(x=>x.id===editingEventoId);
    if(idx>=0){ evento.id=editingEventoId; evento.completado=store.agenda[idx].completado; store.agenda[idx]=evento; }
    showToast('Evento actualizado','success');
  } else {
    evento.id='ev_'+Date.now();
    store.agenda.push(evento);
    if(evento.clienteId){
      const c=store.clientes.find(x=>x.id===evento.clienteId);
      if(c) addHist(c,'agenda','Evento agendado: '+titulo+' ('+fmtDate(fecha)+')');
    }
    showToast('Evento agregado','success');
  }
  saveStore();
  closeModal('modal-agenda');
  renderPage('agenda');
  setTimeout(renderCalMini,50);
}

function completarEvento(id){
  const e=store.agenda.find(x=>x.id===id);
  if(!e) return;
  e.completado=true;
  if(e.clienteId){ const c=store.clientes.find(x=>x.id===e.clienteId); if(c) addHist(c,'agenda','Evento completado: '+e.titulo); }
  saveStore();
  showToast('Evento completado','success');
  renderPage('agenda');
  setTimeout(renderCalMini,50);
}

function eliminarEvento(){
  if(!editingEventoId) return;
  if(!confirm('¿Eliminar este evento?')) return;
  store.agenda=store.agenda.filter(x=>x.id!==editingEventoId);
  saveStore();
  closeModal('modal-agenda');
  showToast('Evento eliminado','info');
  renderPage('agenda');
  setTimeout(renderCalMini,50);
}

// ---- RECORDATORIO AUTO 45 DÍAS ----
function agendarRecordatorio45(cliente){
  if(!cliente.fechaFirmaContrato&&!cliente.fechaRegistro) return;
  const base=cliente.fechaFirmaContrato||cliente.fechaRegistro.split('T')[0];
  const fecha45=new Date(base+'T12:00:00');
  fecha45.setDate(fecha45.getDate()+45);
  const fechaStr=fecha45.toISOString().split('T')[0];
  // Verificar que no exista ya
  const existe=(store.agenda||[]).some(e=>e.clienteId===cliente.id&&e.tipo==='vencimiento'&&e.fecha===fechaStr);
  if(existe) return;
  if(!store.agenda) store.agenda=[];
  store.agenda.push({
    id:'ev_'+Date.now()+'_45',
    titulo:'Solicitud AFORE — '+cliente.nombre,
    tipo:'vencimiento',
    fecha:fechaStr,
    hora:'09:00',
    notas:'Se cumplen 45 días. Iniciar solicitud de retiro en AFORE Móvil.',
    clienteId:cliente.id,
    asesorId:cliente.asesorId||sesionActiva?.id||null,
    completado:false,
    autoGenerado:true,
  });
  addHist(cliente,'agenda','Recordatorio automático: solicitud AFORE el '+fmtDate(fechaStr));
}


function renderComingSoon(page){
  const icons={asesores:'◑'};
  const fases={asesores:'Fase 4'};
  return `<div class="section-title">${page.charAt(0).toUpperCase()+page.slice(1)}</div><div class="section-sub">${fases[page]||''} — Próximamente</div>
  <div class="coming-soon"><div class="cs-icon">${icons[page]||'◌'}</div><div class="cs-title">Módulo en desarrollo</div><div class="cs-sub">Disponible en la siguiente fase.</div></div>`;
}

// ==================== CÁLCULO COMISIÓN ====================
function comisionDefaultParaAsesor(advisorId){
  const asesor=(store.asesores||[]).find(a=>a.id===advisorId);
  return asesor&&asesor.rol!=='admin'?2000:3000;
}

function calcComision(monto, servicioId, advisorId){
  if(!monto||monto<=0) return {honorarios:0,comision:0};
  // Buscar esquema del servicio si se pasa
  const svc=servicioId?store.servicios.find(s=>s.id===servicioId):store.servicios.find(s=>s.id==='retiro_desempleo');
  let honorarios,comision;
  if(svc&&svc.esquema==='manual'){
    return {honorarios:0,comision:0};
  } else if(svc&&svc.esquema==='mixto'){
    const umbral=Number(svc.umbralFijo)||35000;
    if(monto>=umbral){
      honorarios=Number(svc.honorariosFijo)||8000;
      comision=comisionDefaultParaAsesor(advisorId)===2000?2000:(Number(svc.comisionFija)||3000);
    } else {
      honorarios=Math.round(monto*(Number(svc.honorariosPct)||25)/100);
      comision=Math.round(honorarios*(Number(svc.comisionPct)||40)/100);
    }
  } else if(svc&&svc.esquema==='porcentaje'){
    honorarios=Math.round(monto*(Number(svc.honorariosPct)||25)/100);
    comision=Math.round(honorarios*(Number(svc.comisionPct)||40)/100);
  } else {
    // Fallback: lógica original retiro desempleo
    if(monto>=35000){ honorarios=8000; comision=comisionDefaultParaAsesor(advisorId); }
    else { honorarios=Math.round(monto*0.25); comision=Math.round(honorarios*0.40); }
  }
  return {honorarios,comision};
}

function calcFechaRetiro(fechaRegistro){
  const d=new Date(fechaRegistro);
  d.setDate(d.getDate()+47);
  return d.toISOString().split('T')[0];
}

function previewCalculo(){
  const monto=Number(document.getElementById('fc-monto')?.value)||0;
  const svcId=document.getElementById('fc-servicio')?.value||'retiro_desempleo';
  const preview=document.getElementById('calc-preview');
  if(!preview) return;
  if(!monto){ preview.classList.remove('show'); return; }
  const clienteEditado=editingId?store.clientes.find(c=>c.id===editingId):null;
  const calc=calcComision(monto, svcId, clienteEditado?.asesorId||asesorDestinoVista());
  document.getElementById('cp-honorarios').textContent='$'+calc.honorarios.toLocaleString('es-MX');
  document.getElementById('cp-comision').textContent='$'+calc.comision.toLocaleString('es-MX');
  if(!editingId){
    const h=document.getElementById('fc-honorarios');
    const c=document.getElementById('fc-comision');
    if(h) h.value=calc.honorarios;
    if(c) c.value=calc.comision;
  }
  preview.classList.add('show');
}

function validateNSS(input){
  const val=input.value.replace(/\D/g,'');
  const indicator=document.getElementById('nss-indicator');
  if(!val){ input.className='form-input'; if(indicator) indicator.textContent=''; return; }
  if(val.length===11){
    input.className='form-input input-nss-ok';
    if(indicator){ indicator.textContent='✓'; indicator.className='nss-indicator nss-ok'; }
  } else {
    input.className='form-input input-nss-err';
    if(indicator){ indicator.textContent=val.length+'/11'; indicator.className='nss-indicator nss-err'; }
  }
}

function validateAlphaNum(input, indicatorId, required){
  const val=input.value;
  const indicator=document.getElementById(indicatorId);
  if(!val){ input.className='form-input input-upper'; if(indicator) indicator.textContent=''; return; }
  if(val.length===required){
    input.className='form-input input-upper input-nss-ok';
    if(indicator){ indicator.textContent='✓'; indicator.className='nss-indicator nss-ok'; }
  } else {
    input.className='form-input input-upper input-nss-err';
    if(indicator){ indicator.textContent=val.length+'/'+required; indicator.className='nss-indicator nss-err'; }
  }
}
