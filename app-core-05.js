// ==================== HELPERS ====================
function closeModal(id){
  if(id==='modal-cliente'&&clienteFormDirty){
    if(confirm('Hay cambios sin guardar. ¿Desea guardar los cambios?')){ guardarCliente(); return; }
    if(!confirm('¿Salir sin guardar los cambios?')) return;
    clienteFormDirty=false;
  }
  const el=document.getElementById(id); if(el) el.classList.remove('open');
}
function initials(n){ if(!n) return '?'; const p=n.trim().split(' ').filter(Boolean); return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():p[0][0].toUpperCase(); }
function stageLabel(etapa,svc){ const st=stagesFor(svc||'retiro_desempleo'); const f=st.find(s=>s.id===etapa); return f?f.label:etapa||'—'; }
function stageCls(etapa,svc){ const st=stagesFor(svc||'retiro_desempleo'); const i=st.findIndex(s=>s.id===etapa); if(etapa==='concluido') return 'stage-2'; if(i<=1) return 'stage-1'; if(i<=3) return 'stage-5'; return 'stage-3'; }
function fmtDate(iso){
  if(!iso) return '—';
  const raw=iso instanceof Date?fechaISOLocal(iso):String(iso);
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d=new Date(raw); if(isNaN(d)) return raw;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function fmtDateShort(iso){ return fmtDate(iso); }
function fmtDateTime(valor){ const d=valor instanceof Date?valor:new Date(valor); if(isNaN(d)) return String(valor||'—'); return `${fmtDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function fmtFechaHistorial(valor){
  if(!valor) return '—';
  const s=String(valor);
  if(/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T, ]+(\d{2}:\d{2}))?/);
  if(iso) return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4]?' '+iso[4]:''}`;
  const meses={ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sept:'09',sep:'09',oct:'10',nov:'11',dic:'12'};
  const antiguo=s.toLowerCase().match(/(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})(?:,?\s+(\d{1,2}:\d{2}))?/);
  if(antiguo){ const mes=meses[antiguo[2].slice(0,4)]||meses[antiguo[2].slice(0,3)]; if(mes) return `${String(antiguo[1]).padStart(2,'0')}/${mes}/${antiguo[3]}${antiguo[4]?' '+antiguo[4]:''}`; }
  return s;
}
function getVal(id){ return document.getElementById(id)?.value||''; }
function setVal(id,v){ const el=document.getElementById(id); if(el) el.value=v||''; }
function addHist(c,tipo,texto){ if(!c.historial) c.historial=[]; const ahora=new Date(); c.historial.push({tipo,texto,fecha:`${fmtDate(ahora)} ${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`}); }
function showToast(msg,type){
  const ct=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className=`toast toast-${type}`;
  t.innerHTML=`<span>${type==='success'?'✓':type==='warn'?'⚠':'ℹ'}</span>${msg}`;
  ct.appendChild(t);setTimeout(()=>t.remove(),3000);
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  applyTheme(next);
  store.configuracion.tema=next;
  saveStore();
  destroyCharts();
  if(currentPage==='dashboard') setTimeout(initCharts,50);
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('theme-btn').textContent=t==='dark'?'☀':'☾';
  const tr=document.getElementById('cfg-track');if(tr) tr.classList.toggle('on',t==='dark');
}
function guardarConfigSeguridad(){
  store.configuracion.rol=document.getElementById('cfg-rol')?.value||'admin';
  saveStore();
  updateRolUI();
  showToast('Configuración de seguridad guardada','success');
  renderPage('configuracion');
}
function toggleBloqueoFirma(){
  store.configuracion.bloqueo_firma=!store.configuracion.bloqueo_firma;
  saveStore();
  const track=document.getElementById('bloqueo-track');
  if(track) track.classList.toggle('on',store.configuracion.bloqueo_firma);
  showToast('Bloqueo de firma: '+(store.configuracion.bloqueo_firma?'activado':'desactivado'),'info');
}
function guardarConfig(){
  store.configuracion.nombre_app=document.getElementById('cfg-nombre').value.trim()||'C&A CRM Suite';
  store.configuracion.asesor=document.getElementById('cfg-asesor').value.trim()||'Emmanuel Álvarez';
  saveStore();
  document.getElementById('app-name-display').textContent=store.configuracion.nombre_app;
  document.title=store.configuracion.nombre_app;
  const asesor=store.configuracion.asesor;
  document.getElementById('sidebar-name').textContent=asesor;
  document.getElementById('sidebar-avatar').textContent=initials(asesor);
  showToast('Configuración guardada','success');
}
function guardarConfigEmpresa(){
  store.configuracion.empresa_nombre=document.getElementById('cfg-empresa-nombre').value.trim();
  store.configuracion.empresa_representante=document.getElementById('cfg-empresa-rep').value.trim();
  store.configuracion.empresa_domicilio=document.getElementById('cfg-empresa-dom').value.trim();
  store.configuracion.ciudad_contrato=document.getElementById('cfg-ciudad').value.trim();
  saveStore();
  showToast('Datos de empresa guardados','success');
}
function exportar(){
  const b=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='ca_crm_backup_'+new Date().toISOString().split('T')[0]+'.json';a.click();
  showToast('Datos exportados','success');
}
function importar(){ document.getElementById('importar-input').click(); }
function procesarImport(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.clientes) throw new Error('Formato inválido');
      const total=data.clientes.length;
      if(!confirm(`¿Importar backup? Se cargarán ${total} cliente(s). Los datos actuales serán reemplazados.`)){input.value='';return;}
      store=data;
      saveStore();
      renderPage(currentPage);
      showToast(`Importación exitosa: ${total} clientes cargados`,'success');
    }catch(err){
      showToast('Error: archivo no válido o corrupto','warn');
    }
    input.value='';
  };
  reader.readAsText(file);
}

// ==================== RECORDATORIO EVENTOS ====================
let eventoReminderActivo = null;
let reminderInterval = null;

function iniciarRecordatorioEventos(){
  if(reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(verificarEventosProximos, 60000);
  // También verificar al iniciar
  setTimeout(verificarEventosProximos, 3000);
}

function verificarEventosProximos(){
  const ahora = new Date();
  const hoyStr = ahora.toISOString().split('T')[0];
  const horaActual = ahora.getHours()*60 + ahora.getMinutes();
  const eventos = store.agenda||[];

  for(const e of eventos){
    if(e.completado || e.cancelarRecordatorio) continue;
    if(e.fecha !== hoyStr) continue;
    if(!e.hora) continue;

    const [hh,mm] = e.hora.split(':').map(Number);
    const minEvento = hh*60 + mm;
    const diff = horaActual - minEvento;

    // Disparar si estamos entre 0 y +2 minutos del evento
    if(diff >= 0 && diff <= 2){
      // Verificar que no se haya mostrado ya (usando posponer o en los últimos 3 minutos)
      const ultimoAviso = e.ultimoAviso || 0;
      const minutosDesdeAviso = (Date.now() - ultimoAviso) / 60000;
      if(minutosDesdeAviso > 25){ // evitar spam, min 25 min entre avisos
        eventoReminderActivo = e.id;
        e.ultimoAviso = Date.now();
        saveStore();
        mostrarPopupEvento(e);
        break;
      }
    }
  }
}

function mostrarPopupEvento(e){
  const cliente = e.clienteId ? store.clientes.find(c=>c.id===e.clienteId) : null;
  const TIPO_LABELS_R = {llamada:'📞 Llamada',whatsapp:'💬 WhatsApp',meet:'🎥 Meet',cita:'📅 Cita',recordatorio:'🔔 Recordatorio',vencimiento:'⏰ Vencimiento',otro:'📌 Otro'};
  document.getElementById('popup-ev-titulo').textContent = e.titulo;
  document.getElementById('popup-ev-texto').innerHTML =
    '<div style="font-size:13px;font-weight:500;margin-bottom:6px;">'+(TIPO_LABS_R[e.tipo]||e.tipo)+'&nbsp;·&nbsp;'+e.hora+'</div>'
    +(cliente?'<div style="font-size:12px;color:var(--text-muted);">'+cliente.nombre+'</div>':'')
    +(e.notas?'<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">'+e.notas+'</div>':'');
  document.getElementById('popup-evento-recordatorio').classList.add('open');
}

function accionEvento(accion){
  document.getElementById('popup-evento-recordatorio').classList.remove('open');
  if(!eventoReminderActivo) return;
  const e = store.agenda.find(x=>x.id===eventoReminderActivo);
  if(!e){ eventoReminderActivo=null; return; }

  if(accion==='realizado'){
    e.completado = true;
    if(e.clienteId){ const c=store.clientes.find(x=>x.id===e.clienteId); if(c) addHist(c,'agenda','Evento completado: '+e.titulo); }
    showToast('Evento marcado como realizado','success');
    if(currentPage==='agenda') renderPage('agenda');
  } else if(accion==='posponer'){
    // Sumar 30 minutos a la hora del evento
    const [hh,mm] = (e.hora||'00:00').split(':').map(Number);
    const totalMin = hh*60+mm+30;
    const newH = Math.floor(totalMin/60)%24;
    const newM = totalMin%60;
    e.hora = String(newH).padStart(2,'0')+':'+String(newM).padStart(2,'0');
    e.ultimoAviso = 0; // resetear para que dispare a la nueva hora
    showToast('Evento pospuesto a las '+e.hora,'info');
  } else if(accion==='cancelar'){
    e.cancelarRecordatorio = true;
    showToast('Recordatorio cancelado','info');
  }

  saveStore();
  eventoReminderActivo = null;
}

// ==================== EXPORTAR EXCEL ====================
function exportarClientesExcel(){
  // Construir CSV compatible con Excel (UTF-8 BOM para acentos)
  const headers = ['Nombre','Teléfono','Correo','Ciudad','Servicio','Fuente','Etapa',
    'Elegible','NSS','CURP','RFC','Domicilio','Monto AFORE','Contrato Firmado',
    'Fecha Firma','Fecha Retiro Estimada','Comisión','Estado Pago','Registro'];

  const rows = clientesVistaActual().map(c=>[
    c.nombre||'',
    c.telefono||'',
    c.email||'',
    c.ciudad||'',
    getSvcLabel(c.servicio)||'',
    ({facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',recomendacion:'Recomendación',circulo_calido:'Círculo cálido',otro:'Otro'})[c.fuente]||c.fuente||'',
    stageLabel(c.etapa,c.servicio)||'',
    c.elegible==='si'?'Elegible':c.elegible==='no'?'No elegible':c.elegible==='casi'?'Próximo':'Sin verificar',
    c.nss||'',
    c.curp||'',
    c.rfc||'',
    c.domicilio||'',
    c.montoAfore||'',
    c.contratoFirmado?'Sí':'No',
    c.fechaFirmaContrato||'',
    c.fechaRetiroEstimada||'',
    c.comision||c.comisionCalc||'',
    c.estadoPago||'',
    fmtDate(c.fechaRegistro)||'',
  ]);

  const csvContent = [headers, ...rows]
    .map(row=>row.map(v=>{
      const val = String(v).replace(/"/g,'""');
      return val.includes(',') || val.includes('\n') || val.includes('"') ? '"'+val+'"' : val;
    }).join(','))
    .join('\n');

  // BOM UTF-8 para que Excel abra correctamente con acentos
  const blob = new Blob(['\uFEFF'+csvContent], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clientes_ca_crm_'+new Date().toISOString().split('T')[0]+'.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Base de clientes exportada ('+store.clientes.length+' registros)','success');
}

// ==================== HISTORIAL CONTRATOS — guardar HTML ====================
// Se llama desde generarContrato después de renderizar
function guardarVersionContrato(clienteId, servicioNombre, htmlContrato){
  const c = store.clientes.find(x=>x.id===clienteId);
  if(!c) return;
  if(!c.historialContratos) c.historialContratos=[];
  const entry = {
    id: 'ct_'+Date.now(),
    fecha: fmtDateTime(new Date()),
    servicio: servicioNombre,
    generadoPor: store.configuracion.asesor||'Sistema',
    estado: 'Generado',
    htmlSnapshot: htmlContrato, // HTML completo del contrato renderizado
  };
  c.historialContratos.push(entry);
  addHist(c,'contrato','Contrato generado: '+servicioNombre);
  saveStore();
}

function verVersionContrato(clienteId, contratoId){
  const c = store.clientes.find(x=>x.id===clienteId);
  if(!c) return;
  const entry = (c.historialContratos||[]).find(x=>x.id===contratoId);
  if(!entry||!entry.htmlSnapshot){ showToast('Esta versión no tiene snapshot guardado','info'); return; }
  document.getElementById('visor-contrato-titulo').textContent='Contrato — '+entry.servicio+' — '+entry.fecha;
  document.getElementById('visor-contrato-body').innerHTML=
    '<div style="background:#fff;color:#000;padding:24px;border-radius:8px;font-family:Arial,sans-serif;font-size:12px;line-height:1.8;">'+entry.htmlSnapshot+'</div>';
  document.getElementById('modal-visor').classList.add('open');
}

// ==================== LOGIN SYSTEM ====================
let loginPinBuffer = '';
let loginUserSeleccionado = null;

function mostrarLogin(){
  const loginScreen=document.getElementById('login-screen');
  const mainEl=document.querySelector('.main');
  const sidebarEl=document.querySelector('.sidebar');
  if(loginScreen) loginScreen.style.display='flex';
  if(mainEl) mainEl.style.display='none';
  if(sidebarEl) sidebarEl.style.display='none';
  // Resetear estado del PIN
  loginPinBuffer='';
  loginUserSeleccionado=null;
  // Mostrar siempre la grilla de usuarios primero
  const grid=document.getElementById('login-user-grid');
  const pinWrap=document.getElementById('login-pin-wrap');
  const sub=document.querySelector('.login-sub');
  if(grid) grid.style.display='grid';
  if(pinWrap) pinWrap.style.display='none';
  if(sub) sub.style.display='block';
  renderLoginGrid();
  actualizarLogoSidebar();
  const lname=document.getElementById('login-app-name');
  if(lname) lname.textContent=store.configuracion.nombre_app||'C&A CRM Suite';
}

function renderLoginGrid(){
  const grid = document.getElementById('login-user-grid');
  if(!grid) return;
  const asesoresActivos = store.asesores.filter(a=>a.activo!==false);
  grid.innerHTML = asesoresActivos.map(a=>`
    <div class="login-user-card" onclick="seleccionarLoginUser('${a.id}')">
      <div class="login-avatar">
        ${a.foto
          ? `<img src="${a.foto}" alt="${a.nombre}">`
          : `<span>${initials(a.nombre)}</span>`}
      </div>
      <div class="login-user-name">${a.nombre}</div>
      <div class="login-user-rol">
        ${a.rol==='admin'?'<span class="rol-badge rol-admin">Admin</span>':'<span class="rol-badge rol-asesor">Asesor</span>'}
      </div>
    </div>
  `).join('');
}

// ==================== LOGIN CON CONTRASEÑA ====================
let loginPasswordCurrent = '';
let loginPasswordConfirm_v = '';
let esPrimerAcceso = false;

const PWD_REGEX = {
  len:   function(v){ return v.length >= 8; },
  upper: function(v){ return /[A-Z]/.test(v); },
  lower: function(v){ return /[a-z]/.test(v); },
  num:   function(v){ return /[0-9]/.test(v); },
  sym:   function(v){ return /[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(v); },
};

function passwordValida(v){
  return Object.values(PWD_REGEX).every(function(fn){ return fn(v); });
}

function togglePasswordVisibility(){
  const inp=document.getElementById('login-password-input');
  const eye=document.getElementById('pwd-eye');
  if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  if(eye) eye.textContent=inp.type==='password'?'👁':'🙈';
}

function validarRequisitosPassword(v){
  if(!esPrimerAcceso) return;
  const map={
    'req-len':[function(x){return x.length>=8;},'Mínimo 8 caracteres'],
    'req-upper':[function(x){return /[A-Z]/.test(x);},'Una mayúscula'],
    'req-lower':[function(x){return /[a-z]/.test(x);},'Una minúscula'],
    'req-num':[function(x){return /[0-9]/.test(x);},'Un número'],
    'req-sym':[function(x){return /[!@#$%^&*]/.test(x);},'Un símbolo (!@#$%...)'],
  };
  Object.entries(map).forEach(function(entry){
    const id=entry[0]; const fn=entry[1][0]; const label=entry[1][1];
    const el=document.getElementById(id);
    if(el){const ok=fn(v);el.textContent=(ok?'✅ ':'⭕ ')+label;el.style.color=ok?'var(--success)':'var(--text-muted)';}
  });
}

function seleccionarLoginUser(id){
  loginUserSeleccionado = store.asesores.find(function(a){return a.id===id;});
  if(!loginUserSeleccionado) return;
  loginPasswordCurrent = '';
  loginPasswordConfirm_v = '';
  esPrimerAcceso = !loginUserSeleccionado.pin;

  var grid=document.getElementById('login-user-grid');
  var pinWrap=document.getElementById('login-pin-wrap');
  var sub=document.querySelector('.login-sub');
  if(grid) grid.style.display='none';
  if(sub) sub.style.display='none';
  if(pinWrap) pinWrap.style.display='block';

  var errEl=document.getElementById('pin-login-error');
  var reqWrap=document.getElementById('pwd-requisitos');
  var pwdInput=document.getElementById('login-password-input');
  var confirmInput=document.getElementById('login-password-confirm');
  var titleEl=document.getElementById('login-pin-title');
  var subEl=document.getElementById('login-pin-sub');

  var nombre=loginUserSeleccionado.nombre.split(' ')[0];
  if(titleEl) titleEl.textContent='Hola, '+nombre;
  if(errEl) errEl.textContent='';
  if(pwdInput){ pwdInput.value=''; pwdInput.type='password'; }
  if(confirmInput) confirmInput.value='';

  if(esPrimerAcceso){
    if(subEl) subEl.textContent='Crea tu contraseña de acceso';
    if(reqWrap) reqWrap.style.display='block';
  } else {
    if(subEl) subEl.textContent='Ingresa tu contraseña';
    if(reqWrap) reqWrap.style.display='none';
  }
  setTimeout(function(){ if(pwdInput) pwdInput.focus(); }, 150);
}

function volverLoginGrid(){
  loginUserSeleccionado = null;
  loginPasswordCurrent = '';
  loginPasswordConfirm_v = '';
  var grid=document.getElementById('login-user-grid');
  var pinWrap=document.getElementById('login-pin-wrap');
  var sub=document.querySelector('.login-sub');
  if(grid) grid.style.display='grid';
  if(sub) sub.style.display='block';
  if(pinWrap) pinWrap.style.display='none';
}

async function verificarLoginPin(){
  if(!loginUserSeleccionado){
    var e=document.getElementById('pin-login-error');
    if(e) e.textContent='Selecciona un usuario primero';
    return;
  }
  // Leer de variable JS (el input guarda el valor aquí en tiempo real)
  var pwd = loginPasswordCurrent;
  // Fallback al DOM si la variable está vacía
  if(!pwd){
    var inp=document.getElementById('login-password-input');
    if(inp) pwd=inp.value||'';
  }
  var errEl=document.getElementById('pin-login-error');
  if(errEl) errEl.textContent='';

  if(esPrimerAcceso){
    if(pwd.length < 8){
      if(errEl) errEl.textContent='Mínimo 8 caracteres';
      return;
    }
    var confirm2 = loginPasswordConfirm_v;
    if(!confirm2){
      var ci=document.getElementById('login-password-confirm');
      if(ci) confirm2=ci.value||'';
    }
    if(pwd !== confirm2){
      if(errEl) errEl.textContent='Las contraseñas no coinciden';
      return;
    }
    var hash=simpleHash(pwd);
    loginUserSeleccionado.pin=hash;
    var a=store.asesores.find(function(x){return x.id===loginUserSeleccionado.id;});
    if(a) a.pin=hash;
    saveStore();
    showToast('Contraseña creada correctamente','success');
  } else {
    if(!pwd){
      if(errEl) errEl.textContent='Ingresa tu contraseña';
      return;
    }
    var asesor=loginUserSeleccionado;
    var valido=false;
    try{
      var hashPwd=simpleHash(pwd);
      valido=(hashPwd===asesor.pin);
      // También intentar con hashPin async (SHA-256) por si fue guardado así
      if(!valido){
        var hashAsync=await hashPin(pwd);
        valido=(hashAsync===asesor.pin);
      }
    }catch(ex){
      valido=(simpleHash(pwd)===asesor.pin);
    }
    if(!valido){
      if(errEl) errEl.textContent='Contraseña incorrecta. Intenta de nuevo.';
      loginPasswordCurrent='';
      var i2=document.getElementById('login-password-input');
      if(i2){i2.value='';i2.focus();}
      return;
    }
  }

  // ✅ LOGIN EXITOSO
  sesionActiva={...loginUserSeleccionado};
  loginPasswordCurrent='';
  loginPasswordConfirm_v='';
  var ls=document.getElementById('login-screen');
  var me=document.querySelector('.main');
  var se=document.querySelector('.sidebar');
  if(ls) ls.style.display='none';
  if(me) me.style.display='flex';
  if(se) se.style.display='flex';
  actualizarSidebarSesion();
  renderPage('dashboard');
  iniciarRecordatorioEventos();
  setTimeout(initSidebarState,200);
}
function togglePasswordVisibility(){
  const inp=document.getElementById('login-password-input');
  const eye=document.getElementById('pwd-eye');
  if(!inp) return;
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  if(eye) eye.textContent=show?'🙈':'👁';
}

function validarRequisitosPassword(v){
  const wrap=document.getElementById('pwd-requisitos');
  if(!wrap||!esPrimerAcceso) return;
  const reqs={
    'req-len':  PWD_REGEX.len(v),
    'req-upper':PWD_REGEX.upper(v),
    'req-lower':PWD_REGEX.lower(v),
    'req-num':  PWD_REGEX.num(v),
    'req-sym':  PWD_REGEX.sym(v),
  };
  const labels={
    'req-len':'Mínimo 8 caracteres',
    'req-upper':'Una mayúscula',
    'req-lower':'Una minúscula',
    'req-num':'Un número',
    'req-sym':'Un símbolo (!@#$%...)',
  };
  Object.entries(reqs).forEach(([id,ok])=>{
    const el=document.getElementById(id);
    if(el){ el.textContent=(ok?'✅ ':'⭕ ')+labels[id]; el.style.color=ok?'var(--success)':'var(--text-muted)'; }
  });
}

function seleccionarLoginUser(id){
  loginUserSeleccionado = store.asesores.find(a=>a.id===id);
  if(!loginUserSeleccionado) return;
  loginPinBuffer = '';
  const grid=document.getElementById('login-user-grid');
  const pinWrap=document.getElementById('login-pin-wrap');
  const sub=document.querySelector('.login-sub');
  if(grid) grid.style.display='none';
  if(sub) sub.style.display='none';
  if(pinWrap) pinWrap.style.display='block';

  // Determinar si es primer acceso (no tiene contraseña configurada o tiene el PIN default)
  const sinPassword = !loginUserSeleccionado.pin;
  esPrimerAcceso = sinPassword;

  const titleEl=document.getElementById('login-pin-title');
  const subEl=document.getElementById('login-pin-sub');
  const errEl=document.getElementById('pin-login-error');
  const reqWrap=document.getElementById('pwd-requisitos');
  const pwdInput=document.getElementById('login-password-input');
  const confirmInput=document.getElementById('login-password-confirm');

  if(titleEl) titleEl.textContent='Hola, '+loginUserSeleccionado.nombre.split(' ')[0];
  if(errEl) errEl.textContent='';
  if(pwdInput){ pwdInput.value=''; pwdInput.focus(); }
  if(confirmInput) confirmInput.value='';

  if(sinPassword){
    // Primer acceso: pedir crear contraseña
    if(subEl) subEl.textContent='Crea tu contraseña de acceso';
    if(reqWrap) reqWrap.style.display='block';
  } else {
    if(subEl) subEl.textContent='Ingresa tu contraseña';
    if(reqWrap) reqWrap.style.display='none';
  }
}

async function verificarLoginPin(){
  if(!loginUserSeleccionado) return;
  const pwd=document.getElementById('login-password-input')?.value||'';
  const errEl=document.getElementById('pin-login-error');

  if(esPrimerAcceso){
    // Validar requisitos
    if(!passwordValida(pwd)){
      if(errEl) errEl.textContent='La contraseña no cumple todos los requisitos';
      return;
    }
    const confirm=document.getElementById('login-password-confirm')?.value||'';
    if(pwd!==confirm){
      if(errEl) errEl.textContent='Las contraseñas no coinciden';
      return;
    }
    // Guardar nueva contraseña hasheada
    const hash=await hashPin(pwd);
    loginUserSeleccionado.pin=hash;
    const asesorEnStore=store.asesores.find(a=>a.id===loginUserSeleccionado.id);
    if(asesorEnStore) asesorEnStore.pin=hash;
    saveStore();
    showToast('Contraseña creada correctamente','success');
    // Continuar al login
  } else {
    // Verificar contraseña normal
    if(!pwd){
      if(errEl) errEl.textContent='Ingresa tu contraseña';
      return;
    }
    // Compatibilidad con credenciales locales de respaldos antiguos.
    const asesor=loginUserSeleccionado;
    let valido=false;
    valido=await verificarPin(asesor, pwd);
    if(!valido){
      if(errEl) errEl.textContent='Contraseña incorrecta. Intenta de nuevo.';
      const inp=document.getElementById('login-password-input');
      if(inp){ inp.value=''; inp.focus(); }
      return;
    }
  }

  // LOGIN EXITOSO
  sesionActiva={...loginUserSeleccionado};
  const loginScreen=document.getElementById('login-screen');
  const mainEl=document.querySelector('.main');
  const sidebarEl=document.querySelector('.sidebar');
  if(loginScreen) loginScreen.style.display='none';
  if(mainEl) mainEl.style.display='flex';
  if(sidebarEl) sidebarEl.style.display='flex';
  actualizarSidebarSesion();
  await cargarClientes();
  await cargarAgenda();
  renderPage('dashboard');
  iniciarRecordatorioEventos();
  setTimeout(initSidebarState, 200);
}

function volverLoginGrid(){
  loginUserSeleccionado = null;
  loginPinBuffer = '';
  const grid=document.getElementById('login-user-grid');
  const pinWrap=document.getElementById('login-pin-wrap');
  const sub=document.querySelector('.login-sub');
  if(grid) grid.style.display='grid';
  if(sub) sub.style.display='block';
  if(pinWrap) pinWrap.style.display='none';
}

function renderPinDots(){
  const maxLen = 6;
  const filled = loginPinBuffer.length;
  const dots = document.getElementById('login-pin-dots');
  if(!dots) return;
  dots.innerHTML = Array.from({length:maxLen}).map((_,i)=>
    `<div class="pin-dot ${i<filled?'filled':''}"></div>`
  ).join('');
}

function pinKey(k){
  if(k==='←'){
    loginPinBuffer = loginPinBuffer.slice(0,-1);
    renderPinDots();
  } else if(k==='✓'){
    verificarLoginPin();
  } else {
    if(loginPinBuffer.length >= 6) return;
    loginPinBuffer += String(k);
    renderPinDots();
    if(loginPinBuffer.length >= 4){
      // Auto-verificar si coincide
      if(loginPinBuffer === loginUserSeleccionado.pin) verificarLoginPin();
    }
  }
}

function verificarLoginPin(){
  if(!loginUserSeleccionado) return;
  if(loginPinBuffer.length < 4){
    const errEl=document.getElementById('pin-login-error');
    if(errEl) errEl.textContent='Ingresa tu contraseña';
    return;
  }
  if(loginPinBuffer !== loginUserSeleccionado.pin){
    const errEl=document.getElementById('pin-login-error');
    if(errEl) errEl.textContent='PIN incorrecto. Intenta de nuevo.';
    loginPinBuffer='';
    renderPinDots();
    return;
  }
  // LOGIN EXITOSO
  sesionActiva = {...loginUserSeleccionado};
  const loginScreen=document.getElementById('login-screen');
  const mainEl=document.querySelector('.main');
  const sidebarEl=document.querySelector('.sidebar');
  if(loginScreen) loginScreen.style.display='none';
  if(mainEl) mainEl.style.display='flex';
  if(sidebarEl) sidebarEl.style.display='flex';
  actualizarSidebarSesion();
  renderPage('dashboard');
}

function actualizarSidebarSesion(){
  if(!sesionActiva) return;
  const av = document.getElementById('sidebar-avatar');
  const nm = document.getElementById('sidebar-name');
  const rb = document.getElementById('sidebar-rol-badge');
  if(av){
    if(sesionActiva.foto){
      av.innerHTML=`<img src="${sesionActiva.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      av.innerHTML=initials(sesionActiva.nombre);
      av.style.display='flex';
    }
  }
  if(nm) nm.textContent=sesionActiva.nombre;
  if(rb){
    rb.textContent=sesionActiva.rol==='admin'?'Admin':'Asesor';
    rb.className='rol-badge '+(sesionActiva.rol==='admin'?'rol-admin':'rol-asesor');
  }
  // Ocultar sección admin si es asesor
  const adminSection=document.getElementById('nav-admin-section');
  if(adminSection) adminSection.style.display=sesionActiva.rol==='admin'?'':'none';
  // Actualizar nombre app
  document.getElementById('app-name-display').textContent=store.configuracion.nombre_app||'C&A CRM Suite';
  actualizarLogoSidebar();
}

function cerrarSesion(){
  sesionActiva=null;
  loginPinBuffer='';
  loginUserSeleccionado=null;
  mostrarLogin();
}

function isAdmin(){ return sesionActiva && sesionActiva.rol==='admin'; }
function asesorId(){ return sesionActiva ? sesionActiva.id : null; }

// Filtrar clientes por sesión
function clientesVisibles(){
  if(!sesionActiva) return [];
  return clientesVistaActual();
}

// ==================== LOGO EMPRESA ====================
let logoTempBase64 = '';

function actualizarLogoSidebar(){
  const logo = store.configuracion.logo_empresa;
  const wrap = document.getElementById('sidebar-logo-wrap');
  const text = document.getElementById('sidebar-logo-text');
  const loginLogo = document.getElementById('login-logo-wrap');
  const loginText = document.getElementById('login-logo-text');
  if(logo){
    if(wrap){ wrap.innerHTML=`<img src="${logo}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm);">`; }
    if(loginLogo){ loginLogo.innerHTML=`<img src="${logo}" style="width:100%;height:100%;object-fit:cover;">`; }
    // Actualizar preview en modal
    const prev=document.getElementById('logo-preview');
    if(prev) prev.innerHTML=`<img src="${logo}" style="width:100%;height:100%;object-fit:contain;">`;
  } else {
    if(wrap){ wrap.innerHTML=`<span id="sidebar-logo-text" style="font-family:var(--font-display);font-weight:700;font-size:14px;color:#fff;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">C&A</span>`; }
    if(loginLogo){ loginLogo.innerHTML=`<span id="login-logo-text" style="font-family:var(--font-display);font-weight:700;font-size:18px;color:#fff;">C&A</span>`; }
  }
}

function cargarLogo(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    // Comprimir a 200px máx
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const MAX=200;
      const ratio=Math.min(MAX/img.width,MAX/img.height,1);
      canvas.width=Math.round(img.width*ratio);
      canvas.height=Math.round(img.height*ratio);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      logoTempBase64=canvas.toDataURL('image/png',0.85);
      const prev=document.getElementById('logo-preview');
      if(prev) prev.innerHTML=`<img src="${logoTempBase64}" style="width:100%;height:100%;object-fit:contain;">`;
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function guardarLogo(){
  if(logoTempBase64) store.configuracion.logo_empresa=logoTempBase64;
  saveStore();
  actualizarLogoSidebar();
  closeModal('modal-logo');
  logoTempBase64='';
  showToast('Logo guardado','success');
}

function quitarLogo(){
  store.configuracion.logo_empresa='';
  logoTempBase64='';
  saveStore();
  actualizarLogoSidebar();
  const prev=document.getElementById('logo-preview');
  if(prev) prev.innerHTML='<span style="font-size:12px;color:var(--text-muted);">Sin logo</span>';
  closeModal('modal-logo');
  showToast('Logo eliminado','info');
}

// ==================== HASH / AUTH ====================
const DEFAULT_PWD_HASH = ''; // Autenticación local deshabilitada en la versión en la nube.

async function hashPin(pwd){
  try{
    // Intentar con crypto.subtle (requiere contexto seguro)
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pwd));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){
    // Fallback para file:// o contextos sin crypto.subtle: hash simple
    return simpleHash(pwd);
  }
}

function simpleHash(str){
  // Hash determinístico simple para fallback
  let h=5381;
  for(let i=0;i<str.length;i++) h=((h<<5)+h)+str.charCodeAt(i)|0;
  // Expandir a 64 chars hex
  const base=Math.abs(h).toString(16).padStart(8,'0');
  return (base+base+base+base+base+base+base+base).substring(0,64);
}

async function verificarPin(asesor, pwd){
  if(!asesor||!asesor.pin) return false;
  const hash=await hashPin(pwd);
  if(hash===asesor.pin) return true;
  // Fallback: verificar con simpleHash también (por si se guardó con diferente método)
  if(simpleHash(pwd)===asesor.pin) return true;
  return false;
}
let editingAsesorId=null;
let asesorFotoTemp='';

function renderAsesores(){
  if(!isAdmin()) return renderComingSoon('asesores');
  const asesores=store.asesores||[];
  // Estadísticas por asesor
  const statsAsesor=id=>({
    total: store.clientes.filter(c=>c.asesorId===id).length,
    activos: store.clientes.filter(c=>c.asesorId===id&&c.etapa!=='concluido').length,
    concluidos: store.clientes.filter(c=>c.asesorId===id&&c.etapa==='concluido').length,
    comisiones: store.clientes.filter(c=>c.asesorId===id&&c.estadoPago==='Cobrado').reduce((s,c)=>s+Number(c.comision||0),0),
  });

  // Top asesor del mes
  const mesActual=new Date().toISOString().substring(0,7);
  const topStats=asesores.map(a=>({
    ...a,
    cierresMes: store.clientes.filter(c=>c.asesorId===a.id&&c.etapa==='concluido'&&(c.fechaRegistro||'').startsWith(mesActual)).length,
  })).sort((a,b)=>b.cierresMes-a.cierresMes);
  const topAsesor=topStats[0];

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div><div class="section-title">Asesores</div><div class="section-sub">Gestión del equipo y rendimiento</div></div>
    <button class="btn btn-primary" onclick="openModalAsesor()">+ Nuevo asesor</button>
  </div>

  ${topAsesor&&topAsesor.cierresMes>0?`
  <div class="card" style="margin-bottom:16px;border-top:2px solid var(--warning);">
    <div class="card-body" style="display:flex;align-items:center;gap:16px;padding:14px 16px;">
      <div style="font-size:28px;">🏆</div>
      <div>
        <div style="font-size:11px;color:var(--warning);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Top asesor del mes</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${topAsesor.nombre}</div>
        <div style="font-size:12px;color:var(--text-muted);">${topAsesor.cierresMes} trámite${topAsesor.cierresMes!==1?'s':''} concluido${topAsesor.cierresMes!==1?'s':''} este mes</div>
      </div>
    </div>
  </div>`:''}

  <div style="display:flex;flex-direction:column;gap:12px;">
    ${asesores.map(a=>{
      const st=statsAsesor(a.id);
      return `<div class="card">
        <div class="card-body" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="asesor-avatar-lg">
              ${a.foto?`<img src="${a.foto}" alt="${a.nombre}">`:`<span>${initials(a.nombre)}</span>`}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <div class="asesor-nombre">${a.nombre}</div>
                <span class="rol-badge ${a.rol==='admin'?'rol-admin':'rol-asesor'}">${a.rol==='admin'?'Admin':'Asesor'}</span>
                ${a.activo===false?'<span class="chip chip-red" style="font-size:10px;">Inactivo</span>':'<span class="chip chip-green" style="font-size:10px;">Activo</span>'}
              </div>
              <div class="asesor-detalle">${a.ciudad||'—'} · Alta: ${fmtDate(a.fechaAlta)||'—'}</div>
            </div>
            <button class="btn btn-icon" onclick="openModalAsesor('${a.id}')" title="Editar">✎</button>
          </div>
          <div class="asesor-stats" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
            ${[['Clientes',st.total],['Activos',st.activos],['Concluidos',st.concluidos],['Comisiones','$'+st.comisiones.toLocaleString('es-MX')]].map(([l,v])=>`
              <div class="asesor-stat">
                <div class="asesor-stat-val">${v}</div>
                <div class="asesor-stat-lbl">${l}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- TABLA COMPARATIVA -->
  <div class="card" style="margin-top:20px;">
    <div class="card-header"><div class="card-title">Comparativa de rendimiento</div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Asesor</th><th>Clientes totales</th><th>Activos</th><th>Concluidos</th><th>Comisiones</th><th>Tasa de cierre</th></tr></thead>
        <tbody>
          ${asesores.map(a=>{
            const st=statsAsesor(a.id);
            const tasa=st.total>0?Math.round(st.concluidos/st.total*100):0;
            return `<tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="client-avatar" style="width:28px;height:28px;font-size:10px;overflow:hidden;">${a.foto?`<img src="${a.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:initials(a.nombre)}</div>
                  <span style="font-weight:500;">${a.nombre}</span>
                </div>
              </td>
              <td>${st.total}</td>
              <td>${st.activos}</td>
              <td>${st.concluidos}</td>
              <td style="color:var(--success)">$${st.comisiones.toLocaleString('es-MX')}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="progress-bar-wrap" style="flex:1;margin:0;"><div class="progress-bar" style="width:${tasa}%;"></div></div>
                  <span style="font-size:11px;width:32px;">${tasa}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// MODAL ASESOR
function openModalAsesor(id){
  editingAsesorId=id||null;
  asesorFotoTemp='';
  const a=id?store.asesores.find(x=>x.id===id):null;
  document.getElementById('modal-asesor-title').textContent=id?'Editar asesor':'Nuevo asesor';
  const elimBtn=document.getElementById('as-btn-eliminar');
  if(elimBtn) elimBtn.style.display=id&&id!=='asesor_ea'?'':'none';
  setVal('as-nombre',a?a.nombre:'');
  setVal('as-ciudad',a?a.ciudad:'');
  setVal('as-email',a?a.email:'');
  setVal('as-rol',a?a.rol:'asesor');
  setVal('as-activo',a?(a.activo===false?'false':'true'):'true');
  setVal('as-pin','');
  setVal('as-pin2','');
  const requerido=id?'':'*';
  const req1=document.getElementById('as-password-required'); if(req1) req1.textContent=requerido;
  const req2=document.getElementById('as-password2-required'); if(req2) req2.textContent=requerido;
  const ayuda=document.getElementById('as-password-help');
  if(ayuda) ayuda.textContent=id?'Déjala vacía para conservar la contraseña actual. Si la cambias, debe cumplir todos los requisitos.':'Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.';
  validarPasswordAsesor('');
  // Preview foto
  const prev=document.getElementById('asesor-foto-preview');
  const initEl=document.getElementById('asesor-foto-initials');
  if(a&&a.foto){
    prev.innerHTML=`<img src="${a.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    if(initEl) initEl.textContent=a?initials(a.nombre):'?';
    if(prev) prev.innerHTML=`<span id="asesor-foto-initials">${a?initials(a.nombre):'?'}</span>`;
  }
  document.getElementById('modal-asesor').classList.add('open');
}

function actualizarInitialsPreview(){
  const nombre=getVal('as-nombre');
  const initEl=document.getElementById('asesor-foto-initials');
  if(initEl&&!asesorFotoTemp) initEl.textContent=nombre?initials(nombre):'?';
}

function cargarFotoAsesor(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const SIZE=200;
      canvas.width=SIZE; canvas.height=SIZE;
      const ctx=canvas.getContext('2d');
      // Recortar en cuadrado centrado
      const minDim=Math.min(img.width,img.height);
      const sx=(img.width-minDim)/2; const sy=(img.height-minDim)/2;
      ctx.drawImage(img,sx,sy,minDim,minDim,0,0,SIZE,SIZE);
      asesorFotoTemp=canvas.toDataURL('image/jpeg',0.75);
      const prev=document.getElementById('asesor-foto-preview');
      if(prev) prev.innerHTML=`<img src="${asesorFotoTemp}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function validarPasswordAsesor(val){
  const input=document.getElementById('as-pin');
  const confirmacion=getVal('as-pin2');
  const ind=document.getElementById('as-pin-ind');
  const ind2=document.getElementById('as-pin2-ind');
  if(!val){
    if(input) input.className='form-input';
    if(ind) ind.textContent='';
    if(ind2) ind2.textContent='';
    return;
  }
  const valida=passwordValida(val);
  if(input) input.className='form-input '+(valida?'input-nss-ok':'input-nss-err');
  if(ind){ ind.textContent=valida?'✓':'!'; ind.className='nss-indicator '+(valida?'nss-ok':'nss-err'); }
  if(ind2){
    const coincide=Boolean(confirmacion)&&confirmacion===val;
    ind2.textContent=coincide?'✓':(confirmacion?'!':'');
    ind2.className='nss-indicator '+(coincide?'nss-ok':'nss-err');
  }
}

async function guardarAsesor(){
  const nombre=(getVal('as-nombre')||'').trim();
  const password=getVal('as-pin');
  const password2=getVal('as-pin2');
  if(!nombre){showToast('El nombre es obligatorio','warn');return;}
  if(!editingAsesorId&&!password){showToast('Crea una contraseña temporal para el asesor','warn');return;}
  if(password&&!passwordValida(password)){showToast('La contraseña no cumple todos los requisitos','warn');return;}
  if(password&&password!==password2){showToast('Las contraseñas no coinciden','warn');return;}
  const anterior=editingAsesorId?store.asesores.find(a=>a.id===editingAsesorId):null;
  const passwordHash=password?await hashPin(password):(anterior?.pin||'');
  const asesor={
    id:editingAsesorId||'as_'+Date.now(),
    nombre,
    ciudad:getVal('as-ciudad'),
    rol:getVal('as-rol')||'asesor',
    activo:getVal('as-activo')!=='false',
    foto:asesorFotoTemp||(anterior?.foto||''),
    fechaAlta:anterior?.fechaAlta||new Date().toISOString().split('T')[0],
    pin:passwordHash,
  };
  if(editingAsesorId){
    const idx=store.asesores.findIndex(a=>a.id===editingAsesorId);
    if(idx>=0) store.asesores[idx]=asesor;
    // Actualizar sesión si es el asesor en sesión
    if(sesionActiva&&sesionActiva.id===editingAsesorId){ sesionActiva=asesor; actualizarSidebarSesion(); }
    showToast('Asesor actualizado','success');
  } else {
    store.asesores.push(asesor);
    showToast('Asesor creado','success');
  }
  saveStore();
  closeModal('modal-asesor');
  renderPage('asesores');
}

function eliminarAsesor(){
  if(!editingAsesorId||editingAsesorId==='asesor_ea') return;
  if(!confirm('¿Eliminar este asesor? Sus clientes quedarán sin asesor asignado.')) return;
  store.asesores=store.asesores.filter(a=>a.id!==editingAsesorId);
  saveStore();
  closeModal('modal-asesor');
  showToast('Asesor eliminado','info');
  renderPage('asesores');
}
