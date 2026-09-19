const fs=require('fs'),assert=require('node:assert/strict');

const html=fs.readFileSync('runtime/colaboradores.html','utf8');
const css=fs.readFileSync('colaborador/alva-phase-d.css','utf8');
const branding=fs.readFileSync('colaborador/phase-d-branding.js','utf8');
const finalizer=fs.readFileSync('colaborador/phase-d-finalize.js','utf8');
const app=fs.readFileSync('colaborador/app.js','utf8');

assert.match(html,/alva-phase-d\.css\?v=phase-d1/);
assert.match(html,/phase-d-branding\.js\?v=phase-d1/);
assert.match(html,/meta name="theme-color" content="#0d1118"/);

for(const token of ['--bg:#0d1118','--side:#111722','--surface:#151c27','--gold:#ffc20e']) assert.ok(css.includes(token),token);

assert.match(css,/\.sidebar\{/);
assert.match(css,/\.topbar\{/);
assert.match(css,/\.login-card\{/);
assert.match(css,/\.kpi-card/);
assert.match(css,/\.phase-column/);
assert.match(css,/\.modal\{/);
assert.match(css,/@media\(max-width:980px\)/);
assert.match(css,/@media\(max-width:780px\)/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces must balance');

assert.match(branding,/ALVA_TENANT_ROUTE/);
assert.match(branding,/platform-branding/);
assert.match(branding,/ALVA_COLLABORATOR_BRAND/);
assert.match(finalizer,/promotePhaseDStyles/);
assert.match(app,/portalOrganizationName/);
assert.match(app,/state\.bootstrap\?\.organization\?\.name/);

const expectedIds=['login-view','login-form','login-email','login-password','login-error','portal-view','sidebar-avatar','sidebar-name','sidebar-advisor','logout-btn','page-title','sync-label','new-prospect-top','page-content','prospect-modal','prospect-form','p-name','p-phone','p-curp','p-service','save-prospect','toast'];
for(const id of expectedIds)assert.ok(html.includes('id="'+id+'"'),id+' missing');
for(const page of ['inicio','prospectos','clientes','guia','estadisticas','finanzas'])assert.ok(html.includes('data-page="'+page+'"'),page+' missing');

console.log('PASS: collaborator portal keeps its DOM contract and uses the ALVA Navy/Gold design layer.');
