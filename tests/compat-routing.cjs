const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');

const bridge=fs.readFileSync('github-pages-bridge.js','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const fallback=fs.readFileSync('404.html','utf8');
const pluralPortal=fs.readFileSync('colaboradores/index.html','utf8');
assert.match(pluralPortal,/https:\/\/crm-alvasd\.pages\.dev\/C&ACRM\/Colaboradores\//);
assert.doesNotMatch(pluralPortal,/assets\/icons\//);
for(const match of pluralPortal.matchAll(/href="([^"?]+)/g)){
  assert(fs.existsSync('.'+new URL(match[1],'https://example.invalid/colaboradores/').pathname),'Legacy redirect must reference an existing favicon');
}

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

function runBridgeLoader(file,hostname){
  const html=fs.readFileSync(file,'utf8');
  const match=html.match(/<head>\s*<script>([\s\S]*?)<\/script>/);
  assert.ok(match,file+' loader missing');
  const writes=[];
  vm.runInNewContext(match[1],{
    location:{hostname},
    document:{write:value=>writes.push(value)}
  });
  return writes.join('');
}
assert.equal(
  runBridgeLoader('index.html','jeanmaxx.github.io'),
  '<script src="/CyA_CRM/github-pages-bridge.js?v=phase-e1"></script>'
);
assert.equal(runBridgeLoader('index.html','crm-alvasd.pages.dev'),'');


for(const file of [
  'index.html','admin/index.html','demo/index.html','app/index.html'
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
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/colaborador/index.html')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/?tenant=casillas-asociados')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/?tenant=empresa-demo')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/colaborador/styles.css')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/platform/site/styles.css')),
  legacyRedirectPath(new URL('https://crm-alvasd.pages.dev/platform/admin/styles.css'))
];`,sandbox);

assert.deepEqual(Array.from(sandbox.result),[
  '/',
  '/admin/',
  '/C&ACRM/Colaboradores/',
  '/C&ACRM/Colaboradores/',
  '/C&ACRM/',
  '/app/empresa-demo/',
  '',
  '/',
  '/admin/'
]);

console.log('PASS: legacy Cloudflare and GitHub Pages routes migrate to canonical ALVA CRM URLs without intercepting assets.');
