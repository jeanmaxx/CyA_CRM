const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const js=fs.readFileSync('app-client-activities-v2.js','utf8');
const html='<main><div id="main-content"></div></main><div class="modal-overlay" id="modal-perfil"></div>';
const dom=new JSDOM(html,{url:'https://crm.example.invalid',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
const c={id:'c1',nombre:'PRUEBA',servicio:'retiro_desempleo',asesorId:'advisor1',etapa:'contrato_firmado',contratoFirmado:true,fechaFirmaContrato:'2026-09-10',fechaRetiroEstimada:'2026-10-26',fechaSolicitudManual:'2026-10-25',fechaAltaAfore:'',historial:[],docs:{curp:true,acta:true},honorarios:8000,comision:3000};
w.store={clientes:[c]};w.sesionActiva={id:'advisor1',rol:'asesor'};
w.isAdmin=()=>false;w.currentPage='clientes';w.renderPage=()=>{};w.openPerfil=()=>{};let saves=0,confirmations=0,warnings=[];
w.cloudSyncNow=async()=>{saves++;return true};
w.addHist=(client,type,text)=>client.historial.push({tipo:type,texto:text});
w.showToast=(text,type)=>warnings.push({text,type});
w.confirm=()=>{confirmations++;return true};
w.eval(js);
const model=w.__cyaClientActivitiesV2;
assert.equal(model.STEPS.length,12);
assert.deepEqual(Array.from(model.STEPS,s=>s.id),['contrato','firmas','firmado','alta','app','banco_n4','cita','documentos','expediente','solicitud','deposito','honorarios']);
assert.deepEqual(Array.from(model.statuses(c).slice(0,4),s=>s.state),['skipped','done','done','future'],'No fabricating contract generation when only signature known');
assert.equal(model.statuses(c).find(x=>x.id==='documentos').state,'future');
assert(model.renderFull(c).includes('cya-operational-track'));
assert(model.renderMini(c).includes('is-mini'));
assert(!model.renderFull({...c,servicio:'asesoria_pension'}),'Only retirement service receives 12-stage tracker');
assert.equal(model.flags({...c,docs:{curp:true,acta:true,csf:true}}).documentos,true);
assert.equal(model.flags({...c,docs:{curp:true,acta:true}}).documentos,false);
for(const status of ['Pendiente','No recibido','No cobrado','Cobro parcial','Por cobrar','Cancelado']){
 const legacy={...c,etapa:'honorarios_recibidos',estadoPago:status,etapasOperativasV2:{honorarios:{done:true,verifiedExternally:true}}};
 assert.equal(model.flags(legacy).honorarios,false,'No honorarios verdes sin cobro real: '+status);
}
for(const status of ['Cobrado','Pago recibido','Liquidado']){
 const verified={...c,etapa:'honorarios_recibidos',estadoPago:status};
 assert.equal(model.flags(verified).honorarios,true,'Estado financiero pagado compatible: '+status);
}
assert.equal(model.flags({...c,estadoPago:'Cobrado',etapasOperativasV2:{honorarios:{done:true}}}).honorarios,true);

const snap={fechaFirmaContrato:c.fechaFirmaContrato,fechaRetiroEstimada:c.fechaRetiroEstimada,fechaSolicitudManual:c.fechaSolicitudManual,honorarios:c.honorarios,comision:c.comision};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
 assert(model.open('c1','solicitud'));
 d.getElementById('cya-op-date').value='10/11/2026';
 d.getElementById('cya-op-note').value='Solicitud registrada y confirmación expediente';
 const firstSave=d.querySelector('[data-op-save]');
 firstSave.click();
 assert.equal(firstSave.disabled,true,'A pending milestone save must disable repeated clicks');
 firstSave.click(); // deliberate double-click: only one write is permitted
 await tick();await tick();
 assert.equal(saves,1,'Double-click must trigger a single cloud write');
 assert.equal(confirmations,1,'Skipped expediente requires explicit confirmation');
 assert.equal(c.etapasOperativasV2.expediente.done,true);
 assert.equal(c.etapasOperativasV2.solicitud.done,true);
 assert.equal(c.etapasOperativasV2.solicitud.fecha,'2026-11-10');
 assert.equal(c.etapa,'solicitud_realizada','Verified request advances canonical pipeline');
 assert.equal(c.fechaSolicitudRealizada,'2026-11-10','Actual request date is stored explicitly');
 assert.equal(c.etapasOperativasV2.expediente.fecha,null,'No fabricated date for previously missing AFORE evidence');
 assert(c.historial.some(x=>x.tipo==='actividad'));
 for(const [k,v] of Object.entries(snap))assert.equal(c[k],v,'Activity cannot mutate canonical date/finance field '+k);
 assert.equal(model.statuses(c).find(x=>x.id==='documentos').state,'skipped','Skipped prior documents marked yellow');
 assert(model.open('c1','documentos'));
 d.getElementById('cya-op-date').value='11/11/2026';
 d.querySelector('[data-op-save]').click();
 await tick();
 assert.equal(saves,1,'Incomplete checklist does not save');
 for(const id of ['curp','csf','acta'])d.getElementById('cya-op-doc-'+id).checked=true;
 d.querySelector('[data-op-save]').click();await tick();await tick();
 assert.equal(c.etapasOperativasV2.documentos.done,true);
 assert.equal(model.statuses(c).find(x=>x.id==='documentos').state,'done');
 assert(model.open('c1','honorarios'));
 d.getElementById('cya-op-date').value='11/11/2026';
 d.querySelector('[data-op-save]').click();await tick();
 assert.equal(Boolean(c.etapasOperativasV2.honorarios),false,'Honorarios cannot be marked without finance confirmation');
 c.estadoPago='Cobrado';
 d.querySelector('[data-op-save]').click();await tick();await tick();
 assert.equal(c.etapasOperativasV2.honorarios.done,true);
 assert.equal(c.etapasOperativasV2.deposito.done,true,'Deposit confirmation is explicit dependency');
 assert.equal(c.comision,snap.comision,'Never mark advisor commission paid');
 // A completed/attended case is read-only except for an owner/admin's
 // explicit and audited document correction.
 const attended={...c,id:'arch-1',archivado:true,etapasOperativasV2:{},docs:{curp:true,csf:false,acta:false},historial:[]};
 w.store.clientes.push(attended);
 assert(model.open('arch-1','documentos'));
 assert.equal(d.getElementById('cya-op-doc-csf').disabled,false,'Owner can correct attended client documents');
 assert.equal(d.getElementById('cya-op-doc-acta').disabled,false);
 d.getElementById('cya-op-date').value='11/11/2026';
 d.getElementById('cya-op-doc-csf').click();
 d.getElementById('cya-op-doc-acta').click();
 assert.equal(d.getElementById('cya-op-doc-csf').checked,true,'Checkbox responds to real click');
 d.querySelector('[data-op-save]').click();await tick();await tick();
 assert.equal(attended.etapasOperativasV2.documentos.done,true,'Archived owner document correction persisted');
 assert(attended.historial.some(h=>h.tipo==='actividad'),'Correction has audit trail');
 assert(model.open('arch-1','alta'));
 assert(!d.querySelector('[data-op-save]'),'Unrelated archived milestones are read-only');
 // No save for other advisor.
 w.sesionActiva={id:'other',rol:'asesor'};
 const before=saves;
 assert(model.open('c1','app'));
 assert(!d.querySelector('[data-op-save]'),'Unauthorized advisor sees read-only activity details');
 assert.equal(saves,before);
 assert(model.open('arch-1','documentos'));
 assert.equal(d.getElementById('cya-op-doc-csf').disabled,true,'Non-owner cannot modify attended documents');
 assert(!d.querySelector('[data-op-save]'));
 assert.match(d.querySelector('.cya-operational-readonly')?.textContent||'',/Solo lectura/);
 model.close();w.close();
 console.log('PASS: 12 milestones, confirmed canonical request, forecast preservation, no fabricated prior dates, finance and role guards.');
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
