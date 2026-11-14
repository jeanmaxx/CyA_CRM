'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('app-client-hybrid-v2.js','utf8');
const panel=id=>'<section class="tab-panel" id="'+id+'">Original</section>';
const profileContents=()=>'<div class="profile-stage-wrap">Original</div><div class="profile-summary-grid">Original</div><div id="perfil-tabs"></div>'+
 ['pd-contacto','pd-datos','pd-docs','pd-cita-afore','pd-contratos','pd-finanzas','pd-historial'].map(panel).join('');
const html='<div class="modal-overlay open" id="modal-perfil"><div class="modal client-profile-modal">'+
 '<div class="profile-header"><div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div>'+
 '<div class="profile-header-actions"><button id="perfil-edit-btn"></button><button id="perfil-regresar-prospecto-btn"></button>'+
 '<button id="perfil-descartar-btn"></button><button class="profile-close"></button></div></div>'+
 '<div id="perfil-body">'+profileContents()+'</div></div></div>';
const dom=new JSDOM(html,{url:'https://crm.example.invalid',runScripts:'outside-only'}),w=dom.window,d=w.document;
const client={id:'c1',nombre:'CLIENTE DEMO',asesorId:'a1',servicio:'retiro_desempleo',etapa:'contrato_firmado',contratoFirmado:true,fechaRegistro:'2026-11-11',curp:'CURP',telefono:'4421234567',fechaRetiroEstimada:'2026-12-28',historial:[]};
w.perfilClienteActivo='c1';w.store={clientes:[client],agenda:[],asesores:[{id:'a1',nombre:'Asesor'}],colaboradores:[]};
w.__cyaClientActivitiesV2={statuses:()=>[
 {id:'contrato',state:'done'},{id:'firmas',state:'done'},{id:'firmado',state:'done'},{id:'alta',state:'future'},{id:'app',state:'future'}]};
w.FUENTES={};
let opens=[],closed=0;w.openModalAgenda=id=>{opens.push(id)};w.closeModal=id=>{if(id==='modal-perfil')closed++;d.getElementById(id)?.classList.remove('open')};
w.agendaPrioritariaDashboard=()=>[];
w.eval(source);
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await tick();
 assert.equal(d.querySelectorAll('.cya-client-summary-card').length,4);
 assert.equal(d.getElementById('cya-operational-profile'),null);
 assert.match(d.querySelector('.cya-client-next strong').textContent,/Alta/,'Next operational step determined from canonical 12 stages');
 assert.equal(d.querySelector('.cya-client-next').classList.contains('is-neutral'),true,'No agenda = no invented priority');
 assert.equal(d.querySelector('[data-cya-next-event]'),null,'No phantom event action');
 assert.equal(d.querySelector('#perfil-title').textContent,'Expediente del cliente');
 assert.equal(d.querySelector('#perfil-sub strong').textContent,'11/11/2026');
 assert.equal(d.querySelector('[data-cya-summary="collection"]').textContent.includes('30/12/2026'),true,'Existing +2 business days display preserved');
 // Simulate a registered contract-stage agenda event with existing SLA metadata.
 w.store.agenda.push({id:'ev1',clienteId:'c1',regla:'flujo_confirmar_alta',titulo:'Confirmar alta',fecha:'2026-11-13',hora:'09:00',completado:false});
 w.agendaPrioritariaDashboard=()=>[{id:'ev1',seguimientoContrato:{clave:'vencido',etiqueta:'Vencido'}}];
 d.getElementById('perfil-body').innerHTML=profileContents();await tick();
 const action=d.querySelector('[data-cya-next-event="ev1"]');
 assert(action,'Existing event is linked to the next activity');
 assert(action.classList.contains('is-high'),'Read existing SLA for urgency color');
 assert.match(action.textContent,/VENCIDO/);
 const stateBefore=JSON.stringify(w.store);
 action.click();assert.deepEqual(opens,['ev1'],'Link opens precisely the existing agenda event');
 assert.equal(closed,1,'Profile closes when opening linked event');
 assert.equal(JSON.stringify(w.store),stateBefore,'UI never mutates client or event data');
 dom.window.close();
 console.log('PASS next action: canonical pending step, neutral without event, existing SLA and direct Agenda link');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
