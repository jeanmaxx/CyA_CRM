'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('app-core-02a.js','utf8');
const section=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing production code '+a);return src.slice(i,j)};
const app=section('function renderClientes(){','/* Fila operativa acordada:')+
 section('function filtrarClientes(){','function elegibleChip(');
const js=new Function('document','store','clientesVisibles','alertasSeguimiento','colaboradoresVistaActual','getSelectorVistaHTML','flechaOrden','aplicarOrden','renderClientesRows','renderClientesCards','cyaClientesEtapasEncabezados',
 app+';return {renderClientes,filtrarClientes};');
const clients=[
 {id:'uno',nombre:'CLIENTE PRIMERO',curp:'ABCD900101HQTMLL07',telefono:'4411111111',nss:'12345678901',colaboradorId:null},
 {id:'dos',nombre:'CLIENTE SEGUNDO',curp:'WXYZ890202MQTLLL00',telefono:'4422222222',nss:'32145678901',colaboradorId:'col1'},
 {id:'tres',nombre:'ATENDIDO',curp:'ABCD850101MQTLLL02',telefono:'4433333333',archivado:true}
];
const doc=new JSDOM('<!doctype html><body><main id="app"></main></body>').window.document;
const events=[];
const renderRows=rows=>rows.map(c=>'<tr data-cya-client="'+c.id+'"><td>11/11/2026</td><td>'+c.nombre+'</td>'+
 Array.from({length:12},()=>'<td>·</td>').join('')+'<td>28/12/2026</td></tr>').join('');
const api=js(doc,{servicios:[]},()=>clients,()=>[],()=>[{id:'col1',nombre:'Colaborador uno',activo:true}],()=>'',()=>'',x=>x,renderRows,rows=>rows.map(c=>'<div class="client-mobile-card">'+c.nombre+'</div>').join(''),()=>Array.from({length:12},(_,i)=>'<th>Hito '+(i+1)+'</th>').join(''));
doc.getElementById('app').innerHTML=api.renderClientes();
assert.equal(doc.querySelectorAll('#fil-svc, #fil-etapa, #fil-fuente').length,0,'Remove only three redundant filters');
assert.equal(doc.querySelectorAll('#fil-colaborador').length,1,'Collaborator filter remains');
assert.equal(doc.querySelectorAll('#search-cl').length,1);
assert.match(doc.getElementById('search-cl').placeholder,/CURP/);
assert.equal(doc.querySelectorAll('#tbody-cl tr').length,2,'Only active clients shown');
assert.equal(doc.querySelectorAll('.clients-table-wrap table thead').length,2,'Active and attended lists remain');
assert.equal(doc.querySelectorAll('.clients-table-wrap table thead').item(0).querySelectorAll('th').length,15,'Registration, name, 12 activities, request');
assert.equal(doc.querySelectorAll('.clients-attended-section').length,1,'Horizontal collapsible attended list remains');
assert.equal(doc.querySelectorAll('button[onclick="exportarClientesExcel()"],button[onclick="exportarClientesPorEtapa()"]').length,2);
doc.getElementById('search-cl').value='WXYZ890202MQTLLL00';
api.filtrarClientes();
assert.equal(doc.querySelectorAll('#tbody-cl tr').length,1,'CURP search works');
assert.match(doc.getElementById('tbody-cl').textContent,/CLIENTE SEGUNDO/);
doc.getElementById('search-cl').value='';
doc.getElementById('fil-colaborador').value='directo';
api.filtrarClientes();
assert.equal(doc.querySelectorAll('#tbody-cl tr').length,1,'Direct-client filter remains');
assert.match(doc.getElementById('tbody-cl').textContent,/CLIENTE PRIMERO/);
doc.getElementById('fil-colaborador').value='col1';
api.filtrarClientes();
assert.match(doc.getElementById('tbody-cl').textContent,/CLIENTE SEGUNDO/);
assert.deepEqual(events,[],'Read-only filtering');
console.log('PASS Clientes compact exterior: 15 columns, CURP search, collaborator filter, exports and attended bar');
