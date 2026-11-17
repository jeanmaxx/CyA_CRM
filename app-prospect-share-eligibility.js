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
const BRAND_LOGO_URL='/assets/brand/cya-logo-dark.svg';
const normalizePhone=v=>{
 const digits=String(v||'').replace(/\D/g,'');
 if(digits.length===10)return '52'+digits;
 if(digits.length===12&&digits.startsWith('52'))return digits;
 if(digits.length===13&&digits.startsWith('521'))return '52'+digits.slice(3);
 return digits.length>=10&&digits.length<=15?digits:'';
};
const state={data:null,openedFrom:null,recipient:'cliente',drafts:{}};

const RETIRO5_TEMPLATE='¡Hola, {{NOMBRE}}!\n\nAl revisar tu información encontramos que _ya realizaste anteriormente un retiro por desempleo_.\n\nDe acuerdo con tu expediente, la fecha de tu último retiro es *{{FECHA_ULTIMO_RETIRO}}*.\n\nPor ello, hemos programado una nueva revisión para el *{{FECHA_RECONTACTO}}*. En esa fecha te contactaremos para revisar nuevamente tu información y confirmar si ya cumples con los requisitos vigentes para iniciar un nuevo retiro por desempleo.\n\nPor el momento no es posible continuar con el trámite, pero con gusto dejaremos tu registro guardado para dar seguimiento en la fecha indicada.\n\nSi en ese momento continúas interesado y cumples con los requisitos vigentes, podremos comenzar nuevamente con tu trámite.\n\nAgradecemos tu confianza y quedamos a tus órdenes.';
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function isoDate(raw){
 const str=String(raw||'').trim();
 let m=str.match(/^(\d{4})-(\d\d)-(\d\d)/);
 if(!m){const mx=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(mx)m=[null,mx[3],mx[2],mx[1]];}
 if(!m)return '';
 const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?d.toISOString().slice(0,10):'';
}
function addMonths(iso,months){
 if(!iso)return '';
 const [year,month,day]=iso.split('-').map(Number),d=new Date(Date.UTC(year,month-1+months,1));
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
const longDate=iso=>iso?Number(iso.slice(8,10))+' de '+MONTHS[Number(iso.slice(5,7))-1]+' de '+iso.slice(0,4):'pendiente de confirmar';
const shortDate=iso=>iso?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'Por confirmar';
function retiro5Message(d){
 return RETIRO5_TEMPLATE.replace('{{NOMBRE}}',String(d.name||'').trim().split(/\s+/)[0]||'')
 .replace('{{FECHA_ULTIMO_RETIRO}}',longDate(d.lastWithdrawal))
 .replace('{{FECHA_RECONTACTO}}',longDate(d.recontactDate));
}

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
 const pastRaw=value('lead-el-retiro')||l?.elegibilidad?.retiro5||'';
 const lastWithdrawal=isoDate(value('lead-el-fecha-retiro'))||isoDate(l?.fechaUltimoRetiro)||isoDate(l?.elegibilidad?.fechaRetiro);
 const savedLast=isoDate(l?.fechaUltimoRetiro)||isoDate(l?.elegibilidad?.fechaRetiro);
 const scheduled=isoDate(l?.fechaRecontacto)||isoDate((typeof store!=='undefined'?(store.agenda||[]):[]).find(e=>String(e.leadId||'')===String(id)&&String(e.id||'')==='ev_recontacto_'+id)?.fecha);
 const recontactDate=lastWithdrawal===savedLast&&scheduled?scheduled:addMonths(lastWithdrawal,59);
 const today=new Date(),localToday=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 const pendingRetiro5=pastRaw==='si'&&!!lastWithdrawal&&!!recontactDate&&recontactDate>localToday;
 const advisor=(typeof sesionActiva!=='undefined'&&sesionActiva)?sesionActiva:null;
 const assignedAdvisor=(typeof store!=='undefined'?(store.asesores||[]):[]).find(a=>String(a.id)===String(l?.asesorId))||advisor;
 const advisorName=assignedAdvisor?.nombre||'Emmanuel Álvarez';
 const advisorPhone=assignedAdvisor?.telefonoWhatsapp||assignedAdvisor?.whatsapp||assignedAdvisor?.telefono||assignedAdvisor?.celular||'442 286 79 65';
 const qualified=(typeof window.cyaMetaQualification==='function'&&l)?window.cyaMetaQualification(l):null;
 const eligibilityText=qualified?.tone==='green'?'Criterios iniciales favorables':'Evaluación inicial · Por confirmar';
 return {
  name:value('lead-nombre')||l?.nombre||'Prospecto sin nombre',
  weeks:String(weeks),imss,past,pendingRetiro5,lastWithdrawal,recontactDate,advisorName,advisorPhone,
  company:value('lead-com-empresa')||'No registrada',
  sbc,reference:ref,amount:withdrawal,fee,net,
  ratio:ref>0?net/ref:null,period:value('lead-com-periodo')||'2026',
  eligibilityText,
  collaborator:col?.nombre||'Sin colaborador asignado',
  clientPhone:normalizePhone(value('lead-tel')||l?.telefono||''),
  collaboratorPhone:normalizePhone(col?.telefonoWhatsapp||col?.whatsapp||col?.telefono||col?.celular||col?.tel||col?.numero||''),
  phone:normalizePhone(col?.telefonoWhatsapp||col?.whatsapp||col?.telefono||col?.celular||col?.tel||col?.numero||'')
 };
}
function message(d){
 if(d.pendingRetiro5)return 'Seguimiento de '+d.name+'\n\n'+retiro5Message(d);
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
function clientMessage(d){
 if(d.pendingRetiro5)return retiro5Message(d);
 const first=String(d.name||'').trim().split(/\s+/)[0]||'';
 const greeting=first?'¡Hola, '+first.charAt(0).toUpperCase()+first.slice(1).toLocaleLowerCase('es-MX')+'!':'¡Hola!';
 const favorable=d.eligibilityText==='Criterios iniciales favorables';
 const intro=favorable?'Ya terminamos la revisión inicial de tu caso y tengo buenas noticias: *cumples con los criterios iniciales* para continuar evaluando tu Retiro por Desempleo.':
  'Ya terminamos una primera revisión de tu caso. Todavía necesitamos confirmar algunos requisitos antes de determinar si puedes iniciar tu Retiro por Desempleo.';
 const comparison=d.ratio===null?'Aún debemos confirmar los importes a partir de tu información del IMSS.':
  'La estimación que revisamos indica un *neto de '+money(d.net)+' después de honorarios*, equivalente a *'+d.ratio.toFixed(2)+' veces* la referencia de 30 días de tu salario registrado ante el IMSS.';
 return greeting+' 👋\n\n'+intro+'\n\n'+comparison+
  '\n\nLos montos son orientativos y están sujetos a la revisión y autorización de la AFORE; no representan una cantidad garantizada.\n\n'+
  '¿A qué hora tendrías oportunidad de recibir una llamada? 📞 Con gusto te explico los detalles y los siguientes pasos si decides continuar con nosotros.\n\n¡Saludos!';
}
function switchRecipient(recipient,remember=true){
 if(!state.data||!['cliente','colaborador'].includes(recipient))return;
 if(remember&&$('cya-share-text'))state.drafts[state.recipient]=value('cya-share-text');
 state.recipient=recipient;
 const client=recipient==='cliente',d=state.data;
 $('cya-share-recipient-kind').value=recipient;
 $('cya-share-text').value=state.drafts[recipient]??(client?clientMessage(d):message(d));
 $('cya-share-phone').value=client?d.clientPhone:d.collaboratorPhone;
 $('cya-share-phone-label').textContent=client?'WhatsApp del cliente':'WhatsApp del colaborador';
 $('cya-share-message-label').textContent=client?'Mensaje editable para el cliente':'Mensaje editable para el colaborador';
 $('cya-share-recipient').textContent=client?(d.name+' · '+(d.clientPhone?'Número del expediente':'Captura su número')):
  (d.collaborator+' · '+(d.collaboratorPhone?'Número disponible':'Captura su número'));
 $('cya-share-feedback').textContent='';
}
function createDialog(){
 let root=$('cya-share-eligibility-dialog');if(root)return root;
 root=document.createElement('div');root.id='cya-share-eligibility-dialog';root.hidden=true;
 root.innerHTML='<div class="cya-share-window" role="dialog" aria-modal="true" aria-labelledby="cya-share-title">'+
  '<div class="cya-share-bar"><div><strong id="cya-share-title">Compartir elegibilidad</strong><small>Ficha PNG y mensaje para cliente o colaborador</small></div>'+
  '<button type="button" class="cya-share-close" aria-label="Cerrar">×</button></div>'+
  '<div class="cya-share-content">'+
   '<div class="cya-share-pane"><div class="cya-share-pane-title">Vista previa de ficha (PNG)</div>'+
    '<div class="cya-share-png" id="cya-share-sheet">'+
     '<div class="cya-share-png-head"><img class="cya-share-brand-logo" src="'+BRAND_LOGO_URL+'" alt="Casillas & Asociados Consultoría"><div><span class="cya-share-brand-name">CASILLAS & ASOCIADOS · CONSULTORÍA</span><strong>RESULTADO DE ELEGIBILIDAD</strong><small>Retiro por desempleo</small></div></div>'+
     '<div class="cya-share-png-body"><div class="cya-share-client"><div><small>CLIENTE</small><strong id="cya-share-person"></strong></div><span id="cya-share-status"></span></div>'+
     '<div id="cya-share-pending" hidden><div class="cya-share-followup-title">PRÓXIMA FECHA DE REVISIÓN</div><div class="cya-share-followup-date"><strong id="cya-share-followup-date"></strong><span id="cya-share-followup-long"></span><small>Te contactaremos para revisar nuevamente tu caso.</small></div><div class="cya-share-followup-reason"><b>Retiro anterior registrado</b><div>Fecha del último retiro: <strong id="cya-share-last-date"></strong></div><p>Por el momento no es posible iniciar un nuevo trámite debido al tiempo transcurrido desde tu retiro anterior.</p></div><div class="cya-share-followup-note"><b>Tu expediente permanece en seguimiento</b><p>Conservaremos tu registro para realizar una nueva revisión en la fecha programada, considerando los requisitos vigentes.</p></div><div class="cya-share-advisor"><b id="cya-share-advisor"></b><small>Asesor · Casillas & Asociados</small><strong id="cya-share-advisor-phone"></strong></div></div><div id="cya-share-eligible">'+
     '<div class="cya-share-stats" id="cya-share-eligibility-stats"></div>'+
     '<div class="cya-share-stats" id="cya-share-work-stats"></div>'+
     '<div class="cya-share-featured"><div class="cya-share-net"><small>NETO ESTIMADO A RECIBIR</small><strong id="cya-share-net"></strong><span>Importe estimado después de honorarios.</span></div>'+'<div class="cya-share-compare"><span>COMPARACIÓN NETA</span><strong id="cya-share-ratio"></strong><small>Frente a la referencia de 30 días del SBC.</small></div></div>'+'<div class="cya-share-finances" id="cya-share-finance-stats"></div>'+
     
     '<p>Estimación informativa, no monto garantizado. El importe definitivo depende de la modalidad aplicable y autorización de la AFORE.</p>'+
     '</div></div></div></div>'+
   '<div class="cya-share-pane"><div class="cya-share-pane-title">Mensaje de WhatsApp</div>'+
    '<div class="cya-share-recipient-selector"><label for="cya-share-recipient-kind">Destinatario</label><select id="cya-share-recipient-kind" aria-label="Destinatario de elegibilidad"><option value="cliente">Cliente</option><option value="colaborador">Colaborador</option></select></div>'+
    '<div class="cya-share-chat"><label for="cya-share-text" id="cya-share-message-label">Mensaje editable</label><textarea id="cya-share-text" rows="13"></textarea>'+
    '<div class="cya-share-destination"><label for="cya-share-phone" id="cya-share-phone-label">WhatsApp del destinatario</label><input id="cya-share-phone" type="tel" inputmode="tel" placeholder="Número con lada"/>'+
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
 root.querySelector('#cya-share-recipient-kind').addEventListener('change',e=>switchRecipient(e.target.value));
 root.querySelector('#cya-share-png').addEventListener('click',downloadPNG);
 root.querySelector('#cya-share-copy').addEventListener('click',()=>void copyMessage());
 root.querySelector('#cya-share-whatsapp').addEventListener('click',openWhatsapp);
 return root;
}
function stats(items){
 return items.map(([label,v])=>'<div class="cya-share-stat"><small>'+escapeHTML(label)+'</small><strong>'+escapeHTML(v)+'</strong></div>').join('');
}
function render(d){
 $('cya-share-sheet').classList.toggle('cya-share-is-pending',d.pendingRetiro5);
 $('cya-share-pending').hidden=!d.pendingRetiro5;
 $('cya-share-eligible').hidden=d.pendingRetiro5;
 $('cya-share-sheet').querySelector('.cya-share-png-head strong').textContent=d.pendingRetiro5?'RESULTADO DE REVISIÓN':'RESULTADO DE ELEGIBILIDAD';
 $('cya-share-followup-date').textContent=shortDate(d.recontactDate);
 $('cya-share-followup-long').textContent=longDate(d.recontactDate);
 $('cya-share-last-date').textContent=shortDate(d.lastWithdrawal);
 $('cya-share-advisor').textContent=d.advisorName;
 $('cya-share-advisor-phone').textContent=d.advisorPhone;
 $('cya-share-person').textContent=d.name.toUpperCase();
 $('cya-share-status').textContent=d.pendingRetiro5?'Seguimiento programado':d.eligibilityText;
 $('cya-share-eligibility-stats').innerHTML=stats([['Semanas cotizadas',d.weeks],['IMSS activo',d.imss],['Retiro últimos 5 años',d.past]]);
 $('cya-share-work-stats').innerHTML=stats([['Última empresa',d.company],['Salario diario (SBC)',d.sbc===null?'Por confirmar':money(d.sbc)],['Referencia de 30 días',d.sbc===null?'—':money(d.reference)]]);
 $('cya-share-finance-stats').innerHTML=stats([['Retiro estimado',money(d.amount)],['Honorarios de asesoría',money(d.fee)]]);
 $('cya-share-net').textContent=money(d.net);
 $('cya-share-ratio').textContent=d.ratio===null?'—':d.ratio.toFixed(2)+' veces';
 state.drafts={};
 switchRecipient('cliente',false);
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
 if(raw&&!phone){$('cya-share-feedback').textContent='Verifica el teléfono del destinatario (10 dígitos o lada internacional)';return;}
 const url='https://wa.me/'+(phone||'')+'?text='+encodeURIComponent(text);
 const opened=window.open(url,'_blank');
 if(opened)opened.opener=null;
 else $('cya-share-feedback').textContent='El navegador podría haber bloqueado WhatsApp. Permite ventanas emergentes.';
}
function loadBrandLogo(){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('No se pudo cargar el logotipo institucional'));
  img.src=BRAND_LOGO_URL;
  if(img.complete&&img.naturalWidth>0)resolve(img);
 });
}
function drawPendingCanvas(d,logo){
 const c=document.createElement('canvas');c.width=1100;c.height=895;
 const ctx=c.getContext('2d');if(!ctx)throw Error('No se pudo crear el PNG');
 const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 const txt=(v,x,y,size=24,color='#142d50',bold=false)=>{ctx.fillStyle=color;ctx.font=(bold?'700 ':'400 ')+size+'px Arial';ctx.fillText(String(v),x,y)};
 function lines(str,x,y,maxW,size=23,color='#52617a',height=33){
  ctx.font=size+'px Arial';let row='',yy=y;
  for(const word of String(str).split(/\s+/)){const t=row?row+' '+word:word;if(ctx.measureText(t).width>maxW&&row){txt(row,x,yy,size,color);yy+=height;row=word;}else row=t;}
  if(row)txt(row,x,yy,size,color);return yy;
 }
 fill(0,0,1100,895,'#ffffff');fill(0,0,1100,170,'#142d50');fill(0,166,1100,4,'#cba150');
 if(!logo||!logo.naturalWidth)throw Error('Logotipo institucional no disponible');
 const scale=Math.min(170/logo.naturalWidth,126/logo.naturalHeight);
 const w=logo.naturalWidth*scale,h=logo.naturalHeight*scale;
 ctx.drawImage(logo,30+(170-w)/2,19+(126-h)/2,w,h);
 fill(226,27,1,112,'#5b718e');
 txt('CASILLAS & ASOCIADOS · CONSULTORÍA',250,53,18,'#efc878',true);
 txt('RESULTADO DE REVISIÓN',250,100,34,'#ffffff',true);
 txt('Retiro por desempleo',251,139,21,'#dce8f7');
 txt('CLIENTE',35,216,17,'#63768d');lines(d.name.toUpperCase(),35,254,750,27,'#142c4c',31);
 fill(805,198,255,61,'#fff2dc');txt('Seguimiento programado',818,235,18,'#93631d',true);
 fill(35,296,1030,1,'#d9e2eb');
 txt('PRÓXIMA FECHA DE REVISIÓN',40,339,22,'#142d50',true);
 fill(35,357,1030,203,'#e9f0fa');txt(shortDate(d.recontactDate),290,441,67,'#142d50',true);
 txt(longDate(d.recontactDate),342,486,25,'#51627d');
 txt('Te contactaremos para revisar nuevamente tu caso.',217,531,24,'#142d50');
 fill(35,580,1030,140,'#fff7e9');txt('Retiro anterior registrado',55,619,25,'#835a20',true);
 txt('Fecha del último retiro',55,658,22,'#665a4a');
 txt(shortDate(d.lastWithdrawal),815,658,26,'#142d50',true);
 lines('Por el momento no es posible iniciar un nuevo trámite debido al tiempo transcurrido desde tu retiro anterior.',55,698,975,19,'#665a4a',25);
 txt('Tu expediente permanece en seguimiento',40,764,24,'#142d50',true);
 txt('Nueva revisión sujeta a requisitos vigentes y actualización de datos.',40,796,19,'#51627d');
 fill(35,817,1030,1,'#d9e2eb');
 txt(d.advisorName,40,854,24,'#142d50',true);
 txt('Asesor · Casillas & Asociados',40,883,16,'#51627d');
 txt(d.advisorPhone,805,861,23,'#176b4a',true);
 return c;
}
function drawCanvas(d,logo){
 if(d.pendingRetiro5)return drawPendingCanvas(d,logo);
 const c=document.createElement('canvas');c.width=1100;c.height=895;
 const ctx=c.getContext('2d');if(!ctx)throw Error('No se pudo crear el PNG');
 const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 const line=(x,y,w)=>fill(x,y,w,1,'#d9e2eb');
 const text=(t,x,y,size=23,color='#182d4b',bold=false)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Arial';ctx.fillStyle=color;ctx.fillText(String(t),x,y)};
 function wrap(t,x,y,maxW,size=25,color='#182d4b',bold=true,lineHeight=29,maxLines=3){
  const str=String(t),words=str.split(/\s+/);ctx.font=(bold?'700 ':'400 ')+size+'px Arial';
  let current='',rows=[];
  for(const word of words){
   const candidate=current?current+' '+word:word;
   if(ctx.measureText(candidate).width>maxW&&current){rows.push(current);current=word;}else current=candidate;
  }
  if(current)rows.push(current);
  rows.slice(0,maxLines).forEach((row,i)=>text(row,x,y+i*lineHeight,size,color,bold));
 }
 function stat(label,val,x,y,w){
  wrap(label,x,y,w-14,17,'#64758d',false,21,2);
  wrap(val,x,y+51,w-14,22,'#192e4c',true,24,2);
 }
 fill(0,0,1100,895,'#ffffff');
 fill(0,0,1100,170,'#142d50');fill(0,166,1100,4,'#cba150');
 if(!logo||!logo.naturalWidth)throw Error('Logotipo institucional no disponible');
 // The original C&A monogram is white on transparent background, optimized for navy.
 const maxW=170,maxH=126;
 const scale=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight);
 const iw=logo.naturalWidth*scale,ih=logo.naturalHeight*scale;
 ctx.drawImage(logo,30+(maxW-iw)/2,19+(maxH-ih)/2,iw,ih);
 fill(226,27,1,112,'#5b718e');
 text('CASILLAS & ASOCIADOS · CONSULTORÍA',250,53,18,'#efc878',true);
 text('RESULTADO DE ELEGIBILIDAD',250,100,34,'#ffffff',true);
 text('Retiro por desempleo',251,139,21,'#dce8f7');
 text('CLIENTE',35,220,17,'#63768d');
 wrap(d.name.toUpperCase(),35,258,750,30,'#142c4c',true,34,2);
 fill(814,196,251,75,d.eligibilityText.startsWith('Criterios')?'#e4f6e9':'#fff3de');
 wrap(d.eligibilityText,829,226,220,17,'#14643c',true,22,2);
 line(35,302,1030);
 const cols=[35,395,750];
 stat('Semanas cotizadas',d.weeks,cols[0],337,300);
 stat('IMSS activo',d.imss,cols[1],337,300);
 stat('Retiro últimos 5 años',d.past,cols[2],337,310);
 line(35,442,1030);
 stat('Última empresa',d.company,cols[0],478,300);
 stat('Salario diario (SBC)',d.sbc===null?'Por confirmar':money(d.sbc),cols[1],478,300);
 stat('Referencia de 30 días',d.sbc===null?'—':money(d.reference),cols[2],478,300);
 // Two principal figures: net (navy) and comparison (green).
 fill(30,587,569,166,'#142d50');
 fill(30,749,569,4,'#cba150');
 text('NETO ESTIMADO A RECIBIR',51,620,18,'#e9d0a0',true);
 text(money(d.net),51,696,53,'#ffffff',true);
 text('Importe estimado después de honorarios.',52,731,16,'#cfdaea');
 fill(613,587,457,166,'#e4f5e9');
 text('COMPARACIÓN NETA',638,620,18,'#187344',true);
 text(d.ratio===null?'—':d.ratio.toFixed(2)+' veces',638,696,49,'#15733d',true);
 text('Frente a la referencia de 30 días del SBC.',639,731,15,'#347750');
 fill(30,769,510,70,'#f4f6f9');fill(550,769,520,70,'#f4f6f9');
 text('Retiro estimado',48,792,16,'#64758d');
 text(money(d.amount),48,825,26,'#192e4c',true);
 text('Honorarios de asesoría',570,792,16,'#64758d');
 text(money(d.fee),570,825,26,'#192e4c',true);
 text('Estimación informativa, no monto garantizado. La AFORE determina el importe definitivo.',35,869,15,'#63738b');
 return c;
}
async function downloadPNG(){
 const d=state.data;if(!d)return;
 const button=$('cya-share-png');if(button)button.disabled=true;
 try{
  $('cya-share-feedback').textContent='Preparando ficha con logotipo institucional…';
  const logo=await loadBrandLogo();
  const canvas=drawCanvas(d,logo);
  const link=document.createElement('a');
  link.download='CYA_Elegibilidad_'+d.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_')+'.png';
  link.href=canvas.toDataURL('image/png');
  document.body.appendChild(link);link.click();link.remove();
  $('cya-share-feedback').textContent='Ficha PNG generada. Adjunta el archivo en WhatsApp.';
 }catch(e){
  console.error('PNG de elegibilidad',e);
  $('cya-share-feedback').textContent='No se pudo generar el PNG con el logotipo. Verifica la conexión e inténtalo nuevamente.';
 }finally{if(button)button.disabled=false;}
}
window.cyaAbrirCompartirElegibilidad=open;
window.__cyaShareEligibility={snapshot,open,close,downloadPNG,switchRecipient,clientMessage};
})();