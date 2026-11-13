const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync('app-client-hybrid-v2.js','utf8');
const css=fs.readFileSync('app-client-hybrid-v2.css','utf8');
assert.ok(css.includes('#modal-cliente.cya-hybrid-inline-editor'));
const panel=id=>'<section class="tab-panel" id="pd-'+id+'"><div class="info-row">'+id+'</div></section>';
const editorField=(id,v='')=>'<div class="form-group"><label>'+id+'</label><input id="'+id+'" value="'+v+'"></div>';
const profileHTML=()=>'<div class="profile-stage-wrap">Etapas</div><div class="profile-summary-grid"></div><div id="perfil-tabs"></div>'+
 ['contacto','datos','docs','contratos','cita-afore','finanzas','historial'].map(panel).join('');
const html='<div class="modal-overlay open" id="modal-perfil"><div class="modal"><div class="profile-header"><div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div><div class="profile-header-actions"><button id="perfil-edit-btn">Editar</button><button id="perfil-regresar-prospecto-btn"></button><button id="perfil-descartar-btn"></button><button class="profile-close">X</button></div></div><div id="perfil-body">'+profileHTML()+'</div></div></div>'+
 '<div class="modal-overlay" id="modal-cliente"><div class="modal"><div class="modal-header">Editar cliente</div><div class="modal-body"><div id="modal-tabs"></div>'+
 '<div id="tab-contacto" class="tab-panel"><div class="form-row">'+editorField('fc-nombre','CLIENTE PRUEBA')+editorField('fc-telefono','4421111111')+'</div><div class="form-row">'+editorField('fc-colaborador')+editorField('fc-notas')+'</div><div class="cya-next-action-heading">Próxima acción (opcional)</div><div class="form-row">'+editorField('fc-prox-tipo')+editorField('fc-prox-fecha')+'</div><div class="form-row">'+editorField('fc-prox-hora')+editorField('fc-prox-nota')+'</div></div>'+
 '<div id="tab-elegibilidad" class="tab-panel"><div class="form-row">'+editorField('el-semanas')+'<div class="form-group"><input id="el-fecha" type="date" value="2021-07-15"></div></div></div>'+
 '<div id="tab-datos-extra" class="tab-panel"><div class="form-row">'+editorField('fc-nss')+editorField('fc-banco')+'</div><div class="form-row">'+editorField('fc-afore')+editorField('fc-comision')+'</div></div>'+
 '<div class="modal-footer"><button class="btn" onclick="closeModal(\'modal-cliente\')">Cancelar</button><button class="btn btn-primary" onclick="guardarCliente()">Guardar cliente</button></div></div></div></div>';
const dom=new JSDOM(html,{url:'https://crm.example.invalid',runScripts:'outside-only'});
const w=dom.window,d=w.document;
const c={id:'c1',nombre:'CLIENTE PRUEBA',curp:'CURPPRUEBA12345678',telefono:'4421111111',colaboradorId:null,etapa:'contrato_firmado',contratoFirmado:true,notas:'',historial:[],historialContratos:[]};
w.store={clientes:[c],asesores:[],colaboradores:[]};
w.perfilClienteActivo=c.id;
w.FUENTES={};w.clienteFormDirty=false;
w.confirm=()=>false;
let discardCalls=0;d.getElementById('perfil-descartar-btn').onclick=()=>discardCalls++;
let editCalls=0,saveCalls=0,openCalls=0;
w.closeModal=id=>d.getElementById(id).classList.remove('open');
w.editCliente=id=>{
 assert.equal(id,'c1');editCalls++;
 d.getElementById('modal-cliente').classList.add('open');
 d.getElementById('fc-telefono').value=c.telefono;
 d.getElementById('fc-banco').value=c.banco||'';
};
w.guardarCliente=async()=>{
 saveCalls++;
 c.banco=d.getElementById('fc-banco').value;
 d.getElementById('modal-cliente').classList.remove('open');
 w.clienteFormDirty=false;
};
w.openPerfil=id=>{
 assert.equal(id,'c1');openCalls++;
 d.getElementById('perfil-body').innerHTML=profileHTML();
 d.getElementById('modal-perfil').classList.add('open');
};
w.eval(script);
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await tick();
 const click=id=>d.querySelector('[data-hybrid-client="'+id+'"]').click();
 assert.equal(d.getElementById('cya-hybrid-client-panel').hidden,true,'signed client opens with no panel');
 click('identidad');
 const editor=d.getElementById('modal-cliente');
 assert.equal(editor.parentElement.id,'cya-hybrid-client-content','native editor inserted inside card');
 assert.equal(editor.classList.contains('cya-hybrid-inline-editor'),true);
 assert.equal(d.getElementById('fc-telefono').closest('.form-group').hidden,false);
 assert.equal(d.getElementById('fc-banco').closest('.form-group').hidden,true);
 assert.equal(editCalls,1);
 w.clienteFormDirty=true;
 d.getElementById('perfil-descartar-btn').click();
 assert.equal(discardCalls,0,'Discard action must be blocked with unconfirmed dirty edits');
 assert.equal(editor.dataset.hybridSection,'identidad','Blocked discard leaves edited panel open');
 click('banco');
 assert.equal(editor.dataset.hybridSection,'identidad','dirty edits block category change');
 w.confirm=()=>true;click('banco');
 assert.equal(editor.dataset.hybridSection,'banco');
 assert.equal(d.getElementById('fc-telefono').closest('.form-group').hidden,true);
 assert.equal(d.getElementById('fc-banco').closest('.form-group').hidden,false);
 d.getElementById('fc-banco').value='SANTANDER';
 await w.guardarCliente();await tick();
 assert.equal(saveCalls,1);
 assert.equal(openCalls,1,'successful save refreshed existing profile');
 assert.equal(editor.parentElement.id,'cya-hybrid-client-content','successful save reopens the same internal editor without a modal overlay');
 assert.equal(editor.dataset.hybridSection,'banco','save preserves selected category');
 assert.equal(c.banco,'SANTANDER');
 click('notas');assert.equal(editor.dataset.hybridSection,'notas');
 assert.equal(d.getElementById('fc-notas').closest('.form-group').hidden,false);
 for(const field of ['fc-prox-tipo','fc-prox-fecha','fc-prox-hora','fc-prox-nota'])
  assert.equal(d.getElementById(field).closest('.form-group').hidden,false,'Next action visible in Notes: '+field);
 assert.equal(d.getElementById('fc-banco').closest('.form-group').hidden,true);
 w.clienteFormDirty=false;
 click('afore');
 assert.equal(d.getElementById('cya-hybrid-client-content').querySelectorAll('#pd-cita-afore').length,0,'Legacy AFORE reference cannot be duplicated inside editor');
 click('notas');
 assert.equal(d.getElementById('fc-prox-tipo').closest('.form-group').hidden,false);
 click('previsional');
 const visibleDate=d.getElementById('cya-last-withdrawal-mx'),nativeDate=d.getElementById('el-fecha');
 assert(visibleDate,'Mexican date proxy rendered for original date input');
 assert.equal(visibleDate.value,'15/07/2021');
 assert.equal(nativeDate.hidden,true);
 visibleDate.value='17/07/2021';visibleDate.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(nativeDate.value,'2021-07-17','Date writes canonical ISO for native eligibility calculator');
 visibleDate.value='31/02/2021';visibleDate.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(nativeDate.value,'','Invalid calendar date cannot silently persist');
 w.clienteFormDirty=false;
 click('notas');
 assert.equal(d.getElementById('cya-last-withdrawal-mx'),null,'Proxy removed on category exit');
 assert.equal(nativeDate.hidden,false,'Native date restored on exit');
 d.querySelector('.profile-close').click();
 assert.equal(editor.parentElement,d.body,'profile close never strands editor inside a hidden profile');
 d.defaultView.close();console.log('PASS: inline category editing, native field reuse, unsaved changes, bank save, reopen and restore.');
})().catch(err=>{console.error(err);w.close();process.exitCode=1;});
