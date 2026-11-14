'use strict';
// Production DOM + actual CSS (not a mock image): browser geometry is the
// acceptance gate for the approved compact client profile.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{chromium}=require('playwright');
const app=fs.readFileSync('app/index.html','utf8');
const form=new JSDOM(app).window.document.querySelector('#modal-cliente')?.outerHTML;
assert(form&&form.includes('fc-curp'));
const css=fs.readFileSync('styles.css','utf8')+'\n'+fs.readFileSync('app-client-hybrid-v2.css','utf8');
const script=fs.readFileSync('app-client-hybrid-v2.js','utf8');
const stages=['contacto','datos','docs','cita-afore','contratos','finanzas','historial'].map(id=>'<section class="tab-panel" id="pd-'+id+'">Contenido original</section>').join('');
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+
 '<div class="modal-overlay open" id="modal-perfil"><div class="modal client-profile-modal"><div class="profile-header">'+
 '<div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div>'+
 '<div class="profile-header-actions"><button id="perfil-edit-btn"></button><button id="perfil-regresar-prospecto-btn"></button>'+
 '<button id="perfil-descartar-btn"></button><button class="profile-close">✕</button></div></div>'+
 '<div class="modal-body" id="perfil-body">'+
 '<div class="alerta-firma alerta-verde">✓ Contrato firmado el 11/11/2026</div>'+
 '<div class="alerta-firma alerta-amarilla">⚠ Falta capturar banco</div>'+
 '<div class="alerta-firma alerta-amarilla">⚠ Falta cita de actualización de datos en AFORE</div>'+
 '<div class="profile-stage-wrap"></div><div class="profile-summary-grid"></div><div id="perfil-tabs"></div>'+stages+
 '</div></div></div>'+form+'</body></html>';
const cases=[
 {name:'desktop oscuro',width:1440,height:900,theme:'dark'},
 {name:'desktop claro',width:1440,height:900,theme:'light'},
 {name:'escritorio mediano',width:1024,height:768,theme:'dark'},
 {name:'tableta claro',width:820,height:800,theme:'light'},
 {name:'móvil oscuro',width:390,height:844,theme:'dark'},
 {name:'móvil claro',width:390,height:844,theme:'light'}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const sc of cases){
   const page=await browser.newPage({viewport:{width:sc.width,height:sc.height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(html);
   await page.addStyleTag({content:css});
   await page.evaluate(theme=>{
    document.documentElement.dataset.theme=theme;
    const c={id:'c1',nombre:'ROSALIO GONZÁLEZ EVANGELISTA',curp:'GOER700830HQTNVS02',
      telefono:'4461170459',email:'correo@ejemplo.com',domicilio:'C. SANTA BARBARA S/N, PEDRO ESCOBEDO',
      ciudad:'PEDRO ESCOBEDO',asesorId:'a1',etapa:'dado_alta',contratoFirmado:true,
      servicio:'retiro_desempleo',fechaRegistro:'2026-11-11',fechaRetiroEstimada:'2026-12-28',historial:[]};
    window.store={clientes:[c],asesores:[{id:'a1',nombre:'Emmanuel Álvarez'}],colaboradores:[],agenda:[]};
    window.perfilClienteActivo='c1';window.FUENTES={};window.sesionActiva={id:'a1',rol:'asesor'};
    window.isAdmin=()=>false;window.confirm=()=>true;window.showToast=()=>{};
    window.__cyaClientActivitiesV2={statuses:()=>[{id:'alta',state:'done'},{id:'app',state:'future'}]};
    window.editCliente=()=>{
      document.getElementById('modal-cliente').classList.add('open');
      for(const [id,v] of [['fc-nombre',c.nombre],['fc-curp',c.curp],['fc-telefono',c.telefono],
       ['fc-email',c.email],['fc-domicilio',c.domicilio],['fc-ciudad',c.ciudad]])
       document.getElementById(id).value=v;
    };
    window.guardarCliente=async()=>{};
    window.openPerfil=()=>{};
    window.closeModal=id=>document.getElementById(id)?.classList.remove('open');
    window.openModalAgenda=()=>{};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
   },sc.theme);
   await page.addScriptTag({content:script});
   await page.waitForSelector('#cya-client-identity-grid');
   assert.equal(await page.locator('.cya-hybrid-client-card').count(),9,sc.name+' nine cards');
   const rows=await page.locator('.cya-client-identity-row').count();
   assert.equal(rows,2,sc.name+' two rows of editable fields');
   assert.deepEqual(await page.locator('.cya-client-identity-row.row-1 .form-group input').evaluateAll(nodes=>nodes.map(n=>n.id)),
    ['fc-nombre','fc-curp','fc-telefono'],sc.name+' exact first row');
   assert.deepEqual(await page.locator('.cya-client-identity-row.row-2 .form-group input').evaluateAll(nodes=>nodes.map(n=>n.id)),
    ['fc-email','fc-domicilio','fc-ciudad'],sc.name+' exact second row');
   assert.equal(await page.locator('#fc-curp').inputValue(),'GOER700830HQTNVS02');
   assert.equal(await page.locator('#cya-client-copy-curp').count(),1);
   const cardRow=page.locator('.cya-client-summary-grid');
   assert.equal(await cardRow.locator(':scope > *').count(),6,sc.name+' 4 statuses and 2 warnings');
   assert.equal(await page.locator('#cya-hybrid-client-root .alerta-verde').count(),0,sc.name+' no green completed confirmation');
   const locations=await cardRow.locator(':scope > *').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}}));
   if(sc.width>=761){
     assert(locations.every(c=>Math.abs(c.y-locations[0].y)<2),sc.name+' all 6 on exactly ONE row');
     assert(locations.every((c,i)=>i===0||c.x>=locations[i-1].x+locations[i-1].width-1),sc.name+' slots do not overlap');
   }
   const geometry=await cardRow.evaluate(el=>{
     const r=el.getBoundingClientRect();
     return {clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,rectWidth:r.width,winWidth:innerWidth,parentWidth:el.parentElement.clientWidth};
   });
   assert(geometry.scrollWidth<=geometry.clientWidth+2,sc.name+' no horizontal scrollbar on summary '+JSON.stringify(geometry));
   assert(geometry.rectWidth<=geometry.parentWidth+2,sc.name+' summary stays inside expediente');
   assert(locations.every(c=>c.height>=54),sc.name+' compact status cards have 55px min height');
   const gold=await page.locator('#cya-hybrid-client-panel').evaluate(el=>{
     const cs=getComputedStyle(el);return {top:parseFloat(cs.borderTopWidth),right:parseFloat(cs.borderRightWidth),
       bottom:parseFloat(cs.borderBottomWidth),left:parseFloat(cs.borderLeftWidth)};
   });
   assert(Object.values(gold).every(v=>v>=3),sc.name+' COMPLETE gold panel outline '+JSON.stringify(gold));
   const inputMeasures=await page.locator('.cya-client-identity-grid input.form-input').evaluateAll(nodes=>nodes.map(el=>({id:el.id,visible:el.getBoundingClientRect().height,height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width})));
   assert.equal(inputMeasures.length,6);
   assert(inputMeasures.every(x=>Math.abs(x.height-38)<1),sc.name+' six original fields exactly 38px high '+JSON.stringify(inputMeasures));
   if(sc.width>800){
     const curpMeasure=await page.locator('#fc-curp').evaluate(el=>{
       const cs=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');
       ctx.font=cs.font;
       return {text:ctx.measureText(el.value).width,room:el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-3,fieldWidth:el.clientWidth};
     });
     assert(curpMeasure.room>=curpMeasure.text,sc.name+' all 18 CURP glyphs fit without clipping '+JSON.stringify(curpMeasure));
     const fieldRows=await page.locator('.cya-client-identity-row').evaluateAll(nodes=>nodes.map(el=>({cols:getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length})));
     assert.deepEqual(fieldRows.map(x=>x.cols),[3,3],sc.name+' 3 fields in each row');
   }
   const copy=page.locator('#cya-client-copy-curp');
   const hit=await copy.boundingBox();assert(hit&&hit.width>=37&&hit.height>=37,sc.name+' copy button 38px');
   await copy.click();
   assert.equal(await page.evaluate(()=>window.__copied),'GOER700830HQTNVS02',sc.name+' copy full original CURP');
   await page.locator('[data-hybrid-client="banco"]').click();
   assert.equal(await page.locator('#cya-client-copy-curp').count(),0,sc.name+' copy removed when leaving Identity');
   assert.equal(await page.locator('#fc-curp').evaluate(el=>!!el.closest('#tab-datos-extra')),true,sc.name+' original CURP restored');
   assert.deepEqual(errors,[],sc.name+' no uncaught JS errors');
   console.log('PASS approved client layout '+sc.name+': six compact top cards, nine navigation cards, gold panel, exact six editable fields and full CURP copy');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
