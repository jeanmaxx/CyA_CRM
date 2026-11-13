const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app-meta-leads-workflow.js','utf8');
const from=src.indexOf('  function metaQualification(l){'),to=src.indexOf('  // Una sola clasificación compartida',from);
assert(from>=0&&to>from,'Shared qualification must be available in Meta workflow');
const qualify=vm.runInNewContext(src.slice(from,to)+'\nmetaQualification;');
const client=(imss='opcion_a_no_estoy_trabajando_mas_de_45_dias',retiro='opcion_a_no_nunca_he_solicitado_un_retiro',weeks='110 semanas')=>({metaLead:{answers:{imss_status_declared:imss,previous_withdrawal_declared:retiro,weeks_declared:weeks}}});
assert.equal(qualify(client('opcion_b_si_estoy_cotizando')).tone,'red','Working/active IMSS is red');
assert.equal(qualify(client('actualmente_sigo_cotizando_con_un_patrón_ante_el_imss.')).tone,'red','Legacy Meta active IMSS answer is red');
assert.equal(qualify(client('ya_estoy_dado_de_baja_del_imss_o_actualmente_trabajo_por_mi_cuenta_/_de_manera_independiente.','no,_nunca.','sí,_2_años_o_más.')).tone,'green','Legacy Meta unemployed and 2+ years is green');
assert.equal(qualify(client('ya_estoy_dado_de_baja_del_imss_o_actualmente_trabajo_por_mi_cuenta_/_de_manera_independiente.','sí,_fue_hace_menos_de_5_años.','sí,_2_años_o_más.')).tone,'red','Legacy recent withdrawal remains red');
assert.equal(qualify(client(undefined,undefined,'creo_que_tengo_menos_de_2_años.')).tone,'orange','Legacy under two years needs 65-week verification');

assert.equal(qualify(client(undefined,'opcion_c_si_hace_menos_de_5_anos')).tone,'red','Withdrawal <5 years is red');
assert.equal(qualify(client(undefined,undefined,'40 semanas')).tone,'red','<65 weeks is red');
const mid=qualify(client(undefined,undefined,'90 semanas'));
assert.equal(mid.tone,'green','66–104 weeks can be conditionally green when other criteria pass');
assert.equal(mid.needsBalanceReview,true,'Partial weeks requires AFORE balance review');
assert.equal(qualify(client(undefined,undefined,'110 semanas')).tone,'green','105+ weeks is green');
assert.equal(qualify(client('no_estoy_seguro')).tone,'orange','Uncertain IMSS is orange');
assert.equal(qualify(client(undefined,undefined,'no_estoy_seguro')).tone,'orange','Uncertain weeks is orange');
assert.equal(qualify(client(undefined,undefined,'65 semanas')).tone,'orange','Exactly 65 requires manual clarification');
assert.equal(qualify(client(undefined,undefined,'opcion_b_menos_de_2_anos')).tone,'orange','<105 with no known minimum is not auto-approved nor rejected');
assert.equal(qualify({metaLead:{answers:{}}}).tone,'orange','Missing data cannot be auto-approved');
assert.equal(qualify({metaLead:{answers:{imss_status_declared:'opcion_b_actualmente_trabajando',weeks_declared:'120 semanas'}}}).tone,'red','Strong rejection takes precedence over incomplete answers');
const end=src.indexOf('  window.cyaMetaWhatsApp=function(id){',to);
assert(end>to);
const questions=vm.runInNewContext(src.slice(src.indexOf('  function metaQuestionsHtml(l){',to),end)+'\nmetaQuestionsHtml;',{
 safe:x=>String(x??'').replace(/[&<>"']/g,'')
});
const rendered=questions({metaLead:{answers:{imss_status_declared:'opcion_a_sin_cotizar',weeks_declared:'110 semanas',raw:{campaign_id:'123456',adset_id:'777',form_id:'999'}}}});
assert.match(rendered,/Situación ante IMSS/);
assert(!rendered.includes('campaign_id')&&!rendered.includes('777'),'No raw Meta technical IDs in customer-facing answers');
console.log('PASS: user-defined red/orange/conditional green qualification, 65/105 boundaries and friendly Meta answers.');
