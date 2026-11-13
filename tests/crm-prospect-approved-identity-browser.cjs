'use strict';
// Real app/index.html modal, real styles.css and real hybrid module. Synthetic lead.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const index=fs.readFileSync('app/index.html','utf8');
const begin=index.indexOf('<!-- MODAL LEAD -->'),end=index.indexOf('<!-- MODAL ARCHIVAR LEAD -->',begin);
assert(begin>=0&&end>begin,'Must exercise the actual production lead modal');
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+
index.slice(begin,end)+'</body></html>';
const base=fs.readFileSync('styles.css','utf8'),hybridCss=fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const hybridJs=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const scenario of [
   {name:'desktop dark',w:1440,h:900,theme:'dark'},
   {name:'desktop light',w:1440,h:900,theme:'light'},
   {name:'tablet dark',w:1024,h:768,theme:'dark'},
   {name:'tablet light',w:1024,h:768,theme:'light'},
   {name:'mobile dark',w:390,h:844,theme:'dark'},
   {name:'mobile light',w:390,h:844,theme:'light'}
  ]){
   const page=await browser.newPage({viewport:{width:scenario.w,height:scenario.h}});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   await page.setContent(html);
   await page.addStyleTag({content:base});
   await page.addStyleTag({content:hybridCss});
   await page.evaluate(theme=>{
    document.documentElement.dataset.theme=theme;
    document.body.dataset.theme=theme;
    const body=document.querySelector('#modal-lead .modal-body');
    const name=document.getElementById('lead-nombre');
    const tel=document.getElementById('lead-tel');
    const curp=document.getElementById('lead-curp');
    name.value='JOSE CARMEN RESENDIZ ALVAREZ';
    tel.value='4481223833';curp.value='REAC981023HQTSLR01';
    // The date control is created in production by prepararFechasProspecto().
    name.closest('.form-row').insertAdjacentHTML('beforebegin',
     '<div id="lead-registration-wrap"><div class="form-group"><label class="form-label" for="lead-fecha-registro">Fecha de registro</label>'+
     '<input class="form-input input-fecha-mx" id="lead-fecha-registro" value="12/11/2026" required></div></div>');
    // The existing CURP module injects these buttons; keep their original handlers.
    document.getElementById('lead-curp-warning').insertAdjacentHTML('afterend',
     '<div id="lead-curp-actions"><button class="btn cya-curp-copy-icon" type="button" onclick="window.mockCopy()">⧉</button>'+
     '<button class="btn btn-primary" type="button" onclick="window.mockRenapo()">✓ Verificar en RENAPO</button></div>'+
     '<button class="btn" id="cya-mark-review-sent" disabled>✓ Revisión ya solicitada</button>');
    // These two extra launchers were the source of the duplicate green WhatsApp.
    tel.insertAdjacentHTML('afterend',
      '<div id="cya-client-message-actions" style="display:flex"><button class="btn">WhatsApp cliente</button></div>'+
      '<div id="cya-wa-center-actions" style="display:flex"><button class="btn">WhatsApp</button></div>');
    body.insertAdjacentHTML('beforeend',
     '<div id="cya-lead-extra-fields">'+
     '<div class="form-row"><div class="form-group"><label class="form-label">Correo electrónico</label><input class="form-input" id="lead-email" value="ejemplo@gmail.com"></div>'+
     '<div class="form-group"><label class="form-label">Ciudad</label><input class="form-input" id="lead-ciudad" value="Querétaro"></div></div>'+
     '<div class="form-row"><div class="form-group"><label class="form-label">Fuente</label><select class="form-select" id="lead-fuente"><option>Meta Ads</option></select></div>'+
     '<div class="form-group"><label class="form-label">NSS</label><input class="form-input" id="lead-nss"></div></div>'+
     '<div class="form-row"><div class="form-group"><label class="form-label">AFORE</label><input class="form-input" id="lead-afore"></div>'+
     '<div class="form-group"><label class="form-label">Domicilio</label><input class="form-input" id="lead-domicilio" value="Calle y número"></div></div></div>'+
     '<div id="cya-prospect-stage-stepper">Etapas operativas</div>'+
     '<div id="cya-meta-lead-tabs"></div><section id="cya-meta-questionnaire-panel"></section>');
    window.editingLeadId='demo';
    window.store={leads:[{id:'demo',nombre:name.value,telefono:tel.value,curp:curp.value,fechaRegistro:'2026-11-12',fuenteContacto:'Meta Ads',asesorId:'advisor',metaAds:true,revisionSolicitada:true,metaLead:{campaignName:'Campaña Demo'}}],
      colaboradores:[],asesores:[{id:'advisor',nombre:'Emmanuel Álvarez'}]};
    window.openModalLead=()=>document.getElementById('modal-lead').classList.add('open');
    window.guardarLead=async()=>{};
    window.cyaAbrirCentroMensajesWhatsApp=()=>{window.__openedWhatsApp=(window.__openedWhatsApp||0)+1;};
    window.mockCopy=()=>{window.__copied=true;};
    window.mockRenapo=()=>{window.__renapo=true;};
   },scenario.theme);
   await page.addScriptTag({content:hybridJs});
   await page.evaluate(()=>window.openModalLead('demo'));
   await page.waitForSelector('#cya-hybrid-fields-identidad:not([hidden])');
   await page.waitForTimeout(180);
   const id='#cya-hybrid-fields-identidad';
   assert.equal(await page.locator('#lead-fecha-registro').count(),1,'Native registration date is never duplicated');
   assert.equal(await page.locator('#cya-hybrid-registration-slot #lead-fecha-registro').count(),1,'Editable registration stays in header');
   assert.equal(await page.locator('.cya-hybrid-name-line #cya-hybrid-lead-context').count(),1,'Advisor/type/origin chips next to name');
   assert.equal(await page.locator('#cya-hybrid-registration-slot').isVisible(),true);
   assert.equal(await page.locator('#cya-hybrid-review-row #cya-mark-review-sent').count(),1);
   assert.equal(await page.locator('#cya-client-message-actions').isVisible(),false);
   assert.equal(await page.locator('#cya-wa-center-actions').isVisible(),false);
   assert.equal(await page.locator('.cya-hybrid-wa').isVisible(),true);
   const renapo=page.locator('#lead-curp-actions button').last();
   assert.equal((await renapo.innerText()).trim(),'RENAPO','Native RENAPO button shortened');
   // Coordinates, not just presence: identical control heights and common rows.
   const controlIds=['lead-nombre','lead-curp','lead-colaborador','lead-tel','lead-email','lead-domicilio','lead-ciudad'];
   const rects={};
   for(const id of controlIds)rects[id]=await page.locator('#'+id).boundingBox();
   for(const id of controlIds)assert(Math.abs(rects[id].height-38)<1,scenario.name+' '+id+' must be exactly 38px');
   const copy=await page.locator('#lead-curp-actions button').first().boundingBox();
   const renapoRect=await renapo.boundingBox();
   const center=r=>r.y+r.height/2;
   assert(Math.abs(center(rects['lead-curp'])-center(copy))<2&&Math.abs(center(rects['lead-curp'])-center(renapoRect))<2,
       scenario.name+' CURP, Copy, RENAPO share the same horizontal center line');
   assert(copy.x>=rects['lead-curp'].x+rects['lead-curp'].width-2,
       scenario.name+' copy/RENAPO immediately follow CURP');
   if(scenario.w>1050){
    for(const id of ['lead-nombre','lead-colaborador'])assert(Math.abs(rects[id].y-rects['lead-curp'].y)<2,scenario.name+' first row '+id);
    for(const id of ['lead-tel','lead-email','lead-domicilio','lead-ciudad'])assert(Math.abs(rects[id].y-rects['lead-tel'].y)<2,scenario.name+' second row '+id);
    assert(rects['lead-tel'].y>rects['lead-curp'].y+30,scenario.name+' distinct second row');
    const heading=await page.locator('.cya-hybrid-lead-heading').boundingBox();
    const wa=await page.locator('.cya-hybrid-wa').boundingBox();
    const rightGap=heading.x+heading.width-(wa.x+wa.width);
    assert(rightGap>=33,scenario.name+' WhatsApp inset from right modal edge, including card padding');
    assert(Math.abs(center(heading)-center(wa))<4,scenario.name+' WhatsApp vertically centered');
    const panel=await page.locator('#cya-hybrid-section-identidad').boundingBox();
    assert(panel.height<255,scenario.name+' information displayed compactly in one view');
   }
   await page.locator('#lead-curp-actions button').first().click();
   await renapo.click();
   assert.equal(await page.evaluate(()=>window.__copied),true,'Copy handler intact');
   assert.equal(await page.evaluate(()=>window.__renapo),true,'RENAPO handler intact');
   await page.locator('#cya-hybrid-lead-whatsapp').click();
   assert.equal(await page.evaluate(()=>window.__openedWhatsApp),1,'One top-level WhatsApp entry');
   const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   assert.equal(overflows,false,scenario.name+' no horizontal document overflow');
   assert.deepEqual(errors,[],scenario.name+' no browser JS errors');
   console.log('PASS approved prospect identity '+scenario.name);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
