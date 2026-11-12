/* Centro de mensajes del colaborador: exclusivamente plantillas institucionales guardadas en CRM. */
(function collaboratorWhatsAppV3(){
 'use strict';
 const groups=[
  ['bienvenida','Bienvenida'],['revision','Revisión'],['sindos','Revisión SINDOS'],['aprobado','Aprobado'],
  ['finalizacion','Finalización'],['despedida','Despedida'],['curp_mal','CURP mal'],['imss_activo','IMSS activo'],
  ['inconsistencias','Inconsistencias'],['retiro_5','Retiro -5 años'],['sin_semanas','Sin semanas suficientes'],['alta_15','Seguimiento alta']
 ];
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>ch==='&'?'&amp;':ch==='<'?'&lt;':ch==='>'?'&gt;':ch==='"'?'&quot;':'&#39;');
 const firstName=v=>String(v||'').trim().split(/\s+/)[0].toLocaleLowerCase('es-MX').replace(/^./,c=>c.toLocaleUpperCase('es-MX'));
 const phoneNumber=value=>{
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.length===10)return '52'+digits;
  if(digits.length===12&&digits.startsWith('52'))return digits;
  if(digits.length===13&&digits.startsWith('521'))return '52'+digits.slice(3);
  return '';
 };
 const greeting=()=>{const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';};
 const templates=()=>Array.isArray(state?.bootstrap?.messageTemplates)?state.bootstrap.messageTemplates.filter(t=>t&&groups.some(g=>g[0]===t.group)&&String(t.id).startsWith('pl_wa_')):[];
 let current=null,activeGroup='',activeId='';
 function personalize(raw,person){
  const collaborator=state.bootstrap?.collaborator||{};
  const sender=String(collaborator.nombres||collaborator.name||'').trim();
  return String(raw||'').replace(/\{\{NOMBRE\}\}/gi,firstName(person.name))
   .replace(/\{\{ASESOR\}\}/gi,sender||'Tu asesor')
   .replace(/\{\{COLABORADOR\}\}/gi,sender||'Tu colaborador')
   .replace(/\{\{SALUDO\}\}/gi,greeting());
 }
 function ensure(){
  if($('ca-wa-modal'))return;
  const root=document.createElement('div');root.id='ca-wa-modal';root.className='modal-overlay';root.hidden=true;
  root.innerHTML='<section class="modal ca-wa-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-wa-title"><header class="modal-head"><div><span class="eyebrow">MENSAJES INSTITUCIONALES</span><h3 id="ca-wa-title">Mensajes WhatsApp</h3></div><button class="icon-button" type="button" id="ca-wa-close" aria-label="Cerrar">×</button></header>'+
   '<div class="ca-wa-body"><p id="ca-wa-person"></p><div class="ca-wa-caption">Plantillas oficiales de Casillas & Asociados</div><div id="ca-wa-group-list" class="ca-wa-group-list" role="group" aria-label="Categorías de mensajes"></div>'+
   '<div id="ca-wa-parts" class="ca-wa-parts" role="group" aria-label="Mensajes de la categoría"></div>'+
   '<label>Mensaje editable<textarea id="ca-wa-message" rows="10" maxlength="12000"></textarea></label><div id="ca-wa-warning" role="status" class="ca-expediente-help"></div>'+
   '<div class="modal-actions"><button type="button" class="btn" id="ca-wa-copy">Copiar mensaje</button><button type="button" class="btn btn-primary" id="ca-wa-send">Abrir WhatsApp</button></div></div></section>';
  document.body.appendChild(root);
  $('ca-wa-close').addEventListener('click',close);
  root.addEventListener('click',e=>{if(e.target===root)close();});
  $('ca-wa-copy').addEventListener('click',async()=>{
   const message=$('ca-wa-message').value.trim();if(!message)return;
   try{await navigator.clipboard.writeText(message);$('ca-wa-warning').textContent='Mensaje copiado; el envío es manual.';}
   catch(_){$('ca-wa-message').select();$('ca-wa-warning').textContent='Selecciona y copia el mensaje.';}
  });
  $('ca-wa-send').addEventListener('click',()=>{
   if(!current)return;
   const phone=phoneNumber(current.phone),msg=$('ca-wa-message').value.trim();
   if(!phone){$('ca-wa-warning').textContent='Teléfono no válido. Corrígelo en el expediente.';return;}
   if(!msg){$('ca-wa-warning').textContent='Escribe un mensaje para abrir WhatsApp.';return;}
   if(/\{\{[A-Z_]+\}\}/i.test(msg)){$('ca-wa-warning').textContent='Antes de enviar, completa manualmente los datos pendientes indicados entre llaves.';return;}
   const tab=window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
   if(!tab)$('ca-wa-warning').textContent='El navegador bloqueó la pestaña de WhatsApp.';
  });
 }
 function chooseMessage(id){
  const t=templates().find(x=>x.id===id&&x.group===activeGroup);
  if(!t||!current)return;
  activeId=t.id;
  $('ca-wa-message').value=personalize(t.text,current);
  $('ca-wa-parts').querySelectorAll('button').forEach(b=>{const active=b.dataset.template===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  $('ca-wa-warning').textContent='Revisa los datos y el mensaje antes de abrir WhatsApp; nada se envía automáticamente.';
 }
 function chooseGroup(key){
  activeGroup=key;
  $('ca-wa-group-list').querySelectorAll('button').forEach(b=>{const active=b.dataset.group===key;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  const parts=templates().filter(t=>t.group===key).sort((a,b)=>Number(a.order||1)-Number(b.order||1));
  $('ca-wa-parts').innerHTML=parts.map((t,i)=>'<button class="ca-wa-part" type="button" data-template="'+esc(t.id)+'" aria-pressed="false">'+esc(parts.length>1?(i+1)+' / '+parts.length+' · '+t.name:t.name)+'</button>').join('');
  $('ca-wa-parts').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseMessage(b.dataset.template)));
  if(parts[0])chooseMessage(parts[0].id);
 }
 function close(){if($('ca-wa-modal'))$('ca-wa-modal').hidden=true;current=null;}
 window.caV2OpenWhatsApp=function(type,id){
  const person=type==='lead'?(state.prospects||[]).find(p=>String(p.id)===String(id)):(state.bootstrap?.clients||[]).find(c=>String(c.id)===String(id));
  if(!person)return;
  ensure();current={name:person.name,phone:person.phone};
  $('ca-wa-title').textContent='Mensajes WhatsApp';
  $('ca-wa-person').textContent=(type==='lead'?'Prospecto: ':'Cliente: ')+person.name+' · '+(person.phone||'Sin teléfono');
  const available=templates(),categories=groups.filter(g=>available.some(t=>t.group===g[0]));
  $('ca-wa-group-list').innerHTML=categories.map(g=>'<button type="button" class="ca-wa-category" data-group="'+g[0]+'" aria-pressed="false">'+esc(g[1])+'</button>').join('');
  $('ca-wa-group-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseGroup(b.dataset.group)));
  $('ca-wa-message').value='';$('ca-wa-parts').innerHTML='';
  $('ca-wa-warning').textContent=available.length?'':'No hay plantillas institucionales disponibles. Actualiza el portal y vuelve a intentarlo.';
  if(categories[0])chooseGroup(categories[0][0]);
  $('ca-wa-modal').hidden=false;
 };
 window.caV2WhatsAppClose=close;
})();
