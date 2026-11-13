const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom'),vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const dom=new JSDOM(html,{url:'https://crm.example.invalid/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
w.confirm=()=>true;w.alert=()=>{};
w.HTMLElement.prototype.scrollIntoView=function(){};
w.HTMLElement.prototype.scrollTo=function(){};
w.scrollTo=()=>{};
w.Chart=function(){this.destroy=()=>{}};
const run=s=>vm.runInContext(s,dom.getInternalVMContext());
const val=(id,v)=>{const input=d.getElementById(id);assert(input,'Missing input '+id);input.value=v;};
for(const path of ['app-core-01.js','app-core-02a.js','app-core-02b.js','app-core-03.js','app-core-04.js','app-core-05.js','app-core-06.js','app-core-07.js']){
 run(fs.readFileSync(path,'utf8').replace('\ninitResponsiveShell();','\n'));
}
run(fs.readFileSync('tests/fixtures.js','utf8').replace('__ROLE__','admin').replace("actualizarSidebarSesion();updateRolUI();navigate('clientes');",''));
for(const path of ['app-workflow.js','app-prospect-workflow.js','app-contract-word.js','app-operations.js'])run(fs.readFileSync(path,'utf8'));
(async()=>{
 run("store.clientes[0].fechaFirmaContrato='2026-08-15';store.clientes[0].fechaRetiroEstimada='2026-10-10';store.clientes[0].fechaRetiroEstimadaManual=true;store.clientes[0].fechaSolicitudManual='2026-10-11';store.clientes[0].notas='Nota histórica';store.clientes[0].estadoPago='Pendiente';store.clientes[0].clabe='123456789012345678'");
 const before=JSON.parse(run("JSON.stringify(store.clientes[0])"));
 run("editCliente('test-client')");
 val('fc-banco','SANTANDER');
 val('fc-clabe','999999999999999999');
 // Intentionally change fields outside bank; guard must restore these.
 val('fc-telefono','0000000000');
 val('fc-honorarios','12345');
 val('fc-fecha-alta','18/08/2026');
 val('fc-fecha-solicitud-manual','22/10/2026');
 run("window.__cyaHybridClientEditSection='banco'");
 await run('guardarCliente()');
 const after=JSON.parse(run("JSON.stringify(store.clientes[0])"));
 assert.equal(after.banco,'SANTANDER');
 assert.equal(after.clabe,'999999999999999999');
 for(const key of ['telefono','honorarios','comision','fechaFirmaContrato','fechaAltaAfore','fechaRegistro','fechaRetiroEstimada','fechaRetiroEstimadaManual','fechaSolicitudManual','montoAfore','etapa','estadoPago','notas']){
  assert.deepEqual(after[key],before[key],'Unrelated field changed while saving bank: '+key);
 }
 assert.deepEqual(after.docs,before.docs);
 assert.deepEqual(run("store.agenda.filter(e=>e.clienteId==='test-client'&&e.regla==='solicitud_45')"),[],'No new schedule from bank save');
 // Exercise actual notes persistence, including a history entry, without changing bank.
 run("window.__cyaHybridClientEditSection='notas';editCliente('test-client')");
 val('fc-notas','Nueva observación de seguimiento');
 val('fc-banco','OTRO BANCO');
 await run('guardarCliente()');
 const noted=JSON.parse(run("JSON.stringify(store.clientes[0])"));
 assert.equal(noted.notas,'Nueva observación de seguimiento');
 assert.equal(noted.banco,'SANTANDER');
 assert(noted.historial.some(h=>h.tipo==='nota'),'Notes update must be recorded in client audit history');
 assert.equal(noted.fechaRetiroEstimada,before.fechaRetiroEstimada);
 dom.window.close();
 console.log('PASS: real guardarCliente protects nonselected fields, manual dates, bank account, finance and notes audit.');
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1});
