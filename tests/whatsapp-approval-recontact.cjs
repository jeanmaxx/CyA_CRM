const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Sin mensajes reales, datos productivos ni solicitudes de red.
const approvalSource=fs.readFileSync('app-prospect-workflow.js','utf8');
const start=approvalSource.indexOf('async function guardarLead(){');
const next=approvalSource.indexOf('\nfunction ',start+1);
const end=next>start?next:approvalSource.length;
assert(start>0&&end>start,'Debe encontrarse guardarLead() completo');
const code=approvalSource.slice(start,end);
const calls=[],fields={
  'lead-nombre':'CARLOS RAMÍREZ','lead-tel':'4421234567','lead-curp':'',
  'lead-servicio':'retiro_desempleo','lead-estado':'aprobado',
  'lead-colaborador':'','lead-notas':''
};
const saved={id:'lead-demo',nombre:'CARLOS RAMÍREZ',estado:'sindos',fechaRegistro:'2026-10-25'};
const ctx=vm.createContext({
  window:{cyaAbrirCentroMensajesWhatsApp:key=>calls.push(['open',key])},
  store:{leads:[saved],agenda:[]},editingLeadId:saved.id,
  getVal:key=>fields[key]||'',
  leerFechaMX:()=> '2026-10-25',
  fechaISOLocal:()=> '2026-11-04',
  validarFechasElegibilidad:()=>true,
  validarCurpEstructura:()=>({errores:[]}),
  recogerElegibilidadLead:()=>({}),
  cloudSyncNow:async()=>{calls.push(['saved']);},
  showToast:()=>{},closeModal:key=>calls.push(['close',key]),
  renderPage:key=>calls.push(['render',key]),
  registrarCambioFecha:()=>{},asesorDestinoVista:()=> 'owner'
});
vm.runInContext(code,ctx);
(async()=>{
  await vm.runInContext('guardarLead()',ctx);
  assert.deepEqual(calls,[['saved'],['close','modal-lead'],['render','leads'],['open','aprobado']]);
  calls.length=0;
  await vm.runInContext('guardarLead()',ctx);
  assert.deepEqual(calls,[['saved'],['close','modal-lead'],['render','leads']],'No mostrar de nuevo al re-guardar Aprobado');
  calls.length=0;
  fields['lead-estado']='semanas';
  await vm.runInContext('guardarLead()',ctx);
  calls.length=0;
  fields['lead-estado']='aprobado';
  ctx.cloudSyncNow=async()=>{throw Error('Nube no disponible');};
  await vm.runInContext('guardarLead()',ctx);
  assert(!calls.some(c=>c[0]==='open'),'No abrir si falla el guardado en la nube');

  const dateCalls=[];
  const win={};
  const document={
    getElementById:()=>null,
    addEventListener:()=>{},
  };
  const lead={id:'L2',nombre:'ANA',fechaUltimoRetiro:'2025-05-28',elegibilidad:{fechaRetiro:'2025-05-28'}};
  const dateCtx=vm.createContext({
    window:win,document,store:{plantillas:[],leads:[lead],agenda:[]},
    setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>0,
    sumarMesesISO:(date,months)=>{
      dateCalls.push([date,months]);
      const [year,month,day]=date.split('-').map(Number);
      const base=(year*12+month-1)+months;
      const nextYear=Math.floor(base/12),nextMonth=base%12+1;
      const lastDay=new Date(Date.UTC(nextYear,nextMonth,0)).getUTCDate();
      return [nextYear,String(nextMonth).padStart(2,'0'),String(Math.min(day,lastDay)).padStart(2,'0')].join('-');
    }
  });
  vm.runInContext(fs.readFileSync('app-wa-retiro5-dates.js','utf8'),dateCtx);
  const text='Retiro: {{FECHA_ULTIMO_RETIRO}}; recontacto: {{FECHA_RECONTACTO}}';
  const actual=win.cyaCompletarFechasRetiroWhatsApp(text,lead);
  assert.match(actual,/28 de mayo de 2025/);
  assert.match(actual,/28 de abril de 2030/);
  assert.deepEqual(dateCalls,[['2025-05-28',59]],'Debe usar el mismo esquema de 59 meses');
  lead.fechaRecontacto='2030-04-27';dateCalls.length=0;
  assert.match(win.cyaCompletarFechasRetiroWhatsApp(text,lead),/27 de abril de 2030/);
  assert.equal(dateCalls.length,0,'La fecha guardada prevalece sobre el cálculo');
  delete lead.fechaRecontacto;
  dateCtx.store.agenda.push({leadId:'L2',id:'ev_recontacto_L2',fecha:'2030-05-01'});
  assert.match(win.cyaCompletarFechasRetiroWhatsApp(text,lead),/1 de mayo de 2030/);
  dateCtx.store.agenda=[];
  lead.fechaUltimoRetiro='';
  lead.elegibilidad.fechaRetiro='2023-10-16';
  assert.match(win.cyaCompletarFechasRetiroWhatsApp(text,lead),/16 de septiembre de 2028/);
  const center=fs.readFileSync('app-whatsapp-message-center.js','utf8');
  assert.match(center,/cyaCompletarFechasRetiroWhatsApp\(personalized,contact\)/,'La fecha debe aplicarse durante el renderizado');
  console.log('Aprobación: un solo aviso después de guardar; retiro: 59 meses y prioridades de fecha OK');
})().catch(error=>{console.error(error);process.exitCode=1;});