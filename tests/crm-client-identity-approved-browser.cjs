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
    window.validateCLABE=()=>{}; // native validator stub: this browser fixture loads only the hybrid module
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
    ['fc-nombre','fc-curp','fc-nss','fc-telefono'],sc.name+' exact first row');
   assert.deepEqual(await page.locator('.cya-client-identity-row.row-2 .form-group input').evaluateAll(nodes=>nodes.map(n=>n.id)),
    ['fc-email','fc-domicilio','fc-ciudad'],sc.name+' exact second row');
   assert.equal(await page.locator('#fc-curp').inputValue(),'GOER700830HQTNVS02');
   assert.equal(await page.locator('.cya-client-identity-row.row-1 #fc-nss').count(),1,sc.name+' NSS beside CURP in identity');
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
   assert.equal(inputMeasures.length,7);
   assert(inputMeasures.every(x=>Math.abs(x.height-38)<1),sc.name+' seven original fields exactly 38px high '+JSON.stringify(inputMeasures));
   if(sc.width>800){
     const curpMeasure=await page.locator('#fc-curp').evaluate(el=>{
       const cs=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');
       ctx.font=cs.font;
       return {text:ctx.measureText(el.value).width,room:el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-3,fieldWidth:el.clientWidth};
     });
     assert(curpMeasure.room>=curpMeasure.text,sc.name+' all 18 CURP glyphs fit without clipping '+JSON.stringify(curpMeasure));
     const fieldRows=await page.locator('.cya-client-identity-row').evaluateAll(nodes=>nodes.map(el=>({cols:getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length})));
     assert.deepEqual(fieldRows.map(x=>x.cols),[sc.width>900?4:2,3],sc.name+' approved identity columns');
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
   assert.equal(await page.locator('#tab-elegibilidad #fc-nss').count(),0,sc.name+' NSS absent from previsional');
   assert.equal(await page.locator('#fc-nss').count(),1,sc.name+' exactly one NSS input');
   assert.equal(await page.locator('#docs-checklist-container').isVisible(),false,sc.name+' no duplicate documents');
   const pieces=await page.locator('#tab-elegibilidad .form-group:has(#el-semanas), #tab-elegibilidad .form-group:has(#el-imss), #tab-elegibilidad .form-group:has(#el-retiro), #tab-elegibilidad #el-fecha-wrap').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right};}));
   assert.equal(pieces.length,4,sc.name+' all four previsional controls');
   if(sc.width>900){
     const [weeks,imss,withdrawal,date]=pieces;
     assert(pieces.every(x=>Math.abs(x.y-weeks.y)<3),sc.name+' four previsional fields aligned on one row '+JSON.stringify(pieces));
     assert(weeks.x<imss.x&&imss.x<withdrawal.x&&withdrawal.x<date.x,sc.name+' previsional order');
   }
   const panelRight=await page.locator('#cya-hybrid-client-content').evaluate(el=>el.getBoundingClientRect().right);
   assert(pieces.every(p=>p.width>0&&p.right<=panelRight+2),sc.name+' controls inside panel');
   // Approved order: green evaluation ABOVE every input; basic requirement
   // notice BELOW the last input, with RFC kept but hidden.
   const layout=await page.evaluate(()=>{
     const bounds=id=>{const el=document.querySelector(id);if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,visible:getComputedStyle(el).display!=='none'};};
     return {qualification:bounds('#el-result'),basic:bounds('#eleg-container>.eleg-help'),
       fields:['#el-semanas','#el-imss','#el-retiro','#el-fecha-wrap'].map(id=>bounds(id)),
       rfc:document.getElementById('fc-rfc')?.value||null,
       rfcGroup:bounds('.optional-data:has(#fc-rfc)')};
   });
   assert(layout.qualification?.visible&&layout.qualification.width>0,sc.name+' eligible banner visible');
   assert(layout.basic?.visible&&layout.basic.width>0,sc.name+' basic hint visible');
   assert(layout.qualification.top>=Math.max(...layout.fields.map(f=>f.bottom))-2,sc.name+' qualification below all fields '+JSON.stringify(layout));
   assert(layout.basic.top>=layout.qualification.bottom-2,sc.name+' basic hint follows eligibility '+JSON.stringify(layout));
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
   // Banco: real bank fields, original CLABE input and BBVA level, no docs.
   await page.evaluate(()=>{
     const panel=document.getElementById('tab-datos-extra');
     const row=document.createElement('div');row.className='form-row';
     row.innerHTML='<div class="form-group"><label class="form-label">Nivel de cuenta BBVA</label><select class="form-select" id="fc-nivel-bbva"><option>Sin especificar</option><option>Nivel 4</option></select></div>';
     panel.appendChild(row);
   });
   await page.locator('[data-hybrid-client="banco"]').click();
   await page.locator('[data-hybrid-client="banco"]').click();
   const bank=await page.locator('#cya-bank-inline-fields>.form-group').evaluateAll(nodes=>nodes.map(n=>{const el=n.querySelector('input,select'),r=n.getBoundingClientRect();return {id:el?.id,x:r.x,y:r.y,right:r.right,width:r.width};}));
   assert.deepEqual(bank.map(x=>x.id),['fc-banco','fc-clabe','fc-nivel-bbva'],sc.name+' three original bank controls');
   const bankRight=await page.locator('#cya-hybrid-client-content').evaluate(el=>el.getBoundingClientRect().right);
   assert(bank.every(x=>x.width>0&&x.right<=bankRight+2),sc.name+' bank fields inside panel');
   if(sc.width>740)assert(bank.every(x=>Math.abs(x.y-bank[0].y)<2),sc.name+' bank single desktop row');
   assert.equal(await page.locator('#docs-checklist-container').isVisible(),false,sc.name+' no bank documents');
   assert.equal(await page.locator('#extra-doc-new').isVisible(),false,sc.name+' no bank document entry');
   await page.locator('#fc-clabe').fill('123456789012345678');
   assert.equal(await page.locator('#fc-clabe').inputValue(),'123456789012345678',sc.name+' CLABE is editable');
   await page.locator('[data-hybrid-client="finanzas"]').click();
   assert.equal(await page.locator('#tab-datos-extra #fc-clabe').count(),1,sc.name+' bank form restored');

   // Finance fixture reproduces native layout / DOM and keeps the native
   // button with its handler, never a second mock payment button.
   await page.evaluate(()=>{
     const p=document.getElementById('pd-finanzas');
     p.innerHTML='<div class="profile-finance-auto">Cálculo automático</div>'+
       '<div class="info-rows"><div class="info-row">Resumen original</div></div>'+
       '<hr class="divider"><div class="cya-fixture-fin-title">EDITAR / CONFIRMAR DATOS DE COBRO</div>'+
       '<div class="form-row"><div class="form-group"><label class="form-label">Cantidad a retirar de AFORE</label><input id="fin-monto-c1" value="28000"></div>'+
       '<div class="form-group"><label class="form-label">Honorarios</label><input id="fin-hon-c1" value="8400"></div></div>'+
       '<div class="form-row"><div class="form-group"><label class="form-label">Comisión</label><input id="fin-com-c1" value="4200"></div>'+
       '<div class="form-group"><label class="form-label">Fecha retiro estimada</label><input id="fin-fecha-c1" value="28/12/2026"></div></div>'+
       '<div class="form-row"><div class="form-group"><label class="form-label">Estado de pago</label><select id="fin-estado-c1"><option>Pendiente</option></select></div></div>'+
       '<button class="btn btn-primary profile-finance-save" onclick="window.__financeSaveClicked=true">Guardar datos de cobro</button>';
   });
   await page.locator('[data-hybrid-client="finanzas"]').click();
   await page.locator('[data-hybrid-client="finanzas"]').click();
   const finance=await page.locator('#pd-finanzas .cya-client-finance-edit-grid .form-group').evaluateAll(nodes=>nodes.map(n=>{const el=n.querySelector('input,select'),r=n.getBoundingClientRect();return {id:el?.id,x:r.x,y:r.y,right:r.right,width:r.width};}));
   assert.deepEqual(finance.map(x=>x.id),['fin-monto-c1','fin-hon-c1','fin-com-c1','fin-fecha-c1','fin-estado-c1'],sc.name+' finance originals in approved order');
   assert(finance.every(x=>x.width>0),sc.name+' nonzero finance widths');
   if(sc.width>1080)assert(finance.every(x=>Math.abs(x.y-finance[0].y)<2),sc.name+' five finance inputs same row '+JSON.stringify(finance));
   const finLayout=await page.locator('#pd-finanzas').evaluate(el=>{
     const b=e=>e?.getBoundingClientRect();
     return {title:b(el.querySelector('.cya-fixture-fin-title'))?.top,editor:b(el.querySelector('.cya-client-finance-edit-grid'))?.top,summary:b(el.querySelector('.profile-finance-auto'))?.top,button:b(el.querySelector('.profile-finance-save'))?.top,right:b(el)?.right};
   });
   assert(finLayout.title<finLayout.editor&&finLayout.editor<finLayout.summary,sc.name+' editor is above calculations '+JSON.stringify(finLayout));
   assert(finance.every(x=>x.right<=finLayout.right+2),sc.name+' finance no horizontal overflow');
   assert.equal(await page.locator('#pd-finanzas .profile-finance-save').count(),1,sc.name+' one native finance save');
   await page.locator('#pd-finanzas .profile-finance-save').click();
   assert.equal(await page.evaluate(()=>window.__financeSaveClicked),true,sc.name+' native finance save click retained');
   // Comisiones: optional extra-document control must not render in this tab.
   await page.locator('[data-hybrid-client="comisiones"]').click();
   assert.equal(await page.locator('#extra-doc-new').count(),1,sc.name+' document field still exists in source DOM');
   assert.equal(await page.locator('#extra-doc-new').isVisible(),false,sc.name+' extra document hidden in commissions');
   assert.equal(await page.locator('#docs-checklist-container').isVisible(),false,sc.name+' checklist hidden in commissions');
   // Contracts: original native controls + each real contract's status.
   await page.evaluate(()=>{
     const p=document.getElementById('pd-contratos');
     p.innerHTML='<div class="contract-native-block"><div>ESTADO DEL CONTRATO</div>'+
       '<div class="profile-contract-status"><span>Contrato firmado</span><span class="chip chip-green">✓ Firmado</span></div>'+
       '<div class="form-row"><div class="form-group"><label class="form-label">Fecha real de firma</label><input class="form-input" id="perfil-firma" value="11/11/2026"></div>'+
       '<div class="form-group"><label class="form-label">Fecha de alta</label><input class="form-input" id="perfil-alta" value="13/11/2026"></div></div>'+
       '<p>Solicitud prevista: 28/12/2026</p>'+
       '<button class="btn btn-primary" onclick="window.__contractDatesSaved=true;guardarFechasContratoAltaStub()">Guardar fechas</button></div>'+
       '<hr class="divider"><div class="contract-history-label">Historial de contratos generados</div>'+
       '<div class="hist-contrato-item"><div>▤</div><div style="flex:1">Retiro por desempleo</div><div><span class="chip chip-gray">Generado</span><button class="btn">Ver</button></div></div>'+
       '<div class="hist-contrato-item"><div>▤</div><div style="flex:1">Corrección de datos</div><div><span class="chip chip-gray">Generado</span><button class="btn">Ver</button></div></div>'+
       '<div class="contract-generate-wrap"><button class="btn" onclick="window.__contractGenerateClicked=true">+ Generar nuevo contrato</button></div>';
     window.guardarFechasContratoAltaStub=()=>{};
   });
   await page.locator('[data-hybrid-client="contratos"]').click();
   const contractPositions=await page.locator('#pd-contratos').evaluate(panel=>{
     const rect=s=>{const el=panel.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};};
     return {top:rect('.cya-contract-top-row'),generate:rect('.cya-contract-top-row button:first-child'),
       firma:rect('#perfil-firma'),alta:rect('#perfil-alta'),
       predicted:rect('.cya-contract-top-row>p'),save:rect('.cya-contract-top-row>button'),
       heading:rect('.cya-contract-history-heading'),
       first:rect('.hist-contrato-item'),panel:(()=>{const box=panel.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,width:box.width};})()};
   });
   assert(contractPositions.top&&contractPositions.generate&&contractPositions.firma&&contractPositions.alta&&contractPositions.predicted&&contractPositions.save,sc.name+' all native contract fields in top row '+JSON.stringify(contractPositions));
   assert(contractPositions.top.bottom<=contractPositions.heading.top+2,sc.name+' history below contract editor');
   if(sc.width>940){
     const aligned=[contractPositions.generate,contractPositions.firma,contractPositions.alta,contractPositions.predicted,contractPositions.save];
     assert(aligned.every(x=>x.top>=contractPositions.top.top-2&&x.bottom<=contractPositions.top.bottom+2),sc.name+' elements inside compact row');
     assert(contractPositions.generate.left<contractPositions.firma.left&&contractPositions.alta.left<contractPositions.predicted.left&&contractPositions.predicted.left<contractPositions.save.left,sc.name+' approved left-to-right contract order');
   }
   assert(contractPositions.top.right<=contractPositions.panel.right+2,sc.name+' contract top no overflow');
   assert.equal(await page.locator('#pd-contratos .hist-contrato-item').count(),2,sc.name+' no fabricated contracts');
   assert.equal(await page.locator('#pd-contratos .cya-contract-signed-chip').count(),1,sc.name+' only latest contract inherits dossier signed flag');
   assert.equal(await page.locator('#pd-contratos .hist-contrato-item').nth(1).locator('.cya-contract-signed-chip').count(),0,sc.name+' older contract does not inherit signed status');
   assert.equal(await page.locator('#pd-contratos .cya-contract-history-heading span').innerText(),'ESTADO DEL CONTRATO',sc.name+' contract status header');
   await page.locator('#pd-contratos .cya-contract-top-row button').first().click();
   assert.equal(await page.evaluate(()=>window.__contractGenerateClicked),true,sc.name+' original generate handler retained');
   await page.locator('#pd-contratos .cya-contract-top-row>button').click();
   assert.equal(await page.evaluate(()=>window.__contractDatesSaved),true,sc.name+' original dates save handler retained');
   assert.deepEqual(errors,[],sc.name+' no uncaught JS errors');
   console.log('PASS approved client layout '+sc.name+': six compact top cards, nine navigation cards, gold panel, exact six editable fields and full CURP copy');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
