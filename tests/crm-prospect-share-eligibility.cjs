const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('app-prospect-share-eligibility.js','utf8');
const css=fs.readFileSync('app-prospect-share-eligibility.css','utf8');
assert(css.includes('grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr)'),'Compact desktop popup is two columns');
const mk=(id,value)=>'<input id="'+id+'" value="'+value+'">';
const dom=new JSDOM('<div class="modal-overlay open" id="modal-lead">'+
 mk('lead-nombre','LEOBARDO NIETO CERVANTES')+mk('lead-servicio','retiro_desempleo')+
 mk('lead-colaborador','col1')+mk('lead-tel','4425550101')+mk('lead-com-empresa','PARTENZA SA DE CV')+
 mk('lead-com-sbc','160.98')+mk('lead-com-retiro','35193')+
 mk('lead-com-periodo','2026')+mk('lead-el-semanas','164')+
 mk('lead-el-cotiza','No')+mk('lead-el-retiro','No')+'</div>',{
 url:'https://crm.example.invalid/',runScripts:'outside-only'
});
const w=dom.window,d=w.document;
w.editingLeadId='l1';
w.store={leads:[{id:'l1',nombre:'LEOBARDO NIETO CERVANTES',colaboradorId:'col1'}],
 colaboradores:[{id:'col1',nombre:'Colaborador de prueba',telefono:'4421234567'}]};
w.cyaMetaQualification=()=>({tone:'green'});
let url='',opens=0;
w.open=(u)=>{opens++;url=u;return {opener:w}};
w.eval(code);
const share=w.__cyaShareEligibility;
assert(share);
const info=share.snapshot();
assert.equal(info.reference,4829.4);
assert.equal(info.fee,10000);
assert.equal(info.net,25193);
assert.equal(info.ratio.toFixed(2),'5.22');
assert.equal(info.phone,'524421234567');
assert.equal(info.clientPhone,'524425550101');
share.open();
assert.equal(d.getElementById('cya-share-eligibility-dialog').hidden,false);
assert.equal(d.getElementById('cya-share-person').textContent,'LEOBARDO NIETO CERVANTES');
assert.match(d.getElementById('cya-share-ratio').textContent,/5.22 veces/);
assert.equal(d.getElementById('cya-share-recipient-kind').value,'cliente');
assert.equal(d.getElementById('cya-share-phone').value,'524425550101');
assert.match(d.getElementById('cya-share-text').value,/¡Hola, Leobardo!/);
assert.match(d.getElementById('cya-share-text').value,/5.22 veces/);
const select=d.getElementById('cya-share-recipient-kind');
select.value='colaborador';select.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.getElementById('cya-share-phone').value,'524421234567');
assert.match(d.getElementById('cya-share-text').value,/tu cliente/);
assert(!d.getElementById('cya-share-text').value.includes('5.22 veces más'),'Comparison must not overpromise');
d.getElementById('cya-share-text').value='Texto personalizado';
d.getElementById('cya-share-whatsapp').click();
assert.equal(opens,1);
assert(url.startsWith('https://wa.me/524421234567?text='));
assert.equal(decodeURIComponent(url.split('?text=')[1]),'Texto personalizado');
d.getElementById('cya-share-phone').value='123';
d.getElementById('cya-share-whatsapp').click();
assert.equal(opens,1,'Invalid recipient never opens WhatsApp');
d.getElementById('cya-share-phone').value='';
d.getElementById('cya-share-whatsapp').click();
assert.equal(opens,2,'Without collaborator phone, allow WhatsApp recipient picker');
select.value='cliente';select.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.getElementById('cya-share-phone').value,'524425550101');
assert.match(d.getElementById('cya-share-text').value,/¡Hola, Leobardo!/);
d.getElementById('cya-share-whatsapp').click();
assert.equal(opens,3,'Cliente directly opens its registered phone');
assert(url.startsWith('https://wa.me/524425550101?text='));
select.value='colaborador';select.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.getElementById('cya-share-text').value,'Texto personalizado','Each recipient retains its edited message');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(d.getElementById('cya-share-eligibility-dialog').hidden,true);
assert.equal(d.getElementById('modal-lead').classList.contains('open'),true,'Closing share popup never closes parent dossier');
d.getElementById('lead-com-sbc').value='200';
share.open();
assert.equal(d.getElementById('cya-share-ratio').textContent,'4.20 veces','Popup reads current unsaved form, not stale storage');
assert.equal(d.getElementById('lead-com-sbc').value,'200','Share does not mutate source form');
dom.window.close();
console.log('PASS sharing eligibility snapshot, 30% fee cap, net, editable message, collaborator WhatsApp and parent close isolation');