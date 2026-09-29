const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const dom=new JSDOM(fs.readFileSync('app/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'https://example.invalid',runScripts:'outside-only'});const w=dom.window,d=w.document;const run=s=>vm.runInContext(s,dom.getInternalVMContext());w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};w.scrollTo=()=>{};w.Chart=function(){};
for(const file of ['app-core-01.js','app-core-02a.js','app-core-02b.js','app-core-03.js','app-core-04.js','app-core-05.js','app-core-06.js','app-core-07.js'])run(fs.readFileSync(file,'utf8').replace('\ninitResponsiveShell();','\n'));
run(fs.readFileSync('tests/fixtures.js','utf8').replace('__ROLE__','admin').replace("actualizarSidebarSesion();updateRolUI();navigate('clientes');",''));for(const file of ['app-workflow.js','app-prospect-workflow.js','app-contract-word.js','app-operations.js'])run(fs.readFileSync(file,'utf8'));

run(fs.readFileSync('app-operational-board.js','utf8'));
const setClients=clients=>run('store.clientes='+JSON.stringify(clients));
const client=(id,mmdd,extra={})=>({id,nombre:id,curp:'AAAA90'+mmdd+'HQTLLL01',asesorId:'test-owner',...extra});
const week=date=>w.cumpleanosSemanales(new Date(date));
try{
setClients([client('Sunday','1004'),client('Tuesday B','0929',{archivado:true}),client('Tuesday A','0929'),client('Monday','0928'),client('Next','1005'),client('Previous','0927'),client('Invalid','0230'),client('Missing','0929',{curp:''})]);
let result=week('2026-09-29T18:00:00Z');
assert.equal(result.start,'2026-09-28');assert.equal(result.end,'2026-10-04');
assert.deepEqual(Array.from(result.entries,x=>x.client.id),['Monday','Tuesday A','Tuesday B','Sunday']);
assert.equal(week('2026-09-28T03:00:00Z').start,'2026-09-21','Sunday evening in Mexico');
setClients([client('December','1231'),client('January','0101')]);
assert.deepEqual(Array.from(week('2026-12-31T18:00:00Z').entries,x=>x.date),['2026-12-31','2027-01-01']);
setClients([client('Leap','0229',{curp:'AAAA000229HQTLLLA1'})]);
assert.equal(week('2028-02-29T18:00:00Z').entries.length,1);
assert.equal(week('2027-02-28T18:00:00Z').entries.length,0);
setClients([client('Own','0929',{asesorId:run('sesionActiva.id')}),client('Other','0929',{asesorId:'other-advisor'})]);
run("vistaActual='propia'");assert.equal(week('2026-09-29T18:00:00Z').entries.length,2,'Admin sees all clients regardless of selector');
run("sesionActiva.rol='asesor'");assert.equal(week('2026-09-29T18:00:00Z').entries.length,1);
run("sesionActiva.rol='admin'");
const now=week(new Date());const mmdd=now.start.slice(5).replace('-','');
setClients([client('<img src=x onerror=alert(1)>',mmdd),client('Same day',mmdd,{archivado:true,telefono:'5550000000'})]);
run("currentPage='operativo';renderPage('operativo')");
let card=d.querySelector('.operational-birthdays-card');assert(card);
assert.equal(card.previousElementSibling.querySelector('.card-title').textContent,'Agenda prioritaria');
assert.equal(card.querySelectorAll('.operational-birthday-day').length,1);
assert.equal(card.querySelectorAll('.operational-birthday-row').length,2);
assert(!card.querySelector('img'));assert(card.textContent.includes('Sin teléfono registrado'));
w.toggleOperationalBirthdays();card=d.querySelector('.operational-birthdays-card');assert.equal(card.querySelector('[aria-expanded]').getAttribute('aria-expanded'),'false');assert(!card.querySelector('.card-body'));
w.toggleOperationalBirthdays();assert(d.querySelector('.operational-birthdays-card .card-body'));
setClients([]);run("renderPage('operativo')");assert(d.querySelector('.operational-birthdays-card').textContent.includes('No hay cumpleaños'));
console.log('PASS: birthdays, archives, grouping, week/year/timezone boundaries, leap dates, permissions, escaping and collapse.');
}finally{dom.window.close();}
