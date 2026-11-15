'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const core=fs.readFileSync('app-core-06.js','utf8'),safety=fs.readFileSync('app-collaborator-profile-safety.js','utf8');
const page=fs.readFileSync('app/index.html','utf8');
assert(page.includes('id="col-whatsapp"'),'Collaborator modal contains WhatsApp');
const fragment=core.slice(core.indexOf('function normalizarWhatsappColaborador('),core.indexOf('function renderColaboradores()'));
assert(fragment.startsWith('function normalizarWhatsappColaborador'));
const dom=new JSDOM('<div class="modal-overlay open" id="modal-colaborador">'+
 '<input id="col-nombre" value="ANA"/><input id="col-apellidos" value="NIETO"/><input id="col-email" value="ana@example.com"/>'+
 '<input id="col-ciudad" value="QUERÉTARO"/><input id="col-fecha-nacimiento" value=""/>'+
 '<input id="col-asesor" value="a1"/><input id="col-pct" value="50"/><input id="col-activo" value="true"/>'+
 '<input id="col-portal-estado" value="no_crear"/><input id="col-portal-password" value=""/>'+
 '<input id="col-whatsapp" value="+52 442 123 4567"/><div id="col-portal-message"></div></div>',{url:'https://crm.example.invalid/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval(fragment);
assert.equal(w.normalizarWhatsappColaborador('442 123 4567'),'4421234567');
assert.equal(w.normalizarWhatsappColaborador('+52 442 123 4567'),'4421234567');
assert.equal(w.normalizarWhatsappColaborador('5214421234567'),'4421234567');
assert.equal(w.normalizarWhatsappColaborador('44212'),null);
assert.equal(w.normalizarWhatsappColaborador(''),'');
w.eval('let editingColaboradorId="col1";let sesionActiva={id:"a1"};let store={colaboradores:[{id:"col1",asesorId:"a1",nombre:"ANA NIETO",comisionDefault:1000,metaAdicional:"conservar"}],asesores:[{id:"a1"}]};');
w.eval('function guardarColaborador(){}');
w.getVal=id=>d.getElementById(id)?.value||'';
w.isAdmin=()=>false;
w.__cyaCollaboratorProfileMetadataInstalled=true;
w.supabaseClient={functions:{invoke:async()=>({data:{collaborators:[]}})}};
let saves=0,fail=false;
w.saveStore=()=>saves++;
w.cloudSyncNow=async()=>{if(fail)throw Error('Sin conexión')};
w.closeModal=id=>d.getElementById(id).classList.remove('open');
w.showToast=()=>{};
w.renderPage=()=>{};
w.eval(safety);
(async()=>{
 await new Promise(resolve=>setTimeout(resolve,65));
 d.getElementById('col-whatsapp').value='123';
 await w.guardarColaborador();
 assert.equal(w.eval('store.colaboradores[0].telefonoWhatsapp'),undefined,'Invalid number cannot save');
 assert.equal(saves,0);
 d.getElementById('col-whatsapp').value='+52 442 123 4567';
 await w.guardarColaborador();
 assert.equal(saves,1);
 assert.equal(w.eval('store.colaboradores[0].telefonoWhatsapp'),'4421234567');
 assert.equal(w.eval('store.colaboradores[0].comisionDefault'),1000,'Preserves commission settings');
 assert.equal(w.eval('store.colaboradores[0].metaAdicional'),'conservar','Preserves unknown keys');
 d.getElementById('modal-colaborador').classList.add('open');
 w.eval('editingColaboradorId="col1"');
 d.getElementById('col-whatsapp').value='4429999999';
 fail=true;
 await w.guardarColaborador();
 assert.equal(w.eval('store.colaboradores[0].telefonoWhatsapp'),'4421234567','Cloud failure rolls back phone');
 dom.window.close();
 console.log('PASS phase 2 collaborator WhatsApp validation, cloud save, metadata preservation and rollback');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});