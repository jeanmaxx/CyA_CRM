/* WhatsApp manual desde el expediente del prospecto o cliente. Nunca envía automáticamente. */
(function collaboratorWhatsAppV2(){
 'use strict';
 if(window.caV2OpenWhatsApp)return;
 const templates=[
  {id:'bienvenida',title:'Bienvenida',message:'{{SALUDO}}, {{NOMBRE}}. Soy {{COLABORADOR}} de Casillas & Asociados. Te escribo para dar seguimiento a tu trámite. ¿Cómo te encuentras?'},
  {id:'documentos',title:'Solicitud de documentos',message:'{{SALUDO}}, {{NOMBRE}}. Soy {{COLABORADOR}} de Casillas & Asociados. Para continuar con tu trámite, ¿podrías confirmarme si tienes disponible tu INE y la documentación que te solicitamos? Gracias.'},
  {id:'seguimiento',title:'Seguimiento del trámite',message:'{{SALUDO}}, {{NOMBRE}}. Soy {{COLABORADOR}} de Casillas & Asociados. Me comunico para revisar el avance de tu trámite. ¿Tienes alguna actualización o duda que podamos atender?'},
  {id:'cita',title:'Recordatorio de cita',message:'{{SALUDO}}, {{NOMBRE}}. Soy {{COLABORADOR}} de Casillas & Asociados. Te contacto para confirmar los detalles de tu cita en AFORE. Quedo al pendiente de tu respuesta.'},
  {id:'deposito',title:'Confirmación de depósito',message:'{{SALUDO}}, {{NOMBRE}}. Soy {{COLABORADOR}} de Casillas & Asociados. ¿Podrías confirmarme si ya recibiste el depósito de tu AFORE? Por favor no envíes contraseñas ni información bancaria sensible por este medio.'}
 ];
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>ch==='&'?'&amp;':ch==='<'?'&lt;':ch==='>'?'&gt;':ch==='"'?'&quot;':'&#39;');
 const shortName=v=>String(v||'').trim().split(/\s+/)[0].toLocaleLowerCase('es-MX').replace(/^./,c=>c.toLocaleUpperCase('es-MX'));
 const cleanNumber=v=>{
   let digits=String(v||'').replace(/\D/g,'');
   if(digits.length===10)return '52'+digits;
   if(digits.length===12&&digits.startsWith('52'))return digits;
   if(digits.length===13&&digits.startsWith('521'))return '52'+digits.slice(3);
   return '';
 };
 const greeting=()=>{const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';};
 let current=null;
 function prepare(raw,person){
   return raw.replace(/\{\{SALUDO\}\}/g,greeting()).replace(/\{\{NOMBRE\}\}/g,shortName(person.name)).replace(/\{\{COLABORADOR\}\}/g,shortName(state.bootstrap?.collaborator?.name||'tu colaborador'));
 }
 function ensure(){
   if($('ca-wa-modal'))return;
   const root=document.createElement('div');root.id='ca-wa-modal';root.className='modal-overlay';root.hidden=true;
   root.innerHTML='<section class="modal ca-wa-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-wa-title"><header class="modal-head"><div><span class="eyebrow">SEGUIMIENTO POR WHATSAPP</span><h3 id="ca-wa-title">Preparar mensaje</h3></div><button class="icon-button" type="button" id="ca-wa-close" aria-label="Cerrar">×</button></header><div class="ca-wa-body"><p id="ca-wa-person"></p><label>Plantilla<select id="ca-wa-template"></select></label><label>Mensaje editable<textarea id="ca-wa-message" rows="9" maxlength="4000"></textarea></label><div id="ca-wa-warning" role="status" class="ca-expediente-help"></div><div class="modal-actions"><button type="button" class="btn" id="ca-wa-copy">Copiar mensaje</button><button type="button" class="btn btn-primary" id="ca-wa-send">Abrir WhatsApp</button></div></div></section>';
   document.body.appendChild(root);
   $('ca-wa-close').addEventListener('click',close);
   root.addEventListener('click',e=>{if(e.target===root)close();});
   $('ca-wa-template').innerHTML=templates.map(t=>'<option value="'+t.id+'">'+esc(t.title)+'</option>').join('');
   $('ca-wa-template').addEventListener('change',()=>{
     if(!current)return;
     $('ca-wa-message').value=prepare(templates.find(t=>t.id===$('ca-wa-template').value)?.message||'',current);
   });
   $('ca-wa-copy').addEventListener('click',async()=>{
     const message=$('ca-wa-message').value.trim();if(!message)return;
     try{await navigator.clipboard.writeText(message);$('ca-wa-warning').textContent='Mensaje copiado. Envíalo manualmente desde WhatsApp.';}
     catch(_){$('ca-wa-message').select();$('ca-wa-warning').textContent='Selecciona y copia el mensaje para pegarlo en WhatsApp.';}
   });
   $('ca-wa-send').addEventListener('click',()=>{
     if(!current)return;
     const phone=cleanNumber(current.phone),msg=$('ca-wa-message').value.trim();
     if(!phone){$('ca-wa-warning').textContent='El teléfono no tiene un formato mexicano válido (10 dígitos). Corrígelo en el expediente.';return;}
     if(!msg){$('ca-wa-warning').textContent='Escribe un mensaje antes de abrir WhatsApp.';return;}
     const url='https://wa.me/'+phone+'?text='+encodeURIComponent(msg);
     const tab=window.open(url,'_blank','noopener,noreferrer');
     if(!tab)$('ca-wa-warning').textContent='El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para abrir WhatsApp.';
   });
 }
 function close(){if($('ca-wa-modal'))$('ca-wa-modal').hidden=true;current=null;}
 window.caV2OpenWhatsApp=function(type,id){
   const person=type==='lead'
     ?(state.prospects||[]).find(p=>String(p.id)===String(id))
     :(state.bootstrap?.clients||[]).find(c=>String(c.id)===String(id));
   if(!person)return;
   ensure();current={name:person.name,phone:person.phone};
   $('ca-wa-title').textContent='WhatsApp · '+(type==='lead'?'Prospecto':'Cliente');
   $('ca-wa-person').textContent=person.name+' · '+(person.phone||'Sin teléfono');
   $('ca-wa-template').value='seguimiento';
   $('ca-wa-message').value=prepare(templates.find(t=>t.id==='seguimiento').message,current);
   $('ca-wa-warning').textContent='El texto se prepara para revisión. Nada se envía automáticamente.';
   $('ca-wa-modal').hidden=false;
 };
 window.caV2WhatsAppClose=close;
})();
