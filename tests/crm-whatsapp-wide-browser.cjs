'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const mainJs=fs.readFileSync('app-whatsapp-message-center.js','utf8');
const legacySindos=fs.readFileSync('app-wa-sindos-template.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const sc of [
    {name:'desktop oscuro',w:1440,h:900,theme:'dark'},
    {name:'desktop claro',w:1440,h:900,theme:'light'},
    {name:'tableta oscuro',w:1024,h:768,theme:'dark'},
    {name:'tableta claro',w:1024,h:768,theme:'light'},
    {name:'móvil oscuro',w:390,h:844,theme:'dark'},
    {name:'móvil claro',w:390,h:844,theme:'light'}
  ]){
   const page=await browser.newPage({viewport:{width:sc.w,height:sc.h}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+
     '<div class="modal-overlay open" id="modal-perfil"><div class="modal"><div class="modal-body">Cliente sintético</div></div></div>'+
     '</body></html>');
   await page.addStyleTag({content:css});
   await page.evaluate(theme=>{
    document.documentElement.dataset.theme=theme;
    window.perfilClienteActivo='client1';
    window.store={
      leads:[{id:'lead1',nombre:'PROSPECTO DEMO',telefono:'4421234567',estado:'semanas'},
             {id:'lead2',nombre:'SINDOS DEMO',telefono:'4421234567',estado:'sindos'}],
      clientes:[{id:'client1',nombre:'CLIENTE DEMO',telefono:'4421234567',
        servicio:'retiro_desempleo',etapa:'dado_alta',fechaAltaAfore:'2026-10-10'}],
      plantillas:[],asesores:[],colaboradores:[]
    };
    window.__saveCount=0;window.saveStore=()=>{window.__saveCount++;};
    window.showToast=()=>{};
    window.closeModal=id=>{window.__closed=id;document.getElementById(id)?.classList.remove('open');};
    window.navigate=page=>{window.__navigated=page;};
    window.seleccionarPlantilla=id=>{window.__selectedTemplate=id;};
    window.__openedUrls=[];window.open=url=>{window.__openedUrls.push(url);return {opener:null};};
    window.__copiedText='';
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedText=text;}}});
   },sc.theme);
   await page.addScriptTag({content:mainJs});
   await page.addScriptTag({content:legacySindos});
   await page.evaluate(()=>window.cyaAbrirWhatsAppProspectoPorId('lead1'));
   await page.waitForSelector('#cya-wa-message-center.open');
   const center=page.locator('#cya-wa-message-center .modal.cya-wa-center-modal');
   const box=await center.boundingBox();
   assert(box,sc.name+' actual modal is visible');
   if(sc.w===1440)assert(Math.abs(box.width-1280)<2,sc.name+' must render the approved 1280px modal width: '+box.width);
   else assert(box.width<=sc.w,sc.name+' modal fits viewport');
   assert.equal(await page.locator('#cya-wa-main-buttons [data-cya-wa-group]').count(),6,sc.name+' six main groups');
   assert.equal(await page.locator('#cya-wa-reject-buttons [data-cya-wa-group]').count(),6,sc.name+' six nonviable/future groups');
   assert.equal(await page.locator('#cya-wa-main-buttons [data-cya-wa-group="despedida"]').count(),1);
   assert.equal(await page.locator('#cya-wa-reject-buttons [data-cya-wa-group="alta_15"]').count(),1);
   assert.equal(await page.locator('[data-cya-wa-sindos="1"]').count(),0,sc.name+' no duplicate legacy SINDOS button');
   assert.equal(await page.locator('[data-cya-wa-group="revision"]').getAttribute('aria-pressed'),'true',sc.name+' stage-based automatic selection');
   assert.match(await page.locator('#cya-wa-selected-note').innerText(),/según etapa actual/i,sc.name+' automatic suggestion note');
   const selector='#cya-wa-main-buttons [data-cya-wa-group]';
   const cssColumns=await page.locator('#cya-wa-main-buttons').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(cssColumns,sc.w>=1080?6:sc.w>640?3:2,sc.name+' responsive category columns');
   if(sc.w>=1080){
     const coords=await page.locator(selector).evaluateAll(nodes=>nodes.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})));
     assert(coords.every(x=>Math.abs(x.y-coords[0].y)<2),sc.name+' all six follow-up categories share a row');
     assert(coords.every((x,i)=>i===0||x.x>coords[i-1].x),sc.name+' six categories left to right');
   }
   const bodyLayout=await page.locator('.cya-wa-center-modal .modal-body').evaluate(el=>getComputedStyle(el).display);
   assert.equal(bodyLayout,'flex',sc.name+' full-width top category groups and editor below');
   assert.equal(await page.locator('#cya-wa-message-center .cya-wa-part').count(),1,sc.name+' one message tab on revision');
   assert.equal(await page.locator('#cya-wa-message-center textarea').count(),1,sc.name+' only one editable textarea');
   assert.equal(await page.locator('#cya-wa-message-center .modal-footer button').count(),3,sc.name+' exactly three footer actions');
   assert.equal(await page.locator('#cya-wa-message-center .cya-wa-footer-copy').getAttribute('aria-label'),'Copiar mensaje');
   await page.locator('[data-cya-wa-group="bienvenida"]').click();
   assert.equal(await page.locator('#cya-wa-message-center .cya-wa-part').count(),2,sc.name+' one tab per welcome template');
   const area=page.locator('#cya-wa-text-0');
   await area.fill('Mensaje uno EDITADO para prueba');
   await page.locator('[data-cya-wa-part="1"]').click();
   assert.notEqual(await area.inputValue(),'Mensaje uno EDITADO para prueba',sc.name+' second tab displays another official message');
   await area.fill('Mensaje dos EDITADO para prueba');
   await page.locator('[data-cya-wa-part="0"]').click();
   assert.equal(await area.inputValue(),'Mensaje uno EDITADO para prueba',sc.name+' first tab retains unsent draft');
   await page.locator('[data-cya-wa-part="1"]').click();
   assert.equal(await area.inputValue(),'Mensaje dos EDITADO para prueba',sc.name+' second tab retains unsent draft');
   await page.locator('.cya-wa-footer-copy').click();
   await page.waitForFunction(()=>window.__copiedText.includes('Mensaje dos EDITADO'),null,{timeout:3000});
   assert.equal(await page.locator('#cya-wa-message-center textarea').count(),1,sc.name+' no stacked messages after tabs');
   await page.locator('.cya-wa-direct').click();
   const url=await page.evaluate(()=>window.__openedUrls.at(-1));
   assert(url.startsWith('https://wa.me/524421234567?text='),sc.name+' WhatsApp launch is manual');
   assert(decodeURIComponent(url).includes('Mensaje dos EDITADO para prueba'),sc.name+' chosen editable message is sent to WhatsApp preview');
   await page.evaluate(()=>window.cyaCerrarCentroMensajesWhatsApp());
   await page.evaluate(()=>window.cyaAbrirWhatsAppProspectoPorId('lead2'));
   assert.equal(await page.locator('[data-cya-wa-group="sindos"]').getAttribute('aria-pressed'),'true',sc.name+' SINDOS automatic selection');
   assert.match(await page.locator('#cya-wa-text-0').inputValue(),/retiro por desempleo/i,sc.name+' institutional SINDOS text intact');
   await page.evaluate(()=>window.cyaCerrarCentroMensajesWhatsApp());
   await page.evaluate(()=>window.cyaAbrirWhatsAppCliente());
   assert.equal(await page.locator('[data-cya-wa-group="alta_15"]').getAttribute('aria-pressed'),'true',sc.name+' clients still suggest follow-up after alta');
   assert.match(await page.locator('#cya-wa-block-list').innerText(),/Han transcurrido/i,sc.name+' alta timing helper preserved');
   await page.locator('[data-cya-wa-group="finalizacion"]').click();
   assert.equal(await page.locator('.cya-wa-part').count(),3,sc.name+' three separate finalization tabs');
   await page.locator('[data-cya-wa-part="1"]').click();
   await page.locator('.modal-footer button').first().click();
   await page.waitForFunction(()=>window.__selectedTemplate==='pl_wa_finalizacion_2',null,{timeout:3000});
   assert.equal(await page.locator('#cya-wa-message-center.open').count(),0,sc.name+' template editor opens from chosen second message');
   assert.equal(await page.evaluate(()=>window.__openedUrls.length),1,sc.name+' no automatic WhatsApp sending');
   assert.deepEqual(errors,[],sc.name+' no uncaught errors');
   console.log('PASS 1280px WhatsApp modal, six-by-two, selection, tabs, drafts, copy, send and editing: '+sc.name);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
