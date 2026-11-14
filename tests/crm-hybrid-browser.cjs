// Browser-level responsive release smoke test. Synthetic data only.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const css=fs.readFileSync('app-client-hybrid-v2.css','utf8');
const stepsCss=fs.readFileSync('app-client-activities-v2.css','utf8');
const clientJs=fs.readFileSync('app-client-hybrid-v2.js','utf8');
const legacyOverviewJs=fs.readFileSync('app-client-profile-stage2.js','utf8');
const stepsJs=fs.readFileSync('app-client-activities-v2.js','utf8');
const whatsAppJs=fs.readFileSync('app-whatsapp-message-center.js','utf8');
const mk=(id,contents='Panel original')=>'<section class="tab-panel" id="'+id+'">'+contents+'</section>';
const panels=[
  mk('pd-contacto'),mk('pd-datos'),mk('pd-docs'),
  mk('pd-cita-afore'),mk('pd-contratos','<button>Generar contrato</button>'),
  mk('pd-finanzas','<button>Guardar finanzas</button>'),mk('pd-historial')
].join('');
const html='<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="modal-overlay open" id="modal-perfil"><div class="modal client-profile-modal"><header class="profile-header"><div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div><div class="profile-header-actions"><button id="perfil-whatsapp-btn">WhatsApp</button><button id="perfil-edit-btn">Editar</button><button id="perfil-regresar-prospecto-btn">Regresar</button><button id="perfil-descartar-btn">Descartar</button><button class="profile-close">Cerrar</button></div></header><main id="perfil-body"><div class="profile-stage-wrap"></div><div class="profile-summary-grid"></div><div id="perfil-tabs"></div>'+panels+'</main></div></div><div id="modal-cliente"></div><input id="lead-tel"></body></html>';
const errors=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const scenario of [
   {name:'desktop-dark',width:1440,height:900,theme:'dark'},
   {name:'desktop-light',width:1440,height:900,theme:'light'},
   {name:'tablet-dark',width:1024,height:768,theme:'dark'},
   {name:'tablet-light',width:1024,height:768,theme:'light'},
   {name:'mobile-dark',width:390,height:844,theme:'dark'},
   {name:'mobile-light',width:390,height:844,theme:'light'}
  ]){
   const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height},deviceScaleFactor:1});
   page.on('pageerror',err=>errors.push(scenario.name+': '+err.message));
   await page.setContent(html);
   await page.evaluate(theme=>{
    document.documentElement.dataset.theme=theme;
    window.store={clientes:[{id:'c1',nombre:'CLIENTE DEMO',curp:'AAAA000101HQTLLL01',telefono:'4421234567',ciudad:'Querétaro',asesorId:'a1',servicio:'retiro_desempleo',etapa:'generando_contrato',fechaRetiroEstimada:'2026-12-29',historialContratos:[],historial:[],estadoPago:'Pendiente',etapasOperativasV2:{}}],asesores:[{id:'a1',nombre:'Asesor Demo'}],colaboradores:[],plantillas:[],leads:[]};
    window.perfilClienteActivo='c1';
    window.sesionActiva={id:'a1',rol:'asesor',nombre:'Asesor Demo'};
    window.isAdmin=()=>false;
    window.showToast=()=>{};
    window.openPerfil=()=>{};
    window.closeModal=()=>{};
    window.openModalAgenda=()=>{};
    window.selAgCliente=()=>{};
    window.editCliente=()=>{};
    window.guardarCliente=async()=>{};
    window.cloudSyncNow=async()=>true;
    window.saveStore=()=>{};
    window.confirm=()=>true;
   },scenario.theme);
   await page.addStyleTag({content:css+'\n'+stepsCss});
   await page.addScriptTag({content:stepsJs});
   // The previous overview was concurrently installed in production. Exercise
   // both layers together to detect the duplicated six-card summary.
   await page.addScriptTag({content:legacyOverviewJs});
   await page.addScriptTag({content:clientJs});
   await page.waitForSelector('#cya-hybrid-client-root');
   await page.waitForTimeout(120);
   assert.equal(await page.locator('#cya2-overview, #cya2-pending').count(),0,scenario.name+' legacy overview must not compete with hybrid cards');
   assert.equal(await page.locator('#cya-hybrid-copy-curp').count(),0,scenario.name+' no obsolete floating CURP icon');
   assert.equal(await page.locator('#cya-hybrid-client-admin summary svg').count(),1,scenario.name+' SVG settings cog');
   assert.equal(await page.locator('.cya-hybrid-client-card').count(),9,scenario.name+' 9 cards');
   assert.equal(await page.locator('#cya-operational-profile').count(),0,scenario.name+' internal 12-step bar removed');
   assert.equal(await page.locator('.cya-client-summary-card').count(),4,scenario.name+' four executive cards');
   assert.equal(await page.locator('#perfil-title').innerText(),'Expediente del cliente');
   assert.equal(await page.locator('#cya-hybrid-client-name').innerText(),'CLIENTE DEMO');
   assert.equal(await page.locator('#cya-hybrid-client-meta.cya-hybrid-client-meta').count(),1);
   assert.equal(await page.locator('#cya-hybrid-client-dates').count(),0,scenario.name+' dates not duplicated in header');
   assert.equal(await page.locator('#cya-client-summary-grid').count(),0);
   for(const card of await page.locator('.cya-client-summary-card').all()){
    const alignment=await card.evaluate(el=>({align:getComputedStyle(el).textAlign,items:getComputedStyle(el).alignItems,font:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize)}));
    assert.equal(alignment.align,'center',scenario.name+' centered summary');
    assert.equal(alignment.items,'center',scenario.name+' centered flex');
    assert(alignment.font>=14,scenario.name+' enlarged summary values');
   }
   const columns=await page.locator('.cya-hybrid-client-cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
   assert.equal(columns,scenario.width<670?2:3,scenario.name+' responsive card columns');
   assert.equal(await page.locator('#cya-operational-profile').count(),0);
   await page.locator('[data-hybrid-client="finanzas"]').click();
   assert.equal(await page.locator('#cya-hybrid-client-panel').isVisible(),true);
   await page.evaluate(()=>window.__cyaClientActivitiesV2.open('c1','banco_n4'));
   assert.equal(await page.locator('#cya-operational-modal').isVisible(),true);
   await page.locator('[data-op-close]').first().click();
   assert.equal(await page.locator('#cya-operational-modal').count(),0);
   await page.evaluate(()=>window.__cyaClientActivitiesV2.open('c1','documentos'));
   assert.equal(await page.locator('#cya-operational-modal').isVisible(),true);
   const bg=await page.locator('.cya-operational-dialog').evaluate(el=>getComputedStyle(el).backgroundColor);
   const alpha=bg.startsWith('rgba(')?Number(bg.slice(bg.lastIndexOf(',')+1,-1)):1;
   assert.equal(alpha,1,scenario.name+' activity dialog has fully opaque surface');
   await page.locator('#cya-op-doc-csf').check();
   assert.equal(await page.locator('#cya-op-doc-csf').isChecked(),true,scenario.name+' document checkbox works');
   await page.locator('#cya-op-doc-csf').uncheck();
   assert.equal(await page.locator('#cya-op-doc-csf').isChecked(),false,scenario.name+' document uncheck works');
   await page.locator('[data-op-close]').first().click();
   // The center must work in both themes and remain a purely manual action.
   await page.addScriptTag({content:whatsAppJs});
   await page.evaluate(()=>window.cyaAbrirWhatsAppCliente());
   assert.equal(await page.locator('#cya-wa-message-center.open').count(),1);
   assert.equal(await page.locator('.cya-wa-nav').count(),1);
   assert.equal(await page.locator('[data-cya-wa-group="alta_15"]').count(),1);
   assert.equal(await page.locator('#cya-wa-block-list textarea').count()>0,true);
   assert.equal(await page.locator('.cya-wa-helper').count(),0);
   const layout=await page.locator('.cya-wa-center-modal .modal-body').evaluate(el=>getComputedStyle(el).display);
   assert.equal(layout,'flex',scenario.name+' WhatsApp wide category layout');
   const rowCols=await page.locator('#cya-wa-main-buttons').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(rowCols,scenario.width>=1080?6:scenario.width>640?3:2,scenario.name+' WhatsApp categories responsive');
   await page.evaluate(()=>window.cyaCerrarCentroMensajesWhatsApp());
   assert.equal(await page.locator('#cya-wa-message-center.open').count(),0);
   await page.close();
   console.log('PASS browser '+scenario.name+': 9 cards, 4 centered KPIs, no internal step bar, native activity dialogs and WhatsApp');
  }
  assert.deepEqual(errors,[],'Browser must not emit uncaught script errors');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});