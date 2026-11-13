/* Preflight every script in the production CRM loader before browser tests.
 * PR #94 compiled no runtime file and shipped literal backslash-n tokens into
 * app-meta-leads-workflow.js, preventing the Meta and hybrid loaders.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const files=[
  'cloud-config.js',
  'app-ui-profile-polish.js',
  'app-ui-profile-polish-core.js',
  'app-sync-recovery.js',
  'app-meta-leads-workflow.js',
  'app-prospect-manual-fields-fix.js',
  'app-prospect-hybrid-v2.js',
  'app-whatsapp-message-center.js',
  'app-client-hybrid-v2.js',
  'app-client-activities-v2.js'
];
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  try{new vm.Script(source,{filename:file});}
  catch(error){console.error('FAIL JS syntax:',file,error.message);throw error;}
  console.log('PASS JS syntax:',file);
}
const loader=fs.readFileSync('app-prospect-manual-fields-fix.js','utf8');
const recovery=fs.readFileSync('app-sync-recovery.js','utf8');
const app=fs.readFileSync('app/index.html','utf8');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
assert.match(meta,/function fillQuestionnaireTab\(l\)/);
assert(!meta.includes('\\\\n  function fillQuestionnaireTab'),'Backslash n literals must never break Meta JS');
assert.match(recovery,/app-meta-leads-workflow\.js\?v=20261113-restored93/);
assert.match(loader,/app-prospect-hybrid-v2\.js\?v=20261113-restored93/);
assert.match(app,/app-prospect-hybrid-v2\.css\?v=20261113-restored93/);
console.log('PASS production loader graph and syntax');
