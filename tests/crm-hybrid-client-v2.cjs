const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('app/index.html','utf8'),css=fs.readFileSync('app-client-hybrid-v2.css','utf8'),client=fs.readFileSync('app-client-hybrid-v2.js','utf8'),loader=fs.readFileSync('app-prospect-manual-fields-fix.js','utf8'),workflow=fs.readFileSync('app-workflow.js','utf8');
assert.match(html,/app-client-hybrid-v2\.css\?v=20261113-polish2/);
assert.match(loader,/app-client-hybrid-v2\.js\?v=20261113-polish2/);
assert.match(css,/cya-hybrid-client-cards/);
assert.ok(!client.includes('fechaAltaAfore + 46'),'Client UI must not change existing date formula');
assert.ok(workflow.includes('fechaRetiroEstimada'),'Core dates remain managed by existing workflow');
const panel=(id,html='Original')=>'<section class="tab-panel" id="'+id+'">'+html+'</section>';
const originalPanels=[
 panel('pd-contacto','<div id="native-contact">Contacto original</div>'),
 panel('pd-datos','<div class="info-rows"><div class="info-row"><span class="ir-label">NSS</span><span>12345678901</span></div><div class="info-row"><span class="ir-label">Banco</span><span>Santander</span></div></div>'),
 panel('pd-docs','<div id="native-docs">Lista original de documentos</div>'),
 panel('pd-contratos','<button id="native-contract">Crear contrato existente</button>'),
 panel('pd-cita-afore','<button id="native-afore">Editar cita existente</button>'),
 panel('pd-finanzas','<button id="native-finance">Guardar finanzas existentes</button>'),
 panel('pd-historial','<div id="native-history">Historial original</div>')
];
const shell=()=>'<div class="modal-overlay open" id="modal-perfil"><div class="modal client-profile-modal"><header class="profile-header"><div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div><div class="profile-header-actions"><button id="perfil-whatsapp-btn">WhatsApp</button><button id="perfil-edit-btn">Editar</button><button id="perfil-save-btn">Guardar</button><button id="perfil-regresar-prospecto-btn">Regresar</button><button id="perfil-descartar-btn">Descartar</button><button class="profile-close">Cerrar</button></div></header><main id="perfil-body"><div class="profile-stage-wrap">Etapas actuales</div><div class="profile-summary-grid">Resumen anterior</div><div class="tabs" id="perfil-tabs">Pestañas</div>'+originalPanels.join('')+'</main></div></div>';
const dom=new JSDOM(shell(),{url:'https://example.test',runScripts:'outside-only'});
const w=dom.window,d=w.document,clientData={id:'c1',nombre:'CLIENTE DE PRUEBA',curp:'CURPDEPRUEBA',telefono:'4420000000',ciudad:'Querétaro',fechaRetiroEstimada:'2026-12-27',fechaFirmaContrato:'2026-11-11',contratoFirmado:false,etapa:'generando_contrato',colaboradorId:'col1',asesorId:'as1',fuente:'meta_ads',historial:[{texto:'Creación'}],historialContratos:[],nss:'12345678901',banco:'Santander',notas:'Llamada'};
w.store={clientes:[clientData],colaboradores:[{id:'col1',nombre:'Jessica'}],asesores:[{id:'as1',nombre:'Asesor de prueba'}]};
w.perfilClienteActivo='c1';w.FUENTES={meta_ads:'Meta Ads'};
let agendaOpens=0,linkedAgendaClient='';w.openModalAgenda=()=>agendaOpens++;w.selAgCliente=id=>{linkedAgendaClient=id};w.closeModal=id=>d.getElementById(id)?.classList.remove('open');
w.cyaAbrirSolicitudCambioAsesor=()=>{};
w.eval(client);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await tick();
 const cards=[...d.querySelectorAll('[data-hybrid-client]')];
 assert.equal(cards.length,9);
 assert.deepEqual(cards.map(c=>c.dataset.hybridClient),['contratos','identidad','previsional','afore','banco','finanzas','comisiones','notas','historial']);
 assert.match(d.querySelector('#cya-hybrid-client-dates').textContent,/27\/12\/2026/);
 assert.match(d.querySelector('#cya-hybrid-client-meta').textContent,/Jessica/);
 assert(d.querySelector('#cya-hybrid-client-meta').classList.contains('cya-hybrid-client-meta'),'Header metadata must receive responsive CSS');
 assert(d.querySelector('#cya-hybrid-client-dates').classList.contains('cya-hybrid-client-dates'),'Header date labels must receive responsive CSS');
 assert.match(d.querySelector('#cya-hybrid-client-meta').textContent,/Meta Ads/);
 assert.equal(d.getElementById('cya-hybrid-copy-curp'),null,'No floating CURP copy icon in client header');
 assert.ok(d.querySelector('#cya-hybrid-client-admin summary svg'),'Settings menu uses a consistent gear icon');
 assert.equal(d.querySelector('#cya-hybrid-client-panel').hidden,false,'Contracts open automatically before signed');
 assert.ok(d.querySelector('#cya-hybrid-client-content #native-contract'),'Original native contract controls preserved');
 const click=x=>d.querySelector('[data-hybrid-client="'+x+'"]').click();
 click('identidad');assert.ok(d.querySelector('#cya-hybrid-client-content #native-contact'));
 click('previsional');assert.ok(d.querySelector('#cya-hybrid-client-content #pd-datos'));
 assert.equal(d.querySelector('#cya-hybrid-client-content .info-row:nth-child(2)').hidden,true);
 click('banco');assert.equal(d.querySelector('#cya-hybrid-client-content .info-row:nth-child(1)').hidden,true);
 assert.equal(d.querySelector('#cya-hybrid-client-content .info-row:nth-child(2)').hidden,false);
 click('afore');assert.ok(d.querySelector('#cya-hybrid-client-content #native-afore'));assert.ok(d.querySelector('#cya-hybrid-client-content #native-docs'));
 click('finanzas');assert.ok(d.querySelector('#cya-hybrid-client-content #native-finance'));
 click('comisiones');assert.match(d.querySelector('#cya-hybrid-client-content').textContent,/Jessica/);
 click('notas');assert.match(d.querySelector('#cya-hybrid-client-content').textContent,/Llamada/);
 click('historial');assert.ok(d.querySelector('#cya-hybrid-client-content #native-history'));
 assert.equal(d.querySelectorAll('.tab-panel').length,7,'Native panels not duplicated or lost');
 assert.ok(d.querySelector('#cya-hybrid-return #perfil-regresar-prospecto-btn'));
 assert.ok(d.querySelector('#cya-hybrid-discard #perfil-descartar-btn'));
 assert.equal(d.querySelector('.cya-hybrid-danger').disabled,true,'No unverified destructive action');
 // Rerender the legacy profile after confirming signature: contracts move down and form starts closed.
 clientData.contratoFirmado=true;clientData.etapa='contrato_firmado';
 d.querySelector('#perfil-body').innerHTML='<div class="profile-stage-wrap"></div><div class="profile-summary-grid"></div><div id="perfil-tabs"></div>'+originalPanels.join('');
 await tick();
 const after=[...d.querySelectorAll('[data-hybrid-client]')].map(c=>c.dataset.hybridClient);
 assert.deepEqual(after,['identidad','previsional','afore','banco','finanzas','comisiones','contratos','notas','historial']);
 assert.equal(d.querySelector('#cya-hybrid-client-panel').hidden,true,'Signed client starts without a selected section');
 assert.ok(d.getElementById('cya-hybrid-client-agenda'),'Agenda shortcut visible in client profile');
 d.getElementById('cya-hybrid-client-agenda').click();
 assert.equal(agendaOpens,1,'Agenda shortcut invokes existing event creation');
 assert.equal(linkedAgendaClient,'c1','Agenda event is linked to current client');
 w.close();console.log('PASS: 9 cards, signed ordering, existing profile controls, bank/AFORE/finance, compact dates and admin menu.');
})().catch(error=>{console.error(error);w.close();process.exitCode=1});
