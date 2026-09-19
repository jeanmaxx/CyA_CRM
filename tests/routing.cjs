const fs=require('fs'),assert=require('node:assert/strict');

const root=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app/index.html','utf8');
const admin=fs.readFileSync('admin/index.html','utf8');
const adminConfig=fs.readFileSync('admin/config.js','utf8');
const demo=fs.readFileSync('demo/index.html','utf8');
const manifest=JSON.parse(fs.readFileSync('routing-manifest.json','utf8'));

assert.match(root,/<title>ALVA CRM · Gestión comercial, operativa y financiera<\/title>/);
assert.match(root,/href="\/site\/styles\.css\?v=phase-b1"/);
assert.match(root,/src="\/site\/config\.js\?v=phase-b1"/);
assert.match(root,/src="\/site\/app\.js\?v=phase-b1"/);
assert.match(root,/href="\/demo\/"/);

assert.match(admin,/<title>ALVA Control Center · CRM Platform<\/title>/);
assert.match(admin,/src="config\.js\?v=phase-c1"/);
assert.match(admin,/src="app\.js\?v=phase-c1"/);
assert.match(adminConfig,/platform-admin/);

assert.match(app,/<title>ALVA CRM · Aplicación<\/title>/);
assert.match(app,/data-alva-surface="crm-app"/);
assert.match(app,/src="\/cloud-config\.js"/);
assert.match(app,/src="\/cloud-adapter\.js\?v=20260919-entitlements"/);
assert.match(app,/src="\/cloud-sync-safe\.js\?v=20260919-entitlements"/);
assert.doesNotMatch(app,/src="cloud-config\.js"/);

assert.match(demo,/<title>Demo · ALVA CRM<\/title>/);
assert.doesNotMatch(demo,/supabase\.co|publishableKey|sb_publishable_/i);

assert.equal(manifest.canonical.landing.path,'/');
assert.equal(manifest.canonical.demo.path,'/demo/');
assert.equal(manifest.canonical.admin.path,'/admin/');
assert.equal(manifest.canonical.app.path,'/app/');
assert.equal(manifest.canonical.app.tenantAware,true);
assert.equal(manifest.canonical.app.tenantPattern,'/app/<tenant>/');
assert.equal(manifest.canonical.collaborators.path,'/app/<tenant>/colaboradores/');
assert.equal(manifest.aliases.cyaCrm.path,'/C&ACRM/');
assert.equal(manifest.aliases.cyaCollaborators.path,'/C&ACRM/Colaboradores/');

for(const path of [
  'site/styles.css','site/app.js','site/config.js',
  'admin/index.html','admin/styles.css','admin/app.js','admin/config.js',
  'app/index.html','runtime/colaboradores.html','demo/index.html','demo/styles.css'
]) assert.equal(fs.existsSync(path),true,path+' must exist');

console.log('PASS: canonical ALVA CRM route surfaces are separated and demo is isolated from production data.');
