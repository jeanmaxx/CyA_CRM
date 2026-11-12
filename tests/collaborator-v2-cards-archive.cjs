const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const prospectCode=fs.readFileSync('colaborador/portal-v2-stage2.js','utf8');
const archiveCode=fs.readFileSync('colaborador/phase6.js','utf8');
const clientCode=fs.readFileSync('colaborador/portal-v2-stage4.js','utf8');
const css=fs.readFileSync('colaborador/portal-v2-card-unification.css','utf8');
const html=fs.readFileSync('runtime/colaboradores.html','utf8');
assert.match(html,/phase6\.js\?v=20261112-groups/);
assert.match(html,/portal-v2-card-unification\.css\?v=20261112-cards/);
assert.match(css,/#discarded-prospects-content\[hidden\]\{display:none!important\}/);
assert.match(css,/\.ca-v2-client-card/);
assert.match(archiveCode,/collaborator-discarded/);
assert.doesNotMatch(archiveCode,/update_prospect|saveProspect|portalAction\(/);
const dom=new JSDOM('<main id="page-content"></main>',{url:'https://example.test/',runScripts:'outside-only'});
const w=dom.window;
w.requestAnimationFrame=cb=>cb();
w.esc=value=>String(value??'').replace(/[&<>"']/g,ch=>ch==='&'?'&amp;':ch==='<'?'&lt;':ch==='>'?'&gt;':ch==='"'?'&quot;':'&#39;');
w.dateMX=()=> '12/11/2026';
w.state={page:'inicio',prospects:[
 {id:'a1',name:'Activa',curp:'CURPACTIVA',internalStatus:'aprobado'},
 {id:'d1',name:'Archivada',curp:'CURPARCHIVADA',internalStatus:'descartado'}],
 bootstrap:{services:[{id:'retiro_desempleo',name:'Retiro por desempleo'}],clients:[
 {id:'c1',name:'Cliente Uno',curp:'CURPCLIENTE',serviceId:'retiro_desempleo',stage:'dado_alta',appointment:{},activities:{}}]}};
const queries=[];
w.portalClient={functions:{invoke:async(name,payload)=>{
 queries.push({name,payload});
 return {data:{items:[
  {id:'d1',name:'Archivada',curp:'CURPARCHIVADA',phone:'4421111111',serviceId:'retiro_desempleo',reason:'IMSS activo',archiveNotes:'Se notificó al cliente',originalNotes:'Nota previa',date:'2026-11-12'},
  {id:'d2',name:'Otra persona',reason:'IMSS activo',archiveNotes:'',date:'2026-11-11'},
  {id:'d3',name:'Tercera',reason:'No quiso continuar',date:'2026-11-10'}]}};
}}};
w.ALVA_TENANT_ROUTE={tenantSlug:'casillas-asociados'};
w.renderProspects=()=>'<div class="legacy"></div>';
w.navigate=page=>{
 w.state.page=page;
 w.document.getElementById('page-content').innerHTML=page==='prospectos'?w.renderProspects():'<div>Otra vista</div>';
};
w.eval(prospectCode);w.eval(archiveCode);
(async()=>{
 w.navigate('prospectos');
 await new Promise(resolve=>setImmediate(resolve));
 const $=selector=>w.document.querySelector(selector);
 assert.equal(w.document.querySelectorAll('.portal-v2-prospect-card').length,1,'Discarded not in live lanes');
 const activeButton=$('.portal-v2-prospect-open');
 assert.ok(activeButton,'Whole prospect card must be clickable');
 assert.match(activeButton.textContent,/Activa/);
 assert.match(activeButton.textContent,/CURPACTIVA/);
 assert.match(activeButton.getAttribute('onclick'),/openProspectModal/);
 assert.equal(w.document.querySelectorAll('.portal-v2-prospect-card .prospect-actions').length,0);
 assert.equal(w.document.querySelectorAll('.portal-v2-approved-card .eligibility-confirmed').length,0);
 assert.equal(queries.length,1,'Archive loaded with scoped collaborator endpoint');
 assert.equal(queries[0].name,'collaborator-discarded');
 const content=$('#discarded-prospects-content'),toggle=$('.ca-archive-toggle');
 assert.ok(content.hidden,'Archived starts collapsed');
 assert.equal(toggle.getAttribute('aria-expanded'),'false');
 assert.equal($('.discarded-count').textContent,'3');
 toggle.click();
 assert.equal(content.hidden,false);
 assert.equal(toggle.getAttribute('aria-expanded'),'true');
 assert.equal(w.document.querySelectorAll('.ca-archive-group').length,2,'Distinct reason columns');
 assert.equal(w.document.querySelectorAll('.ca-archive-person').length,3);
 assert.equal(w.document.querySelectorAll('.ca-archive-person .discarded-data').length,0);
 assert.match(content.textContent,/IMSS activo/);
 assert.match(content.textContent,/No quiso continuar/);
 w.document.querySelector('[data-archive-id="d1"]').click();
 assert.equal($('#ca-archived-prospect-modal').hidden,false);
 assert.match($('#ca-archived-expediente-body').textContent,/CURPARCHIVADA/);
 assert.match($('#ca-archived-expediente-body').textContent,/Se notificó al cliente/);
 assert.match($('#ca-archived-expediente-body').textContent,/Solo consulta/i);
 assert.ok(!$('#ca-archived-prospect-modal').querySelector('form, [type="submit"]'));
 $('#ca-archived-close').click();
 assert.equal($('#ca-archived-prospect-modal').hidden,true);
 w.navigate('inicio');w.navigate('prospectos');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal($('#discarded-prospects-content').hidden,true,'Collapsed again on next visit');
 w.eval(clientCode);
 w.navigate('clientes');
 const clientCard=$('.ca-v2-client-card');
 assert.ok(clientCard);
 assert.match(clientCard.textContent,/Cliente Uno/);
 assert.match(clientCard.textContent,/CURPCLIENTE/);
 assert.match(clientCard.getAttribute('onclick'),/caOpenClient/);
 assert.equal(w.document.querySelectorAll('.ca-v2-sticky .client-name-link').length,0);
 w.close();console.log('PASS: unified click-to-expediente cards, grouped collapsed archive and read-only details.');
})().catch(error=>{console.error(error);w.close();process.exitCode=1;});
