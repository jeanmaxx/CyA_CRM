const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app-core-02a.js','utf8');
const start=src.indexOf('const CYA_CLIENT_STAGE_LABELS='),end=src.indexOf('function toggleAlertasClientes(el){',start);
assert(start>=0&&end>start,'14-column client rendering functions exist');
const model=vm.runInNewContext(src.slice(start,end)+'\n({headers:cyaClientesEtapasEncabezados,rows:renderClientesRows,cards:renderClientesCards});',{
 window:{__cyaClientActivitiesV2:{statuses:()=>Array.from({length:12},(_,i)=>({id:['contrato','firmas','firmado','alta','app','banco_n4','cita','documentos','expediente','solicitud','deposito','honorarios'][i],state:i<3?'done':'future'}))}},
 fmtDate:x=>x,escapeHTMLBasico:x=>String(x),etiquetaSolicitudCliente:()=>'29/12/2026'
});
const headers=model.headers();
assert.equal((headers.match(/<th\b/g)||[]).length,12);
for(const title of ['Contrato','Firmas','Firmado','Alta AFORE','AFORE Móvil','Banco N4','Cita','Documentos','Expediente','Solicitud','Depósito','Honorarios'])assert(headers.includes(title),title);
const c={id:'synthetic-1',nombre:'CLIENTE DE PRUEBA',servicio:'retiro_desempleo',fechaRegistro:'2026-11-13'};
const html=model.rows([c]);
assert.equal((html.match(/<td\b/g)||[]).length,15,'Date + name + 12 milestone cells + request');
assert.equal((html.match(/data-cya-activity=/g)||[]).length,12);
assert(!html.includes('Abrir expediente')&&!html.includes('Ver perfil')&&!html.includes('✎'),'No extra row actions');
assert(html.includes('data-cya-activity="documentos"'));
const mobile=model.cards([c]);
assert.equal((mobile.match(/data-cya-activity=/g)||[]).length,12);
assert(!mobile.includes('Ver expediente'),'No redundant mobile open button');
const head=src.slice(src.indexOf('<thead><tr>',src.indexOf('function renderClientes(){')),src.indexOf('</tr></thead>',src.indexOf('function renderClientes(){')));
for(const obsolete of ['Etapa actual','Proceso pendiente','Avance (12)','<th>Servicio</th>'])assert(!head.includes(obsolete),'Removed column '+obsolete);
console.log('PASS: header with 12 named milestones, no surplus columns/actions, mobile parity.');
