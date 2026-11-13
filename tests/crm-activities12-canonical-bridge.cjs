const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const js=fs.readFileSync('app-client-activities-v2.js','utf8');
const backend=fs.readFileSync('supabase/functions/collaborator-portal/index.ts','utf8');
const portal=fs.readFileSync('colaborador/portal-v2-stage4.js','utf8');
for(const marker of ['etapasOperativasV2','portalActividades','verifiedExternally:true','paymentCollected(p)'])
 assert(backend.includes(marker),'Collaborator endpoint must expose shared evidence: '+marker);
assert(portal.includes("key:'documentos'")&&portal.includes("key:'contrato'")&&portal.includes("key:'firmas'"));
const dom=new JSDOM('<div id="modal-perfil"></div>',{url:'https://crm.example.invalid',runScripts:'outside-only'});
const w=dom.window,d=w.document;
const c={id:'1',nombre:'PRUEBA',asesorId:'a1',servicio:'retiro_desempleo',etapa:'generando_contrato',historialContratos:[{fecha:'2026-10-01',id:'pdf-01'}],fechaRetiroEstimada:'2026-11-16',fechaSolicitudManual:'2026-11-16',historial:[],docs:{},banco:'Santander',honorarios:8000,comision:3000,estadoPago:'Pendiente'};
w.store={clientes:[c]};w.sesionActiva={id:'a1',nombre:'ASESOR',rol:'asesor'};w.isAdmin=()=>false;
w.showToast=()=>{};w.renderPage=()=>{};w.currentPage='clientes';w.openPerfil=()=>{};
w.addHist=(cl,t,msg)=>cl.historial.push({tipo:t,texto:msg});
let fail=false,saves=0;w.cloudSyncNow=async()=>{saves++;if(fail)throw Error('network');return true};
w.confirm=()=>true;
w.eval(js);
const model=w.__cyaClientActivitiesV2;
const tick=()=>new Promise(r=>setTimeout(r,0));
async function complete(step,date,note='Confirmado en evidencia'){
 assert(model.open('1',step));
 d.getElementById('cya-op-date').value=date;
 d.getElementById('cya-op-note').value=note;
 d.querySelector('[data-op-save]').click();
 await tick();await tick();
}
(async()=>{
 await complete('contrato','01/10/2026');
 assert(model.flags(c).contrato);
 await complete('firmas','02/10/2026');
 assert.equal(c.etapa,'contrato_firmas');
 await complete('firmado','03/10/2026');
 assert.equal(c.etapa,'contrato_firmado');
 assert.equal(c.fechaFirmaContrato,'2026-10-03');
 assert.equal(c.contratoFirmado,true);
 assert(model.flags(c).firmas,'Signatures completed');
 assert.equal(c.fechaRetiroEstimada,'2026-11-16','Signature plus 46 forecast is not recalculated or replaced by new workflow');
 assert.equal(c.fechaSolicitudManual,'2026-11-16');
 await complete('alta','06/10/2026');
 assert.equal(c.fechaAltaAfore,'2026-10-06');
 assert.equal(c.etapa,'dado_alta');
 // Selecting a bank is not verification; the dedicated N4 step must be explicitly confirmed.
 assert.equal(model.flags(c).banco_n4,false);
 await complete('banco_n4','06/10/2026');
 assert.equal(c.cuentaNivel4,'si');
 assert(model.flags(c).banco_n4);
 // A scheduled appointment may legitimately be in the future.
 assert(model.open('1','cita'));
 d.getElementById('cya-op-date').value='20/11/2026';
 d.getElementById('cya-op-time').value='10:30';
 d.getElementById('cya-op-branch').value='AFORE Plaza Centro';
 d.getElementById('cya-op-note').value='Confirmada por telefono';
 d.querySelector('[data-op-save]').click();
 await tick();await tick();
 assert.equal(c.fechaBiometrica,'2026-11-20');
 assert.equal(c.horaBiometrica,'10:30');
 assert.equal(c.sucursalAfore,'AFORE Plaza Centro');
 // No false persisted state after cloud failure.
 fail=true;
 const pre=JSON.stringify(c.etapasOperativasV2),stage=c.etapa,noteCount=c.historial.length;
 await complete('app','07/10/2026');
 assert.equal(JSON.stringify(c.etapasOperativasV2),pre,'Failed cloud write restores activity evidence');
 assert.equal(c.etapa,stage);
 assert.equal(c.historial.length,noteCount);
 fail=false;
 assert(saves>=6);
 w.close();console.log('PASS: contract/signature/alta native bridge, forecast unchanged, N4 verification, future AFORE appointment and failed sync rollback.');
})().catch(err=>{console.error(err);w.close();process.exitCode=1});
