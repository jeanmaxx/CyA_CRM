const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');

const source=fs.readFileSync('tenant-routing.js','utf8');

function resolve(pathname,search='',hostname='crm-alvasd.pages.dev'){
  const window={location:{pathname,search,hostname}};
  vm.runInNewContext(source,{window,URLSearchParams,decodeURIComponent,Object,String,Boolean,RegExp});
  return window.ALVA_TENANT_ROUTE;
}

let r=resolve('/app/casillas-asociados/');
assert.equal(r.tenantSlug,'casillas-asociados');
assert.equal(r.surface,'crm');
assert.equal(r.source,'canonical');
assert.equal(r.canonicalCrmPath,'/app/casillas-asociados/');

r=resolve('/app/casillas-asociados/colaboradores/');
assert.equal(r.tenantSlug,'casillas-asociados');
assert.equal(r.surface,'collaborators');
assert.equal(r.canonicalCollaboratorPath,'/app/casillas-asociados/colaboradores/');

r=resolve('/C&ACRM/');
assert.equal(r.tenantSlug,'casillas-asociados');
assert.equal(r.surface,'crm');
assert.equal(r.source,'alias');
assert.equal(r.cyaAlias,'/C&ACRM/');

r=resolve('/C&ACRM/Colaboradores/');
assert.equal(r.tenantSlug,'casillas-asociados');
assert.equal(r.surface,'collaborators');
assert.equal(r.cyaCollaboratorsAlias,'/C&ACRM/Colaboradores/');

r=resolve('/app/');
assert.equal(r.tenantSlug,'');
assert.equal(r.surface,'crm');
assert.equal(r.source,'app-root');

r=resolve('/app/','?tenant=empresa-demo');
assert.equal(r.tenantSlug,'empresa-demo');
assert.equal(r.surface,'crm');
assert.equal(r.source,'query');

r=resolve('/CyA_CRM/C&ACRM/','','jeanmaxx.github.io');
assert.equal(r.tenantSlug,'casillas-asociados');
assert.equal(r.source,'alias');

const redirects=fs.readFileSync('_redirects','utf8');
assert.match(redirects,/\/C&ACRM\/Colaboradores\/ \s*\/colaborador\/index\.html 200/x);
assert.match(redirects,/\/app\/\*\/colaboradores\/ \s*\/colaborador\/index\.html 200/x);
assert.match(redirects,/\/C&ACRM\/ \s*\/app\/index\.html 200/x);
assert.match(redirects,/\/app\/\* \s*\/app\/index\.html 200/x);

const admin=fs.readFileSync('admin/app.js','utf8');
assert.match(admin,/function tenantAccessPath/);
assert.match(admin,/\/C&ACRM\//);
assert.match(admin,/\/app\/.*encodeURIComponent/);
assert.doesNotMatch(admin,/\?tenant=/);

const portal=fs.readFileSync('colaborador/app.js','utf8');
assert.match(portal,/PORTAL_TENANT_SLUG/);
assert.match(portal,/tenantSlug:PORTAL_TENANT_SLUG/);

const portalEdge=fs.readFileSync('supabase/functions/collaborator-portal/index.ts','utf8');
const discardedEdge=fs.readFileSync('supabase/functions/collaborator-discarded/index.ts','utf8');
for(const edge of [portalEdge,discardedEdge]){
  assert.match(edge,/expectedTenantSlug/);
  assert.match(edge,/no corresponde a la organización de este enlace/);
}
assert.match(portalEdge,/organization:\{id:organization\.id,name:organization\.name,slug:organization\.slug\}/);

console.log('PASS: tenant routing, C&A aliases and collaborator tenant guards are wired.');
