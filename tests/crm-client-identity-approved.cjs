'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const app=fs.readFileSync('app/index.html','utf8');
const nativeDoc=new JSDOM(app).window.document;
const form=nativeDoc.getElementById('modal-cliente')?.outerHTML;
assert(form&&form.includes('fc-curp')&&form.includes('fc-nombre'),'Using the real original client editor, not a mock copy');
const panels=['pd-contacto','pd-datos','pd-docs','pd-cita-afore','pd-contratos','pd-finanzas','pd-historial'].map(id=>'<section class="tab-panel" id="'+id+'">Original '+id+'</section>').join('');
let alertMode='pending';
const main=()=>'<div class="alerta-firma alerta-verde">✓ Contrato firmado el 11/11/2026</div>'+
 (alertMode==='pending'?'<div class="alerta-firma alerta-amarilla">⚠ Falta capturar banco</div>'+
 '<div class="alerta-firma alerta-amarilla">⚠ Falta cita de actualización de datos en AFORE</div>':'')+
 (alertMode==='overflow'?'<div class="alerta-firma alerta-amarilla">⚠ Banco</div>'+
 '<div class="alerta-firma alerta-amarilla">⚠ Cita AFORE</div><div class="alerta-firma alerta-roja">⚠ Vencimiento</div>':'')+
 '<div class="profile-stage-wrap"></div><div class="profile-summary-grid"></div><div id="perfil-tabs"></div>'+panels;
const profile=()=>'<div class="modal-overlay open" id="modal-perfil"><div class="modal client-profile-modal"><div class="profile-header">'+
 '<div class="profile-header-copy"><div id="perfil-title"></div><div id="perfil-sub"></div></div>'+
 '<div class="profile-header-actions"><button id="perfil-edit-btn"></button><button id="perfil-regresar-prospecto-btn"></button>'+
 '<button id="perfil-descartar-btn"></button><button class="profile-close"></button></div></div>'+
 '<div id="perfil-body">'+main()+'</div></div></div>';
const dom=new JSDOM(profile()+form,{url:'https://crm.example.invalid',runScripts:'outside-only'}),w=dom.window,d=w.document;
const curp='GOER700830HQTNVS02';
const c={id:'c1',nombre:'ROSALIO GONZÁLEZ EVANGELISTA',curp,telefono:'4461170459',email:'correo@ejemplo.com',
 domicilio:'C. SANTA BÁRBARA S/N, PEDRO ESCOBEDO, QUERÉTARO',ciudad:'PEDRO ESCOBEDO',
 asesorId:'a1',etapa:'dado_alta',contratoFirmado:true,fechaRegistro:'2026-11-11',
 servicio:'retiro_desempleo',fechaRetiroEstimada:'2026-12-28',historial:[]};
w.store={clientes:[c],asesores:[{id:'a1',nombre:'Emmanuel Álvarez'}],colaboradores:[],agenda:[]};
w.perfilClienteActivo='c1';w.FUENTES={};w.clienteFormDirty=false;w.confirm=()=>true;
w.__cyaClientActivitiesV2={statuses:()=>[{id:'firmado',state:'done'},{id:'alta',state:'done'},{id:'app',state:'future'}]};
const copied=[],toast=[];Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async s=>copied.push(s)}});
w.showToast=(msg,status)=>toast.push({msg,status});
w.closeModal=id=>d.getElementById(id)?.classList.remove('open');
let editCount=0,saveCount=0,openCount=0;
w.editCliente=id=>{
 assert.equal(id,'c1');editCount++;
 d.getElementById('modal-cliente').classList.add('open');
 for(const [id,v] of [['fc-nombre',c.nombre],['fc-curp',c.curp],['fc-telefono',c.telefono],['fc-email',c.email],
 ['fc-domicilio',c.domicilio],['fc-ciudad',c.ciudad],['fc-banco',c.banco||'']])
 d.getElementById(id).value=v;
};
w.guardarCliente=async()=>{
 saveCount++;c.telefono=d.getElementById('fc-telefono').value;
 c.curp=d.getElementById('fc-curp').value;
 d.getElementById('modal-cliente').classList.remove('open');
};
w.openPerfil=id=>{assert.equal(id,c.id);openCount++;d.getElementById('perfil-body').innerHTML=main();d.getElementById('modal-perfil').classList.add('open')};
w.eval(fs.readFileSync('app-client-hybrid-v2.js','utf8'));
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await tick();
 const root=d.getElementById('cya-hybrid-client-root');
 assert(root,'Native client card mounted');
 assert.equal(root.querySelectorAll('.cya-client-summary-card').length,4);
 assert.equal(root.querySelectorAll('.cya-client-pending-alert').length,2,'Two real pending alerts share the summary row');
 assert.equal(root.querySelector('.cya-client-summary-grid').classList.contains('has-2-alerts'),true);
 assert.equal(root.querySelectorAll('.cya-client-pending-alert.is-medium').length,2);
 assert(!root.textContent.includes('✓ Contrato firmado el'),'Completed confirmation not repeated');
 assert.equal(d.querySelectorAll('.cya-client-identity-row').length,2,'Exactly two visible Identity field rows');
 const six=[
  ['fc-nombre','fc-curp','fc-telefono'],
  ['fc-email','fc-domicilio','fc-ciudad']
 ];
 six.forEach((ids,row)=>assert.deepEqual([...d.querySelectorAll('.cya-client-identity-row')[row].querySelectorAll('.form-group input[id]')].map(n=>n.id),ids,'Approved field order '+row));
 const native=d.getElementById('modal-cliente');
 assert.equal(native.classList.contains('cya-client-identity-active'),true);
 assert.equal(d.getElementById('fc-curp').value,curp,'Complete original 18-character CURP is not masked');
 assert.equal(curp.length,18);
 assert.equal(d.getElementById('cya-client-copy-curp').previousElementSibling.contains(d.getElementById('fc-curp')),true,'Copy button directly follows field');
 assert.equal(d.querySelectorAll('#cya-client-copy-curp').length,1,'Exactly one CURP copy control');
 d.getElementById('cya-client-copy-curp').click();await tick();
 assert.deepEqual(copied,[curp],'Clipboard gets full CURP');
 d.getElementById('fc-curp').value='ABCD900101HQTLLL01';
 d.getElementById('cya-client-copy-curp').click();await tick();
 assert.equal(copied.at(-1),'ABCD900101HQTLLL01','Clipboard reads updated unsaved original input');
 assert.equal(d.getElementById('cya-hybrid-client-panel').querySelector('.cya-hybrid-client-panel-head small').textContent,'Datos del cliente');
 assert.equal(d.querySelectorAll('[data-hybrid-client]').length,9,'Nine cards preserved');
 assert.equal(d.getElementById('fc-fuente').closest('.form-group').hidden,true,'Source not duplicated in compact Identity');
 assert.equal(d.getElementById('fc-nombre').closest('#tab-contacto'),null,'Native name field moved, never cloned');
 assert.equal(d.getElementById('fc-curp').closest('#tab-datos-extra'),null,'Native CURP moved, never cloned');
 assert.equal(d.querySelectorAll('#fc-curp').length,1,'Native CURP input must retain single identity');
 d.getElementById('fc-curp').value=curp;
 d.getElementById('fc-telefono').value='4465550011';
 await w.guardarCliente();await tick();
 assert.equal(saveCount,1,'Native save handler called once');
 assert.equal(c.telefono,'4465550011','Real native field value saved');
 assert.equal(d.getElementById('fc-curp').value,curp,'Native CURP preserved');
 assert.equal(openCount,1,'Original profile redraw works after native save');
 assert.equal(d.querySelectorAll('.cya-client-identity-row').length,2,'Rebuilt native fields remain compact');
 d.querySelector('[data-hybrid-client="banco"]').click();
 assert.equal(d.getElementById('cya-client-copy-curp'),null,'Identity copy button removed on section change');
 assert.equal(d.getElementById('fc-nombre').closest('#tab-contacto')!==null,true,'Original name restored');
 assert.equal(d.getElementById('fc-curp').closest('#tab-datos-extra')!==null,true,'Original CURP restored');
 assert.equal(d.getElementById('fc-banco').closest('.form-group').hidden,false,'Native bank still editable');
 d.querySelector('[data-hybrid-client="notas"]').click();
 assert.equal(native.dataset.hybridSection,'notas','Other native panel still works');
 w.clienteFormDirty=false;
 d.querySelector('[data-hybrid-client="identidad"]').click();
 assert.equal(d.querySelectorAll('#cya-client-copy-curp').length,1,'No duplicate copy control after category round trip');
 // Resolve pending warnings: profile rebuild should show four statuses only.
 alertMode='resolved';w.openPerfil('c1');await tick();
 assert.equal(d.querySelectorAll('.cya-client-pending-alert').length,0,'Resolved warnings disappear (not green)');
 assert.equal(d.querySelector('.cya-client-summary-grid.has-0-alerts')!==null,true,'KPI row automatically expands');
 assert.equal(d.querySelectorAll('.cya-client-summary-card').length,4);
 // More than two warnings must remain accessible in the second tooltip.
 alertMode='overflow';w.openPerfil('c1');await tick();
 assert.equal(d.querySelectorAll('.cya-client-pending-alert').length,2,'Additional alerts grouped without horizontal overflow');
 assert.match(d.querySelectorAll('.cya-client-pending-alert')[1].title,/Cita AFORE.+Vencimiento/);
 d.querySelector('.profile-close').click();
 assert.equal(d.getElementById('fc-nombre').closest('#tab-contacto')!==null,true,'Original form restored on profile close');
 assert.equal(d.getElementById('fc-curp').closest('#tab-datos-extra')!==null,true,'CURP restored on profile close');
 assert.deepEqual(toast.filter(x=>x.status==='success').map(x=>x.msg),['CURP copiada','CURP copiada']);
 dom.window.close();
 console.log('PASS Clientes approved: 6 native fields/2 rows, copy full 18 CURP, original save, all tabs, 4 KPI + only pending alerts and restore');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
