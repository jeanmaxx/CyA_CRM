// ==================== STORE ====================
const STORE_KEY = 'ca_crm_v2';

const SERVICIOS_DEFAULT = [
  {
    id:'retiro_desempleo', nombre:'Retiro por desempleo', activo:true,
    descripcion:'Gestion y acompanamiento del retiro de fondos AFORE por motivo de desempleo.',
    esquema:'mixto',
    honorariosFijo:8000, comisionFija:3000, umbralFijo:35000, montoReferencia:35190,
    honorariosPct:25, comisionPct:40,
    docs:['ine','nss','curp','acta','comprobante','rfc'],
    plantilla:'[CENTRO]CONTRATO DE PRESTACION DE SERVICIOS[/CENTRO]\n\nQue celebran por una parte {{EMPRESA_NOMBRE}} con domicilio en {{EMPRESA_DOMICILIO}}, a quien en lo sucesivo se le referira en este contrato como LA EMPRESA y por otra al mayor de edad a {{CLIENTE_NOMBRE}} con domicilio ubicado en {{CLIENTE_DOMICILIO}}, a quien se le referira como EL CONTRATANTE DEL SERVICIO.\n\nLAS PARTES patentizan su conformidad para sujetarse a este contrato al tenor literal de las siguientes DECLARACIONES Y CLAUSULAS:\n[SEPARADOR]\n[CENTRO]DECLARACIONES[/CENTRO]\n\nI.   Declara LA EMPRESA estar dedicada a la mediacion y tramitologia en materia de Seguridad Social, relacionada con las Administradoras de Fondos para el Retiro (AFORES).\nII.  Que le ha informado a EL CONTRATANTE DEL SERVICIO que su obligacion bajo el presente contrato es una obligacion de medios y resultados.\nIII. Declara EL CONTRATANTE DEL SERVICIO ser mayor de edad, mexicano, con capacidad legal, manifestando que es su deseo contratar los servicios de la empresa.\nIV.  Sigue declarando EL CONTRATANTE DEL SERVICIO que cuenta con la capacidad legal y los recursos economicos necesarios para celebrar el presente contrato.\nV.   Declara EL CONTRATANTE DEL SERVICIO que esta enterado del presupuesto de los honorarios que son materia del presente contrato.\nVI.  Sigue declarando EL CONTRATANTE DEL SERVICIO que ha proporcionado a LA EMPRESA toda la informacion y documentacion de los asuntos encomendados.\n[SEPARADOR]\n[CENTRO]CLAUSULAS[/CENTRO]\n\n[NEGRITA]PRIMERA.- OBJETO.[/NEGRITA] LA EMPRESA se obliga frente a EL CONTRATANTE DEL SERVICIO a realizar las siguientes actividades:\na) BUSCAR QUE EL CONTRATANTE OBTENGA UN APOYO POR DESEMPLEO DE {{MONTO_RETIRO}} CON ASESORAMIENTO DE LA EMPRESA, SIEMPRE Y CUANDO TENGA UN SALDO EN AFORE MAYOR A $35,000.00\nb) ACOMPANAR EN EL PROCESO AL CONTRATANTE DEL SERVICIO HASTA QUE HAYA OBTENIDO SU RECURSO.\nc) ASESORAR Y ACLARAR DUDAS DEL CONTRATANTE DURANTE TODO EL PROCESO.\nd) CAMBIO DE AFORE Y ACTUALIZACION DE INFORMACION PARA AGILIZAR EL TRAMITE.\ne) ALTA ANTE EL IMSS CON SALARIO DIARIO INTEGRADO DE $1,200.00\nf) ACOMPANAMIENTO PARA APERTURA DE CUENTA PARA DEPOSITOS\ng) PROCESOS DE COBRO DENTRO DE LA AFORE PARA LA OBTENCION DEL RECURSO.\n\n[NEGRITA]SEGUNDA.- Honorarios.[/NEGRITA] EL CONTRATANTE DEL SERVICIO se obliga a pagar a LA EMPRESA la cantidad de {{HONORARIOS}} de la cantidad recuperada de la AFORE. Este pago debera efectuarse dentro de 12 horas habiles a partir del deposito hecho por la AFORE.\n\n[NEGRITA]TERCERA.-[/NEGRITA] EL CONTRATANTE DEL SERVICIO encomienda con caracter de EXCLUSIVO a LA EMPRESA la gestoria y tramitologia para la obtencion del monto de retiro por desempleo.\n\n[NEGRITA]CUARTA.-[/NEGRITA] EL CONTRATANTE DEL SERVICIO entrega a LA EMPRESA toda la informacion y documentos necesarios para el tramite.\n\n[NEGRITA]QUINTA.-[/NEGRITA] EL CONTRATANTE DEL SERVICIO da la exclusividad por un periodo de 2 meses para concluir el tramite.\n\n[NEGRITA]SEXTA.-[/NEGRITA] En caso de desistimiento, EL CONTRATANTE DEL SERVICIO pagara una penalizacion de $3,500.00 en un plazo maximo de 72 horas.\n\n[NEGRITA]SEPTIMA.-[/NEGRITA] La naturaleza del presente contrato es civil, regulado por el Codigo Civil del Estado de Queretaro.\n\n[NEGRITA]OCTAVA.-[/NEGRITA] Las partes no tienen relacion laboral ni subordinacion alguna.\n\n[NEGRITA]NOVENA.-[/NEGRITA] El presente contrato tendra duracion de 2 meses a partir de la fecha de firma.\n\n[NEGRITA]DECIMA.-[/NEGRITA] Cualquier modificacion debe constar por escrito y estar firmado por las partes.\n\n[NEGRITA]DECIMA PRIMERA.-[/NEGRITA] Ambas partes se someten al fuero de las leyes del Estado de Queretaro y a los tribunales de San Juan del Rio, Queretaro.\n[SEPARADOR]\nEnteradas las partes, firman el presente contrato por duplicado el {{FECHA_CONTRATO}} en {{CIUDAD_CONTRATO}}.\n\n[FIRMA]LA EMPRESA - {{EMPRESA_REPRESENTANTE}} | EL CONTRATANTE DEL SERVICIO - {{CLIENTE_NOMBRE}}[/FIRMA]'
  },
  { id:'asesoria_pension', nombre:'Asesoría pensión', activo:true, descripcion:'Orientación y gestión para trámites de pensión IMSS/ISSSTE.', esquema:'manual', docs:['ine','nss','curp','acta'], plantilla:'CONTRATO DE ASESORÍA PENSIÓN\n\n[Plantilla por definir]' },
  { id:'correccion_imss', nombre:'CORRECCIÓN ANTE IMSS', activo:true, descripcion:'Acompañamiento para correcciones de datos y documentos ante el IMSS.', esquema:'manual', docs:['ine','nss','curp','acta','comprobante'], plantilla:'CONTRATO DE CORRECCIÓN ANTE IMSS\n\n[Plantilla por definir]' },
  { id:'seguro_social', nombre:'Servicio de seguro social', activo:true, descripcion:'Gestión de trámites y servicios ante el IMSS.', esquema:'manual', docs:['ine','nss','curp'], plantilla:'CONTRATO SEGURO SOCIAL\n\n[Plantilla por definir]' },
  { id:'ppr', nombre:'PPR (Plan Personal de Retiro)', activo:true, descripcion:'Asesoría y contratación de Plan Personal de Retiro.', esquema:'manual', docs:['ine','nss','curp','acta','comprobante','rfc','estado_cuenta'], plantilla:'CONTRATO PPR\n\n[Plantilla por definir]' },
];

const DOCS_CATALOGO = [
  {id:'ine',label:'INE (ambos lados)'},
  {id:'nss',label:'Número de Seguridad Social'},
  {id:'curp',label:'CURP (actualizada)'},
  {id:'acta',label:'Acta de nacimiento (actualizada)'},
  {id:'comprobante',label:'Comprobante de domicilio (máx. 3 meses)'},
  {id:'rfc',label:'RFC'},
  {id:'estado_cuenta',label:'Estado de cuenta bancario'},
  {id:'cartilla_imss',label:'Cartilla del IMSS'},
];

let store = {
  clientes:[], servicios:[], agenda:[],
  asesores:[], colaboradores:[], leads:[],
  configuracion:{
    nombre_app:'C&A CRM Suite', tema:'dark',
    empresa_nombre:'Casillas & Asociados',
    empresa_domicilio:'C. Gregorio Moreno #65, Col. 2da Amp. Adolfo López Mateos, CP 76750, Tequisquiapan, Querétaro.',
    empresa_representante:'JORGE CASILLAS AVILA',
    ciudad_contrato:'Tequisquiapan, Querétaro',
    pin_admin:'', bloqueo_firma:true,
    logo_empresa: '',  // base64
  }
};
let sesionActiva = null; // { id, nombre, rol, pin, foto }
let currentPage = 'dashboard';
let editingId = null;
let editingServicioId = null;
let extraDocsModal = [];
let chartInstances = {};
let perfilClienteActivo = null;
let clienteFormDirty = false;
let perfilDirty = false;

function loadStore(){
  try{ const r=localStorage.getItem(STORE_KEY); if(r) store=JSON.parse(r); }catch(e){}
  if(!store||typeof store!=='object') store={clientes:[],servicios:[],agenda:[],asesores:[],colaboradores:[],leads:[],configuracion:{}};
  if(!store.clientes) store.clientes=[];
  if(!store.configuracion) store.configuracion={};
  if(!store.servicios||store.servicios.length===0) store.servicios=SERVICIOS_DEFAULT;
  // Mantener el catálogo actualizado sin borrar personalizaciones existentes.
  SERVICIOS_DEFAULT.forEach(def=>{ if(!store.servicios.some(s=>s.id===def.id)) store.servicios.push({...def}); });
  const retiroCfg=store.servicios.find(s=>s.id==='retiro_desempleo');
  if(retiroCfg){
    if(!retiroCfg.honorariosFijo) retiroCfg.honorariosFijo=8000;
    if(!retiroCfg.comisionFija||Number(retiroCfg.comisionFija)===2000) retiroCfg.comisionFija=3000;
    if(!retiroCfg.umbralFijo) retiroCfg.umbralFijo=35000;
    if(!retiroCfg.montoReferencia) retiroCfg.montoReferencia=35190;
  }
  if(!store.asesores) store.asesores=[];
  if(!store.colaboradores) store.colaboradores=[];
  if(!store.leads) store.leads=[];
  // Unificar las variantes históricas del servicio de corrección sin perder registros vinculados.
  const correccionIds=new Set(['correccion_imss','correccion_documentacion','actualizacion_datos','actualizacion_correccion_datos','correccion_datos']);
  const normalizarServicio=v=>(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esCorreccion=s=>{
    const n=normalizarServicio(s.nombre);
    return correccionIds.has(s.id)||((n.includes('CORRECCION')||n.includes('ACTUALIZACION'))&&(n.includes('IMSS')||n.includes('DATOS')||n.includes('DOCUMENT')));
  };
  const serviciosCorreccion=store.servicios.filter(esCorreccion);
  const idsCorreccion=new Set([...correccionIds,...serviciosCorreccion.map(s=>s.id)]);
  const baseCorreccion=serviciosCorreccion.find(s=>s.id==='correccion_imss')||serviciosCorreccion[0]||{};
  const servicioCorreccion={...baseCorreccion,...SERVICIOS_DEFAULT.find(s=>s.id==='correccion_imss'),id:'correccion_imss',nombre:'CORRECCIÓN ANTE IMSS',esquema:'manual'};
  store.servicios=store.servicios.filter(s=>!esCorreccion(s));
  store.servicios.push(servicioCorreccion);
  [...store.clientes,...store.leads].forEach(registro=>{ if(idsCorreccion.has(registro.servicio)) registro.servicio='correccion_imss'; });
  const migrarEtapasV21=store.configuracion.etapasProspectoV21Migradas!==true;
  const estadosLeadValidos=['pensiones','correccion_imss','semanas','sindos','aprobado','archivado'];
  store.leads.forEach(l=>{
    if(!estadosLeadValidos.includes(l.estado)) l.estado='semanas';
    if(!l.fechaInicio) l.fechaInicio=new Date().toISOString();
    if(!l.servicio) l.servicio='retiro_desempleo';
    if(migrarEtapasV21&&l.estado==='semanas'&&l.servicio==='asesoria_pension') l.estado='pensiones';
    if(migrarEtapasV21&&l.estado==='semanas'&&l.servicio==='correccion_imss') l.estado='correccion_imss';
  });
  store.configuracion.etapasProspectoV21Migradas=true;
  if(store.configuracion.etapasClientesV22Migradas!==true){
    store.clientes.forEach(c=>{
      if(c.servicio==='correccion_imss'&&!STAGES_CORRECCION_IMSS.some(s=>s.id===c.etapa)){
        c.etapa=c.etapa==='concluido'?'resuelto':c.etapa==='proceso'?'proceso_imss':'recabando_documentacion';
      }
      if(c.servicio==='asesoria_pension'&&!STAGES_PENSIONES.some(s=>s.id===c.etapa)){
        c.etapa=c.etapa==='concluido'?'proceso_afore_resuelto':c.etapa==='proceso'?'proceso_imss':'recabando_documentacion';
      }
    });
    store.configuracion.etapasClientesV22Migradas=true;
  }
  // Colaboradores iniciales
  if(store.colaboradores.length===0){
    store.colaboradores=[
      {id:'col_daniela',nombre:'Daniela',ciudad:'Sierra / Cadereyta',asesorId:'asesor_ea',pctComision:50,activo:true,fechaAlta:new Date().toISOString().split('T')[0]},
      {id:'col_analaura',nombre:'Ana Laura',ciudad:'Irapuato',asesorId:'asesor_ea',pctComision:50,activo:true,fechaAlta:new Date().toISOString().split('T')[0]},
    ];
  }
  if(!store.agenda) store.agenda=[];
  if(!store.configuracion.empresa_nombre) store.configuracion.empresa_nombre='Casillas & Asociados';
  if(!store.configuracion.empresa_representante) store.configuracion.empresa_representante='JORGE CASILLAS AVILA';
  if(!store.configuracion.ciudad_contrato) store.configuracion.ciudad_contrato='Tequisquiapan, Querétaro';
  if(store.configuracion.pin_admin===undefined) store.configuracion.pin_admin='';
  if(store.configuracion.bloqueo_firma===undefined) store.configuracion.bloqueo_firma=true;
  if(!store.configuracion.logo_empresa) store.configuracion.logo_empresa='';
  // La versión en la nube nunca crea usuarios ni contraseñas locales.
  // Completar también los recordatorios creados en versiones anteriores.
  store.agenda.forEach(evento=>{
    if(!evento.leadId||!(evento.autoGenerado||String(evento.id||'').startsWith('ev_recontacto_'))) return;
    const lead=store.leads.find(l=>l.id===evento.leadId);
    if(lead&&!String(evento.notas||'').includes('Nombre:')){
      const notaAnterior=String(evento.notas||'').trim();
      const esNotaGenerica=/^Está por cumplir 5 años/i.test(notaAnterior);
      evento.notas=notasRecontactoLead(lead)+(!esNotaGenerica&&notaAnterior?'\nNota anterior: '+notaAnterior:'');
    }
  });
  applyTheme(store.configuracion.tema||'dark');
}
function saveStore(){ localStorage.setItem(STORE_KEY,JSON.stringify(store)); }

// ==================== CONSTANTS ====================
const STAGES_RETIRO=[
  {id:'generando_contrato', label:'Generando contrato',   short:'1·Contrato'},
  {id:'contrato_firmas',    label:'Contrato en firmas',   short:'2·Firmas'},
  {id:'contrato_firmado',   label:'Contrato firmado',     short:'3·Firmado'},
  {id:'dado_alta',          label:'Dado de alta',         short:'4·Alta'},
  {id:'afore_actualizada',  label:'AFORE actualizada',    short:'5·AFORE'},
  {id:'solicitud_realizada',label:'Solicitud realizada',  short:'6·Solicitud'},
  {id:'deposito_recibido',  label:'Depósito recibido',    short:'7·Depósito'},
  {id:'honorarios_recibidos',label:'Honorarios recibidos',short:'8·Honorarios'},
];
const STAGES_CORRECCION_IMSS=[
  {id:'recabando_documentacion',label:'Recabando documentación',short:'1·Documentación'},
  {id:'proceso_imss',label:'En proceso ante el IMSS',short:'2·Proceso IMSS'},
  {id:'resuelto',label:'Resuelto',short:'3·Resuelto'},
];
const STAGES_PENSIONES=[
  {id:'recabando_documentacion',label:'Recabando documentación',short:'1·Documentación'},
  {id:'proceso_imss',label:'En proceso ante el IMSS',short:'2·Proceso IMSS'},
  {id:'resolucion_entregada',label:'Resolución entregada',short:'3·Resolución'},
  {id:'proceso_afore_resuelto',label:'En proceso ante AFORE resuelto',short:'4·AFORE resuelto'},
];
const STAGES_DEFAULT=[{id:'inicio',label:'Inicio'},{id:'proceso',label:'En proceso'},{id:'concluido',label:'Concluido'}];
const DOCS_RETIRO=[
  {id:'ine',label:'INE (ambos lados)'},
  {id:'nss',label:'Número de Seguridad Social'},
  {id:'curp',label:'CURP (actualizada)'},
  {id:'acta',label:'Acta de nacimiento (actualizada)'},
  {id:'comprobante',label:'Comprobante de domicilio (máx. 3 meses)'},
  {id:'rfc',label:'RFC'},
  {id:'cuenta_bancaria',label:'Datos bancarios (CLABE)'},
  {id:'cita_afore',label:'Cita actualización AFORE'},
];
const DOCS_PPR=[...DOCS_RETIRO,{id:'estado_cuenta',label:'Estado de cuenta bancario'}];
const DOCS_DEFAULT=DOCS_RETIRO.slice(0,4);
// SERVICIOS label helper — lee del store en tiempo real
const SERVICIOS_STATIC={retiro_desempleo:'Retiro desempleo',asesoria_pension:'Asesoría pensión',correccion_imss:'CORRECCIÓN ANTE IMSS',seguro_social:'Seguro social',ppr:'PPR'};
function getSvcLabel(id){ const s=store.servicios.find(x=>x.id===id); return s?s.nombre:(SERVICIOS_STATIC[id]||id||'—'); }
const FUENTES={facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',recomendacion:'Recomendación',circulo_calido:'Círculo cálido',de_colaborador:'De colaborador',otro:'Otro'};
const SERVICIOS={retiro_desempleo:'Retiro desempleo',asesoria_pension:'Asesoría pensión',correccion_imss:'CORRECCIÓN ANTE IMSS',seguro_social:'Seguro social',ppr:'PPR'};
const FUENTE_COLORS=['#3b82f6','#ec4899','#a855f7','#10b981','#f59e0b','#64748b'];

function stagesFor(svc){
  if(svc==='retiro_desempleo') return STAGES_RETIRO;
  if(svc==='asesoria_pension') return STAGES_PENSIONES;
  if(svc==='correccion_imss') return STAGES_CORRECCION_IMSS;
  return STAGES_DEFAULT;
}
function docsFor(svc){
  const servicio=store.servicios.find(s=>s.id===svc);
  if(servicio&&servicio.docs){
    return servicio.docs.map(docId=>{
      const found=DOCS_CATALOGO.find(d=>d.id===docId);
      return found||{id:docId,label:docId};
    });
  }
  return svc==='ppr'?DOCS_PPR:svc==='retiro_desempleo'?DOCS_RETIRO:DOCS_DEFAULT;
}
function getServicio(id){ return store.servicios.find(s=>s.id===id)||null; }

// ==================== NAVIGATE ====================
function navigate(page, el){
  // Control de acceso: asesor no puede entrar a módulos de admin
  const soloAdmin=['servicios','asesores','configuracion'];
  if(soloAdmin.includes(page)&&!isAdmin()){
    showToast('Acceso restringido — solo administradores','warn');
    return;
  }
  currentPage=page;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  else { const found=document.querySelector('[data-page="'+page+'"]'); if(found) found.classList.add('active'); }
  const titles={
    dashboard:['Dashboard','Resumen general'],
    clientes:['Clientes','Base de clientes'],
    pipeline:['Pipeline','Estado de trámites activos'],
    contratos:['Contratos','Generador y visor de contratos'],
    plantillas:['Plantillas','Mensajes personalizados para clientes'],
    agenda:['Agenda','Citas, recordatorios y seguimientos'],
    finanzas:['Finanzas','Comisiones y proyección de ingresos'],
    leads:['Prospectos','Leads y seguimiento de conversión'],
    colaboradores:['Colaboradores','Red de colaboradores y comisiones'],
    servicios:['Servicios','Catálogo y reglas de operación'],
    asesores:['Asesores','Gestión del equipo y rendimiento'],
    configuracion:['Configuración','Ajustes del sistema']
  };
  const [t,s]=titles[page]||[page,''];
  document.getElementById('topbar-title').textContent=t;
  document.getElementById('topbar-sub').textContent=s;
  const cta=document.getElementById('topbar-cta');
  cta.style.display=page==='clientes'?'':'none';
  destroyCharts();
  renderPage(page);
}

function destroyCharts(){
  Object.values(chartInstances).forEach(c=>{try{c.destroy();}catch(e){}});
  chartInstances={};
}
