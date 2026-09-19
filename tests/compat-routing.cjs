const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');

const bridge=fs.readFileSync('github-pages-bridge.js','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const fallback=fs.readFileSync('404.html','utf8');

function runBridge(pathname,search='',hash='',hostname='jeanmaxx.github.io'){
  const calls=[];
  const href='https://'+hostname+pathname+search+hash;
  const window={location:{hostname,pathname,search,hash,href,replace:url=>calls.push(url)}};
  vm.runInNewContext(bridge,{window,URLSearchParams,decodeURIComponent,encodeURIComponent,String,RegExp});
  return calls[0]||'';
}

assert.equal(runBridge('/CyA_CRM/'),'https://crm-alvasd.pages.dev/C&ACRM/');
assert.equal(
  runBridge('/CyA_CRM/','?tenant=casillas-asociados'),
  'https://crm-alvasd.pages.dev/C&ACRM/'
);
assert.equal(
  runBridge('/CyA_CRM/','?tenant=empresa-demo&utm_source=legacy'),
  'https://crm-alvasd.pages.dev/app/empresa-demo/?utm_source=legacy'
);
assert.equal(
  runBridge('/CyA_CRM/colaborador/'),
  'https://crm-alvasd.pages.dev/C&ACRM/Colaboradores/'
);
assert.equal(
  runBridge('/CyA_CRM/platform/site/'),
  'https://crm-alvasd.pages.dev/'
);
assert.equal(
  runBridge('/CyA_CRM/platform/admin/'),
  'https://crm-alvasd.pages.dev/admin/'
);
assert.equal(
  runBridge('/CyA_CRM/admin/'),
  'https://crm-alvasd.pages.dev/admin/'
);
assert.equal(
  runBridge('/CyA_CRM/demo/'),
  'https://crm-alvasd.pages.dev/demo/'
);
assert.equal(
  runBridge('/CyA_CRM/C&ACRM/Colaboradores/'),
  'https://crm-alvasd.pages.dev/C&ACRM/Colaboradores/'
);
assert.equal(
  runBridge('/CyA_CRM/app/empresa-demo/'),
  'https://crm-alvasd.pages.dev/app/empresa-demo/'
);
assert.equal(runBridge('/CyA_CRM/unknown/'),'https://crm-alvasd.pages.dev/C&ACRM/');
assert.equal(runBridge('/CyA_CRM/','','','crm-alvasd.pages.dev'),'');
assert.match(fallback,/github-pages-bridge\.js\?v=phase-e1/);

for(const file of [
  'index.html','admin/index.html','demo/index.html','app/index.html',
  'platform/site/index.html','platform/admin/index.html','colaborador/index.html'
]){
  assert.match(fs.readFileSync(file,'utf8'),/github-pages-bridge\.js\?v=phase-e1/,file);
}

const prelude=worker.slice(0,worker.indexOf('export default'));
const sandbox={URL,URLSearchParams,decodeURIComponent,encodeURIComponent,String,RegExp,result:null};
vm.runInNewContext(prelude+`
result=[
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/platform/site/')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/platform/admin/')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/colaborador/')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/?tenant=casillas-asociados')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/?tenant=empresa-demo')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/colaborador/styles.css')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/platform/admin/styles.css'))
];`,sandbox);

assert.deepEqual(Array.from(sandbox.result),[
  '/',
  '/admin/',
  '/C&ACRM/Colaboradores/',
  '/C&ACRM/',
  '/app/empresa-demo/',
  '',
  ''
]);

console.log('PASS: legacy Cloudflare and GitHub Pages routes migrate to canonical ALVA CRM URLs without intercepting assets.');
