/* Meta Leads workflow - additive production module.
   Keeps Meta intake visually separate until the advisor requests the weeks/NSS review. */
(function installMetaLeadsWorkflow(){
  if(window.__cyaMetaLeadsWorkflowInstalled)return;
  window.__cyaMetaLeadsWorkflowInstalled=true;

  const META_SOURCE='Meta Ads';
  const META_PENDING_NAME='Nombre pendiente de validar';
  const CLIENT_REVIEW_TEMPLATE={
    id:'pl_meta_revision_en_proceso',
    nombre:'Meta Ads · Aviso de revisión en proceso',
    etapa:'semanas',
    tipo:'whatsapp',
    icono:'🔎',
    texto:'¡Hola, {{NOMBRE}}!\n\nTe saluda {{ASESOR}}, Consultor Previsional de Casillas & Asociados y soy tu asesor asignado para brindarte la información.\n\nQuiero confirmarte que recibimos tu solicitud para la revisión de tu Retiro por Desempleo de AFORE.\nYa estamos validando tus datos en el sistema para calcular el monto al que puedes acceder.\n\n📍 Cobertura: Te comento que nuestra atención y firma presencial se realiza en:\nQuerétaro, San Juan del Río, Tequisquiapan, Ezequiel Montes, Cadereyta, Tepeji e Irapuato.\n\nEn unos momentos te comparto los resultados de tu consulta y cómo podemos iniciar tu trámite.\n\n¡Quedo a tus órdenes! 📲'
  };

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const leadById=id=>(store?.leads||[]).find(l=>String(l.id)===String(id));
  const currentLead=()=>editingLeadId?leadById(editingLeadId):null;
  const normalizeCurp=value=>String(value||'').replace(/[^A-ZÑ0-9]/gi,'').toUpperCase().slice(0,18);
  const normalizePhone=value=>{
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.length===13&&digits.startsWith('521'))digits=digits.slice(3);
    else if(digits.length===12&&digits.startsWith('52'))digits=digits.slice(2);
    else if(digits.length>10)digits=digits.slice(-10);
    return digits.slice(0,10);
  };

  function greeting(){
    const hour=new Date().getHours();
    if(hour>=5&&hour<12)return 'Buen día';
    if(hour>=12&&hour<20)return 'Buenas tardes';
    return 'Buenas noches';
  }

  function isMetaLead(l){
    const source=String(l?.fuenteContacto||l?.origen?.fuente||'').trim().toLowerCase();
    return l?.metaAds===true||source==='meta ads'||Boolean(l?.metaLead)||Boolean(l?.origenMeta);
  }

  function rawMetaName(l){
    return String(l?.metaLead?.nombreRecibido||l?.origenMeta?.nombreRecibido||l?.nombreMeta||'').trim();
  }

  function preferredMetaName(l){
    const stored=String(l?.nombre||'').trim();
    if(stored&&!/^nombre pendiente de validar$/i.test(stored))return stored;
    return rawMetaName(l)||stored;
  }

  function firstName(value){
    return String(value||'').trim().split(/\s+/)[0]||'';
  }

  function currentAdvisorName(){
    try{
      const value=typeof asesorNombreCompleto==='function'?asesorNombreCompleto(sesionActiva):(sesionActiva?.nombre||'');
      return String(value||'').trim()||'tu asesor';
    }catch(_){return String(sesionActiva?.nombre||'').trim()||'tu asesor';}
  }

  function ensureClientReviewTemplate(){
    if(!window.store)return false;
    let arr=Array.isArray(store.plantillas)?store.plantillas:null;
    if(!arr){
      try{arr=typeof PLANTILLAS_DEFAULT!=='undefined'?PLANTILLAS_DEFAULT.map(p=>({...p})):[];}catch(_){arr=[];}
      store.plantillas=arr;
    }
    if(arr.some(p=>p.id===CLIENT_REVIEW_TEMPLATE.id))return false;
    arr.push({...CLIENT_REVIEW_TEMPLATE});
    try{saveStore?.();}catch(_){ }
    return true;
  }

  function clientReviewTemplate(){
    ensureClientReviewTemplate();
    return (store?.plantillas||[]).find(p=>p.id===CLIENT_REVIEW_TEMPLATE.id)||CLIENT_REVIEW_TEMPLATE;
  }

  function clientReviewMessage(lead=currentLead()){
    if(!lead)return {ok:false,message:'',phone:'',name:''};
    const visibleName=preferredMetaName(lead)||String(document.getElementById('lead-nombre')?.value||'').trim();
    const name=firstName(visibleName);
    const phone=normalizePhone(document.getElementById('lead-tel')?.value||lead?.telefono||lead?.phone||'');
    let message=String(clientReviewTemplate().texto||CLIENT_REVIEW_TEMPLATE.texto)
      .replace(/{{NOMBRE}}/g,name||'')
      .replace(/{{ASESOR}}/g,currentAdvisorName())
      .trim();
    if(name){
      const hello=`¡Hola, ${name}!`;
      if(message.startsWith(hello))message=message.replace(hello,`${hello} ${greeting()}.`);
    }
    return {ok:true,message,phone,name};
  }

  function reviewMessage(){
    const curp=normalizeCurp(document.getElementById('lead-curp')?.value||currentLead()?.curp||'');
    if(curp.length!==18)return {ok:false,curp,message:''};
    return {ok:true,curp,message:`${greeting()}, tengo un nuevo cliente interesado, ¿me ayudan con la revisión por favor?\nCURP: ${curp}`};
  }

  async function copyText(text){
    const value=String(text||'').trim();
    if(!value)return false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}}catch(_){ }
    const area=document.createElement('textarea');
    area.value=value;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(area);area.select();area.setSelectionRange(0,value.length);
    let ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}area.remove();return ok;
  }

  function openClientWhatsApp(payload){
    if(!payload?.phone||payload.phone.length!==10){showToast?.('El prospecto necesita un teléfono válido de 10 dígitos para abrir WhatsApp','warn');return null;}
    const url=`https://wa.me/52${payload.phone}?text=${encodeURIComponent(payload.message||'')}`;
    const tab=window.open(url,'_blank');
    if(tab)try{tab.opener=null;}catch(_){ }
    return tab;
  }

  window.cyaCopiarSolicitudRevision=async function(){
    const payload=reviewMessage();
    if(!payload.ok){showToast?.('La CURP debe tener 18 caracteres antes de solicitar revisión','warn');return;}
    const ok=await copyText(payload.message);
    showToast?.(ok?'Solicitud de revisión copiada':'No fue posible copiar automáticamente la solicitud',ok?'success':'warn');
  };

  window.cyaAbrirWhatsAppRevision=function(){
    const payload=reviewMessage();
    if(!payload.ok){showToast?.('La CURP debe tener 18 caracteres antes de solicitar revisión','warn');return;}
    const url='https://wa.me/?text='+encodeURIComponent(payload.message);
    const tab=window.open(url,'_blank');
    if(tab)try{tab.opener=null;}catch(_){ }
    copyText(payload.message).then(ok=>showToast?.(tab?(ok?'WhatsApp abierto y solicitud copiada':'WhatsApp abierto. Selecciona tu grupo de trabajo.'):'El navegador bloqueó WhatsApp; la solicitud quedó copiada.',tab?'success':'warn'));
  };

  window.cyaCopiarAvisoRevisionCliente=async function(){
    const payload=clientReviewMessage();
    if(!payload.ok)return;
    const ok=await copyText(payload.message);
    showToast?.(ok?'Mensaje para el prospecto copiado':'No fue posible copiar el mensaje',ok?'success':'warn');
  };

  window.cyaAbrirWhatsAppCliente=function(){
    const payload=clientReviewMessage();
    if(!payload.ok)return;
    const tab=openClientWhatsApp(payload);
    if(tab)showToast?.('WhatsApp abierto con el número y mensaje del prospecto','success');
  };

  let clientMessageLeadId=null;
  function ensureClientReviewModal(){
    if(document.getElementById('cya-client-review-message-modal'))return;
    const modal=document.createElement('div');
    modal.id='cya-client-review-message-modal';modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal cya-client-review-modal" role="dialog" aria-modal="true" aria-labelledby="cya-client-review-title">
      <div class="modal-header"><div><div class="modal-title" id="cya-client-review-title">Avisar al prospecto</div><div class="cya-client-review-sub">La revisión ya quedó marcada como enviada. Puedes avisarle al prospecto que estamos trabajando en su caso.</div></div><button class="modal-close" type="button" onclick="cyaCerrarAvisoRevisionCliente()">×</button></div>
      <div class="modal-body"><div class="cya-client-review-template">Plantilla: ${safe(CLIENT_REVIEW_TEMPLATE.nombre)}</div><textarea class="form-textarea cya-client-review-text" id="cya-client-review-text" spellcheck="true"></textarea><div class="form-helper">El mensaje usa únicamente el primer nombre. Puedes editarlo antes de copiarlo o enviarlo por WhatsApp.</div></div>
      <div class="modal-footer"><button class="btn" type="button" onclick="cyaIrPlantillaRevisionCliente()">Plantillas</button><button class="btn" type="button" onclick="cyaCopiarAvisoRevisionPopup()">📋 Copiar mensaje</button><button class="btn" type="button" onclick="cyaAbrirWhatsAppAvisoRevision()" style="background:#25d366;border-color:#25d366;color:#fff;">💬 Abrir WhatsApp</button><button class="btn btn-primary" type="button" onclick="cyaCerrarAvisoRevisionCliente()">Listo</button></div>
    </div>`;
    document.body.appendChild(modal);
  }

  function openClientReviewModal(lead){
    ensureClientReviewModal();
    clientMessageLeadId=lead?.id||null;
    const payload=clientReviewMessage(lead);
    const area=document.getElementById('cya-client-review-text');if(area)area.value=payload.message;
    document.getElementById('cya-client-review-message-modal')?.classList.add('open');
  }

  window.cyaCopiarAvisoRevisionPopup=async function(){
    const text=document.getElementById('cya-client-review-text')?.value||'';
    const ok=await copyText(text);showToast?.(ok?'Mensaje copiado':'No fue posible copiar el mensaje',ok?'success':'warn');
  };

  window.cyaAbrirWhatsAppAvisoRevision=function(){
    const lead=leadById(clientMessageLeadId);
    if(!lead)return;
    const payload=clientReviewMessage(lead);
    payload.message=document.getElementById('cya-client-review-text')?.value||payload.message;
    const tab=openClientWhatsApp(payload);
    if(tab)showToast?.('WhatsApp abierto con el mensaje de revisión','success');
  };

  window.cyaCerrarAvisoRevisionCliente=function(){
    document.getElementById('cya-client-review-message-modal')?.classList.remove('open');
    clientMessageLeadId=null;
    closeModal?.('modal-lead');
    renderPage?.('leads');
  };

  window.cyaIrPlantillaRevisionCliente=function(){
    const templateId=CLIENT_REVIEW_TEMPLATE.id;
    document.getElementById('cya-client-review-message-modal')?.classList.remove('open');
    clientMessageLeadId=null;
    closeModal?.('modal-lead');
    try{navigate('plantillas',document.querySelector('[data-page="plantillas"]'));setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(templateId);},80);}catch(_){ }
  };

  window.cyaMarcarRevisionEnviada=async function(){
    const lead=currentLead();
    if(!lead){showToast?.('Primero guarda el prospecto antes de marcar la revisión','warn');return;}
    const payload=reviewMessage();
    if(!payload.ok){showToast?.('La CURP debe tener 18 caracteres antes de marcar la revisión','warn');return;}
    const now=new Date().toISOString();
    lead.curp=payload.curp;
    lead.revisionSolicitada=true;
    lead.fechaRevisionSolicitada=now;
    lead.estado='semanas';
    lead.historialRevision=[...(Array.isArray(lead.historialRevision)?lead.historialRevision:[]),{fecha:now,tipo:'revision_semanas_nss',accion:'solicitada'}];
    try{
      await cloudSyncNow?.({throwOnError:true});
      showToast?.('Revisión marcada como enviada. El prospecto pasó a En revisión de semanas / NSS.','success');
      openClientReviewModal(lead);
    }catch(error){
      lead.revisionSolicitada=false;
      lead.fechaRevisionSolicitada=null;
      showToast?.('No se pudo guardar el cambio. El prospecto permanece como pendiente de revisión.','warn');
    }
  };

  function ensureReviewButtons(){
    const actions=document.getElementById('lead-curp-actions');
    if(!actions||document.getElementById('cya-copy-review-request'))return;
    const copy=document.createElement('button');
    copy.id='cya-copy-review-request';copy.type='button';copy.className='btn';copy.textContent='⧉ Copiar solicitud';copy.onclick=window.cyaCopiarSolicitudRevision;
    const wa=document.createElement('button');
    wa.id='cya-open-whatsapp-review';wa.type='button';wa.className='btn';wa.textContent='◉ Abrir WhatsApp';wa.onclick=window.cyaAbrirWhatsAppRevision;
    actions.append(copy,wa);

    const mark=document.createElement('button');
    mark.id='cya-mark-review-sent';mark.type='button';mark.className='btn cya-review-sent';mark.textContent='✓ Marcar revisión como enviada';mark.onclick=window.cyaMarcarRevisionEnviada;
    actions.insertAdjacentElement('afterend',mark);
  }

  function ensureClientMessageButtons(){
    const tel=document.getElementById('lead-tel');
    if(!tel)return;
    let actions=document.getElementById('cya-client-message-actions');
    if(!actions){
      actions=document.createElement('div');actions.id='cya-client-message-actions';actions.className='cya-client-message-actions';
      actions.innerHTML='<button class="btn" type="button" onclick="cyaCopiarAvisoRevisionCliente()">📋 Copiar mensaje</button><button class="btn cya-whatsapp-client" type="button" onclick="cyaAbrirWhatsAppCliente()">💬 WhatsApp cliente</button>';
      tel.insertAdjacentElement('afterend',actions);
    }
    const lead=currentLead();
    actions.style.display=lead&&isMetaLead(lead)?'flex':'none';
  }

  function ensureMetaNameHelper(){
    const input=document.getElementById('lead-nombre');if(!input)return;
    let helper=document.getElementById('cya-meta-name-helper');
    if(!helper){helper=document.createElement('div');helper.id='cya-meta-name-helper';helper.className='cya-meta-name-helper';helper.textContent='⚠ Verificar nombre mediante RENAPO.';input.insertAdjacentElement('afterend',helper);}
    const lead=currentLead();helper.style.display=lead&&isMetaLead(lead)?'block':'none';
  }

  function extraFieldsHtml(){
    return `<div id="cya-lead-extra-fields" class="cya-lead-extra-fields">
      <div class="cya-extra-title">Datos disponibles desde prospecto</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Correo electrónico</label><input class="form-input" id="lead-email" type="email" placeholder="correo@ejemplo.com"></div>
        <div class="form-group"><label class="form-label">Ciudad / municipio</label><input class="form-input" id="lead-ciudad" placeholder="Ciudad de atención"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Fuente de contacto</label><select class="form-select" id="lead-fuente"><option value="">— Seleccionar —</option><option>Meta Ads</option><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>Recomendación</option><option>Círculo cálido</option><option>De colaborador</option><option>Otro</option></select></div>
        <div class="form-group"><label class="form-label">NSS (si ya se conoce)</label><input class="form-input" id="lead-nss" inputmode="numeric" maxlength="11" placeholder="11 dígitos"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">AFORE (si ya se conoce)</label><input class="form-input" id="lead-afore" placeholder="AFORE"></div>
        <div class="form-group"><label class="form-label">Domicilio (opcional)</label><input class="form-input" id="lead-domicilio" placeholder="Calle, número, colonia, municipio, CP"></div>
      </div>
      <div id="cya-meta-origin-box" class="cya-meta-origin-box" hidden></div>
    </div>`;
  }

  function ensureExtraFields(){
    if(document.getElementById('cya-lead-extra-fields'))return;
    const notes=document.getElementById('lead-notas');
    const group=notes?.closest('.form-group');
    if(!group)return;
    group.insertAdjacentHTML('beforebegin',extraFieldsHtml());
  }



  function prospectStages(){
    const service=document.getElementById('lead-servicio')?.value||'retiro_desempleo';
    if(service==='asesoria_pension')return [['pensiones','Pensiones']];
    if(service==='correccion_imss')return [['correccion_imss','Corrección ante IMSS']];
    return [['semanas','Semanas / NSS'],['sindos','SINDOs'],['aprobado','Aprobado']];
  }
  let cyaStageClickTimer=null;
  let cyaStageSaving=false;
  async function setProspectStage(value){
    const select=document.getElementById('lead-estado');
    if(!select||select.disabled||cyaStageSaving||![...select.options].some(o=>o.value===value))return;
    const oldValue=select.value;
    if(oldValue===value)return;
    const lead=currentLead();
    if(!lead){showToast?.('No se encontró el prospecto abierto; vuelve a abrir su expediente','warn');return;}
    const oldStage=lead.estado;
    cyaStageSaving=true;
    select.value=value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    renderProspectStageStepper();
    try{
      lead.estado=value;
      if(typeof saveStore==='function')saveStore();
      if(typeof cloudSyncNow==='function')await cloudSyncNow({throwOnError:true});
      showToast?.('Etapa guardada: '+(CYA_STAGES[value]||value),'success');
    }catch(err){
      lead.estado=oldStage;
      select.value=oldValue;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      renderProspectStageStepper();
      try{if(typeof saveStore==='function')saveStore();}catch(_){}
      showToast?.('No se pudo guardar el cambio de etapa; se restauró la anterior','warn');
    }finally{cyaStageSaving=false;}
  }
  function ensureProspectStageStepper(){
    const body=document.querySelector('#modal-lead .modal-body');
    if(!body)return null;
    let stepper=document.getElementById('cya-prospect-stage-stepper');
    if(!stepper){
      stepper=document.createElement('section');
      stepper.id='cya-prospect-stage-stepper';
      stepper.className='cya-prospect-stage-stepper';
      body.insertBefore(stepper,body.firstChild);
      stepper.addEventListener('click',e=>{
        const btn=e.target.closest('[data-cya-stage-select]');
        if(!btn)return;
        if(cyaStageClickTimer)clearTimeout(cyaStageClickTimer);
        const target=btn.dataset.cyaStageSelect;
        cyaStageClickTimer=setTimeout(()=>{cyaStageClickTimer=null;void setProspectStage(target);},280);
      });
      stepper.addEventListener('dblclick',e=>{
        const btn=e.target.closest('[data-cya-stage-select]');
        if(!btn)return;
        e.preventDefault();
        if(cyaStageClickTimer){clearTimeout(cyaStageClickTimer);cyaStageClickTimer=null;}
        const stages=prospectStages();
        const select=document.getElementById('lead-estado');
        const current=stages.findIndex(([key])=>key===select?.value);
        if(current<=0){showToast?.('Ya estás en la primera etapa','info');return;}
        const previous=stages[current-1];
        if(window.confirm('¿Deseas regresar a la etapa anterior: '+previous[1]+'?'))void setProspectStage(previous[0]);
      });
      document.getElementById('lead-estado')?.addEventListener('change',renderProspectStageStepper);
      document.getElementById('lead-servicio')?.addEventListener('change',()=>setTimeout(renderProspectStageStepper,0));
    }
    return stepper;
  }
  function renderProspectStageStepper(){
    const stepper=ensureProspectStageStepper();
    if(!stepper)return;
    const select=document.getElementById('lead-estado');
    const active=select?.value||'semanas';
    const stages=prospectStages();
    const current=stages.findIndex(([key])=>key===active);
    stepper.innerHTML='<div class="cya-prospect-stage-caption">ETAPAS DEL TRÁMITE</div><div class="cya-prospect-stage-steps">'+stages.map(([key,label],i)=>{
      const done=current>=0&&i<current;
      const selected=key===active;
      return '<button type="button" class="cya-prospect-stage-step'+(selected?' active':'')+(done?' done':'')+'" data-cya-stage-select="'+key+'" aria-current="'+(selected?'step':'false')+'" title="Clic para cambiar de etapa; doble clic para confirmar regreso a la anterior"><span class="cya-prospect-stage-dot">'+(done?'✓':i+1)+'</span><span class="cya-prospect-stage-label">'+safe(label)+'</span></button>';
    }).join('')+'</div><div class="cya-prospect-stage-note">Seleccionada: <strong>'+safe(Object.fromEntries(stages)[active]||CYA_STAGES[active]||'Sin definir')+'</strong> · Cambio guardado al seleccionar</div>';
  }

  function ensureQuestionnaireTab(){
    const modal=document.getElementById('modal-lead');
    const body=modal?.querySelector('.modal-body');
    if(!body)return;
    let tabs=document.getElementById('cya-meta-lead-tabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.id='cya-meta-lead-tabs';
      tabs.className='cya-meta-lead-tabs';
      tabs.innerHTML='<button type="button" class="cya-meta-tab active" data-cya-panel="datos">Datos del prospecto</button><button type="button" class="cya-meta-tab" data-cya-panel="cuestionario">📋 Cuestionario Meta Ads</button>';
      const panel=document.createElement('section');
      panel.id='cya-meta-questionnaire-panel';
      panel.className='cya-meta-questionnaire-panel';
      panel.hidden=true;
      body.insertBefore(tabs,body.firstChild);
      body.insertBefore(panel,tabs.nextSibling);
      tabs.addEventListener('click',event=>{
        const button=event.target.closest('[data-cya-panel]');
        if(!button)return;
        setQuestionnaireTab(button.dataset.cyaPanel);
      });
    }
    return tabs;
  }
  function setQuestionnaireTab(selected){
    const tabs=document.getElementById('cya-meta-lead-tabs');
    const body=document.querySelector('#modal-lead .modal-body');
    const panel=document.getElementById('cya-meta-questionnaire-panel');
    if(!tabs||!body||!panel)return;
    const showQuestions=selected==='cuestionario';
    for(const button of tabs.querySelectorAll('[data-cya-panel]')){
      const active=button.dataset.cyaPanel===selected;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
    }
    for(const child of body.children){
      if(child===tabs)continue;
      if(child===panel){child.hidden=!showQuestions;continue;}
      child.hidden=showQuestions;
    }
  }
  function fillQuestionnaireTab(l){
    const tabs=ensureQuestionnaireTab();
    const panel=document.getElementById('cya-meta-questionnaire-panel');
    if(!tabs||!panel)return;
    const visible=Boolean(l&&isMetaLead(l));
    tabs.hidden=!visible;
    if(!visible){setQuestionnaireTab('datos');return;}
    const q=metaQualification(l);
    const heading=q.tone==='green'?'🟢':q.tone==='red'?'🔴':'🟠';
    const signature=String(l.id)+':'+JSON.stringify(l.metaLead?.answers||{});
    if(panel.dataset.cyaLeadSignature===signature)return;
    panel.dataset.cyaLeadSignature=signature;
    panel.innerHTML='<div class="cya-meta-questionnaire-head"><strong>'+heading+' '+safe(q.label)+'</strong><p>Precalificación orientativa basada únicamente en las respuestas del formulario. No sustituye la validación ante IMSS/AFORE.</p></div><div class="cya-meta-questionnaire-list">'+metaQuestionsHtml(l)+'</div>';
    setQuestionnaireTab('datos');
  }

  function fillExtraFields(){
    ensureExtraFields();ensureReviewButtons();ensureClientMessageButtons();ensureMetaNameHelper();
    const l=currentLead();
    fillQuestionnaireTab(l);
    renderProspectStageStepper();
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??'';};
    set('lead-email',l?.email||l?.correo||'');
    set('lead-ciudad',l?.ciudad||l?.municipio||'');
    set('lead-fuente',l?.fuenteContacto||l?.origen?.fuente||'');
    set('lead-nss',l?.nss||'');
    set('lead-afore',l?.afore||'');
    set('lead-domicilio',l?.domicilio||'');
    if(l&&isMetaLead(l)){
      const nameInput=document.getElementById('lead-nombre');
      const preferred=preferredMetaName(l);
      if(nameInput&&preferred&&(!String(nameInput.value||'').trim()||/^nombre pendiente de validar$/i.test(String(nameInput.value||'').trim())))nameInput.value=preferred;
    }
    const metaBox=document.getElementById('cya-meta-origin-box');
    if(metaBox){
      const meta=l?.metaLead||l?.origenMeta||null;
      if(meta){
        metaBox.hidden=false;
        metaBox.innerHTML=`<strong>Origen Meta Ads</strong><span>${safe(meta.campaignName||'Campaña no registrada')}</span><strong>${safe(metaQualification(l).label)}</strong><div class="cya-meta-answers"><b>Respuestas del formulario</b>${metaQuestionsHtml(l)}</div>`;
      }else metaBox.hidden=true;
    }
    const clientActions=document.getElementById('cya-client-message-actions');if(clientActions)clientActions.style.display=l&&isMetaLead(l)?'flex':'none';
    const nameHelper=document.getElementById('cya-meta-name-helper');if(nameHelper)nameHelper.style.display=l&&isMetaLead(l)?'block':'none';
    const mark=document.getElementById('cya-mark-review-sent');
    if(mark){
      mark.style.display=l?'inline-flex':'none';
      if(l?.revisionSolicitada){mark.disabled=true;mark.textContent='✓ Revisión ya solicitada';}
      else{mark.disabled=false;mark.textContent='✓ Marcar revisión como enviada';}
    }
  }

  function captureExtraFields(){
    const get=id=>String(document.getElementById(id)?.value||'').trim();
    return {email:get('lead-email'),ciudad:get('lead-ciudad'),fuenteContacto:get('lead-fuente'),nss:get('lead-nss').replace(/\D/g,'').slice(0,11),afore:get('lead-afore'),domicilio:get('lead-domicilio')};
  }

  const baseOpenModalLead=window.openModalLead;
  if(typeof baseOpenModalLead==='function')window.openModalLead=function(){
    const result=baseOpenModalLead.apply(this,arguments);
    setTimeout(fillExtraFields,0);
    return result;
  };

  const baseGuardarLead=window.guardarLead;
  if(typeof baseGuardarLead==='function')window.guardarLead=async function(){
    const extras=captureExtraFields();
    await baseGuardarLead.apply(this,arguments);
    const lead=currentLead();
    if(!lead)return;
    Object.assign(lead,extras);
    if(extras.fuenteContacto===META_SOURCE){lead.metaAds=true;lead.nombreVerificado=lead.nombreVerificado===true;lead.nombrePendienteValidacion=lead.nombreVerificado!==true;}
    try{await cloudSyncNow?.({throwOnError:true});}catch(_){showToast?.('Los datos adicionales quedaron pendientes de sincronizar','warn');}
  };

  function isMetaNewLead(l){
    const source=String(l?.fuenteContacto||l?.origen?.fuente||'').toLowerCase();
    return l?.estado!=='archivado'&&l?.estado!=='aprobado'&&!l?.revisionSolicitada&&(l?.metaAds===true||source==='meta ads'||Boolean(l?.metaLead)||Boolean(l?.origenMeta));
  }


  function metaQualification(l){
    const a=l?.metaLead?.answers||{},d=l?.elegibilidadDeclarada||l?.elegibilidad?.porServicio?.retiro_desempleo?.declarado||{};
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const imss=norm(a.imss_status_declared||d.respuestasOriginales?.cotiza);
    const retiro=norm(a.previous_withdrawal_declared||d.respuestasOriginales?.retiro);
    const semanas=norm(a.weeks_declared||d.respuestasOriginales?.semanas);
    const active=d.sinCotizar==='cotiza_activo'||(/opcion_b|actualmente_cotiz|imss_activo|dado_de_alta|trabajando/.test(imss)&&!/no_estoy|sin_cotizar|no_cotizo/.test(imss));
    const recent=d.retiro==='menos_5_anos'||/opcion_c|menos_de_5_anos/.test(retiro);
    const short=d.semanas==='menos_105'||/opcion_b|menos_de_2_anos|menos_de_105/.test(semanas);
    const favorable=!active&&!recent&&!short&&(d.precalificacion==='favorable'||(/opcion_a|45_dias|sin_cotizar/.test(imss)&&/opcion_a|al_menos_2_anos/.test(semanas)&&/opcion_a|opcion_b|nunca|mas_de_5_anos/.test(retiro)));
    return {tone:active||recent||short?'red':favorable?'green':'orange',active,recent,label:active?'IMSS activo · Declarado':recent?'Retiro menor a 5 años · Declarado':short?'Cotización insuficiente · Declarada':favorable?'Buen candidato · Por verificar':'Información por verificar'};
  }
  function metaQuestionsHtml(l){
    const a=l?.metaLead?.answers||{},raw=a.raw||{};
    const excluded=/^(id|lead_id|leadgen_id|created_time|campaign_name|adset_name|ad_name|form_name|platform|full_name|email|phone|phone_number|lead_status|resumen_para_compartir|notas_manuales|accion_crm|estado_crm|fecha_crm)$/i;
    const entries=Object.entries(raw).filter(([k,v])=>!excluded.test(k)&&v!==null&&String(v).trim());
    const items=entries.length?entries:[['Situación IMSS',a.imss_status_declared],['Tiempo cotizado',a.weeks_declared],['Retiro anterior',a.previous_withdrawal_declared]].filter(([,v])=>v);
    return items.length?items.map(([k,v])=>'<div class="cya-meta-answer"><strong>'+safe(String(k).replace(/_/g,' '))+'</strong><span>'+safe(v)+'</span></div>').join(''):'<p>Este registro no incluye respuestas del cuestionario.</p>';
  }
  window.cyaMetaWhatsApp=function(id){
    const l=leadById(id);if(!l)return;
    const q=metaQualification(l);if(!q.active&&!q.recent)return;
    const phone=normalizePhone(l.telefono||l.phone);
    if(phone.length!==10){showToast?.('Verifica el teléfono del prospecto','warn');return;}
    const intro='Hola, gracias por responder nuestro formulario de Retiro por Desempleo de AFORE.';
    const detail=q.active?'Según tus respuestas, actualmente sigues cotizando ante el IMSS. Por ahora no podemos iniciar el trámite; conservaremos tu solicitud para retomarla si cambia tu situación laboral.':'Según tus respuestas, realizaste un retiro por desempleo hace menos de cinco años. En general, debe transcurrir un plazo de cinco años entre retiros. Conservaremos tu solicitud para darle seguimiento.';
    const message=intro+'\\n\\n'+detail+'\\n\\nEsta es una orientación inicial basada en tus respuestas, no una verificación oficial. Si algún dato es incorrecto, podemos revisarlo contigo.\\n\\nCasillas & Asociados.';
    window.open('https://wa.me/52'+phone+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
  };
  function metaLeadCardHtml(l){
    const fechaBase=l?.fechaInicio||l?.fechaCaptura||l?.fechaRegistro||new Date().toISOString();
    const dias=Math.max(0,Math.floor((Date.now()-new Date(fechaBase).getTime())/(1000*60*60*24))||0);
    const nombre=preferredMetaName(l)||META_PENDING_NAME;
    const curp=l?.curp||'CURP pendiente';
    const primeraNota=(l?.notas||'').split(/\r?\n/)[0]||'Pendiente de revisión';
    const service=typeof getSvcLabel==='function'?getSvcLabel(l?.servicio):'Retiro por desempleo';
    const qualification=metaQualification(l);
    return `<div class="lead-card cya-meta-lead-card cya-meta-tone-${qualification.tone}" data-lead-id="${safe(l?.id)}" role="button" tabindex="0" onclick="openModalLead('${safe(l?.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModalLead('${safe(l?.id)}');}">
      <div class="cya-meta-tag">META ADS · ${safe(qualification.label)}</div>
      <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;"><div class="lead-card-nombre">${safe(nombre)}</div><span class="lead-card-dias ${dias>1?'lead-dias-normal':'lead-dias-ok'}" style="margin:0;flex-shrink:0;">${dias}d</span></div>
      <div style="font-size:10px;color:var(--text-secondary);margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(curp)}</div>
      <div class="cya-meta-raw-name">⚠ Verificar nombre en RENAPO</div>
      <div class="lead-card-nota" title="${safe(primeraNota)}">${safe(primeraNota)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${safe(service)}</div>
      ${qualification.active||qualification.recent?`<button type="button" class="btn cya-meta-wa" onclick="event.stopPropagation();cyaMetaWhatsApp(\'${safe(l?.id)}\')">💬 WhatsApp sugerido</button>`:""}
    </div>`;
  }

  function columnLabel(col){
    const text=col?.querySelector('.lead-col-header span')?.textContent||'';
    return text.replace(/[↓↑▾▸]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function installCompactStage(col,key){
    if(!col)return;
    col.classList.add('cya-compact-stage');
    col.dataset.cyaStage=key;
    const header=col.querySelector('.lead-col-header');
    if(!header||header.dataset.cyaCompactBound==='1')return;
    header.dataset.cyaCompactBound='1';
    header.setAttribute('role','button');header.setAttribute('tabindex','0');header.setAttribute('aria-expanded','false');
    const toggle=()=>{
      const expanded=col.classList.toggle('is-expanded');
      header.setAttribute('aria-expanded',expanded?'true':'false');
    };
    header.addEventListener('click',event=>{if(event.target.closest('button'))return;toggle();});
    header.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});
  }

  function applyProspectLayout(kanban,metaCol){
    if(!kanban)return;
    const directCols=[...kanban.children].filter(el=>el.classList?.contains('lead-col')&&el.id!=='cya-meta-new-column');
    const pensiones=directCols.find(col=>columnLabel(col).startsWith('pensiones'))||kanban.querySelector('.cya-special-leads-stack [data-cya-stage="pensiones"]');
    const correccion=directCols.find(col=>columnLabel(col).startsWith('corrección ante imss'))||kanban.querySelector('.cya-special-leads-stack [data-cya-stage="correccion"]');
    const semanas=directCols.find(col=>columnLabel(col).startsWith('en revisión de semanas'))||[...kanban.querySelectorAll(':scope > .lead-col')].find(col=>columnLabel(col).startsWith('en revisión de semanas'));

    let stack=kanban.querySelector(':scope > .cya-special-leads-stack');
    if(!stack){stack=document.createElement('div');stack.className='cya-special-leads-stack';}
    if(pensiones){installCompactStage(pensiones,'pensiones');if(pensiones.parentElement!==stack)stack.appendChild(pensiones);}
    if(correccion){installCompactStage(correccion,'correccion');if(correccion.parentElement!==stack)stack.appendChild(correccion);}

    if(stack.children.length){
      if(stack.parentElement!==kanban){
        if(semanas&&semanas.parentElement===kanban)kanban.insertBefore(stack,semanas);else kanban.prepend(stack);
      }
      if(metaCol&&metaCol.parentElement===kanban){
        const target=semanas&&semanas.parentElement===kanban?semanas:null;
        if(target&&metaCol.nextElementSibling!==target)kanban.insertBefore(metaCol,target);
        if(metaCol.previousElementSibling!==stack)kanban.insertBefore(stack,metaCol);
      }
    }
  }


  const CYA_STAGES={pensiones:'Pensiones',correccion_imss:'Corrección ante IMSS',semanas:'En revisión de semanas / NSS',sindos:'En revisión de SINDOs',aprobado:'Aprobado'};
  let cyaMoving=false;
  async function moveProspectStage(id,stage){
    if(cyaMoving||!Object.hasOwn(CYA_STAGES,stage))return;
    const lead=leadById(id);
    if(!lead||lead.estado==='archivado'||lead.estado===stage)return;
    cyaMoving=true;
    const previous=lead.estado;
    lead.estado=stage;
    try{
      await cloudSyncNow({throwOnError:true});
      showToast?.('Etapa actualizada: '+CYA_STAGES[stage],'success');
      renderPage('leads');
      if(stage==='aprobado'&&previous!=='aprobado'&&typeof window.cyaAbrirCentroMensajesWhatsApp==='function')window.cyaAbrirCentroMensajesWhatsApp('aprobado');
    }catch(e){
      lead.estado=previous;
      showToast?.('No se pudo sincronizar el movimiento; se conservó la etapa anterior','warn');
      renderPage('leads');
    }finally{cyaMoving=false;}
  }
  window.cyaMoverProspectoEtapa=function(id){
    const lead=leadById(id);if(!lead)return;
    let modal=document.getElementById('cya-move-lead-modal');
    if(!modal){
      modal=document.createElement('div');modal.id='cya-move-lead-modal';modal.className='modal-overlay';
      modal.innerHTML='<div class="modal" style="max-width:440px"><div class="modal-header"><div class="modal-title">Mover prospecto</div><button type="button" class="btn btn-icon" id="cya-move-close">✕</button></div><div class="modal-body"><p id="cya-move-lead-name" style="font-weight:600;margin-bottom:12px"></p><label class="form-label" for="cya-move-stage">Nueva etapa</label><select class="form-select" id="cya-move-stage"></select><p style="font-size:11px;color:var(--text-muted);margin-top:10px">La precalificación y las respuestas del cuestionario se conservarán.</p></div><div class="modal-footer"><button type="button" class="btn" id="cya-move-cancel">Cancelar</button><button type="button" class="btn btn-primary" id="cya-move-confirm">Mover</button></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('#cya-move-close').onclick=modal.querySelector('#cya-move-cancel').onclick=()=>modal.classList.remove('open');
      modal.querySelector('#cya-move-confirm').onclick=async()=>{
        const target=modal.querySelector('#cya-move-stage').value;
        modal.classList.remove('open');await moveProspectStage(modal.dataset.leadId,target);
      };
    }
    modal.dataset.leadId=String(id);
    modal.querySelector('#cya-move-lead-name').textContent=lead.nombre||'Prospecto';
    modal.querySelector('#cya-move-stage').innerHTML=Object.entries(CYA_STAGES).map(([key,label])=>'<option value="'+key+'"'+(key===lead.estado?' selected':'')+'>'+label+'</option>').join('');
    modal.classList.add('open');
  };
  function enhanceProspectKanban(kanban){
    const cols=[...kanban.querySelectorAll('.lead-col')];
    for(const col of cols){
      const label=columnLabel(col);
      const stage=col.id==='cya-meta-new-column'?'meta':Object.keys(CYA_STAGES).find(key=>label.startsWith(CYA_STAGES[key].toLowerCase().split(' / ')[0].toLowerCase()));
      if(!stage)continue;
      col.dataset.cyaDropStage=stage;
      const body=col.querySelector('.lead-col-body');
      if(!body)continue;
      if(body.dataset.cyaDropBound!=='1'){
        body.dataset.cyaDropBound='1';
        body.addEventListener('dragover',e=>{if(stage==='meta')return;e.preventDefault();e.dataTransfer.dropEffect='move';col.classList.add('cya-drop-target');});
        body.addEventListener('dragleave',e=>{if(!body.contains(e.relatedTarget))col.classList.remove('cya-drop-target');});
        body.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('cya-drop-target');const id=e.dataTransfer.getData('text/x-cya-lead');if(id&&stage!=='meta')moveProspectStage(id,stage);});
      }
    }
    for(const card of kanban.querySelectorAll('.lead-card[data-lead-id]')){
      const id=card.dataset.leadId;
      if(!id||card.dataset.cyaDragBound==='1')continue;
      card.dataset.cyaDragBound='1';
      card.draggable=true;
      card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/x-cya-lead',id);e.dataTransfer.effectAllowed='move';card.classList.add('cya-dragging');});
      card.addEventListener('dragend',()=>{card.classList.remove('cya-dragging');kanban.querySelectorAll('.cya-drop-target').forEach(el=>el.classList.remove('cya-drop-target'));});
    }
  }


  const cyaSortMode=Object.create(null);
  const cyaPriority={green:0,orange:1,red:2};
  const cyaLeadDate=l=>Date.parse(l?.fechaCaptura||l?.fechaInicio||l?.fechaRegistro||'')||0;
  function sortCyaLeads(items,mode){
    return [...items].sort((a,b)=>{
      if(mode==='priority'){
        const p=cyaPriority[metaQualification(a).tone]-cyaPriority[metaQualification(b).tone];
        if(p)return p;
      }
      return cyaLeadDate(b)-cyaLeadDate(a)||String(a.nombre||'').localeCompare(String(b.nombre||''),'es');
    });
  }
  function installColumnSorting(kanban){
    for(const col of kanban.querySelectorAll('.lead-col')){
      const body=col.querySelector('.lead-col-body'),header=col.querySelector('.lead-col-header');
      if(!body||!header)continue;
      const stage=col.id==='cya-meta-new-column'?'meta':col.dataset.cyaDropStage||columnLabel(col);
      if(!stage)continue;
      let actions=header.querySelector('.cya-column-sort-actions');
      if(!actions){
        actions=document.createElement('span');
        actions.className='cya-column-sort-actions';
        actions.innerHTML='<button type="button" class="cya-sort-action" data-sort="date" title="Ordenar por fecha (más recientes primero)" aria-label="Ordenar por fecha">📅</button><button type="button" class="cya-sort-action" data-sort="priority" title="Ordenar por prioridad: verde, naranja, rojo" aria-label="Ordenar por prioridad">☷</button>';
        actions.addEventListener('click',e=>{
          const button=e.target.closest('[data-sort]');
          if(!button)return;
          e.stopPropagation();
          cyaSortMode[stage]=button.dataset.sort;
          applyColumnSort(col,stage);
        });
        header.appendChild(actions);
      }
      applyColumnSort(col,stage);
    }
  }
  function applyColumnSort(col,stage){
    const body=col.querySelector('.lead-col-body');
    if(!body)return;
    const mode=cyaSortMode[stage]||'date';
    for(const button of col.querySelectorAll('.cya-sort-action'))button.classList.toggle('active',button.dataset.sort===mode);
    const cards=[...body.querySelectorAll(':scope > .lead-card[data-lead-id]')];
    if(cards.length<2)return;
    const leads=cards.map(card=>({card,lead:leadById(card.dataset.leadId)})).filter(item=>item.lead);
    const ordered=leads.sort((a,b)=>{
      if(mode==='priority'){
        const diff=cyaPriority[metaQualification(a.lead).tone]-cyaPriority[metaQualification(b.lead).tone];
        if(diff)return diff;
      }
      return cyaLeadDate(b.lead)-cyaLeadDate(a.lead)||String(a.lead.nombre||'').localeCompare(String(b.lead.nombre||''),'es');
    });
    if(ordered.every((item,index)=>item.card===cards[index]))return;
    const fragment=document.createDocumentFragment();
    for(const item of ordered)fragment.appendChild(item.card);
    body.appendChild(fragment);
  }
  function installGroupedCurps(){
    window.abrirCurpsPendientes=function(){
      const visible=typeof leadsVistaActual==='function'?leadsVistaActual():(store?.leads||[]);
      const groups=[
        {id:'meta',title:'Nuevos Meta Ads',leads:visible.filter(isMetaNewLead)},
        {id:'semanas',title:'En revisión de semanas / NSS',leads:visible.filter(l=>l?.estado==='semanas'&&!isMetaNewLead(l))}
      ];
      let modal=document.getElementById('cya-curps-priority-modal');
      if(!modal){
        modal=document.createElement('div');modal.className='modal-overlay';modal.id='cya-curps-priority-modal';
        modal.innerHTML='<div class="modal" style="max-width:680px" role="dialog" aria-modal="true"><div class="modal-header"><div class="modal-title">CURPs pendientes por columna y prioridad</div><button type="button" class="btn btn-icon" data-cya-curp-close>✕</button></div><div class="modal-body"><p style="font-size:11px;color:var(--text-muted)">Grupos separados por columna. Dentro de cada grupo: verde, naranja y rojo. Los registros sin precalificación aparecen en «Por verificar».</p><div class="cya-curp-tabs" role="tablist" aria-label="Columna de prospectos"><button type="button" class="cya-curp-tab active" role="tab" aria-selected="true" data-cya-curp-tab="meta">Meta Ads</button><button type="button" class="cya-curp-tab" role="tab" aria-selected="false" data-cya-curp-tab="semanas">En revisión</button></div><div id="cya-curp-groups"></div></div><div class="modal-footer"><button type="button" class="btn" data-cya-curp-close>Cerrar</button></div></div>';
        modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-cya-curp-close]'))modal.classList.remove('open');});
        modal.addEventListener('click',e=>{
          const tab=e.target.closest('[data-cya-curp-tab]');
          if(!tab)return;
          const selected=tab.dataset.cyaCurpTab;
          for(const button of modal.querySelectorAll('[data-cya-curp-tab]')){
            const active=button.dataset.cyaCurpTab===selected;
            button.classList.toggle('active',active);
            button.setAttribute('aria-selected',String(active));
          }
          for(const section of modal.querySelectorAll('[data-cya-curp-panel]'))section.hidden=section.dataset.cyaCurpPanel!==selected;
        });
        modal.addEventListener('click',async e=>{
          const button=e.target.closest('[data-cya-curp-copy]');if(!button)return;
          const textarea=button.closest('.cya-curp-priority-group')?.querySelector('textarea');
          const value=textarea?.value||'';
          if(!value)return;
          try{await navigator.clipboard.writeText(value);showToast?.('CURPs copiadas','success');}
          catch(_){textarea.focus();textarea.select();showToast?.('Selecciona y copia las CURPs','info');}
        });
        document.body.appendChild(modal);
      }
      let total=0;
      const html=groups.map(group=>{
        const blocks=[['green','🟢 Favorable'],['orange','🟠 Por verificar'],['red','🔴 No favorable']];
        const sections=blocks.map(([tone,label])=>{
          const members=sortCyaLeads(group.leads.filter(l=>metaQualification(l).tone===tone),'date');
          let missing=0;const seen=new Set();const curps=[];
          for(const lead of members){
            const curp=String(lead.curp||'').replace(/[^A-ZÑ0-9]/gi,'').toUpperCase();
            if(curp.length!==18){missing++;continue;}
            if(!seen.has(curp)){seen.add(curp);curps.push(curp);}
          }
          total+=curps.length;
          return '<div class="cya-curp-priority-group"><div class="cya-curp-priority-heading"><strong>'+label+' ('+curps.length+')</strong><button type="button" class="btn" data-cya-curp-copy '+(!curps.length?'disabled':'')+'>📋 Copiar</button></div><textarea class="form-textarea" readonly rows="'+Math.min(7,Math.max(2,curps.length))+'">'+safe(curps.join('\\n'))+'</textarea>'+(missing?'<div class="cya-curp-missing">'+missing+' sin CURP completa</div>':'')+'</div>';
        }).join('');
        return '<section class="cya-curp-column" data-cya-curp-panel="'+group.id+'"'+(group.id==='meta'?'':' hidden')+'><h3>'+safe(group.title)+' ('+group.leads.length+')</h3>'+sections+'</section>';
      }).join('');
      modal.querySelector('#cya-curp-groups').innerHTML=html;
      for(const tab of modal.querySelectorAll('[data-cya-curp-tab]')){const active=tab.dataset.cyaCurpTab==='meta';tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));}
      modal.classList.add('open');
      if(!total)showToast?.('No hay CURPs completas en las columnas seleccionadas','info');
    };
  }

  function applyMetaNewColumn(){
    const kanban=document.querySelector('.leads-kanban');
    if(!kanban)return;
    const leads=(typeof leadsVistaActual==='function'?leadsVistaActual():(store?.leads||[])).filter(isMetaNewLead);

    let col=document.getElementById('cya-meta-new-column');
    if(!col){
      col=document.createElement('div');col.id='cya-meta-new-column';col.className='lead-col cya-meta-new-column';
      col.innerHTML='<div class="lead-col-header"><span>Nuevos Meta Ads</span><span class="cya-meta-count">0</span></div><div class="lead-col-body"></div>';
      kanban.prepend(col);
    }
    const headerCount=col.querySelector('.cya-meta-count');if(headerCount)headerCount.textContent=String(leads.length);
    const body=col.querySelector('.lead-col-body');
    const signature=leads.map(l=>`${l.id}:${l.nombre||''}:${l.fechaInicio||l.fechaCaptura||''}:${l.revisionSolicitada?'1':'0'}:${metaQualification(l).tone}`).join('|');
    if(body&&body.dataset.cyaSignature!==signature){
      body.dataset.cyaSignature=signature;
      body.innerHTML=leads.length?leads.map(metaLeadCardHtml).join(''):'<div class="cya-meta-empty">Sin prospectos nuevos</div>';
    }

    for(const lead of leads){
      [...kanban.querySelectorAll(`.lead-card[data-lead-id="${CSS.escape(String(lead.id))}"]`)].forEach(card=>{
        if(!card.closest('#cya-meta-new-column'))card.remove();
      });
    }
    applyProspectLayout(kanban,col);
    for(const card of kanban.querySelectorAll('.lead-card[data-lead-id]')){
      const lead=leadById(card.dataset.leadId);
      if(!lead||!isMetaLead(lead)||lead.estado==='aprobado'||card.closest('#cya-meta-new-column'))continue;
      const q=metaQualification(lead);
      card.classList.add('cya-meta-lead-card','cya-meta-tone-'+q.tone);
      if(!card.querySelector('.cya-meta-tag'))card.insertAdjacentHTML('afterbegin','<div class="cya-meta-tag">META ADS · '+safe(q.label)+'</div>');
    }
    enhanceProspectKanban(kanban);
    installColumnSorting(kanban);
  }

  function migrateExistingMetaNames(){
    let changed=false;
    for(const lead of (store?.leads||[])){
      if(!isMetaLead(lead))continue;
      const raw=rawMetaName(lead);if(!raw)continue;
      const current=String(lead.nombre||'').trim();
      if(!current||/^nombre pendiente de validar$/i.test(current)){
        lead.nombre=raw;
        lead.nombreVerificado=false;
        lead.nombrePendienteValidacion=true;
        changed=true;
      }
    }
    if(changed){
      try{saveStore?.();}catch(_){ }
      setTimeout(()=>{try{Promise.resolve(cloudSyncNow?.({throwOnError:true})).catch(()=>{});}catch(_){ }},350);
    }
  }

  function installStyles(){
    if(document.getElementById('cya-meta-leads-styles'))return;
    const style=document.createElement('style');style.id='cya-meta-leads-styles';style.textContent=`
      .cya-review-sent{margin-top:8px;border-color:rgba(245,158,11,.45);color:var(--warning);display:inline-flex}
      .cya-client-message-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.cya-client-message-actions .btn{font-size:11px;padding:6px 9px}.cya-whatsapp-client{background:#25d366!important;border-color:#25d366!important;color:#fff!important}
      .cya-meta-name-helper{font-size:10px;color:var(--warning);margin-top:5px}
      .cya-client-review-modal{max-width:680px}.cya-client-review-sub{font-size:11px;color:var(--text-muted);margin-top:3px}.cya-client-review-template{font-size:10px;color:var(--text-muted);margin-bottom:7px}.cya-client-review-text{min-height:310px;line-height:1.45}
      .cya-lead-extra-fields{margin:12px 0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary)}
      .cya-extra-title{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:10px}
      .cya-meta-origin-box{display:flex;flex-direction:column;gap:3px;margin-top:8px;padding:9px 10px;border-left:3px solid #1877f2;background:rgba(24,119,242,.07);border-radius:4px}
      .cya-meta-origin-box strong{font-size:10px;color:#60a5fa}.cya-meta-origin-box span{font-size:10px;color:var(--text-muted)}
      .cya-meta-new-column{border:1px solid rgba(24,119,242,.35);flex:0 0 250px;min-width:250px}.cya-meta-new-column .lead-col-header{background:linear-gradient(90deg,#1559c7,#1877f2)}
      .cya-meta-lead-card.cya-meta-tone-green{background:rgba(22,163,74,.12)!important;border:1px solid #16a34a!important}.cya-meta-lead-card.cya-meta-tone-orange{background:rgba(245,158,11,.12)!important;border:1px solid #f59e0b!important}.cya-meta-lead-card.cya-meta-tone-red{background:rgba(220,38,38,.12)!important;border:1px solid #dc2626!important}.cya-meta-wa{font-size:10px!important;margin-top:8px}.cya-meta-answers{margin-top:10px;display:grid;gap:7px}.cya-meta-answer{display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--border);padding-bottom:6px}.cya-meta-answer strong{font-size:10px}.cya-meta-answer span{font-size:11px;overflow-wrap:anywhere}
      .cya-meta-lead-tabs{display:flex;gap:8px;position:sticky;top:0;z-index:5;background:var(--bg-secondary);padding:10px 0 12px;margin-bottom:14px;border-bottom:1px solid var(--border)}.cya-meta-tab{flex:1;min-width:0;padding:11px 8px;border:1px solid var(--border);border-radius:9px;background:var(--bg-card,var(--bg-secondary));color:var(--text-secondary);font-size:12px;font-weight:700;cursor:pointer}.cya-meta-tab.active{background:#1559c7;color:#fff;border-color:#1877f2}.cya-meta-questionnaire-panel{padding:4px 0 22px}.cya-meta-questionnaire-head{padding:14px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border);margin-bottom:12px}.cya-meta-questionnaire-head strong{font-size:14px}.cya-meta-questionnaire-head p{font-size:11px;color:var(--text-muted);margin:8px 0 0}.cya-meta-questionnaire-list{display:grid;gap:10px}.cya-meta-questionnaire-list .cya-meta-answer{padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--bg-secondary)}.cya-meta-questionnaire-list .cya-meta-answer strong{font-size:12px}.cya-meta-questionnaire-list .cya-meta-answer span{font-size:13px;color:var(--text-primary)}[hidden]#cya-meta-lead-tabs,[hidden]#cya-meta-questionnaire-panel{display:none!important}
      .cya-drop-target{outline:2px dashed #3b82f6;outline-offset:-3px}.cya-dragging{opacity:.55}.cya-lead-move-btn{display:block;margin-top:8px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--text-secondary);font-size:10px;cursor:pointer;touch-action:manipulation}.cya-lead-move-btn:hover{color:#60a5fa;border-color:#60a5fa}
      .cya-prospect-stage-stepper{margin-bottom:16px;padding:12px 4px 14px;border-bottom:1px solid var(--border)}.cya-prospect-stage-caption{font-size:10px;letter-spacing:1px;color:var(--text-muted);font-weight:700;margin-bottom:14px}.cya-prospect-stage-steps{display:flex;justify-content:space-between;gap:3px;position:relative}.cya-prospect-stage-step{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;gap:6px;padding:3px 1px;border:0;background:transparent;color:var(--text-muted);cursor:pointer}.cya-prospect-stage-dot{width:26px;height:26px;border:2px solid #334155;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--bg-secondary)}.cya-prospect-stage-step.done .cya-prospect-stage-dot{background:#10b981;border-color:#10b981;color:#fff}.cya-prospect-stage-step.active .cya-prospect-stage-dot{border-color:#3b82f6;color:#3b82f6}.cya-prospect-stage-label{font-size:10px;line-height:1.25;text-align:center;overflow-wrap:anywhere}.cya-prospect-stage-step.active .cya-prospect-stage-label{color:#60a5fa;font-weight:700}.cya-prospect-stage-step.done .cya-prospect-stage-label{color:#10b981}.cya-prospect-stage-note{text-align:center;font-size:10px;color:var(--text-muted);margin-top:12px}.cya-prospect-stage-note strong{color:#60a5fa}@media(max-width:600px){.cya-prospect-stage-label{font-size:8px}.cya-prospect-stage-dot{width:23px;height:23px}}
      .cya-prospect-stage-stepper{margin-bottom:8px!important;padding:5px 2px 8px!important}.cya-prospect-stage-caption{font-size:9px!important;margin-bottom:6px!important}.cya-prospect-stage-steps{max-width:520px;margin:auto}.cya-prospect-stage-step{gap:3px!important;padding:2px!important}.cya-prospect-stage-dot{width:21px!important;height:21px!important;font-size:10px!important}.cya-prospect-stage-label{font-size:9px!important;line-height:1.1!important}.cya-prospect-stage-note{margin-top:5px!important;font-size:9px!important}
      .cya-column-sort-actions{display:inline-flex;gap:3px;margin-left:auto;align-items:center}.cya-sort-action{border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.12);color:#fff;border-radius:5px;cursor:pointer;font-size:13px;padding:3px 5px;line-height:1.2}.cya-sort-action.active{background:rgba(255,255,255,.3);border-color:#fff}.cya-curp-column{margin:14px 0 20px;padding:12px;border:1px solid var(--border);border-radius:10px}.cya-curp-column h3{font-size:13px;margin:0 0 10px}.cya-curp-priority-group{margin:10px 0}.cya-curp-priority-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:11px}.cya-curp-priority-heading .btn{font-size:10px;padding:4px 8px}.cya-curp-priority-group textarea{font-family:monospace;font-size:12px;min-height:50px;resize:vertical}.cya-curp-missing{font-size:10px;color:var(--warning);margin-top:3px}
      .cya-curp-tabs{display:flex;gap:8px;margin:12px 0 6px}.cya-curp-tab{flex:1;padding:11px 8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);font-weight:700;cursor:pointer}.cya-curp-tab.active{background:#1559c7;border-color:#3b82f6;color:#fff}.cya-curp-column[hidden]{display:none!important}
      .cya-meta-count{background:rgba(0,0,0,.2);padding:2px 8px;border-radius:10px;font-size:11px}.cya-meta-tag{font-size:8px;font-weight:700;letter-spacing:.45px;color:#60a5fa;margin-bottom:4px}.cya-meta-raw-name{font-size:9px;color:var(--warning);margin-bottom:4px}.cya-meta-empty{font-size:11px;color:var(--text-muted);text-align:center;padding:16px 0}
      .cya-special-leads-stack{flex:0 0 205px;min-width:205px;display:flex;flex-direction:column;gap:8px;align-self:flex-start}.cya-special-leads-stack .lead-col{width:100%!important;min-width:0!important;min-height:0!important;height:auto!important}.cya-special-leads-stack .lead-col-header{cursor:pointer;border-radius:7px}.cya-special-leads-stack .lead-col-header::after{content:'▸';font-size:11px;margin-left:6px;opacity:.7}.cya-special-leads-stack .lead-col.is-expanded .lead-col-header::after{content:'▾'}.cya-special-leads-stack .lead-col-body{display:none!important}.cya-special-leads-stack .lead-col.is-expanded .lead-col-body{display:block!important;max-height:360px;overflow:auto}.cya-special-leads-stack .lead-col.is-expanded{box-shadow:0 8px 20px rgba(0,0,0,.12)}
      @media(max-width:700px){#lead-curp-actions{display:grid!important;grid-template-columns:1fr 1fr}.cya-review-sent{width:100%;justify-content:center}.cya-client-message-actions{display:grid!important;grid-template-columns:1fr 1fr}.cya-client-review-modal{max-width:96vw}.cya-client-review-text{min-height:280px}.cya-lead-extra-fields .form-row{grid-template-columns:1fr}.cya-special-leads-stack{flex:0 0 180px;min-width:180px}.cya-meta-new-column{flex-basis:230px;min-width:230px}}
    `;document.head.appendChild(style);
  }

  installStyles();
  installGroupedCurps();
  ensureClientReviewTemplate();
  migrateExistingMetaNames();
  ensureReviewButtons();ensureExtraFields();ensureClientMessageButtons();ensureMetaNameHelper();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensureReviewButtons();ensureClientMessageButtons();ensureMetaNameHelper();applyMetaNewColumn();});
  }).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(applyMetaNewColumn,100);
})();