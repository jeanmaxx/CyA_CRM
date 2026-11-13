const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const styles=fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const curp=fs.readFileSync('app-curp-client-eligibility.js','utf8');
const html=fs.readFileSync('app/index.html','utf8');
const loader=fs.readFileSync('app-prospect-manual-fields-fix.js','utf8');
assert.match(html,/app-prospect-hybrid-v2\.css\?v=20261113-stable/);
assert.match(loader,/app-prospect-hybrid-v2\.js\?v=20261113-stable/);
assert.match(styles,/cya-hybrid-lead-cards/);
assert.ok(!meta.includes('cya-copy-review-request'));
assert.ok(!meta.includes('cya-open-whatsapp-review'));
assert.ok(!meta.includes('cyaCopiarSolicitudRevision'));
assert.ok(!meta.includes('cyaAbrirWhatsAppRevision'));
assert.ok(meta.includes('reviewMessage()'),'Keep review validation, only remove abandoned actions');
assert.ok(meta.includes('cyaMarcarRevisionEnviada'),'Keep official review flow');
assert.ok(curp.includes('cya-curp-copy-icon'));
assert.ok(curp.includes('cyaVerificarCurpProspecto()'));
const dom=new JSDOM('<div class="modal-overlay" id="modal-lead"><div class="modal"><div class="modal-body">'+
 '<div class="form-row"><div class="form-group"><input id="lead-nombre" value="ANA PRUEBA"></div><div class="form-group"><input id="lead-tel" value="4420000000"></div></div>'+
 '<div class="form-row"><div class="form-group"><input id="lead-curp" value="CURPPRUEBA"><div id="lead-curp-actions"><button id="curp-copy">Copiar</button><button id="curp-renapo">RENAPO</button></div></div><div class="form-group"><select id="lead-colaborador"><option value="c1" selected>Jessica</option></select></div></div>'+
 '<div class="form-row"><div class="form-group"><select id="lead-servicio"><option value="retiro_desempleo">Retiro</option></select></div><div class="form-group"><select id="lead-estado"><option value="semanas">En revisión</option></select></div></div>'+
 '<div class="form-section">Datos de elegibilidad</div><div id="lead-elegibilidad-container"><input id="lead-el-semanas" value="900"></div>'+
 '<div class="form-group"><textarea id="lead-notas">Llamada inicial</textarea></div>'+
 '<div id="lead-registration-wrap"><input id="lead-fecha-registro" value="12/11/2026"></div>'+
 '<section id="cya-prospect-stage-stepper">Etapas existentes</section>'+
 '<div id="cya-lead-extra-fields"><div class="form-row"><div class="form-group"><input id="lead-email" value="test@example.com"></div><div class="form-group"><input id="lead-ciudad" value="Querétaro"></div></div>'+
 '<div class="form-row"><div class="form-group"><select id="lead-fuente"><option value="Meta Ads" selected>Meta Ads</option></select></div><div class="form-group"><input id="lead-nss" value="12345678901"></div></div>'+
 '<div class="form-row"><div class="form-group"><input id="lead-afore" value="SURA"></div><div class="form-group"><input id="lead-domicilio" value="Calle uno"></div></div></div>'+
 '<div id="cya-meta-lead-tabs">Pestañas legacy</div><section id="cya-meta-questionnaire-panel">Respuestas originales</section>'+
 '</div><div class="modal-footer"><button id="guardar-prospecto">Guardar</button></div></div></div>',{url:'https://crm.example.invalid/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.store={leads:[{id:'l1',nombre:'ANA PRUEBA',telefono:'4420000000',curp:'CURPPRUEBA',fuenteContacto:'Meta Ads',estado:'semanas',colaboradorId:'c1',metaAds:true,metaLead:{campaignName:'Campaña',answers:{pregunta:'sí'}},historial:[{fecha:'2026-11-12',accion:'Alta de prospecto'}]}],colaboradores:[{id:'c1',nombre:'Jessica'}],asesores:[]};
w.editingLeadId='l1';let saves=0,wa=0,confirmNext=false;
w.openModalLead=function(){d.getElementById('modal-lead').classList.add('open');};
w.guardarLead=async()=>{saves++;d.getElementById('modal-lead').classList.remove('open');};
w.cyaAbrirCentroMensajesWhatsApp=()=>{wa++};
w.confirm=()=>confirmNext;
d.getElementById('guardar-prospecto').onclick=()=>w.guardarLead();
w.eval(code);
(async()=>{
 w.openModalLead('l1');
 await new Promise(resolve=>setTimeout(resolve,150));
 assert.equal(d.querySelectorAll('.cya-hybrid-lead-card').length,5);
 assert.equal(d.querySelectorAll('.cya-hybrid-lead-section:not([hidden])').length,1);
 assert.match(d.getElementById('cya-hybrid-lead-context').textContent,/Jessica/);
 assert.match(d.getElementById('cya-hybrid-lead-context').textContent,/Meta Ads/);
 assert.equal(d.getElementById('cya-hybrid-fields-identidad').contains(d.getElementById('lead-curp')),true);
 assert.equal(d.getElementById('cya-hybrid-fields-identidad').contains(d.getElementById('lead-domicilio')),true);
 assert.equal(d.getElementById('cya-hybrid-fields-elegibilidad').contains(d.getElementById('lead-el-semanas')),true);
 assert.equal(d.getElementById('cya-hybrid-fields-origen').contains(d.getElementById('lead-fuente')),true);
 assert.equal(d.getElementById('cya-hybrid-fields-origen').contains(d.getElementById('cya-meta-questionnaire-panel')),true);
 assert.match(d.getElementById('cya-hybrid-origin-overview').textContent,/Campaña/);
 assert.equal(d.getElementById('cya-hybrid-origin-overview').open,false,'Meta campaign source collapses by default');
 assert(d.getElementById('cya-hybrid-qualification'),'Qualification indicator appears inside eligibility section');
 assert.equal(d.getElementById('cya-hybrid-fields-seguimiento').contains(d.getElementById('lead-notas')),true);
 assert.equal(d.getElementById('cya-hybrid-fields-historial').textContent.includes('Alta de prospecto'),true);
 // The live original element, not a duplicate, remains editable and is seen by original save handler.
 const input=d.getElementById('lead-nombre');input.value='ANA MODIFICADA';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 d.querySelector('[data-hybrid-lead-section="elegibilidad"]').click();
 assert.equal(d.querySelector('[data-hybrid-lead-section="identidad"]').getAttribute('aria-pressed'),'true','Unsaved edit blocks navigation without explicit confirmation');
 confirmNext=true;d.querySelector('[data-hybrid-lead-section="elegibilidad"]').click();
 assert.equal(d.querySelector('[data-hybrid-lead-section="elegibilidad"]').getAttribute('aria-pressed'),'true');
 assert.equal(d.getElementById('lead-nombre').value,'ANA MODIFICADA');
 d.getElementById('guardar-prospecto').click();
 await new Promise(resolve=>setTimeout(resolve,180));
 assert.equal(saves,1,'Existing save action remains wired');
 assert.equal(d.getElementById('modal-lead').classList.contains('open'),true,'Keep expediente open after successful save');
 assert.equal(d.querySelector('[data-hybrid-lead-section="elegibilidad"]').getAttribute('aria-pressed'),'true','Preserve active section after save');
 d.getElementById('cya-hybrid-lead-whatsapp').click();
 assert.equal(wa,1,'Uses existing institutional WhatsApp action');
 dom.window.close();console.log('PASS: hybrid prospect cards, live fields, Meta questionnaire, CURP actions, unsaved edit guard, save and WhatsApp.');
})().catch(err=>{console.error(err);dom.window.close();process.exitCode=1});
