/* Casillas & Asociados — Compartir elegibilidad; separate read-only share dialog.
 * Renders current live Prospectos values; never saves or changes the dossier.
 * WhatsApp deep links cannot attach a PNG automatically. */
(function(){
'use strict';
if(window.__cyaShareEligibilityInstalled)return;
window.__cyaShareEligibilityInstalled=true;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const value=id=>$(id)?.value?.trim()||'';
const positive=id=>{const raw=value(id);return raw===''?null:Math.max(0,Number(raw)||0);};
const periodMax=y=>y==='2027'?37200:35193;
const normalizePhone=v=>{
 const digits=String(v||'').replace(/\D/g,'');
 if(digits.length===10)return '52'+digits;
 if(digits.length===12&&digits.startsWith('52'))return digits;
 if(digits.length===13&&digits.startsWith('521'))return '52'+digits.slice(3);
 return digits.length>=10&&digits.length<=15?digits:'';
};
const state={data:null,openedFrom:null};
function snapshot(){
 const id=typeof editingLeadId!=='undefined'?editingLeadId:null;
 const l=typeof store!=='undefined'?(store.leads||[]).find(x=>String(x.id)===String(id)):null;
 const colId=value('lead-colaborador')||l?.colaboradorId||'';
 const col=typeof store!=='undefined'?(store.colaboradores||[]).find(x=>String(x.id)===String(colId)):null;
 const sbc=positive('lead-com-sbc'),amount=positive('lead-com-retiro');
 const withdrawal=amount??0,fee=Math.min(withdrawal*.3,10000),net=withdrawal-fee,ref=(sbc??0)*30;
 const weeksRaw=value('lead-el-semanas');
 const weeks=weeksRaw||l?.elegibilidad?.semanas||'Por confirmar';
 const label=id=>{const el=$(id);if(!el)return '';return el.selectedOptions?.[0]?.textContent?.trim()||el.value||''};
 const imss=label('lead-el-cotiza')||'Por confirmar';
 const past=label('lead-el-retiro')||'Por confirmar';
 const qualified=(typeof window.cyaMetaQualification==='function'&&l)?window.cyaMetaQualification(l):null;
 const eligibilityText=qualified?.tone==='green'?'Criterios iniciales favorables':'Evaluación inicial · Por confirmar';
 return {
  name:value('lead-nombre')||l?.nombre||'Prospecto sin nombre',
  weeks:String(weeks),imss,past,
  company:value('lead-com-empresa')||'No registrada',
  sbc,reference:ref,amount:withdrawal,fee,net,
  ratio:ref>0?net/ref:null,period:value('lead-com-periodo')||'2026',
  maximum:periodMax(value('lead-com-periodo')||'2026'),
  eligibilityText,
  collaborator:col?.nombre||'Sin colaborador asignado',
  phone:normalizePhone(col?.telefonoWhatsapp||col?.whatsapp||col?.telefono||col?.celular||col?.tel||col?.numero||'')
 };
}
function message(d){
 const comparison=d.ratio!==null?
  'El neto estimado después de honorarios equivale a *'+d.ratio.toFixed(2)+' veces* la referencia de 30 días del salario registrado en el IMSS.':
  'Aún falta el salario diario registrado ante el IMSS para realizar la comparación de importes.';
 const intro=d.eligibilityText==='Criterios iniciales favorables'?
  'La revisión preliminar muestra criterios iniciales favorables para continuar evaluando su trámite de Retiro por Desempleo.':
  'Te comparto la evaluación preliminar de elegibilidad para continuar verificando los requisitos del trámite de Retiro por Desempleo.';
 return '¡Hola! Te comparto el resultado de elegibilidad de tu cliente *'+d.name+'*.\n\n'+intro+'\n\n'+comparison+
  '\n\nEl retiro estimado es de '+money(d.amount)+' y el neto estimado después de honorarios sería '+money(d.net)+
  '. Ambos son importes orientativos sujetos a revisión y autorización de la AFORE.\n\nTe comparto la ficha resumen como apoyo para tu seguimiento.\n\n¡Saludos!';
}
function createDialog(){
 let root=$('cya-share-eligibility-dialog');if(root)return root;
 root=document.createElement('div');root.id='cya-share-eligibility-dialog';root.hidden=true;
 root.innerHTML='<div class="cya-share-window" role="dialog" aria-modal="true" aria-labelledby="cya-share-title">'+
  '<div class="cya-share-bar"><div><strong id="cya-share-title">Compartir elegibilidad</strong><small>Ficha PNG y mensaje para colaborador</small></div>'+
  '<button type="button" class="cya-share-close" aria-label="Cerrar">×</button></div>'+
  '<div class="cya-share-content">'+
   '<div class="cya-share-pane"><div class="cya-share-pane-title">Vista previa de ficha (PNG)</div>'+
    '<div class="cya-share-png" id="cya-share-sheet">'+
     '<div class="cya-share-png-head"><b>C&A</b><div><strong>RESULTADO DE ELEGIBILIDAD</strong><small>Retiro por desempleo</small></div></div>'+
     '<div class="cya-share-png-body"><div class="cya-share-client"><div><small>CLIENTE</small><strong id="cya-share-person"></strong></div><span id="cya-share-status"></span></div>'+
     '<div class="cya-share-stats" id="cya-share-eligibility-stats"></div>'+
     '<div class="cya-share-stats" id="cya-share-work-stats"></div>'+
     '<div class="cya-share-finances" id="cya-share-finance-stats"></div>'+
     '<div class="cya-share-compare"><span>COMPARACIÓN NETA<small>Neto frente a referencia de 30 días</small></span><strong id="cya-share-ratio"></strong></div>'+
     '<p>Estimación interna, no monto autorizado por la AFORE. La modalidad y requisitos aplicables deben verificarse.</p>'+
     '</div></div></div>'+
   '<div class="cya-share-pane"><div class="cya-share-pane-title">Mensaje de WhatsApp</div>'+
    '<div class="cya-share-chat"><label for="cya-share-text">Mensaje editable para el colaborador</label><textarea id="cya-share-text" rows="13"></textarea>'+
    '<div class="cya-share-destination"><label for="cya-share-phone">WhatsApp del colaborador</label><input id="cya-share-phone" type="tel" inputmode="tel" placeholder="Número con lada"/>'+
    '<small id="cya-share-recipient"></small></div></div>'+
    '<p class="cya-share-hint">WhatsApp abrirá la conversación con el texto precargado. El PNG se adjunta manualmente; nada se enviará automáticamente.</p></div>'+
   '</div>'+
  '<div class="cya-share-footer"><span id="cya-share-feedback" role="status"></span>'+
   '<button type="button" class="btn" id="cya-share-png">Generar PNG</button>'+
   '<button type="button" class="btn" id="cya-share-copy">Copiar mensaje</button>'+
   '<button type="button" class="btn cya-share-whatsapp" id="cya-share-whatsapp">WhatsApp</button></div></div>';
 document.body.appendChild(root);
 root.querySelector('.cya-share-close').addEventListener('click',close);
 root.addEventListener('click',e=>{if(e.target===root)close();});
 root.querySelector('#cya-share-png').addEventListener('click',downloadPNG);
 root.querySelector('#cya-share-copy').addEventListener('click',()=>void copyMessage());
 root.querySelector('#cya-share-whatsapp').addEventListener('click',openWhatsapp);
 return root;
}
function stats(items){
 return items.map(([label,v])=>'<div class="cya-share-stat"><small>'+escapeHTML(label)+'</small><strong>'+escapeHTML(v)+'</strong></div>').join('');
}
function render(d){
 $('cya-share-person').textContent=d.name.toUpperCase();
 $('cya-share-status').textContent=d.eligibilityText;
 $('cya-share-eligibility-stats').innerHTML=stats([['Semanas cotizadas',d.weeks],['IMSS activo',d.imss],['Retiro últimos 5 años',d.past]]);
 $('cya-share-work-stats').innerHTML=stats([['Última empresa',d.company],['Salario diario (SBC)',d.sbc===null?'Por confirmar':money(d.sbc)],['Referencia de 30 días',d.sbc===null?'—':money(d.reference)]]);
 $('cya-share-finance-stats').innerHTML=stats([['Retiro estimado',money(d.amount)],['Honorarios',money(d.fee)],['Neto estimado',money(d.net)],['Máximo de referencia',money(d.maximum)]]);
 $('cya-share-ratio').textContent=d.ratio===null?'—':d.ratio.toFixed(2)+' veces';
 $('cya-share-text').value=message(d);
 $('cya-share-phone').value=d.phone;
 $('cya-share-recipient').textContent=d.collaborator+(d.phone?' · Número disponible':' · Puedes escribir su número');
 $('cya-share-feedback').textContent='';
}
function open(){
 if(!$('modal-lead')?.classList.contains('open'))return;
 if(value('lead-servicio')!=='retiro_desempleo'){window.showToast?.('Esta ficha se utiliza para Retiro por Desempleo','warn');return;}
 state.openedFrom=document.activeElement;
 state.data=snapshot();createDialog();render(state.data);
 $('cya-share-eligibility-dialog').hidden=false;
 $('cya-share-text').focus();
}
function close(){
 const d=$('cya-share-eligibility-dialog');if(d)d.hidden=true;
 state.openedFrom?.focus?.();
}
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&$('cya-share-eligibility-dialog')?.hidden===false){
  e.preventDefault();e.stopImmediatePropagation();close();
 }
},true);
async function copyMessage(){
 const text=value('cya-share-text');
 try{
  if(!text)throw Error('Mensaje vacío');
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
  else{
   const a=$('cya-share-text');a.select();
   if(!document.execCommand('copy'))throw Error('No se pudo copiar');
  }
  $('cya-share-feedback').textContent='Mensaje copiado';
 }catch(error){$('cya-share-feedback').textContent='Selecciona el mensaje para copiarlo manualmente';}
}
function openWhatsapp(){
 const text=value('cya-share-text');if(!text){$('cya-share-feedback').textContent='Escribe un mensaje antes de continuar';return;}
 const raw=value('cya-share-phone'),phone=normalizePhone(raw);
 if(raw&&!phone){$('cya-share-feedback').textContent='Verifica el teléfono del colaborador (10 dígitos o lada internacional)';return;}
 const url='https://wa.me/'+(phone||'')+'?text='+encodeURIComponent(text);
 const opened=window.open(url,'_blank');
 if(opened)opened.opener=null;
 else $('cya-share-feedback').textContent='El navegador podría haber bloqueado WhatsApp. Permite ventanas emergentes.';
}
function drawCanvas(d){
 const c=document.createElement('canvas');c.width=1100;c.height=810;
 const ctx=c.getContext('2d');if(!ctx)throw Error('No se pudo crear el PNG');
 const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 const line=(x,y,w)=>fill(x,y,w,1,'#d9e2eb');
 const text=(t,x,y,size=23,color='#182d4b',bold=false)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Arial';ctx.fillStyle=color;ctx.fillText(String(t),x,y)};
 function wrap(t,x,y,maxW,size=25,color='#182d4b',bold=true,lineHeight=29,maxLines=3){
  const str=String(t),words=str.split(/\s+/);ctx.font=(bold?'700 ':'400 ')+size+'px Arial';
  let current='',rows=[];
  for(const word of words){
   let candidate=current?current+' '+word:word;
   if(ctx.measureText(candidate).width>maxW&&current){rows.push(current);current=word;}else current=candidate;
  }
  if(current)rows.push(current);
  rows.slice(0,maxLines).forEach((row,i)=>text(row,x,y+i*lineHeight,size,color,bold));
 }
 function stat(label,val,x,y,w){
  wrap(label,x,y,w-14,17,'#64758d',false,21,2);
  wrap(val,x,y+51,w-14,22,'#192e4c',true,24,2);
 }
 fill(0,0,1100,810,'#fff');
 fill(0,0,1100,145,'#132d52');fill(0,141,1100,5,'#c9a050');
 text('C&A',37,85,59,'#f1c87c',true);
 text('RESULTADO DE ELEGIBILIDAD',205,78,34,'#fff',true);
 text('Retiro por desempleo',208,116,21,'#dce8f7');
 text('CLIENTE',35,194,18,'#63768d');
 wrap(d.name.toUpperCase(),35,238,780,31,'#142c4c',true,33,2);
 fill(820,181,245,59,d.eligibilityText.startsWith('Criterios')?'#e4f6e9':'#fff3de');
 wrap(d.eligibilityText,833,206,222,16,'#14643c',true,19,2);
 line(35,289,1030);
 const cols=[35,395,750];
 stat('Semanas cotizadas',d.weeks,cols[0],325,300);
 stat('IMSS activo',d.imss,cols[1],325,300);
 stat('Retiro últimos 5 años',d.past,cols[2],325,310);
 line(35,427,1030);
 stat('Última empresa',d.company,cols[0],469,300);
 stat('Salario diario (SBC)',d.sbc===null?'Por confirmar':money(d.sbc),cols[1],469,300);
 stat('Referencia de 30 días',d.sbc===null?'—':money(d.reference),cols[2],469,300);
 fill(30,572,1040,120,'#fcf8ee');
 const financial=[['Retiro estimado',money(d.amount)],['Honorarios',money(d.fee)],['Neto estimado',money(d.net)],['Máximo de referencia',money(d.maximum)]];
 financial.forEach((pair,i)=>stat(pair[0],pair[1],45+i*260,607,242));
 fill(30,703,1040,59,'#e4f6e9');
 text('COMPARACIÓN NETA',51,741,22,'#187344',true);
 text(d.ratio===null?'—':d.ratio.toFixed(2)+' veces',790,742,33,'#15733d',true);
 text('Estimación informativa, sujeta al cálculo y autorización de la AFORE.',35,787,16,'#63738b');
 return c;
}
function downloadPNG(){
 const d=state.data;if(!d)return;
 try{
  const canvas=drawCanvas(d);
  const link=document.createElement('a');
  link.download='CYA_Elegibilidad_'+d.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_')+'.png';
  link.href=canvas.toDataURL('image/png');
  document.body.appendChild(link);link.click();link.remove();
  $('cya-share-feedback').textContent='Ficha PNG generada. Adjunta el archivo en WhatsApp.';
 }catch(e){console.error('PNG de elegibilidad',e);$('cya-share-feedback').textContent='No se pudo crear la ficha PNG en este navegador';}
}
window.cyaAbrirCompartirElegibilidad=open;
window.__cyaShareEligibility={snapshot,open,close,downloadPNG};
})();