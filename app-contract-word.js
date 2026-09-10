/* Native Word template: every saved version includes its immutable DOCX and captured fields. */
const CONTRACT_TEMPLATE_VERSION='retiro-contrato-pagare-v1';
const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
let wordContractCurrent=null;
let privateContractTemplate=null;
let wordGenerationBusy=false;
const renderContratosAnterior=renderContratos;
const generarContratoAnterior=generarContrato;
const imprimirContratoAnterior=imprimirContrato;
const guardarContratoAnterior=guardarContratoHistorial;
const verVersionContratoAnterior=verVersionContrato;
const onContratoClienteAnterior=onContratoClienteChange;
const onContratoServicioAnterior=onContratoServicioChange;
onContratoServicioChange=function(){invalidarContratoActual();return onContratoServicioAnterior();};
renderContratos=function(){
  wordContractCurrent=null;
  let html=renderContratosAnterior();
  html=html.replace(/id="ct-fecha" type="date" value="[^"]*"/,'id="ct-fecha" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" oninput="mascaraFechaMX(this)" value="'+fechaISOaMX(fechaISOLocal(new Date()))+'"');
  html=html.replace('id="ct-pagare-fecha" type="date"','id="ct-pagare-fecha" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" oninput="mascaraFechaMX(this)"');
  html=html.replace('<button class="btn" onclick="imprimirContrato()"', '<button class="btn" id="btn-word" onclick="descargarContratoWord()" style="display:none;">↓ Word</button><button class="btn" onclick="imprimirContrato()"');
  html=html.replace('👁 Vista previa','Generar contrato').replace('(honorarios + $5,000)','(honorarios + cobranza externa)').replace('Incluye $5,000 por cobranza externa en caso de requerirse','El importe de cobranza externa se puede ajustar en los datos del contrato.');
  html=html.replace('<div class="card" id="ct-datos-preview"', '<div class="card" id="ct-word-fields"><div class="card-header"><div class="card-title">Datos editables del contrato</div></div><div class="card-body" id="ct-word-fields-body"><p class="form-helper">Selecciona un cliente para cargar sus datos.</p></div></div><div class="card" id="ct-datos-preview"');
  return html;
};
function contractTextField(id,label,value,wide=false){return `<div class="form-group ${wide?'wide':''}"><label class="form-label" for="${id}">${label}</label><input class="form-input" id="${id}" value="${esc(value)}"></div>`;}
onContratoClienteChange=function(){
  onContratoClienteAnterior();
  const redundantPreview=document.getElementById('ct-datos-preview');if(redundantPreview)redundantPreview.style.display='none';
  const c=store.clientes.find(c=>c.id===selectedClienteId);if(!c)return;
  const cfg={...(privateContractTemplate?.defaults||{}),...store.configuracion};
  const el=document.getElementById('ct-word-fields-body');
  if(el)el.innerHTML=`<div class="contract-fields"><div class="contract-subsection">Datos del cliente</div>${contractTextField('ct-word-nombre','Nombre del cliente',c.nombre,true)}${contractTextField('ct-word-domicilio','Domicilio del cliente',c.domicilio,true)}<div class="contract-subsection">Datos de la empresa</div>${contractTextField('ct-word-representante','Representante de la empresa',cfg.empresa_representante||privateContractTemplate?.defaults?.empresa_representante||'',true)}<div id="ct-office-slot" class="wide"></div><input type="hidden" id="ct-word-empresa-dom" value="${esc(cfg.empresa_domicilio||privateContractTemplate?.defaults?.empresa_domicilio||'')}"><div class="form-group wide"><label class="form-label" for="ct-word-ciudad">Lugar de firma · municipio y estado de la oficina</label><input class="form-input" id="ct-word-ciudad" value="${esc(cfg.ciudad_contrato||privateContractTemplate?.defaults?.ciudad_contrato||'')}" readonly></div><div class="form-group"><label class="form-label">Saldo de retiro</label><input class="form-input" type="number" id="ct-word-saldo" value="35000" min="0" step="0.01"></div><div class="form-group"><label class="form-label">Cobranza externa</label><input class="form-input" type="number" id="ct-word-cobranza" value="5000" min="0" step="0.01"></div></div><p class="form-helper">Estos ajustes se aplican a esta versión del documento. El expediente conserva sus datos originales.</p>`;
  if(tieneMontoFinanciero(c.honorarios)){setVal('ct-honorarios',c.honorarios);setVal('ct-pagare-monto',Number(c.honorarios)+5000);}
  setVal('ct-fecha',fechaISOaMX(c.fechaFirmaContrato||fechaISOLocal(new Date())));
  actualizarFechaPagare();
  invalidarContratoActual();
};
actualizarFechaPagare=function(){
  const fecha=fechaMXaISO(getVal('ct-fecha'));if(fecha)setVal('ct-pagare-fecha',fechaISOaMX(sumarDiasISO(fecha,60)));
};
function invalidarContratoActual(){
  wordContractCurrent=null;
  const badge=document.getElementById('ct-guardado-badge');if(badge)badge.style.display='none';
  for(const id of ['btn-word','btn-imprimir','btn-guardar-historial']){const btn=document.getElementById(id);if(btn)btn.style.display='none';}
  const visor=document.getElementById('ct-visor');if(visor)visor.innerHTML='<p class="form-helper">Pulsa Generar contrato para preparar la versión con los datos actuales.</p>';
}
function numeroALetrasEntero(n){
  const small=['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  if(n<30)return small[n];
  if(n<100)return ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'][Math.floor(n/10)]+(n%10?' Y '+small[n%10]:'');
  if(n===100)return 'CIEN';
  if(n<1000)return ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'][Math.floor(n/100)]+(n%100?' '+numeroALetrasEntero(n%100):'');
  if(n<1000000)return (n<2000?'MIL':apocoparNumero(numeroALetrasEntero(Math.floor(n/1000)))+' MIL')+(n%1000?' '+numeroALetrasEntero(n%1000):'');
  return (n<2000000?'UN MILLÓN':apocoparNumero(numeroALetrasEntero(Math.floor(n/1000000)))+' MILLONES')+(n%1000000?' '+numeroALetrasEntero(n%1000000):'');
}
function apocoparNumero(text){return text.replace(/VEINTIUNO$/,'VEINTIÚN').replace(/UNO$/,'UN');}
function dineroEnLetras(value){const cents=Math.round(Number(value)*100);const pesos=Math.floor(cents/100);return apocoparNumero(numeroALetrasEntero(pesos))+(pesos&&pesos%1000000===0?' DE':'')+(pesos===1?' PESO ':' PESOS ')+String(cents%100).padStart(2,'0')+'/100 M.N.';}
function fechaContratoLarga(iso){const d=parseFechaFlexible(iso);if(!d)return '';return `${String(d.getDate()).padStart(2,'0')} DE ${['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][d.getMonth()]} DE ${d.getFullYear()}`;}
function datosContratoWord(){
  const fecha=leerFechaMX('ct-fecha');const vence=leerFechaMX('ct-pagare-fecha');
  if(!fecha||!vence||vence<fecha)throw new Error('Revisa la fecha de firma y el vencimiento del pagaré');
  const vars={CLIENTE_NOMBRE:getVal('ct-word-nombre').trim().toUpperCase(),CLIENTE_DOMICILIO:getVal('ct-word-domicilio').trim().toUpperCase(),EMPRESA_REPRESENTANTE:getVal('ct-word-representante').trim().toUpperCase(),EMPRESA_DOMICILIO:getVal('ct-word-empresa-dom').trim(),CIUDAD_CONTRATO:getVal('ct-word-ciudad').trim(),FECHA_CONTRATO:fechaContratoLarga(fecha),PAGARE_VENCIMIENTO:fechaContratoLarga(vence)};
  for(const v of Object.values(vars))if(!v)throw new Error('Completa nombre, domicilios, representante, lugar y fechas del documento');
  const monetary=[['ct-monto','MONTO_RETIRO'],['ct-honorarios','HONORARIOS'],['ct-pagare-monto','PAGARE_MONTO'],['ct-word-saldo','SALDO_MINIMO'],['ct-word-cobranza','PAGARE_COBRANZA']];
  const raw={};for(const [id,key] of monetary){const s=getVal(id);const n=Number(s);if(s===''||!Number.isFinite(n)||n<0||n>999999999)throw new Error('Revisa los importes del documento');raw[key]=n;vars[key]=n.toLocaleString('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2});vars[key+'_LETRAS']=dineroEnLetras(n);}
  if(Math.abs(raw.PAGARE_MONTO-raw.HONORARIOS-raw.PAGARE_COBRANZA)>0.009)throw new Error('El monto del pagaré debe coincidir con honorarios más cobranza externa');
  return vars;
}
function escapeXML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
async function crearDocxContrato(vars,templateBytes){
  if(!templateBytes){if(!privateContractTemplate?.content_base64)throw new Error('La plantilla Word no está disponible en esta sesión');templateBytes=Uint8Array.from(atob(privateContractTemplate.content_base64),c=>c.charCodeAt(0));}
  const zip=await JSZip.loadAsync(templateBytes);
  for(const name of Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(n))){
    const xml=await zip.file(name).async('string');
    let filled=xml.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(vars[key]===undefined)throw new Error('Falta el campo '+key);return escapeXML(vars[key]);});
    if(/^word\/header\d+\.xml$/.test(name)&&vars.EMPRESA_DOMICILIO){
      const logo=filled.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/)?.[0];
      if(logo&&logo.includes('<w:drawing>')){
        const table='<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="6760"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>'+logo+'</w:tc><w:tc><w:tcPr><w:tcW w:w="6760" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>'+escapeXML(vars.EMPRESA_DOMICILIO)+'</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
        filled=filled.replace(/(<w:hdr\b[^>]*>)[\s\S]*<\/w:hdr>/,'$1'+table+'</w:hdr>');
      }
    }
    if(/^word\/footer\d+\.xml$/.test(name))filled=filled.replace(/(<w:ftr\b[^>]*>)[\s\S]*<\/w:ftr>/,'$1<w:p/></w:ftr>');
    zip.file(name,filled);
  }
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
async function renderWordBytes(bytes,el){
  el.innerHTML='';el.classList.add('contract-word-host');
  await docx.renderAsync(bytes,el,el,{className:'docx',inWrapper:true,breakPages:true,ignoreLastRenderedPageBreak:true,useBase64URL:true,renderHeaders:true,renderFooters:true,renderFootnotes:true});
}
generarContrato=async function(){
  if(getVal('ct-servicio')!=='retiro_desempleo'){invalidarContratoActual();return generarContratoAnterior();}
  if(wordGenerationBusy)return;
  const clienteId=selectedClienteId;const c=store.clientes.find(c=>c.id===clienteId);if(!c)return showToast('Selecciona un cliente','warn');
  wordGenerationBusy=true;
  const fields=[...document.querySelectorAll('input[id^="ct-"],select[id^="ct-"],textarea[id^="ct-"]')].map(el=>({el,disabled:el.disabled}));
  fields.forEach(({el})=>el.disabled=true);
  try{
    const vars=datosContratoWord();const bytes=await crearDocxContrato(vars);
    wordContractCurrent={id:crypto.randomUUID(),clienteId,vars,bytes,saved:false,templateVersion:CONTRACT_TEMPLATE_VERSION};
    try{await renderWordBytes(bytes,document.getElementById('ct-visor'));}catch(previewError){document.getElementById('ct-visor').textContent='Vista previa no disponible. Puedes descargar el Word. '+previewError.message;}
    document.getElementById('ct-visor-title').textContent='Contrato y pagaré · Word';
    for(const id of ['ct-acciones-bar','btn-imprimir','btn-word'])document.getElementById(id).style.display='';
    await guardarContratoHistorial();
  }catch(e){if(wordContractCurrent&&!wordContractCurrent.saved){const btn=document.getElementById('btn-guardar-historial');if(btn)btn.style.display='';}showToast(e.message||'No se pudo generar el documento','warn');}finally{wordGenerationBusy=false;fields.forEach(({el,disabled})=>el.disabled=disabled);}
};
guardarContratoHistorial=async function(){
  const version=wordContractCurrent;if(!version)return guardarContratoAnterior();if(version.saved)return;
  const c=store.clientes.find(c=>c.id===version.clienteId);if(!c)throw new Error('El expediente ya no está disponible');
  const path=`${CA_ORG_ID}/${c.id}/${version.id}.docx`;
  if(!version.uploaded){const {error}=await supabaseClient.storage.from('crm-contracts').upload(path,new Blob([version.bytes],{type:DOCX_MIME}),{contentType:DOCX_MIME,upsert:false});if(error)throw error;version.uploaded=true;}
  const entry={id:version.id,fecha:new Date().toISOString(),servicio:getSvcLabel('retiro_desempleo'),generadoPor:sesionActiva?.nombre||'',generadoPorId:sesionActiva?.id,estado:'Generado',docxPath:path,templateVersion:version.templateVersion,campos:{...version.vars}};
  c.historialContratos||=[];
  if(!c.historialContratos.some(h=>h.id===entry.id)){c.historialContratos.push(entry);addHist(c,'contrato','Contrato y pagaré generados · versión '+version.id.slice(0,8));}
  try{await cloudSyncNow({throwOnError:true});version.saved=true;const b=document.getElementById('ct-guardado-badge');if(b){b.style.display='';b.textContent='✓ Versión guardada en historial';}const btn=document.getElementById('btn-guardar-historial');if(btn)btn.style.display='none';}
  catch(e){const b=document.getElementById('btn-guardar-historial');if(b)b.style.display='';throw new Error('El documento se generó, pero el historial está pendiente de guardar. Pulsa Guardar en historial.');}
};
function descargarBytesWord(bytes,nombre){const url=URL.createObjectURL(new Blob([bytes],{type:DOCX_MIME}));const a=document.createElement('a');a.href=url;a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function descargarContratoWord(){if(!wordContractCurrent)return;try{await guardarContratoHistorial();descargarBytesWord(wordContractCurrent.bytes,'Contrato-y-pagare-'+wordContractCurrent.id.slice(0,8)+'.docx');}catch(e){showToast(e.message,'warn');}}
async function descargarVersionWord(clienteId,id){
  const entry=store.clientes.find(c=>c.id===clienteId)?.historialContratos?.find(h=>h.id===id);if(!entry?.docxPath)return;
  const {data,error}=await supabaseClient.storage.from('crm-contracts').download(entry.docxPath);if(error)return showToast('No se pudo descargar esta versión: '+error.message,'warn');
  descargarBytesWord(new Uint8Array(await data.arrayBuffer()),'Contrato-y-pagare-'+id.slice(0,8)+'.docx');
}
verVersionContrato=async function(clienteId,id){
  const entry=store.clientes.find(c=>c.id===clienteId)?.historialContratos?.find(h=>h.id===id);
  if(!entry?.docxPath)return verVersionContratoAnterior(clienteId,id);
  try{
    const {data,error}=await supabaseClient.storage.from('crm-contracts').download(entry.docxPath);if(error)throw error;
    const body=document.getElementById('visor-contrato-body');document.getElementById('visor-contrato-titulo').textContent='Contrato y pagaré — '+fmtDateTime(entry.fecha);
    body.innerHTML=`<button class="btn" onclick="descargarVersionWord('${clienteId}','${id}')">↓ Descargar esta versión en Word</button><div id="history-word-preview"></div>`;
    document.getElementById('modal-visor').classList.add('open');await renderWordBytes(await data.arrayBuffer(),document.getElementById('history-word-preview'));
  }catch(e){showToast('No se pudo abrir la versión: '+e.message,'warn');}
};
imprimirContrato=async function(){
  if(!wordContractCurrent)return imprimirContratoAnterior();
  try{
    await guardarContratoHistorial();
    const frame=document.createElement('iframe');frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(frame);
    const d=frame.contentDocument;d.open();d.write('<!doctype html><html><head><meta charset="utf-8"><title>Contrato y pagaré</title><style>@page{margin:0}body{margin:0}.docx-wrapper{padding:0!important;background:white!important}section.docx{box-shadow:none!important;margin:0!important;break-after:page}section.docx:last-child{break-after:auto}</style></head><body></body></html>');d.close();
    await docx.renderAsync(wordContractCurrent.bytes,d.body,d.head,{className:'docx',inWrapper:true,breakPages:true,useBase64URL:true,renderHeaders:true,renderFooters:true,ignoreLastRenderedPageBreak:true});
    await d.fonts.ready;await Promise.all([...d.images].map(im=>im.complete?Promise.resolve():new Promise(resolve=>{im.onload=resolve;im.onerror=resolve;})));
    frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);
  }catch(e){showToast('No se pudo preparar la impresión: '+e.message,'warn');}
};

// Any edit invalidates the generated snapshot so a previous version cannot be exported by mistake.
document.addEventListener('input',event=>{if(event.target.id?.startsWith('ct-')&&wordContractCurrent)invalidarContratoActual();});
