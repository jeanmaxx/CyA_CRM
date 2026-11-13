const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const js=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const css=fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const baseCss=fs.readFileSync('styles.css','utf8');
const waJs=fs.readFileSync('app-whatsapp-message-center.js','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const from=meta.indexOf('  function metaQualification(l){'),to=meta.indexOf('  window.cyaMetaWhatsApp=function(id){',from);
assert(from>=0&&to>from);
const functions='(function(){const safe=s=>String(s??"").replace(/[&<>"]/g,"");'+meta.slice(from,to)+'window.cyaMetaHumanQuestions=metaQuestionsHtml;})()';
const form=(id,second)=>'<div class="form-row"><div class="form-group"><input id="'+id+'" value="'+(id==='lead-nombre'?'PRUEBA LOCAL':id==='lead-curp'?'PRUEBACURP':'4420000000')+'">'+(id==='lead-curp'?'<div id="lead-curp-actions"><button class="btn cya-curp-copy-icon" type="button" aria-label="Copiar CURP">⧉</button><button class="btn btn-primary" type="button">Verificar en RENAPO</button></div>':'')+'</div><div class="form-group"><input id="'+second+'" value="Prueba"></div></div>';
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:13px Arial;--bg-secondary:#16202e;--surface-2:#1d2838;--border:#344056;--text:#fff;--text-muted:#aaa;--text-secondary:#ccc;color:#fff;background:#101827}.modal-overlay.open{display:block}.modal{width:94vw;max-height:94vh;overflow-y:auto;margin:auto}.modal-body{padding:10px}.form-row{display:flex;gap:10px}.form-group{flex:1;min-width:0}.form-input,select,input{padding:8px;box-sizing:border-box;max-width:100%;color:inherit;background:#101827}button{cursor:pointer}</style></head><body><div class="modal-overlay open" id="modal-lead"><div class="modal modal-lg"><div class="modal-body">'+
 form('lead-nombre','lead-tel')+form('lead-curp','lead-colaborador')+
 '<div class="form-row"><div class="form-group"><select id="lead-servicio"><option value="retiro_desempleo">Retiro desempleo</option></select></div><div class="form-group"><select id="lead-estado"><option>semanas</option></select></div></div>'+
 '<div class="form-section">Criterios</div><div id="lead-elegibilidad-container"><input id="lead-el-semanas" value="110"></div>'+
 '<div class="form-group"><textarea id="lead-notas"></textarea></div><div id="lead-registration-wrap"><input id="lead-fecha-registro" value="13/11/2026"></div>'+
 '<div id="cya-prospect-stage-stepper">Seguimiento nativo</div>'+
 '<div id="cya-lead-extra-fields"><div class="form-group"><input id="lead-email"></div><div class="form-group"><input id="lead-ciudad"></div><div class="form-group"><input id="lead-domicilio"></div><div class="form-group"><input id="lead-nss"></div><div class="form-group"><input id="lead-afore"></div><div class="form-group"><select id="lead-fuente"><option value="Meta Ads">Meta Ads</option></select></div></div>'+
 '<div id="cya-meta-lead-tabs">Legacy questionnaire tabs</div><section id="cya-meta-questionnaire-panel"></section></div><div class="modal-footer"><button type="button">Cancelar</button><button type="button">Guardar</button></div></div></div></body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [name,width,height,theme] of [['desktop dark',1440,900,'dark'],['desktop light',1440,900,'light'],['tablet dark',1024,768,'dark'],['tablet light',1024,768,'light'],['mobile dark',390,844,'dark'],['mobile light',390,844,'light']]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(html);await page.addStyleTag({content:baseCss+'\n'+css});
   await page.evaluate(t=>{
    document.documentElement.dataset.theme=t;
    window.editingLeadId='test-lead';
    window.store={leads:[{id:'test-lead',nombre:'PRUEBA LOCAL',telefono:'4420000000',curp:'PRUEBACURP',estado:'semanas',fuenteContacto:'Meta Ads',metaAds:true,metaLead:{campaignName:'Campaña de prueba',adsetName:'Conjunto Demo',adName:'Anuncio Demo',formName:'Formulario Demo',answers:{imss_status_declared:'opcion_a_sin_cotizar',previous_withdrawal_declared:'opcion_a_nunca',weeks_declared:'110 semanas',raw:{campaign_id:'technical-secret',adset_id:'technical-secret'}}}}],asesores:[],colaboradores:[]};
    window.openModalLead=()=>document.getElementById('modal-lead').classList.add('open');
    window.guardarLead=async()=>{};
   },theme);
   await page.addScriptTag({content:functions});
   await page.evaluate(()=>{const l=window.store.leads[0];document.getElementById('cya-meta-questionnaire-panel').innerHTML=window.cyaMetaHumanQuestions(l);});
   await page.addScriptTag({content:js});
   await page.evaluate(()=>window.openModalLead('test-lead'));
   await page.waitForSelector('#cya-hybrid-lead-root');
   await page.waitForTimeout(165);
   assert.equal(await page.locator('.cya-hybrid-lead-card').count(),5);
   const columns=await page.locator('.cya-hybrid-lead-cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
   assert.equal(columns,width<=620?2:width<=900?3:5,name+' one-row navigation at desktop, no waste');
   assert.equal(await page.locator('#cya-hybrid-qualification.is-green').count(),1,name+' green qualification');
   await page.locator('[data-hybrid-lead-section="origen"]').click();
   const metaDetails=page.locator('#cya-hybrid-origin-overview');
   assert.equal(await metaDetails.evaluate(el=>el.open),false,name+' campaign metadata collapsed by default');
   const originOrder=await page.locator('#cya-hybrid-fields-origen').evaluate(el=>[...el.children].map(x=>x.id||x.className));
   assert(originOrder.indexOf('cya-hybrid-qualification')<originOrder.indexOf('cya-hybrid-answers'),name+' qualification first');
   assert(originOrder.indexOf('cya-hybrid-answers')<originOrder.indexOf('cya-hybrid-origin-overview'),name+' answers before metadata');
   assert.equal(await page.locator('#cya-hybrid-answers').isVisible(),true,name+' one visible Meta answers summary');
   assert.equal(await page.locator('#cya-meta-questionnaire-panel').isVisible(),false,name+' legacy questionnaire hidden');
   await page.locator('#cya-hybrid-origin-overview summary').click();
   assert.equal(await metaDetails.evaluate(el=>el.open),true,name+' expandable Meta panel');
   const source=await metaDetails.innerText();
   assert(source.includes('Campaña de prueba')&&source.includes('Conjunto Demo')&&source.includes('Anuncio Demo')&&source.includes('Formulario Demo'),name+' readable origin');
   await page.locator('#cya-hybrid-origin-overview summary').click();
   assert.equal(await metaDetails.evaluate(el=>el.open),false,name+' collapses again');
   const q=await page.locator('#cya-hybrid-answers').innerText();
   assert(!q.includes('technical-secret')&&!q.includes('campaign_id'),name+' no technical data');
   await page.locator('[data-hybrid-lead-section="seguimiento"]').click();
   const follow=await page.locator('#cya-hybrid-fields-seguimiento').evaluate(el=>[...el.children].map(x=>x.id||x.querySelector('input,select,textarea')?.id));
   assert.equal(follow[0],'cya-prospect-stage-stepper',name+' stages displayed first');
   assert.equal(follow[1],'lead-estado',name+' state after stages');
   assert.equal(follow[2],'lead-servicio',name+' service after state');
   assert.equal(follow[3],'lead-notas',name+' notes last');
   const step=await page.locator('#cya-prospect-stage-stepper').boundingBox();
   const state=await page.locator('#lead-estado').boundingBox();
   assert(step.y<=state.y,name+' stages physically precede dropdowns');
   await page.locator('[data-hybrid-lead-section="identidad"]').click();
   const curpField=await page.locator('#lead-curp').boundingBox();
   const copyButton=await page.locator('#lead-curp-actions button').first().boundingBox();
   const renapoButton=await page.locator('#lead-curp-actions button').last().boundingBox();
   const center=box=>box.y+box.height/2;
   assert(Math.abs(center(curpField)-center(copyButton))<3&&Math.abs(center(curpField)-center(renapoButton))<3,name+' CURP and actions centered in same row');
   assert(copyButton.x>=curpField.x+curpField.width-3,name+' Copy to right of CURP');
   assert.equal((await page.locator('#lead-curp-actions button').last().innerText()).trim(),'RENAPO',name+' exact RENAPO label');
   const formHeight=await page.locator('#cya-hybrid-fields-identidad').evaluate(el=>el.getBoundingClientRect().height);
   if(width>900)assert(formHeight<205,name+' identity compact rather than long half-width rows');
   if(width>840){
    const coords=await page.locator('#lead-curp-actions button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
    assert(Math.abs(coords[0]-coords[1])<2,name+' CURP and RENAPO buttons share a line');
   }
   // The WhatsApp module historically injects an extra button below phone.
   // Opening the full-width modal must not restore any such duplicate.
   await page.evaluate(()=>{
     let duplicate=document.getElementById('cya-wa-center-actions');
     if(!duplicate){duplicate=document.createElement('div');duplicate.id='cya-wa-center-actions';document.getElementById('lead-tel').insertAdjacentElement('afterend',duplicate);}
     duplicate.innerHTML='<button type="button">WhatsApp extra</button>';
   });
   await page.addScriptTag({content:waJs});
   await page.waitForTimeout(90);
   assert.equal(await page.locator('#cya-hybrid-lead-whatsapp').isVisible(),true);
   assert.equal(await page.locator('#cya-wa-center-actions').isVisible(),false,name+' redundant phone WhatsApp hidden');
   await page.locator('#cya-hybrid-lead-whatsapp').click();
   assert.equal(await page.locator('#cya-wa-message-center.open').count(),1,name+' WhatsApp opens');
   const dialogWidth=await page.locator('.cya-wa-center-modal').evaluate(el=>el.getBoundingClientRect().width);
   const bodyDisplay=await page.locator('.cya-wa-center-modal .modal-body').evaluate(el=>getComputedStyle(el).display);
   if(width>690){
     assert(dialogWidth>=780,name+' full-width WhatsApp modal, not the global 580px default');
     assert.equal(bodyDisplay,'grid',name+' categories on left, template on right');
   }else{
     assert(dialogWidth<=width,name+' WhatsApp fits mobile viewport');
     assert.equal(bodyDisplay,'block',name+' mobile vertical navigation');
   }
   await page.evaluate(()=>window.cyaCerrarCentroMensajesWhatsApp());
   assert.deepEqual(errors,[],name+' no unhandled browser exceptions');
   console.log('PASS '+name+': compact cards, friendly Meta answers, qualification, responsive buttons');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
