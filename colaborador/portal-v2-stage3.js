/* Etapa 3 · Expediente único: información editable y seguimiento de solo lectura.
 * Las actividades se harán editables en la etapa 4.
 */
(function installCollaboratorExpedienteV2(){
  'use strict';
  if(window.__caExpedienteV2)return;window.__caExpedienteV2=true;
  const byId=id=>document.getElementById(id);
  let activeClientId='',activeTab='informacion';
  const enc=v=>esc(String(v??''));
  const clientById=id=>(state.bootstrap?.clients||[]).find(c=>String(c.id)===String(id));
  const serviceName=id=>(state.bootstrap?.services||[]).find(s=>s.id===id)?.name||id||'Servicio';
  const stepInfo=[
    ['Contrato firmado',c=>c.stage!=='contrato_firmas'&&Boolean(c.signature?.signed||c.signature?.date||c.progress?.done?.[6])],
    ['Cliente dado de alta',c=>Boolean(c.progress?.done?.[6])],
    ['App AforeMóvil instalada',c=>Boolean(c.aforeMovil==='si')],
    ['Revisión de cuenta bancaria nivel 4',c=>Boolean(c.bankLevel4==='si')],
    ['Crear cita en Afore',c=>Boolean(c.appointment?.date)],
    ['Expediente Afore actualizado',c=>Boolean(c.progress?.done?.[8])],
    ['Solicitud en aplicación',c=>Boolean(c.progress?.done?.[9])],
    ['Recepción de depósito',c=>Boolean(c.progress?.done?.[10])],
    ['Pago de honorarios',c=>Boolean(c.progress?.done?.[11])]
  ];
  function ensure(){
    if(byId('ca-expediente-v2'))return;
    const root=document.createElement('div');
    root.id='ca-expediente-v2';root.className='modal-overlay ca-expediente-overlay';root.hidden=true;
    root.innerHTML='<section class="modal ca-expediente-modal" role="dialog" aria-modal="true" aria-labelledby="ca-expediente-title"><header class="modal-head"><div><span class="eyebrow">MIS CLIENTES</span><h3 id="ca-expediente-title">Expediente</h3></div><button type="button" class="icon-button" id="ca-expediente-close" aria-label="Cerrar expediente">×</button></header><div class="ca-expediente-tabs" role="tablist" aria-label="Secciones del expediente"><button type="button" role="tab" id="ca-tab-info" aria-controls="ca-expediente-body">Información</button><button type="button" role="tab" id="ca-tab-track" aria-controls="ca-expediente-body">Seguimiento</button></div><div id="ca-expediente-message" class="form-message" role="status"></div><div id="ca-expediente-body"></div></section>';
    document.body.appendChild(root);
    byId('ca-expediente-close').addEventListener('click',close);
    byId('ca-tab-info').addEventListener('click',()=>switchTab('informacion'));
    byId('ca-tab-track').addEventListener('click',()=>switchTab('seguimiento'));
    root.addEventListener('click',event=>{if(event.target===root)close();});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  }
  function infoMarkup(c){
    return '<form id="ca-expediente-form" class="ca-expediente-form">'+
      '<p class="ca-expediente-help">Los cambios se actualizan en el expediente oficial del CRM. El domicilio se guarda como texto completo para respetar los contratos actuales.</p>'+
      '<div class="form-grid two">'+
        '<label>Nombre completo<input id="ca-exp-name" maxlength="220" required value="'+enc(c.name)+'"></label>'+
        '<label>Teléfono<input id="ca-exp-phone" maxlength="40" required inputmode="tel" value="'+enc(c.phone)+'"></label>'+
      '</div>'+
      '<div class="form-grid two">'+
        '<label>CURP<input value="'+enc(c.curp)+'" readonly aria-readonly="true" title="La CURP se corrige desde el CRM del asesor"></label>'+
        '<label>Servicio<input value="'+enc(serviceName(c.serviceId))+'" readonly aria-readonly="true"></label>'+
      '</div>'+
      '<label>Domicilio completo<textarea id="ca-exp-address" maxlength="1000" rows="4" placeholder="Calle y número, colonia, código postal, municipio y estado">'+enc(c.address)+'</textarea></label>'+
      '<div class="modal-actions"><button class="btn ca-wa-button" type="button" id="ca-wa-client">WhatsApp</button><button class="btn btn-primary" type="submit" id="ca-exp-save">Guardar cambios</button></div>'+
      '</form>';
  }
  function trackingMarkup(c){
    const date=c.appointment?.date?dateMX(c.appointment.date):'Sin fecha asignada';
    const note=c.stage==='contrato_firmas'?'<p class="ca-expediente-help">Firma pendiente de confirmación del colaborador.</p>':'';
    const lines=stepInfo.map(([title,done])=>'<div class="ca-expediente-step"><span class="'+(done(c)?'is-complete':'')+'" aria-label="'+(done(c)?'Completado':'Pendiente')+'">'+(done(c)?'✓':'○')+'</span><strong>'+enc(title)+'</strong></div>').join('');
    return '<div class="ca-expediente-followup">'+note+
      '<div class="ca-expediente-summary"><button type="button" class="ca-expediente-summary-edit" data-activity="afore" aria-label="Editar AFORE"><small>AFORE · Editar</small><strong>'+enc(c.afore||'Por confirmar')+'</strong></button><button type="button" class="ca-expediente-summary-edit" data-activity="cita" aria-label="Editar cita en AFORE"><small>Cita en AFORE · Editar</small><strong>'+date+'</strong></button><button type="button" class="ca-expediente-summary-edit" data-activity="cita" aria-label="Editar hora o sucursal"><small>Hora / sucursal · Editar</small><strong>'+enc([c.appointment?.time,c.appointment?.branch].filter(Boolean).join(' · ')||'Por confirmar')+'</strong></button><button type="button" class="ca-expediente-summary-edit" data-activity="banco" aria-label="Editar banco"><small>Banco · Editar</small><strong>'+enc(c.bank||'Por confirmar')+'</strong></button></div>'+
      (window.caV2TrackingSummary?window.caV2TrackingSummary(c):'<div class="ca-expediente-steps">'+lines+'</div>')+
      '<p class="ca-expediente-help">Selecciona una actividad para consultar su estado o registrar su realización. Los depósitos y honorarios conservan su verificación externa.</p>'+
      '<div class="modal-actions"><button class="btn" type="button" id="ca-exp-view-contract">Consultar contrato</button></div>'+
      '</div>';
  }
  function switchTab(tab){
    activeTab=tab;const c=clientById(activeClientId);if(!c){close();return;}
    const info=tab==='informacion';
    byId('ca-tab-info').setAttribute('aria-selected',String(info));
    byId('ca-tab-track').setAttribute('aria-selected',String(!info));
    byId('ca-tab-info').tabIndex=info?0:-1;byId('ca-tab-track').tabIndex=info?-1:0;
    byId('ca-expediente-body').innerHTML=info?infoMarkup(c):trackingMarkup(c);
    if(info){byId('ca-expediente-form').addEventListener('submit',save);byId('ca-wa-client')?.addEventListener('click',()=>window.caV2OpenWhatsApp?.('client',activeClientId));}
    else {byId('ca-exp-view-contract').addEventListener('click',()=>window.caViewContract?.(activeClientId));byId('ca-expediente-body').querySelectorAll('.ca-expediente-summary-edit').forEach(button=>button.addEventListener('click',()=>button.dataset.activity==='afore'?editAfore():window.caV2OpenActivity?.(activeClientId,button.dataset.activity)));}
  }
  function editAfore(){
    const c=clientById(activeClientId);if(!c)return;
    let overlay=byId('ca-exp-afore-modal');
    if(!overlay){
      overlay=document.createElement('div');overlay.id='ca-exp-afore-modal';overlay.className='modal-overlay';overlay.hidden=true;
      overlay.innerHTML='<section class="modal ca-exp-afore-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-exp-afore-title"><header class="modal-head"><h3 id="ca-exp-afore-title">Editar AFORE del cliente</h3><button class="icon-button" type="button" id="ca-exp-afore-close" aria-label="Cerrar">×</button></header><form class="ca-exp-afore-form" id="ca-exp-afore-form"><label>AFORE registrada<input id="ca-exp-afore-name" maxlength="100" required placeholder="Nombre de la AFORE"></label><p id="ca-exp-afore-feedback" role="status"></p><div class="modal-actions"><button type="button" class="btn" id="ca-exp-afore-cancel">Cancelar</button><button type="submit" class="btn btn-primary" id="ca-exp-afore-save">Guardar AFORE</button></div></form></section>';
      document.body.appendChild(overlay);
      const hide=()=>{overlay.hidden=true;};
      byId('ca-exp-afore-close').addEventListener('click',hide);
      byId('ca-exp-afore-cancel').addEventListener('click',hide);
      overlay.addEventListener('click',event=>{if(event.target===overlay)hide();});
      byId('ca-exp-afore-form').addEventListener('submit',async event=>{
        event.preventDefault();
        const client=clientById(activeClientId),value=byId('ca-exp-afore-name').value.trim(),btn=byId('ca-exp-afore-save'),msg=byId('ca-exp-afore-feedback');
        if(!client||!value)return;
        btn.disabled=true;msg.textContent='Guardando…';
        try{
          const reply=await portalAction({action:'update_client_info',clientId:client.id,expectedUpdatedAt:client.updatedAt,afore:value});
          const list=state.bootstrap?.clients||[],index=list.findIndex(x=>x.id===client.id);
          if(index>=0&&reply.client)list[index]=reply.client;
          await refreshDashboardOnly();
          overlay.hidden=true;switchTab('seguimiento');
          msg.textContent='';toast('AFORE actualizada en el expediente','success');
        }catch(err){msg.textContent=err?.message||'No se pudo guardar la AFORE';}
        finally{btn.disabled=false;}
      });
    }
    byId('ca-exp-afore-name').value=c.afore||'';
    byId('ca-exp-afore-feedback').textContent='';
    overlay.hidden=false;byId('ca-exp-afore-name').focus();
  }
  function close(){const el=byId('ca-expediente-v2');if(el)el.hidden=true;activeClientId='';}
  async function save(event){
    event.preventDefault();
    const c=clientById(activeClientId),message=byId('ca-expediente-message');
    if(!c)return;
    const name=byId('ca-exp-name').value.trim(),phone=byId('ca-exp-phone').value.trim(),address=byId('ca-exp-address').value.trim();
    if(!name||!phone){message.textContent='El nombre y el teléfono son obligatorios.';return;}
    const btn=byId('ca-exp-save');btn.disabled=true;message.textContent='Guardando cambios…';
    try{
      const response=await portalAction({action:'update_client_info',clientId:c.id,expectedUpdatedAt:c.updatedAt,name,phone,address});
      const list=state.bootstrap?.clients||[],index=list.findIndex(row=>row.id===c.id);
      if(index>=0&&response.client)list[index]=response.client;
      await refreshDashboardOnly();
      if(state.page==='clientes')window.navigate('clientes',true);
      message.textContent='Cambios guardados en el CRM. Puedes seguir consultando el expediente.';
      // No cerrar el modal ni cambiar la pestaña.
      switchTab('informacion');
    }catch(error){
      message.textContent=error.message||'No fue posible guardar los cambios.';
      if(/actualizado por otra persona/i.test(message.textContent)){
        message.textContent+=' Cierra el expediente y vuelve a abrirlo para ver la versión más reciente.';
      }
    }finally{btn.disabled=false;}
  }
  const legacyOpen=window.caOpenClient;
  window.caOpenClient=function(id){
    const c=clientById(id);if(!c)return legacyOpen?.(id);
    ensure();activeClientId=id;activeTab='informacion';
    byId('ca-expediente-title').textContent='Expediente · '+c.name;
    byId('ca-expediente-message').textContent='';
    byId('ca-expediente-v2').hidden=false;
    switchTab('informacion');
    byId('ca-exp-name')?.focus();
  };
  window.caCloseExpedienteV2=close;
  window.caV2RefreshExpediente=()=>{if(activeClientId&&byId('ca-expediente-v2')?.hidden===false)switchTab(activeTab);};
  // La ventana de prospectos se mantiene como el mismo expediente informativo,
  // usando los campos oficiales y el formulario histórico.
  const legacyProspectOpen=window.openProspectModal;
  window.openProspectModal=function(id=''){
    legacyProspectOpen(id);
    const title=byId('prospect-modal-title');
    if(title&&id)title.textContent='Expediente · Prospecto';
  };
})();
