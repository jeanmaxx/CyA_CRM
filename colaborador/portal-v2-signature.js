/* Confirmación de firma por el colaborador: misma fecha y evidencia que el CRM principal. */
(function collaboratorSignatureV3(){
 'use strict';
 const $=id=>document.getElementById(id);
 let id='';
 function close(){if($('ca-signature-modal'))$('ca-signature-modal').hidden=true;id='';}
 function ensure(){
  if($('ca-signature-modal'))return;
  const root=document.createElement('div');root.id='ca-signature-modal';root.className='modal-overlay';root.hidden=true;
  root.innerHTML='<section class="modal ca-signature-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-signature-title"><div class="modal-head"><div><span class="eyebrow">CONFIRMACIÓN DE FIRMA</span><h3 id="ca-signature-title">Contrato firmado</h3></div><button type="button" id="ca-signature-close" class="icon-button" aria-label="Cerrar">×</button></div><form id="ca-signature-form" class="ca-signature-body"><p id="ca-signature-person" class="ca-expediente-help"></p><label>Fecha real de firma (dd/mm/aaaa)<input id="ca-signature-date" type="text" inputmode="numeric" data-mx-date maxlength="10" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/aaaa" autocomplete="off" required></label><label>Nota u observación (opcional)<textarea id="ca-signature-note" rows="4" maxlength="1000" placeholder="Ej. Contrato firmado presencialmente; se entregó copia al cliente"></textarea></label><div id="ca-signature-error" class="ca-signature-error" role="alert"></div><div class="ca-signature-actions"><button type="button" class="btn" id="ca-signature-cancel">Cancelar</button><button type="submit" class="btn btn-primary" id="ca-signature-submit">Confirmar contrato firmado</button></div></form></section>';
  document.body.appendChild(root);
  $('ca-signature-close').addEventListener('click',close);$('ca-signature-cancel').addEventListener('click',close);
  root.addEventListener('click',e=>{if(e.target===root)close();});
  $('ca-signature-form').addEventListener('submit',save);
 }
 async function save(e){
  e.preventDefault();
  const client=(state.bootstrap?.clients||[]).find(c=>String(c.id)===String(id));
  if(!client)return;
  const button=$('ca-signature-submit'),error=$('ca-signature-error');
  const date=window.caV2Dates.toISO($('ca-signature-date').value),notes=$('ca-signature-note').value.trim();
  if(!date){error.textContent='Indica una fecha válida en formato dd/mm/aaaa.';return;}
  button.disabled=true;error.textContent='';
  try{
   const res=await portalAction({action:'confirm_contract_signature',clientId:id,expectedUpdatedAt:client.updatedAt,date,note:notes});
   const rows=state.bootstrap?.clients||[],index=rows.findIndex(c=>String(c.id)===String(id));
   if(index>=0&&res.client)rows[index]=res.client;
   await refreshDashboardOnly();
   close();
   if(state.page==='clientes')window.navigate('clientes',true);
   window.caV2RefreshExpediente?.();
   toast('Contrato firmado registrado en el expediente','success');
  }catch(err){error.textContent=err.message||'No fue posible confirmar la firma';button.disabled=false;}
 }
 window.caV2ConfirmSignature=function(clientId){
  const c=(state.bootstrap?.clients||[]).find(x=>String(x.id)===String(clientId));
  if(!c||c.stage!=='contrato_firmas')return;
  ensure();id=c.id;
  $('ca-signature-person').textContent=c.name+' · Colaborador responsable de la firma';
  $('ca-signature-date').value=window.caV2Dates.today();
  window.caV2Dates.bind($('ca-signature-form'));
  $('ca-signature-note').value='';$('ca-signature-error').textContent='';$('ca-signature-submit').disabled=false;
  $('ca-signature-modal').hidden=false;
 };
 window.caV2CloseSignature=close;
})();
