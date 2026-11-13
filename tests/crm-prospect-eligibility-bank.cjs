'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),vm=require('node:vm');
const meta=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const fixer=fs.readFileSync('app-prospect-manual-fields-fix.js','utf8');
const hybrid=fs.readFileSync('app-prospect-hybrid-v2.js','utf8');
const clientPrefill=fs.readFileSync('app-meta-lead-client-prefill.js','utf8');
for(const [name,src] of [['Meta',meta],['Manual fields',fixer],['Hybrid',hybrid],['Client prefill',clientPrefill]]){
 new vm.Script(src,{filename:name});
}
const between=(src,from,to)=>{
 const a=src.indexOf(from),b=src.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Cannot isolate production function '+from);
 return src.slice(a,b);
};
const extra=Function(between(meta,'  function extraFieldsHtml(){','  function ensureExtraFields(){')+';return extraFieldsHtml;')();
const d=new JSDOM('<!doctype html><body></body>').window.document;
d.body.innerHTML=extra();
const bank=d.getElementById('lead-banco');
assert(bank&&bank.list?.id==='cya-lead-bancos','Actual Meta lead form includes editable bank and suggestions');
assert.equal(bank.required,false,'Bank stays optional');
assert.equal(d.getElementById('lead-afore').list?.id,'cya-lead-afores','AFORE retains suggested options and free text');
for(const [id,value] of Object.entries({
 'lead-email':'correo@demo.mx','lead-ciudad':'Querétaro','lead-fuente':'Meta Ads',
 'lead-nss':'442 123 12345','lead-afore':'SURA','lead-domicilio':'Domicilio DEMO','lead-banco':' bbva '
}))d.getElementById(id).value=value;
const capture=Function('document',between(meta,'  function captureExtraFields(){','  const baseOpenModalLead=')+';return captureExtraFields;')(d);
const fields=capture();
assert.equal(fields.banco,'BBVA','Bank persists in lead payload without extra mandatory fields');
assert.equal(fields.afore,'SURA');
assert.equal(fields.nss,'44212312345');
assert.match(meta,/Object\.assign\(lead,extras\)/,'Existing save bridge persists bank in the same lead');
assert.match(meta,/await cloudSyncNow/,'Save bridge synchronizes the bank through standard cloud sync');
assert.match(meta,/set\('lead-banco',l\?\.banco\|\|''\)/,'Reopen shows persisted bank');
assert.match(fixer,/FIELD_IDS=\[[^\]]*'lead-banco'/,'Bank survives the Meta refresh observer');
const clientDoc=new JSDOM('<!doctype html><select id="fc-fuente"><option value=""></option></select><input id="fc-banco"><input id="fc-afore">').window.document;
const helper=between(clientPrefill,'  function ensureMetaSourceOption(){','  const baseOpen=window.openModalCliente;');
const prefill=Function('document','store',helper+';return prefillFromLead;')(
 clientDoc,{leads:[{id:'lead-demo',banco:'BBVA',afore:'SURA',metaAds:true}]}
);
prefill('lead-demo');
assert.equal(clientDoc.getElementById('fc-banco').value,'BBVA','Bank transfers into existing client form');
assert.equal(clientDoc.getElementById('fc-afore').value,'SURA');
clientDoc.getElementById('fc-banco').value='BANAMEX';
prefill('lead-demo');
assert.equal(clientDoc.getElementById('fc-banco').value,'BANAMEX','Do not overwrite existing client bank');
assert.match(hybrid,/appendTo\('elegibilidad',groupFor\('lead-banco'\)\)/);
console.log('PASS bank optional, existing form, lead save, reopening, cloud sync and safe client prefill');
