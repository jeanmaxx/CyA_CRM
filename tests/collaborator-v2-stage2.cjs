const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const code=fs.readFileSync('colaborador/portal-v2-stage2.js','utf8');
const css=fs.readFileSync('colaborador/portal-v2-stage2.css','utf8');
const clientJs=fs.readFileSync('colaborador/phase2.js','utf8');
const eligibleJs=fs.readFileSync('colaborador/phase5.js','utf8');
const html=fs.readFileSync('runtime/colaboradores.html','utf8');

const state={prospects:[
 {id:'a',name:'Segunda revisión',internalStatus:'reconsulta'},
 {id:'b',name:'CURP',internalStatus:'semanas'},
 {id:'c',name:'SINDOS',internalStatus:'sindos'},
 {id:'d',name:'Aprobado',internalStatus:'aprobado'},
 {id:'e',name:'Archivado',internalStatus:'archivado'}
]};
const sandbox={
 window:{},state,
 renderProspects:()=>'<div>legacy</div>',
 esc:value=>String(value||''),
 prospectDetails:()=>''
};
vm.runInNewContext(code,sandbox);
const output=sandbox.renderProspects();
const headers=['Pendientes en segunda revisión','Revisión de elegibilidad (CURP)','Revisión de SINDOS','Aprobado'];
for(const header of headers)assert.ok(output.includes(header),'Missing lane '+header);
for(const id of ['a','b','c','d'])assert.ok(output.includes('openProspectModal(\''+id+'\')'),id);
assert.equal((output.match(/class="phase-column portal-v2-lane/g)||[]).length,4);
assert.ok(!output.includes('Archivado</h4>'));
assert.ok(!output.includes('Marcar realizada'),'Advisors own official approval');
assert.ok(!output.includes('Validación confirmada por Líder de equipo.'));
assert.ok(output.includes('Ya puedes contactar al prospecto para solicitar INE y elaborar contrato.'));
assert.ok(!output.includes('Documentación para contrato'));
assert.match(css,/grid-template-columns:repeat\(4/);
assert.match(css,/overflow-x:auto!important/);assert.match(css,/min-width:0!important;width:100%!important/);assert.match(output,/class="portal-v2-prospect-open"/);assert.ok(!output.includes('class="prospect-actions"'));
assert.ok(!output.includes('eligibility-confirmed'));
assert.ok(output.includes('aria-label="Abrir expediente de'));
assert.match(clientJs,/String\(c\.stage\|\|''\)!=='generando_contrato'/);
assert.match(clientJs,/signaturePending=client\.stage==='contrato_firmas'/);
assert.match(eligibleJs,/Portal v2 renders the approved lane natively/);
assert.match(html,/portal-v2-stage2\.css\?v=20261112-compact/);
assert.match(html,/portal-v2-stage2\.js\?v=20261112-cards/);
console.log('PASS: portal v2 stage 2 lanes, signing visibility, no legacy approved lane duplication, and layout hooks.');
