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
   // Previsional layout: generated eligibility controls coexist with the one
   // native NSS group. Verify real Chromium grid geometry and restoration.
   await page.evaluate(()=>{
     document.getElementById('eleg-container').innerHTML=
      '<div class="eleg-help">Retiro por desempleo — Mín. 105 semanas</div>'+
      '<div class="form-group"><label class="form-label">Semanas cotizadas</label><input class="form-input" id="el-semanas" value="141"></div>'+
      '<div class="form-row"><div class="form-group"><label class="form-label">¿Tiene alta activa en IMSS?</label><select class="form-select" id="el-imss"><option>No</option></select></div>'+
      '<div class="form-group"><label class="form-label">¿Retiró en últimos 5 años?</label><select class="form-select" id="el-retiro"><option>Sí</option></select></div></div>'+
      '<div class="form-group" id="el-fecha-wrap"><label>Fecha último retiro</label><input id="el-fecha" type="date"></div>';
     const result=document.getElementById('el-result');result.textContent='✓ Elegible';result.className='eligibility-result show er-eligible';
     const rfc=document.getElementById('fc-rfc');if(rfc)rfc.value='RFCGUARDADO123';
   });
   await page.locator('[data-hybrid-client="previsional"]').click();
   assert.equal(await page.locator('#tab-elegibilidad .cya-previsional-nss #fc-nss').count(),1,sc.name+' NSS moved not copied');
   assert.equal(await page.locator('#fc-nss').count(),1,sc.name+' exactly one NSS input');
   assert.equal(await page.locator('#docs-checklist-container').isVisible(),false,sc.name+' no duplicate documents');
   const pieces=await page.locator('#tab-elegibilidad .cya-previsional-nss, #tab-elegibilidad .form-group:has(#el-semanas), #tab-elegibilidad .form-group:has(#el-imss), #tab-elegibilidad .form-group:has(#el-retiro), #tab-elegibilidad #el-fecha-wrap').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right};}));
   assert.equal(pieces.length,5,sc.name+' all five previsional controls');
   if(sc.width>900){
     // DOM order is weeks, IMSS, withdrawal, date, NSS; CSS grid places NSS first.
     const [weeks,imss,withdrawal,date,nss]=pieces;
     assert(Math.abs(nss.y-weeks.y)<3&&Math.abs(weeks.y-imss.y)<3,sc.name+' NSS weeks and IMSS in first row '+JSON.stringify(pieces));
     assert(Math.abs(withdrawal.y-date.y)<3,sc.name+' withdrawal and date in second row '+JSON.stringify(pieces));
     assert(nss.x<weeks.x&&weeks.x<imss.x,sc.name+' first row logical ordering');
   }
   const panelRight=await page.locator('#cya-hybrid-client-content').evaluate(el=>el.getBoundingClientRect().right);
   assert(pieces.every(p=>p.width>0&&p.right<=panelRight+2),sc.name+' controls inside panel');
   // Approved order: green evaluation ABOVE every input; basic requirement
   // notice BELOW the last input, with RFC kept but hidden.
   const layout=await page.evaluate(()=>{
     const bounds=id=>{const el=document.querySelector(id);if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,visible:getComputedStyle(el).display!=='none'};};
     return {qualification:bounds('#el-result'),basic:bounds('#eleg-container>.eleg-help'),
       fields:['#fc-nss','#el-semanas','#el-imss','#el-retiro','#el-fecha-wrap'].map(id=>bounds(id)),
       rfc:document.getElementById('fc-rfc')?.value||null,
       rfcGroup:bounds('.optional-data:has(#fc-rfc)')};
   });
   assert(layout.qualification?.visible&&layout.qualification.width>0,sc.name+' eligible banner visible');
   assert(layout.basic?.visible&&layout.basic.width>0,sc.name+' basic hint visible');
   assert(layout.qualification.bottom<=Math.min(...layout.fields.map(f=>f.top))+2,sc.name+' qualification precedes all fields '+JSON.stringify(layout));
   assert(layout.basic.top>=Math.max(...layout.fields.map(f=>f.bottom))-2,sc.name+' basic hint follows all fields '+JSON.stringify(layout));
   assert.equal(layout.rfc,'RFCGUARDADO123',sc.name+' original RFC data kept in DOM');
   assert.equal(layout.rfcGroup?.visible,false,sc.name+' RFC disclosure not visible in previsional');
   await page.locator('[data-hybrid-client="banco"]').click();
   assert.equal(await page.locator('#tab-datos-extra #fc-nss').count(),1,sc.name+' NSS restored after leaving');
   // AFORE: five original controls, same desktop row, no horizontal scroll,
   // institution reference below fields and original DOM restoration.
   await page.evaluate(()=>{
     const panel=document.getElementById('tab-datos-extra');
     const row=document.createElement('div');row.className='form-row';
     row.innerHTML='<div class="form-group"><label class="form-label">AFORE</label><select class="form-select" id="fc-afore"><option>SURA</option><option>Profuturo</option></select></div>'+
      '<div class="form-group"><label class="form-label">Hora de la cita</label><input class="form-input" id="fc-hora-afore" type="time"></div>'+
      '<div class="form-group"><label class="form-label">Sucursal o modalidad</label><input class="form-input" id="fc-sucursal-afore"></div>';
     panel.appendChild(row);
     const ref=document.createElement('div');ref.className='afore-reference';ref.id='afore-reference-fixture';ref.textContent='SURA: teléfono y documentos de referencia';
     panel.appendChild(ref);
     document.getElementById('fc-afore').addEventListener('change',e=>ref.textContent=e.target.value+': documentación');
   });
   await page.locator('[data-hybrid-client="afore"]').click();
   const aforeInputs=await page.locator('#cya-afore-inline-fields>.form-group').evaluateAll(nodes=>nodes.map(n=>{
     const r=n.getBoundingClientRect(),input=n.querySelector('input,select');
     return {id:input?.id,top:r.top,left:r.left,right:r.right,width:r.width};
   }));
   assert.deepEqual(aforeInputs.map(x=>x.id),['fc-afore','fc-fecha-biometrica','fc-hora-afore','fc-sucursal-afore','fc-fecha-solicitud-manual'],sc.name+' native five AFORE fields');
   assert(aforeInputs.every(x=>x.width>0),sc.name+' AFORE inputs visible');
   const aBounds=await page.locator('#cya-hybrid-client-content').evaluate(el=>el.getBoundingClientRect());
   assert(aforeInputs.every(x=>x.right<=aBounds.right+2),sc.name+' AFORE inputs stay inside panel');
   if(sc.width>920){
     assert(aforeInputs.every(x=>Math.abs(x.top-aforeInputs[0].top)<2),sc.name+' all AFORE fields on one desktop row '+JSON.stringify(aforeInputs));
     assert(aforeInputs.every((x,i)=>i===0||x.left>aforeInputs[i-1].left),sc.name+' ordered left to right');
   }
   const refInfo=await page.locator('#afore-reference-fixture').evaluate(el=>({top:el.getBoundingClientRect().top,width:el.getBoundingClientRect().width}));
   assert(refInfo.top>Math.max(...aforeInputs.map(x=>x.top)),sc.name+' reference appears below fields');
   assert(refInfo.width>aBounds.width*.85,sc.name+' institution info uses available width '+JSON.stringify({refInfo,aBounds}));
   await page.locator('#fc-afore').selectOption('Profuturo');
   assert.match(await page.locator('#afore-reference-fixture').textContent(),/Profuturo/,sc.name+' original AFORE change listener retained');
   await page.locator('[data-hybrid-client="banco"]').click();
   assert.equal(await page.locator('#tab-datos-extra #fc-afore').count(),1,sc.name+' AFORE select restored');
   assert.equal(await page.locator('#cya-afore-inline-fields').count(),0,sc.name+' AFORE grid removed after switching');
   assert.deepEqual(errors,[],sc.name+' no uncaught JS errors');
   console.log('PASS approved client layout '+sc.name+': six compact top cards, nine navigation cards, gold panel, exact six editable fields and full CURP copy');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
