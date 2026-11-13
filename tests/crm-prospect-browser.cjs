const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const js=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const css=fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const from=meta.indexOf('  function metaQualification(l){'),to=meta.indexOf('  window.cyaMetaWhatsApp=function(id){',from);
assert(from>=0&&to>from);
const functions='(function(){const safe=s=>String(s??"").replace(/[&<>"]/g,"");'+meta.slice(from,to)+'window.cyaMetaHumanQuestions=metaQuestionsHtml;})()';
const form=(id,second)=>'<div class="form-row"><div class="form-group"><input id="'+id+'" value="'+(id==='lead-nombre'?'PRUEBA LOCAL':id==='lead-curp'?'PRUEBACURP':'4420000000')+'">'+(id==='lead-curp'?'<div id="lead-curp-actions"><button type="button">Copiar CURP</button><button type="button">Verificar en RENAPO</button></div>':'')+'</div><div class="form-group"><input id="'+second+'" value="Prueba"></div></div>';
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:13px Arial;--bg-secondary:#16202e;--surface-2:#1d2838;--border:#344056;--text:#fff;--text-muted:#aaa;--text-secondary:#ccc;color:#fff;background:#101827}.modal-overlay.open{display:block}.modal{width:94vw;max-height:94vh;overflow-y:auto;margin:auto}.modal-body{padding:10px}.form-row{display:flex;gap:10px}.form-group{flex:1;min-width:0}.form-input,select,input{padding:8px;box-sizing:border-box;max-width:100%;color:inherit;background:#101827}button{cursor:pointer}</style></head><body><div class="modal-overlay open" id="modal-lead"><div class="modal"><div class="modal-body">'+
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
   await page.setContent(html);await page.addStyleTag({content:css});
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
   assert.equal(columns,width<=840?2:3,name+' correct compact columns');
   assert.equal(await page.locator('#cya-hybrid-qualification.is-green').count(),1,name+' green qualification');
   await page.locator('[data-hybrid-lead-section="origen"]').click();
   const metaDetails=page.locator('#cya-hybrid-origin-overview');
   assert.equal(await metaDetails.evaluate(el=>el.open),false,name+' campaign metadata collapsed by default');
   const originOrder=await page.locator('#cya-hybrid-fields-origen').evaluate(el=>[...el.children].map(x=>x.id||x.className));
   assert(originOrder.indexOf('cya-hybrid-qualification')<originOrder.indexOf('cya-meta-questionnaire-panel'),name+' qualification first');
   assert(originOrder.indexOf('cya-meta-questionnaire-panel')<originOrder.indexOf('cya-hybrid-origin-overview'),name+' answers before metadata');
   await page.locator('#cya-hybrid-origin-overview summary').click();
   assert.equal(await metaDetails.evaluate(el=>el.open),true,name+' expandable Meta panel');
   const source=await metaDetails.innerText();
   assert(source.includes('Campaña de prueba')&&source.includes('Conjunto Demo')&&source.includes('Anuncio Demo')&&source.includes('Formulario Demo'),name+' readable origin');
   await page.locator('#cya-hybrid-origin-overview summary').click();
   assert.equal(await metaDetails.evaluate(el=>el.open),false,name+' collapses again');
   const q=await page.locator('#cya-meta-questionnaire-panel').innerText();
   assert(!q.includes('technical-secret')&&!q.includes('campaign_id'),name+' no technical data');
   await page.locator('[data-hybrid-lead-section="identidad"]').click();
   if(width>840){
    const coords=await page.locator('#lead-curp-actions button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
    assert(Math.abs(coords[0]-coords[1])<2,name+' CURP and RENAPO buttons share a line');
   }
   assert.deepEqual(errors,[],name+' no unhandled browser exceptions');
   console.log('PASS '+name+': compact cards, friendly Meta answers, qualification, responsive buttons');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
