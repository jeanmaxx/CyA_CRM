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
    window.store={leads:[{id:'demo',nombre:'CLIENTE PRUEBA',telefono:'4420000000',curp:'DEMOCURP',servicio:'retiro_desempleo',elegibilidad:{semanas:'110',cotizaImss:'no',retiro5:'no'},banco:'BBVA'}],asesores:[],colaboradores:[]};
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
    const info=await page.locator('#'+id).evaluateAll(nodes=>nodes.map(el=>({hidden:el.hidden,visible:getComputedStyle(el).display,box:el.getBoundingClientRect().toJSON(),parent:el.parentElement?.className,ancestors:[el.parentElement?.parentElement?.id,el.parentElement?.parentElement?.parentElement?.id]})));
    console.log('ELIGIBILITY CONTROL',sc.name,id,JSON.stringify(info));
    boxes[id]=await page.locator('#'+id).boundingBox({timeout:2500});
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
    const close=(a,b)=>Math.abs(boxes[a].y-boxes[b].y)<3;
    assert(close('lead-el-semanas','lead-el-cotiza')&&close('lead-el-semanas','lead-el-retiro')&&close('lead-el-semanas','lead-el-fecha-retiro'),
       sc.name+' all four primary criteria in one row');
    assert(close('lead-nss','lead-afore')&&close('lead-nss','lead-banco'),sc.name+' three supplemental fields in second row');
    assert(boxes['lead-nss'].y>boxes['lead-el-semanas'].y+30,sc.name+' second row below first');
    const result=await page.locator('#lead-initial-criteria').boundingBox();
    assert(result.y>boxes['lead-nss'].y,sc.name+' verdict below supplemental bank');
   }
   assert.equal(await page.locator('#lead-initial-criteria .criteria-alert').isVisible(),true,sc.name+' live eligibility result');
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
