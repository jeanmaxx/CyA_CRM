/* Meta Leads workflow - isolated additive module.
   Loaded only from the feature branch until the complete flow is validated.
   It does not alter production database schema and stores new prospect metadata in the existing lead payload. */
(function installMetaLeadsWorkflow(){
  if(window.__cyaMetaLeadsWorkflowInstalled)return;
  window.__cyaMetaLeadsWorkflowInstalled=true;

  const META_SOURCE='Meta Ads';

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const leadById=id=>(store?.leads||[]).find(l=>String(l.id)===String(id));
  const currentLead=()=>editingLeadId?leadById(editingLeadId):null;
  const normalizeCurp=value=>String(value||'').replace(/[^A-ZÑ0-9]/gi,'').toUpperCase().slice(0,18);

  function greeting(){
    const hour=new Date().getHours();
    if(hour>=5&&hour<12)return 'Buen día';
    if(hour>=12&&hour<20)return 'Buenas tardes';
    return 'Buenas noches';
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
      closeModal?.('modal-lead');
      renderPage?.('leads');
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

  function fillExtraFields(){
    ensureExtraFields();ensureReviewButtons();
    const l=currentLead();
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??'';};
    set('lead-email',l?.email||l?.correo||'');
    set('lead-ciudad',l?.ciudad||l?.municipio||'');
    set('lead-fuente',l?.fuenteContacto||l?.origen?.fuente||'');
    set('lead-nss',l?.nss||'');
    set('lead-afore',l?.afore||'');
    set('lead-domicilio',l?.domicilio||'');
    const metaBox=document.getElementById('cya-meta-origin-box');
    if(metaBox){
      const meta=l?.metaLead||l?.origenMeta||null;
      if(meta){
        const rawName=meta.nombreRecibido||l?.nombreMeta||'';
        metaBox.hidden=false;
        metaBox.innerHTML=`<strong>Origen Meta Ads</strong><span>${rawName?`Nombre recibido: ${safe(rawName)} · `:''}${safe(meta.campaignName||'Campaña no registrada')}</span>`;
      }else metaBox.hidden=true;
    }
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
    if(extras.fuenteContacto===META_SOURCE){lead.metaAds=true;lead.nombreVerificado=lead.nombreVerificado===true;}
    try{await cloudSyncNow?.({throwOnError:true});}catch(_){showToast?.('Los datos adicionales quedaron pendientes de sincronizar','warn');}
  };

  function isMetaNewLead(l){
    const source=String(l?.fuenteContacto||l?.origen?.fuente||'').toLowerCase();
    return l?.estado!=='archivado'&&!l?.revisionSolicitada&&(l?.metaAds===true||source==='meta ads'||Boolean(l?.metaLead)||Boolean(l?.origenMeta));
  }

  function applyMetaNewColumn(){
    const kanban=document.querySelector('.leads-kanban');
    if(!kanban)return;
    document.getElementById('cya-meta-new-column')?.remove();
    const leads=(typeof leadsVistaActual==='function'?leadsVistaActual():(store?.leads||[])).filter(isMetaNewLead);
    if(!leads.length)return;
    const col=document.createElement('div');col.id='cya-meta-new-column';col.className='lead-col cya-meta-new-column';
    const header=document.createElement('div');header.className='lead-col-header';header.innerHTML=`<span>Nuevos Meta Ads</span><span class="cya-meta-count">${leads.length}</span>`;
    const body=document.createElement('div');body.className='lead-col-body';
    for(const lead of leads){
      const card=[...kanban.querySelectorAll('.lead-card[data-lead-id]')].find(el=>String(el.dataset.leadId)===String(lead.id));
      if(!card)continue;
      const tag=document.createElement('div');tag.className='cya-meta-tag';tag.textContent='META ADS · PENDIENTE DE REVISIÓN';
      if(!card.querySelector('.cya-meta-tag'))card.insertBefore(tag,card.firstChild);
      body.appendChild(card);
    }
    col.append(header,body);kanban.prepend(col);
  }

  function installStyles(){
    if(document.getElementById('cya-meta-leads-styles'))return;
    const style=document.createElement('style');style.id='cya-meta-leads-styles';style.textContent=`
      .cya-review-sent{margin-top:8px;border-color:rgba(245,158,11,.45);color:var(--warning);display:inline-flex}
      .cya-lead-extra-fields{margin:12px 0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary)}
      .cya-extra-title{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:10px}
      .cya-meta-origin-box{display:flex;flex-direction:column;gap:3px;margin-top:8px;padding:9px 10px;border-left:3px solid #1877f2;background:rgba(24,119,242,.07);border-radius:4px}
      .cya-meta-origin-box strong{font-size:10px;color:#60a5fa}.cya-meta-origin-box span{font-size:10px;color:var(--text-muted)}
      .cya-meta-new-column{border:1px solid rgba(24,119,242,.35)}.cya-meta-new-column .lead-col-header{background:linear-gradient(90deg,#1559c7,#1877f2)}
      .cya-meta-count{background:rgba(0,0,0,.2);padding:2px 8px;border-radius:10px;font-size:11px}.cya-meta-tag{font-size:8px;font-weight:700;letter-spacing:.45px;color:#60a5fa;margin-bottom:4px}
      @media(max-width:700px){#lead-curp-actions{display:grid!important;grid-template-columns:1fr 1fr}.cya-review-sent{width:100%;justify-content:center}.cya-lead-extra-fields .form-row{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  installStyles();
  ensureReviewButtons();ensureExtraFields();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensureReviewButtons();if(document.getElementById('modal-lead')?.classList.contains('open'))fillExtraFields();applyMetaNewColumn();});
  }).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(applyMetaNewColumn,100);
})();
