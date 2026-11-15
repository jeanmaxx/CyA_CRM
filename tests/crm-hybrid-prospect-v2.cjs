const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const styles=fs.readFileSync('app-prospect-hybrid-v2.css','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const curp=fs.readFileSync('app-curp-client-eligibility.js','utf8');
const html=fs.readFileSync('app/index.html','utf8');
const loader=fs.readFileSync('app-prospect-manual-fields-fix.js','utf8');
assert.match(html,/app-prospect-hybrid-v2\.css\?v=20261115-compartir-elegibilidad1/);
assert.match(loader,/app-prospect-hybrid-v2\.js\?v=20261115-compartir-elegibilidad1/);
assert.match(styles,/cya-hybrid-lead-cards/);
assert.ok(!meta.includes('cya-copy-review-request'));
assert.ok(!meta.includes('cya-open-whatsapp-review'));
assert.ok(!meta.includes('cyaCopiarSolicitudRevision'));
assert.ok(!meta.includes('cyaAbrirWhatsAppRevision'));
assert.ok(meta.includes('reviewMessage()'),'Keep review validation, only remove abandoned actions');
assert.ok(!meta.includes('class="cya-prospect-stage-dot" aria-hidden="true"'),'Stage renderer no longer generates circle or green check');
assert.match(meta,/function syncProspectSource\(/,'Automatic source sync installed');
assert.match(meta,/hasMetaOrigin\(lead\)/,'Meta Ads source takes precedence');
assert.match(meta,/col\.addEventListener\('change',\(\)=>syncProspectSource\(true\)\)/,'Collaborator selection recalculates contact source');
const archiveCode=fs.readFileSync('app-core-06.js','utf8');
assert.match(archiveCode,/lead\.fechaArchivo=alreadyArchived&&lead\.fechaArchivo\?lead\.fechaArchivo:now/,'Original archived date is preserved when editing reason');
assert.match(archiveCode,/lead\.historial\.push\(/,'Archiving adds a dated historical entry');
assert.match(code,/lead\?\.fechaArchivo/,'Legacy archived records show stored archive date in history');
assert.ok(meta.includes('cyaMarcarRevisionEnviada'),'Keep official review flow');
assert.ok(curp.includes('cya-curp-copy-icon'));
assert.ok(curp.includes('cyaVerificarCurpProspecto()'));
const dom=new JSDOM('<div class="modal-overlay" id="modal-lead"><div class="modal"><div class="modal-body">'+
 '<div class="form-row"><div class="form-group"><input id="lead-nombre" value="ANA PRUEBA"></div><div class="form-group"><input id="lead-tel" value="4420000000"></div></div>'+
 '<div class="form-row"><div class="form-group"><input id="lead-curp" value="CURPPRUEBA"><div id="lead-curp-actions"><button id="curp-copy">Copiar</button><button id="curp-renapo">✓ Verificar en RENAPO</button></div><button id="cya-mark-review-sent" disabled>✓ Revisión ya solicitada</button></div><div class="form-group"><select id="lead-colaborador"><option value="c1" selected>Jessica</option></select></div></div>'+
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
w.editingLeadId='l1';let saves=0,opens=0,wa=0,confirmNext=false;
w.openModalLead=function(){opens++;d.getElementById('modal-lead').classList.add('open');};
w.closeModal=id=>d.getElementById(id).classList.remove('open');
w.guardarLead=async()=>{
 saves++;
 w.store.leads[0].nombre=d.getElementById('lead-nombre').value;
 d.dispatchEvent(new w.CustomEvent('cya:prospect-saved',{detail:{id:'l1'}}));
 return true;
};
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
 assert.equal(d.getElementById('cya-hybrid-fields-identidad').contains(d.getElementById('lead-nss')),true,'Original NSS beside CURP');
 assert.equal(d.getElementById('cya-hybrid-fields-elegibilidad').contains(d.getElementById('lead-nss')),false,'NSS not duplicated in eligibility');
 assert.equal(d.getElementById('cya-hybrid-fields-identidad').contains(d.getElementById('lead-domicilio')),true);
 assert.equal(d.getElementById('cya-hybrid-registration-slot').contains(d.getElementById('lead-fecha-registro')),true,'Original editable registration field appears in header, not repeated in the form');
 assert.equal(d.querySelectorAll('#lead-fecha-registro').length,1,'One date input and no duplicated data');
 assert.equal(d.getElementById('cya-hybrid-curp-line').contains(d.getElementById('lead-curp')),true);
 assert.equal(d.getElementById('cya-hybrid-curp-line').contains(d.getElementById('lead-curp-actions')),true,'CURP and original actions share one control row');
 assert.equal(d.getElementById('curp-renapo').textContent,'RENAPO','Only RENAPO text');
 assert.equal(d.getElementById('cya-hybrid-review-row').contains(d.getElementById('cya-mark-review-sent')),true,'Requested review is a discrete status row');
 const identity=[...d.getElementById('cya-hybrid-fields-identidad').children].map(el=>el.querySelector('input,select')?.id||el.id);
 assert.deepEqual(identity.slice(0,8),['lead-nombre','lead-curp','lead-nss','lead-tel','lead-colaborador','lead-email','lead-domicilio','lead-ciudad'],'Approved field order');
 const heading=d.querySelector('.cya-hybrid-lead-heading');
 assert(heading.querySelector('.cya-hybrid-name-line').contains(d.getElementById('cya-hybrid-lead-context')),'Advisor/type/source chips beside the name');
 assert.equal(heading.querySelector('.cya-hybrid-registration-label').textContent,'REGISTRO');
 assert.equal(heading.querySelectorAll('#cya-hybrid-lead-whatsapp').length,1,'Only header WhatsApp');

 assert.equal(d.getElementById('cya-hybrid-fields-elegibilidad').contains(d.getElementById('lead-el-semanas')),true);
 // Compact commercial simulator stays in Prospectos > Elegibilidad.
 const comercial=d.getElementById('cya-prospect-commercial');
 assert(comercial,'Commercial simulator appears alongside original eligibility controls');
 assert.equal(comercial.querySelectorAll('.cya-com-values>.cya-com-field').length,5,'Five compact financial columns');
 assert.equal(d.querySelector('label[for="lead-com-honorarios"]').textContent,'Honorarios','Concise aligned label');
 const sbc=d.getElementById('lead-com-sbc'),ret=d.getElementById('lead-com-retiro');
 sbc.value='200';sbc.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(d.getElementById('lead-com-referencia').value,/6,000/,'SBC times thirty');
 assert.match(d.getElementById('lead-com-honorarios').value,/10,000/,'Fee capped at ten thousand');
 assert.match(d.getElementById('lead-com-neto').value,/25,193/,'Net calculation from maximum 2026');
 assert.equal(d.getElementById('lead-com-comparacion').value,'4.20 veces');
 ret.value='20000';ret.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(d.getElementById('lead-com-honorarios').value,/6,000/,'Below cap: thirty percent');
 assert.match(d.getElementById('lead-com-neto').value,/14,000/,'Net below the cap');
 const period=d.getElementById('lead-com-periodo');period.value='2027';period.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(ret.value,'37200','2027 scenario initializes at approved estimated amount');
 assert.match(d.getElementById('lead-com-honorarios').value,/10,000/,'2027 stays capped');
 assert.match(d.getElementById('lead-com-neto').value,/27,200/);
 assert.equal(d.getElementById('lead-com-comparacion').value,'4.53 veces');
 d.getElementById('lead-com-empresa').value='EMPLEO DE PRUEBA';

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
 assert.equal(d.querySelector('[data-hybrid-lead-section="elegibilidad"]').getAttribute('aria-pressed'),'true','Unsaved edits do not block navigation');
 assert.equal(d.getElementById('lead-nombre').value,'ANA MODIFICADA','Field value retained when changing sections');
 assert.equal(d.getElementById('lead-com-empresa').value,'EMPLEO DE PRUEBA','Commercial input retained across tabs');
 d.querySelector('[data-hybrid-lead-section="identidad"]').click();
 d.querySelector('[data-hybrid-lead-section="elegibilidad"]').click();
 assert.equal(d.querySelector('[data-hybrid-lead-section="elegibilidad"]').getAttribute('aria-pressed'),'true');
 assert.equal(d.getElementById('lead-nombre').value,'ANA MODIFICADA');
 const previousRoot=d.getElementById('cya-hybrid-lead-root');
 const previousInput=d.getElementById('lead-nombre');
 d.getElementById('guardar-prospecto').click();
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(saves,1,'Existing save action remains wired');
 assert.equal(opens,1,'Saving an existing prospect must not reopen its modal');
 assert.equal(d.getElementById('cya-hybrid-lead-root'),previousRoot,'Same existing dossier retained without replacing DOM');
 assert.equal(d.getElementById('lead-nombre'),previousInput,'Original input and focus context retained');
 assert.equal(d.getElementById('cya-hybrid-lead-name').textContent,'ANA MODIFICADA','Live heading refreshed after saving');
 assert.equal(d.getElementById('modal-lead').classList.contains('open'),true,'Keep expediente open after successful save');
 assert.equal(d.querySelector('[data-hybrid-lead-section="elegibilidad"]').getAttribute('aria-pressed'),'true','Preserve active section after save');
 d.getElementById('cya-hybrid-lead-whatsapp').click();
 assert.equal(wa,1,'Uses existing institutional WhatsApp action');
 assert.equal(heading.contains(d.getElementById('cya-prospect-stage-stepper')),true,'Existing stage controls stay in header');
 const overlay=d.getElementById('modal-lead');
 d.getElementById('lead-notas').value='nota no guardada';
 d.getElementById('lead-notas').dispatchEvent(new w.Event('input',{bubbles:true}));
 overlay.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.equal(overlay.classList.contains('open'),true,'Dirty outside click does not close dossier');
 assert.equal(d.getElementById('cya-prospect-unsaved-dialog').hidden,false,'Shows explicit unsaved changes dialog');
 d.querySelector('[data-unsaved-stay]').click();
 assert.equal(d.getElementById('cya-prospect-unsaved-dialog').hidden,true,'Keep editing dismisses only prompt');
 overlay.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 d.querySelector('[data-unsaved-discard]').click();
 assert.equal(overlay.classList.contains('open'),false,'Discard closes dossier');
 w.openModalLead('l1');
 await new Promise(resolve=>setTimeout(resolve,70));
 d.getElementById('lead-notas').value='Guardar al cerrar';
 d.getElementById('lead-notas').dispatchEvent(new w.Event('input',{bubbles:true}));
 overlay.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const savesBefore=saves;
 d.querySelector('[data-unsaved-save]').click();
 await new Promise(resolve=>setTimeout(resolve,40));
 assert.equal(saves,savesBefore+1,'Save dialog calls existing save exactly once');
 assert.equal(overlay.classList.contains('open'),false,'Successful save closes after confirmation');
 w.openModalLead('l1');
 await new Promise(resolve=>setTimeout(resolve,70));
 overlay.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.equal(overlay.classList.contains('open'),false,'Read-only outside click closes without prompt');
 dom.window.close();console.log('PASS: hybrid prospect cards, live fields, Meta questionnaire, CURP actions, unsaved edit guard, save and WhatsApp.');
})().catch(err=>{console.error(err);dom.window.close();process.exitCode=1});
