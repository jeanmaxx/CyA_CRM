'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const index=fs.readFileSync('app/index.html','utf8');
const first=index.indexOf('<!-- MODAL LEAD -->'),end=index.indexOf('<!-- MODAL ARCHIVAR LEAD -->',first);
assert(first>=0&&end>first,'Actual production modal');
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+index.slice(first,end)+'</body></html>';
const css=fs.readFileSync('styles.css','utf8')+'\n'+fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const hybrid=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const workflow=fs.readFileSync('app-workflow.js','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const extract=(text,a,b)=>{const start=text.indexOf(a),stop=text.indexOf(b,start+a.length);assert(start>=0&&stop>start,'Missing native function '+a);return text.slice(start,stop);};
const nativeRender=extract(workflow,'function renderLeadElegibilidad(existing={})','function actualizarNacimientoDesdeCurp()');
const nativeExtra=extract(meta,'  function extraFieldsHtml(){','  function ensureExtraFields(){');
const nativeMeta=extract(meta,'  function metaQualification(l){','  window.cyaMetaWhatsApp=function(id){');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const sc of [
    {name:'desktop dark',w:1440,h:900,theme:'dark'},
    {name:'desktop light',w:1440,h:900,theme:'light'},
    {name:'tablet dark',w:1024,h:768,theme:'dark'},
    {name:'tablet light',w:1024,h:768,theme:'light'},
    {name:'mobile dark',w:390,h:844,theme:'dark'},
    {name:'mobile light',w:390,h:844,theme:'light'},
   ]){
   const page=await browser.newPage({viewport:{width:sc.w,height:sc.h}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(html);await page.addStyleTag({content:css});
   await page.evaluate(()=>{
    document.getElementById('modal-lead').classList.add('open');
    const body=document.querySelector('#modal-lead .modal-body');
    document.getElementById('lead-nombre').closest('.form-row').insertAdjacentHTML('beforebegin',
     '<div id="lead-registration-wrap"><div class="form-group"><label class="form-label">Fecha de registro</label><input class="form-input" id="lead-fecha-registro" value="12/11/2026"></div></div>');
    document.getElementById('lead-curp-warning').insertAdjacentHTML('afterend',
     '<div id="lead-curp-actions"><button class="btn cya-curp-copy-icon">⧉</button><button class="btn">RENAPO</button></div>');
    window.store={leads:[{id:'demo',nombre:'CLIENTE PRUEBA',telefono:'4420000000',curp:'DEMOCURP',servicio:'retiro_desempleo',elegibilidad:{semanas:'110',cotizaImss:'no',retiro5:'no'},banco:'BBVA',fuenteContacto:'Meta Ads',metaAds:true,metaLead:{campaignName:'Campaña de prueba',adsetName:'Conjunto Demo',adName:'Anuncio Demo',formName:'Formulario Demo',answers:{imss_status_declared:'opcion_a_sin_cotizar',previous_withdrawal_declared:'opcion_a_nunca',weeks_declared:'opcion_a_2_anos_o_mas',raw:{campaign_id:'technical-secret'}}}}],asesores:[],colaboradores:[]};
    const service=document.getElementById('lead-servicio');
    service.innerHTML='<option value="retiro_desempleo">Retiro por desempleo</option>';
    service.value='retiro_desempleo';
    window.editingLeadId='demo';
    window.openModalLead=()=>document.getElementById('modal-lead').classList.add('open');
    window.guardarLead=async()=>{};
    window.cyaAbrirCentroMensajesWhatsApp=()=>{};
   });
   await page.addScriptTag({content:nativeExtra+'; window.__fixtureExtraFields=extraFieldsHtml;'});
   await page.evaluate(()=>{
    document.getElementById('lead-notas').closest('.form-group').insertAdjacentHTML('beforebegin',window.__fixtureExtraFields());
    document.getElementById('lead-banco').value='BBVA';
    document.getElementById('lead-afore').value='SURA';
    document.getElementById('lead-nss').value='44200001234';
    window.getVal=id=>document.getElementById(id)?.value||'';
    window.esc=v=>String(v??'').replace(/[&<>"]/g,'');
    window.triSelect=(id,label,value)=>'<div class="form-group"><label class="form-label">'+label+'</label><select id="'+id+'" class="form-select"><option value="">Por verificar</option><option value="si">Sí</option><option value="no" '+(value==='no'?'selected':'')+'>No</option></select></div>';
    window.inputFecha=(id,value,label)=>'<div class="form-group"><label class="form-label">'+label+'</label><input class="form-input input-fecha-mx" id="'+id+'" value="'+(value||'')+'" placeholder="dd/mm/aaaa"></div>';
    window.actualizarElegibilidadInicial=()=>{let el=document.getElementById('lead-initial-criteria');if(el)el.innerHTML='<div class="criteria-alert criteria-verde">✓ Cumple criterios iniciales · confirmar con IMSS/AFORE</div>';};
   });
   await page.addScriptTag({content:'(function(){const safe=v=>String(v??" ").replace(/[&<>\"]/g,"");'+nativeMeta+'window.cyaMetaHumanQuestions=metaQuestionsHtml;})()'});
   await page.evaluate(()=>{
     const questionnaire=document.createElement('section');
     questionnaire.id='cya-meta-questionnaire-panel';
     questionnaire.className='cya-meta-questionnaire-panel';
     const lead=window.store.leads[0];
     questionnaire.innerHTML='<div class="cya-meta-questionnaire-head"><strong>Encabezado Meta heredado</strong></div><div class="cya-meta-questionnaire-list">'+window.cyaMetaHumanQuestions(lead)+'</div>';
     document.querySelector('#modal-lead .modal-body').appendChild(questionnaire);
   });
   await page.addScriptTag({content:nativeRender});
   await page.evaluate(()=>renderLeadElegibilidad({semanas:'110',cotizaImss:'no',retiro5:'no',fechaRetiro:''}));
   await page.addScriptTag({content:hybrid});
   await page.evaluate(()=>window.openModalLead('demo'));
   await page.waitForSelector('#cya-hybrid-lead-root');
   await page.locator('[data-hybrid-lead-section="elegibilidad"]').click();
   await page.waitForSelector('#cya-hybrid-fields-elegibilidad[data-eligibility-service="retiro_desempleo"]');
   assert.equal(await page.locator('#lead-banco').count(),1,sc.name+' one bank field');
   assert.equal(await page.locator('#cya-hybrid-fields-elegibilidad #lead-banco').count(),1,sc.name+' bank in eligibility');
   const ids=['lead-el-semanas','lead-el-cotiza','lead-el-retiro','lead-el-fecha-retiro','lead-nss','lead-afore','lead-banco'];
   const boxes={};
   for(const id of ids){
    boxes[id]=await page.locator('#'+id).boundingBox({timeout:3000});
    assert(boxes[id],sc.name+' visible '+id);
    assert(Math.abs(boxes[id].height-38)<2,sc.name+' 38px height for '+id+': '+boxes[id].height);
   }
   const nav=page.locator('.cya-hybrid-lead-card');
   assert.equal(await nav.count(),5);
   for(let i=0;i<5;i++){
    const align=await nav.nth(i).locator('.cya-hybrid-card-title').evaluate(el=>({t:getComputedStyle(el).textTransform,align:getComputedStyle(el).textAlign}));
    assert.equal(align.t,'uppercase',sc.name+' uppercase nav '+i);
    assert.equal(align.align,'center',sc.name+' centered nav '+i);
   }
   const columns=await page.locator('.cya-hybrid-lead-cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(columns,sc.w<=640?2:3,sc.name+' responsive nav columns');
   if(sc.w>1050){
    console.log('ELIGIBILITY GEOMETRY',sc.name,JSON.stringify(boxes));
    console.log('ELIGIBILITY DISPLAY',await page.locator('#cya-hybrid-fields-elegibilidad').evaluate(el=>({display:getComputedStyle(el).display,grid:getComputedStyle(el).gridTemplateColumns,children:[...el.children].map(n=>({id:n.id,cls:n.className,display:getComputedStyle(n).display,order:getComputedStyle(n).order}))})));
    const close=(a,b)=>Math.abs(boxes[a].y-boxes[b].y)<3;
    assert(close('lead-el-semanas','lead-el-cotiza')&&close('lead-el-semanas','lead-el-retiro')&&close('lead-el-semanas','lead-el-fecha-retiro'),
       sc.name+' all four primary criteria in one row');
    assert(close('lead-nss','lead-afore')&&close('lead-nss','lead-banco'),sc.name+' three supplemental fields in second row');
    assert(boxes['lead-nss'].y>boxes['lead-el-semanas'].y+30,sc.name+' second row below first');
    const result=await page.locator('#lead-initial-criteria').boundingBox();
    assert(result.y>boxes['lead-nss'].y,sc.name+' verdict below supplemental bank');
   }
   assert.equal(await page.locator('#lead-initial-criteria .criteria-alert').isVisible(),true,sc.name+' live eligibility result');
   // Match the approved Origen y captación mockup in the REAL production modal:
   // gold accent is common to all five active tabs, while the qualification
   // retains independent green/red/orange status semantics.
   await page.locator('[data-hybrid-lead-section="origen"]').click();
   const originSection=page.locator('#cya-hybrid-section-origen');
   assert.equal(await originSection.isVisible(),true,sc.name+' origin visible');
   const gold=await originSection.evaluate(el=>({width:getComputedStyle(el).borderLeftWidth,color:getComputedStyle(el).borderLeftColor}));
   assert.equal(gold.width,'4px',sc.name+' gold accent applied to active tab');
   assert.equal(gold.color,'rgb(202, 164, 94)',sc.name+' accent uses approved C&A gold');
   const qualification=page.locator('#cya-hybrid-qualification.is-green');
   assert.equal(await qualification.count(),1,sc.name+' native Meta qualification stays green');
   const qStyle=await qualification.locator('strong').evaluate(el=>({align:getComputedStyle(el).textAlign,transform:getComputedStyle(el).textTransform,size:parseFloat(getComputedStyle(el).fontSize)}));
   assert.equal(qStyle.align,'center');
   assert.equal(qStyle.transform,'uppercase');
   assert(qStyle.size>=14,sc.name+' enlarged approval title');
   const qText=(await qualification.locator('strong').innerText()).toUpperCase();
   assert(qText.includes('PREAPROBACIÓN FAVORABLE'),sc.name+' actual preapproval text');
   const cards=page.locator('#cya-hybrid-fields-origen .cya-meta-questionnaire-list .cya-meta-answer');
   assert.equal(await cards.count(),3,sc.name+' precisely three human-readable answers');
   const boxesAnswers=[];
   for(let i=0;i<3;i++){
    const title=cards.nth(i).locator('strong');
    const style=await title.evaluate(el=>({align:getComputedStyle(el).textAlign,transform:getComputedStyle(el).textTransform,size:parseFloat(getComputedStyle(el).fontSize)}));
    assert.equal(style.align,'center',sc.name+' centered answer title '+i);
    assert.equal(style.transform,'uppercase',sc.name+' uppercase answer title '+i);
    assert(style.size>=12,sc.name+' readable answer title '+i);
    boxesAnswers.push(await cards.nth(i).boundingBox());
   }
   if(sc.w>640){
    assert(boxesAnswers.every(box=>Math.abs(box.y-boxesAnswers[0].y)<3),sc.name+' three answers share a row');
    assert(boxesAnswers[1].x>boxesAnswers[0].x&&boxesAnswers[2].x>boxesAnswers[1].x,sc.name+' answer ordering');
   }else{
    assert(boxesAnswers[1].y>boxesAnswers[0].y&&boxesAnswers[2].y>boxesAnswers[1].y,sc.name+' answers stack on mobile');
   }
   const originContents=await page.locator('#cya-hybrid-fields-origen').evaluate(el=>[...el.children].map(c=>c.id||c.querySelector('select')?.id));
   assert(originContents.indexOf('cya-hybrid-qualification')<originContents.indexOf('cya-meta-questionnaire-panel'));
   assert(originContents.indexOf('cya-meta-questionnaire-panel')<originContents.indexOf('cya-hybrid-origin-overview'));
   assert.equal(await page.locator('#cya-meta-questionnaire-panel .cya-meta-questionnaire-head').isVisible(),false,sc.name+' duplicate summary hidden');
   const source=page.locator('#lead-fuente');
   assert.equal(await source.isVisible(),true,sc.name+' native source remains editable');
   const details=page.locator('#cya-hybrid-origin-overview');
   assert.equal(await details.evaluate(el=>el.open),false,sc.name+' Meta details collapsed by default');
   const detailsTitle=await details.locator('summary').evaluate(el=>({align:getComputedStyle(el).textAlign,transform:getComputedStyle(el).textTransform}));
   assert.equal(detailsTitle.transform,'uppercase');
   await details.locator('summary').click();
   assert.equal(await details.evaluate(el=>el.open),true,sc.name+' Meta details expands');
   const srcText=await details.innerText();
   for(const label of ['Campaña de prueba','Conjunto Demo','Anuncio Demo','Formulario Demo'])assert(srcText.includes(label),sc.name+' meta label '+label);
   assert(!srcText.includes('technical-secret'),sc.name+' sensitive technical IDs not exposed');
   await details.locator('summary').click();
   assert.equal(await details.evaluate(el=>el.open),false,sc.name+' Meta details collapses');
   // All five content panels receive the same accent, not just Origen.
   for(const tab of ['identidad','elegibilidad','seguimiento','historial']){
    await page.locator('[data-hybrid-lead-section="'+tab+'"]').click();
    const color=await page.locator('#cya-hybrid-section-'+tab).evaluate(el=>getComputedStyle(el).borderLeftColor);
    assert.equal(color,'rgb(202, 164, 94)',sc.name+' gold accent '+tab);
   }
   await page.locator('[data-hybrid-lead-section="elegibilidad"]').click();
   await page.locator('#lead-banco').fill('SANTANDER');
   assert.equal(await page.locator('#lead-banco').inputValue(),'SANTANDER');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   assert(!overflow,sc.name+' no page-wide overflow');
   assert.deepEqual(errors,[],sc.name+' no JS errors');
   console.log('PASS approved Elegibilidad real markup '+sc.name);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
