const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('runtime/colaboradores.html','utf8');
const client=fs.readFileSync('colaborador/portal-v2-stage3.js','utf8');
const app=fs.readFileSync('colaborador/app.js','utf8');
const edge=fs.readFileSync('supabase/functions/collaborator-portal/index.ts','utf8');
const source=fs.readFileSync('colaborador/portal-v2-whatsapp.js','utf8');
const css=fs.readFileSync('colaborador/portal-v2-whatsapp.css','utf8');
assert.match(html,/id="ca-wa-prospect"/);
assert.match(html,/portal-v2-whatsapp\.js\?v=20261112-institutional/);
assert.match(client,/id="ca-wa-client"/);
assert.match(client,/caV2OpenWhatsApp\?\.\('client',activeClientId\)/);
assert.match(app,/caV2OpenWhatsApp\?\.\('lead',p\.id\)/);
assert.match(edge,/admin\.from\('message_templates'\)/);
assert.match(edge,/messageTemplates:\(templates\|\|\[\]\)\.filter/);
assert.match(edge,/r\.payload\?\.cyaGrupo/);
assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
assert.match(css,/#ca-wa-modal\{z-index:30010!important\}/);
const dom=new JSDOM('<main></main>',{url:'https://example.test/',runScripts:'outside-only'});
const w=dom.window,actions=[];
w.state={bootstrap:{
 collaborator:{name:'JESSICA MENDOZA',nombres:'Jessica'},
 clients:[{id:'c',name:'JUAN CARLOS PÉREZ',phone:'4421234567'}],
 messageTemplates:[
  {id:'pl_wa_bienvenida_1',name:'Bienvenida / requisitos (1/2)',group:'bienvenida',order:1,text:'¡Hola, {{NOMBRE}}! {{SALUDO}}. Te saluda {{ASESOR}}.'},
  {id:'pl_wa_bienvenida_2',name:'Bienvenida / requisitos (2/2)',group:'bienvenida',order:2,text:'Continuamos contigo, {{NOMBRE}}.'},
  {id:'pl_wa_revision_1',name:'Revisión',group:'revision',order:1,text:'{{NOMBRE}}, estamos revisando tu trámite.'},
  {id:'pl_wa_curp_mal_1',name:'CURP mal',group:'curp_mal',order:1,text:'{{NOMBRE}}, necesitamos tu CURP.'},
  {id:'pl_bienvenida',name:'Plantilla antigua',group:'bienvenida',order:1,text:'NO USAR PLANTILLA VIEJA'}
 ]},prospects:[{id:'p',name:'MARÍA LOZANO',phone:'4423334455'}]};
w.open=(url,target,features)=>{actions.push({url,target,features});return {};};
w.navigator.clipboard={writeText:async()=>{}};
w.eval(source);
w.caV2OpenWhatsApp('client','c');
const $=id=>w.document.getElementById(id);
assert.equal($('ca-wa-modal').hidden,false);
assert.equal(w.document.querySelectorAll('.ca-wa-category').length,3);
assert.equal(w.document.querySelectorAll('.ca-wa-part').length,2);
assert.match($('ca-wa-message').value,/Juan/);
assert.match($('ca-wa-message').value,/Jessica/);
assert.doesNotMatch($('ca-wa-modal').textContent,/Plantilla antigua/);
assert.equal(actions.length,0,'Opening a message does not send');
w.document.querySelectorAll('.ca-wa-part')[1].click();
assert.match($('ca-wa-message').value,/Continuamos/);
w.document.querySelector('[data-group="revision"]').click();
assert.match($('ca-wa-message').value,/revisando tu trámite/);
$('ca-wa-send').click();
assert.equal(actions.length,1);
assert.match(actions[0].url,/^https:\/\/wa\.me\/524421234567\?text=/);
w.caV2WhatsAppClose();
w.caV2OpenWhatsApp('lead','p');
assert.match($('ca-wa-message').value,/María/);
assert.equal(actions.length,1);
w.close();
console.log('PASS: organizational CRM templates only, grouped chips, first-name greetings, WhatsApp manual send and modal layering.');
