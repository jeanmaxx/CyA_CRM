const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('app-core-02b.js','utf8');
const start=source.indexOf('  // Hybrid client panel edits must never overwrite unrelated stored fields.');
const end=source.indexOf('\n  if(editingId){',start);
assert(start>=0&&end>start,'Guarded native client save section must exist');
const selectedSource=source.slice(start,end);
const apply=new Function('cliente','oldCliente','window','getVal','addHist',selectedSource+'\nreturn {cliente,cyaIsScopedSave,cyaInlineSection};');
const original={
 id:'c1',nombre:'CLIENTE ORIGINAL',telefono:'4421111111',email:'old@example.com',ciudad:'TEQUISQUIAPAN',
 curp:'ABCD123456HQTXXX01',domicilio:'Calle 1',fuente:'meta_ads',nss:'12345678901',banco:'BBVA',
 clabe:'012345678901234567',nivelCuentaBBVA:'4',afore:'SURA',notas:'Nota anterior',
 fechaFirmaContrato:'2026-09-01',fechaAltaAfore:'2026-09-03',fechaRegistro:'2026-08-30',
 fechaRetiroEstimada:'2026-10-17',fechaRetiroEstimadaManual:true,fechaSolicitudManual:'2026-10-19',
 honorarios:8000,comision:3000,comisionManual:true,comisionCalc:3000,honorariosCalc:8000,
 colaboradorId:'co1',colPct:50,finanzasConfiguradas:true,estadoPago:'Pendiente',
 montoAfore:35190,montoRetiro:35190,etapa:'dado_alta',contratoFirmado:true,
 docs:{curp:true},historial:[{fecha:'2026-08-30',texto:'Alta'}],
 datosPropiosLegado:{campo:'mantener'},agendaRef:'agenda_original'
};
const clone=x=>JSON.parse(JSON.stringify(x));
const invoke=(section,edits)=>{const c={...clone(original),...edits};const entries=[];const result=apply(c,clone(original),{__cyaHybridClientEditSection:section},id=>id==='fc-clabe'?'999999999999999999':'',(...args)=>entries.push(args));return {...result,entries};};
let x=invoke('banco',{banco:'SANTANDER',clabe:'desactualizada',telefono:'MUTADO',fechaRetiroEstimada:'2026-12-31',fechaAltaAfore:'2026-12-01',estadoPago:'Cobrado',montoAfore:20000,docs:{curp:false}});
assert(x.cyaIsScopedSave);
assert.equal(x.cliente.banco,'SANTANDER');assert.equal(x.cliente.clabe,'999999999999999999');
assert.equal(x.cliente.telefono,original.telefono);
assert.equal(x.cliente.fechaAltaAfore,original.fechaAltaAfore);
assert.equal(x.cliente.fechaRetiroEstimada,original.fechaRetiroEstimada);
assert.equal(x.cliente.estadoPago,original.estadoPago);
assert.equal(x.cliente.montoAfore,original.montoAfore);
assert.deepEqual(x.cliente.docs,original.docs);
assert.deepEqual(x.cliente.datosPropiosLegado,original.datosPropiosLegado);
x=invoke('notas',{notas:'Nueva observación',comision:6000,fechaSolicitudManual:'2026-12-01'});
assert.equal(x.cliente.notas,'Nueva observación');
assert.equal(x.cliente.comision,3000);assert.equal(x.cliente.fechaSolicitudManual,original.fechaSolicitudManual);
assert.equal(x.entries.length,1);assert.equal(x.entries[0][1],'nota');
x=invoke('identidad',{nombre:'NUEVO NOMBRE',curp:'NUEVACURP',banco:'BANCO AJENO',etapa:'concluido'});
assert.equal(x.cliente.nombre,'NUEVO NOMBRE');assert.equal(x.cliente.curp,'NUEVACURP');
assert.equal(x.cliente.banco,original.banco);assert.equal(x.cliente.etapa,original.etapa);
x=invoke('comisiones',{honorarios:9000,comision:3500,banco:'OTRO',colaboradorId:'co2'});
assert.equal(x.cliente.honorarios,9000);assert.equal(x.cliente.comision,3500);assert.equal(x.cliente.colaboradorId,'co2');
assert.equal(x.cliente.banco,original.banco);assert.equal(x.cliente.honorariosCalc,original.honorariosCalc);
x=invoke('afore',{fechaSolicitudManual:'2026-11-11',fechaFirmaContrato:'2026-12-01'});
assert.equal(x.cliente.fechaSolicitudManual,'2026-11-11');
assert.equal(x.cliente.fechaFirmaContrato,original.fechaFirmaContrato);
assert(source.includes('cliente.fechaRetiroEstimada=cyaIsScopedSave?old.fechaRetiroEstimada'),'Manual/autocalculated date preserved on inline save');
assert(source.includes('if(!cyaIsScopedSave)sincronizarFechasCliente(cliente,oldCliente)'),'No unrequested agenda/date recalc');
console.log('PASS: scoped edits preserve unrelated dates, banking, finances, legacy payload, manual adjustments and note audit.');
