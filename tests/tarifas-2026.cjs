const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Prueba sintética sin clientes reales ni acceso a Supabase.
const fields={};
for(const id of ['fc-monto','fc-servicio','fc-colaborador','fc-honorarios','fc-comision','fc-col-comision','cp-honorarios','cp-comision','cp-empresa','cp-empresa-row','calc-preview']){
  fields[id]={value:'',textContent:'',dataset:{},style:{display:''},classList:{add(){},remove(){}}};
}
fields['fc-servicio'].value='retiro_desempleo';
const store={
  servicios:[{id:'retiro_desempleo',esquema:'mixto',honorariosFijo:8000,comisionFija:3000,umbralFijo:35000,honorariosPct:25,comisionPct:40},{id:'asesoria_pension',esquema:'manual'}],
  asesores:[{id:'owner',rol:'admin'}],colaboradores:[{id:'collab',pctComision:40}],
  clientes:[{id:'historico',servicio:'retiro_desempleo',montoAfore:35193,honorarios:8000,comision:3000,asesorId:'owner'}],
};
const scope=vm.createContext({store,document:{getElementById:id=>fields[id]||null},editingId:null,asesorDestinoVista:()=> 'owner'});
vm.runInContext(fs.readFileSync('app-core-04.js','utf8'),scope);
const calc=(m,client)=>vm.runInContext('calcComision('+m+',"retiro_desempleo","owner",'+JSON.stringify(client)+')',scope);
const current={tarifaComisionesVersion:'2026-11'};
for(const [m,h,c] of [[35193,10000,5000],[50000,10000,5000],[35192,8798,4399],[35192.5,8798.13,4399.07],[30000,7500,3750],[10000,2500,1250]]){
  assert.equal(calc(m,current).honorarios,h,'honorarios '+m);
  assert.equal(calc(m,current).comision,c,'comision '+m);
}
// Tarifas anteriores intactas, aunque coincidan con un monto de la tarifa nueva.
assert.equal(calc(35193,store.clientes[0]).honorarios,8000);
assert.equal(calc(35193,store.clientes[0]).comision,3000);
scope.currentForTest={tarifaComisionesVersion:'2026-11',colaboradorId:'collab',asesorId:'owner',colPct:40,comision:5000};
assert.equal(vm.runInContext('comisionDelColaborador(currentForTest,store.colaboradores[0])',scope),2000);
assert.equal(vm.runInContext('comisionDelAsesor(currentForTest,store.colaboradores[0])',scope),3000);
scope.currentForTest={tarifaComisionesVersion:'2026-11',colaboradorId:'collab',asesorId:'owner',colPct:50,comision:3750};
assert.equal(vm.runInContext('comisionDelColaborador(currentForTest,store.colaboradores[0])',scope),1875);
assert.equal(vm.runInContext('comisionDelAsesor(currentForTest,store.colaboradores[0])',scope),1875);
// La vista previa debe proponer importes sin sobrescribir ajustes manuales.
fields['fc-monto'].value='35193';fields['fc-colaborador'].value='collab';
vm.runInContext('previewCalculo()',scope);
assert.equal(fields['fc-honorarios'].value,10000);
assert.equal(fields['fc-comision'].value,5000);
assert.equal(fields['fc-col-comision'].value,2000);
assert.match(fields['cp-comision'].textContent,/Asesor \$3,000.*Colaborador \$2,000/);
assert.equal(fields['cp-empresa'].textContent,'$5,000');
fields['fc-monto'].value='30000';
vm.runInContext('previewCalculo()',scope);
assert.equal(fields['fc-honorarios'].value,7500);
assert.equal(fields['fc-comision'].value,3750);
assert.equal(fields['fc-col-comision'].value,1875);
assert.equal(fields['cp-empresa'].textContent,'$3,750');
fields['fc-honorarios'].value='6400';fields['fc-honorarios'].dataset.cyaManual='1';
fields['fc-comision'].value='3200';fields['fc-comision'].dataset.cyaManual='1';
vm.runInContext('previewCalculo()',scope);
assert.equal(fields['fc-honorarios'].value,'6400');
assert.equal(fields['fc-comision'].value,'3200');
assert.equal(fields['cp-empresa'].textContent,'$3,200');
// Edición de cliente histórico no modifica sus campos.
scope.editingId='historico';fields['fc-honorarios'].value='8000';fields['fc-comision'].value='3000';
vm.runInContext('previewCalculo()',scope);
assert.equal(fields['fc-honorarios'].value,'8000');assert.equal(fields['fc-comision'].value,'3000');
console.log('Tarifas 2026: 6 escenarios, histórico y edición manual OK');
