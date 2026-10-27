/* Meta lead outcomes: official archive reasons, contextual WhatsApp responses and funnel export.
   Feature-branch additive module. It does not add or rename archive reasons. */
(function installMetaLeadOutcomes(){
  if(window.__cyaMetaLeadOutcomesInstalled)return;
  window.__cyaMetaLeadOutcomesInstalled=true;

  const OFFICIAL_CAUSES=Object.freeze({
    docs_incompletos:'No envió toda la documentación',
    no_contesta:'No contesta',
    aprobado_no_contesta:'Aprobado y no contesta',
    no_quiso:'No quiso continuar',
    imss_activo:'Tiene IMSS activo',
    inconsistencias_curp_nss:'Inconsistencias de CURP / NSS',
    retiro_menos_5:'Retiró hace menos de 5 años',
    otros:'Otros',
  });

  const TEMPLATE_BY_CAUSE=Object.freeze({
    imss_activo:'pl_no_elegible_imss_activo',
    retiro_menos_5:'pl_no_elegible_retiro_5',
    inconsistencias_curp_nss:'pl_no_elegible_inconsistencia',
  });

  const DEFAULT_OUTCOME_TEMPLATES=[
    {
      id:'pl_no_elegible_imss_activo',
      nombre:'No elegible · IMSS activo',
      etapa:'',tipo:'whatsapp',icono:'📌',
      texto:'Hola {{NOMBRE}}.\n\nAl revisar tu solicitud en el sistema, detectamos que actualmente te encuentras cotizando como trabajador activo ante el IMSS.\n\nPor disposición oficial y de acuerdo con la Ley del Seguro Social, uno de los requisitos indispensables para poder tramitar el retiro es contar con un mínimo de 7 días naturales en estatus de baja laboral (sin cotizar ante el IMSS).\n\nPor esta razón, por el momento no es posible iniciar tu trámite.\n\n📌 ¿Qué podemos hacer? Si en algún momento cambias de situación laboral o concluyes tu relación de trabajo formal, con gusto guardamos tu expediente para dar inicio a tu gestión en cuanto cumplas el plazo requerido.\n\n¡Seguimos a tus órdenes para cualquier duda sobre tu AFORE o trámites de pensión! 🤝',
    },
    {
      id:'pl_no_elegible_retiro_5',
      nombre:'No elegible · Retiro hace menos de 5 años',
      etapa:'',tipo:'whatsapp',icono:'⏳',
      texto:'Hola {{NOMBRE}}.\n\nRevisamos tus datos en el sistema respecto a tu solicitud de Retiro por Desempleo de AFORE.\n\nPor disposición legal, para acceder nuevamente a este beneficio es obligatorio que hayan transcurrido al menos 5 años desde tu último retiro.\n\nLamentablemente, en tu caso aún no se cumple el plazo y la ley establece que solo es posible ejercer este derecho una vez cada 5 años, por lo que no es viable iniciar el proceso ahora.\n\nCon gusto dejamos tu registro guardado para cuando se cumpla este plazo y te contactamos para intentarlo nuevamente.\n\nSi tienes alguna duda, quedamos a tus órdenes. 🤝',
    },
    {
      id:'pl_no_elegible_inconsistencia',
      nombre:'Inconsistencia CURP / NSS · Opciones de corrección',
      etapa:'correccion_imss',tipo:'whatsapp',icono:'🛠️',
      texto:'Hola {{NOMBRE}}, te saluda {{ASESOR}} de Casillas & Asociados.\n\nValidamos tus datos en el sistema para tu solicitud de Retiro de AFORE y detectamos una inconsistencia en tus registros oficiales ante el IMSS/AFORE, asociada a tu CURP o Número de Seguridad Social (NSS).\n\nMientras exista este detalle en tu expediente, el sistema no permite autorizar una disposición de recursos.\n\n📌 ¿Cuáles son las opciones para solucionarlo?\n\n1️⃣ Por tu cuenta (directo en ventanilla): puedes acudir personalmente a tu Subdelegación del IMSS y a las oficinas de tu AFORE para ingresar la aclaración y unificación de datos. Una vez que queden corregidos y actualizados en el sistema, con gusto retomamos tu trámite de retiro.\n\n2️⃣ Con nuestro apoyo (gestoría especializada): si prefieres evitar las vueltas, filas y trámites burocráticos, en la consultora podemos apoyarte con la corrección y saneamiento de tu expediente para dejar tu cuenta en condiciones de continuar con el retiro.\n\nDime con total confianza cómo prefieres manejarlo y con gusto te orientamos.\n\n¡Quedo a tus órdenes! 🤝',
    },
  ];

  function safe(value){
    return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  }
  function escCsv(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
  function normalizePhone(value){
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.length===12&&digits.startsWith('52'))digits=digits.slice(2);
    if(digits.length===13&&digits.startsWith('521'))digits=digits.slice(3);
    return digits.slice(-10);
  }
  function isMetaLead(l){
    const source=String(l?.fuenteContacto||l?.fuente||l?.origen?.fuente||'').trim().toLowerCase();
    return l?.metaAds===true||Boolean(l?.metaLead)||Boolean(l?.origenMeta)||source==='meta ads';
  }
  function isMetaClient(c,metaLeadIds){
    const source=String(c?.fuente||c?.fuenteContacto||c?.origen?.fuente||'').trim().toLowerCase();
    return c?.metaAds===true||Boolean(c?.metaLead)||source==='meta ads'||metaLeadIds.has(String(c?.origenLeadId||''));
  }
  function currentAdvisorName(){
    try{return typeof asesorNombreCompleto==='function'?asesorNombreCompleto(sesionActiva):(sesionActiva?.nombre||'Casillas & Asociados');}
    catch(_){return sesionActiva?.nombre||'Casillas & Asociados';}
  }
  function firstVerifiedName(entity){
    if(!entity)return '';
    const raw=String(entity.nombre||'').trim();
    if(!raw||/^nombre pendiente/i.test(raw))return '';
    if(entity.nombreVerificado===false)return '';
    return raw.split(/\s+/)[0]||'';
  }
  function greeting(){
    const hour=new Date().getHours();
    if(hour>=5&&hour<12)return 'Buen día';
    if(hour>=12&&hour<20)return 'Buenas tardes';
    return 'Buenas noches';
  }

  function ensureOutcomeTemplates(){
    if(!window.store)return false;
    let arr=Array.isArray(store.plantillas)?store.plantillas:null;
    if(!arr){
      try{arr=typeof PLANTILLAS_DEFAULT!=='undefined'?PLANTILLAS_DEFAULT.map(p=>({...p})):[];}catch(_){arr=[];}
      store.plantillas=arr;
    }
    let changed=false;
    for(const tpl of DEFAULT_OUTCOME_TEMPLATES){
      if(!arr.some(p=>p.id===tpl.id)){arr.push({...tpl});changed=true;}
    }
    if(changed){
      try{saveStore?.();}catch(_){ }
    }
    return changed;
  }

  function templateForCause(cause){
    const id=TEMPLATE_BY_CAUSE[cause];
    if(!id)return null;
    ensureOutcomeTemplates();
    return (store?.plantillas||[]).find(p=>p.id===id)||DEFAULT_OUTCOME_TEMPLATES.find(p=>p.id===id)||null;
  }

  function renderOutcomeMessage(entity,cause){
    const tpl=templateForCause(cause);
    if(!tpl)return '';
    const name=firstVerifiedName(entity);
    let text=String(tpl.texto||'');
    text=text.replace(/^Hola\s+\{\{NOMBRE\}\}([,.!]?)/i,`${greeting()}${name?' '+name:''}$1`);
    text=text.replace(/\{\{NOMBRE\}\}/g,name||'').replace(/\{\{ASESOR\}\}/g,currentAdvisorName());
    return text.replace(/ +([,.])/g,'$1').replace(/\n{3,}/g,'\n\n').trim();
  }

  async function copyText(value){
    const text=String(value||'').trim();if(!text)return false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch(_){ }
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}ta.remove();return ok;
  }

  function ensureOutcomeModal(){
    if(document.getElementById('cya-outcome-message-modal'))return;
    const modal=document.createElement('div');modal.id='cya-outcome-message-modal';modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal cya-outcome-modal" role="dialog" aria-modal="true" aria-labelledby="cya-outcome-title">
      <div class="modal-header"><div><div class="modal-title" id="cya-outcome-title">Respuesta sugerida</div><div class="cya-outcome-sub" id="cya-outcome-cause"></div></div><button class="modal-close" type="button" onclick="cyaCerrarRespuestaArchivo()">×</button></div>
      <div class="modal-body"><div class="cya-outcome-template-name" id="cya-outcome-template-name"></div><textarea class="form-textarea cya-outcome-text" id="cya-outcome-text" spellcheck="true"></textarea><div class="form-helper">Puedes editar el mensaje antes de copiarlo o abrir WhatsApp. La plantilla base sigue siendo editable desde Plantillas.</div></div>
      <div class="modal-footer"><button class="btn" type="button" onclick="cyaIrPlantillaArchivo()">Plantillas</button><button class="btn" type="button" onclick="cyaCopiarRespuestaArchivo()">📋 Copiar respuesta</button><button class="btn" type="button" onclick="cyaAbrirWhatsAppArchivo()" style="background:#25d366;border-color:#25d366;color:#fff;">💬 Abrir WhatsApp</button><button class="btn btn-primary" type="button" onclick="cyaCerrarRespuestaArchivo()">Cerrar</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)window.cyaCerrarRespuestaArchivo();});
  }

  let outcomeContext=null;
  function openOutcomeModal(lead,cause){
    const tpl=templateForCause(cause);if(!tpl)return;
    ensureOutcomeModal();
    outcomeContext={leadId:lead?.id||null,cause,templateId:tpl.id};
    const text=renderOutcomeMessage(lead,cause);
    const causeEl=document.getElementById('cya-outcome-cause');if(causeEl)causeEl.textContent=OFFICIAL_CAUSES[cause]||cause;
    const nameEl=document.getElementById('cya-outcome-template-name');if(nameEl)nameEl.textContent='Plantilla: '+tpl.nombre;
    const area=document.getElementById('cya-outcome-text');if(area)area.value=text;
    document.getElementById('cya-outcome-message-modal')?.classList.add('open');
  }

  window.cyaCerrarRespuestaArchivo=function(){document.getElementById('cya-outcome-message-modal')?.classList.remove('open');outcomeContext=null;};
  window.cyaCopiarRespuestaArchivo=async function(){
    const text=document.getElementById('cya-outcome-text')?.value||'';
    const ok=await copyText(text);showToast?.(ok?'Respuesta copiada':'No fue posible copiar la respuesta',ok?'success':'warn');
  };
  window.cyaAbrirWhatsAppArchivo=async function(){
    const text=document.getElementById('cya-outcome-text')?.value||'';if(!text.trim())return;
    await copyText(text);
    const tab=window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');if(tab)try{tab.opener=null;}catch(_){ }
    showToast?.(tab?'WhatsApp abierto. Selecciona el chat o grupo correspondiente.':'El navegador bloqueó WhatsApp; el mensaje quedó copiado.',tab?'success':'warn');
  };
  window.cyaIrPlantillaArchivo=function(){
    const templateId=outcomeContext?.templateId||null;
    window.cyaCerrarRespuestaArchivo();
    try{navigate('plantillas',document.querySelector('[data-page="plantillas"]'));setTimeout(()=>{if(templateId&&typeof seleccionarPlantilla==='function')seleccionarPlantilla(templateId);},80);}catch(_){ }
  };

  function ensureArchiveTemplateHint(){
    const select=document.getElementById('lead-causa-archivo');if(!select)return;
    let hint=document.getElementById('cya-archive-template-hint');
    if(!hint){hint=document.createElement('div');hint.id='cya-archive-template-hint';hint.className='cya-archive-template-hint';select.closest('.form-group')?.insertAdjacentElement('afterend',hint);}
    const cause=String(select.value||'');const tpl=templateForCause(cause);
    if(!tpl){hint.style.display='none';hint.innerHTML='';return;}
    hint.style.display='flex';hint.innerHTML=`<span><strong>Respuesta disponible:</strong> ${safe(tpl.nombre)}</span><button class="btn" type="button" onclick="cyaPrevisualizarRespuestaArchivo()">Ver respuesta</button>`;
  }
  window.cyaPrevisualizarRespuestaArchivo=function(){
    const cause=String(document.getElementById('lead-causa-archivo')?.value||'');
    const lead=(store?.leads||[]).find(l=>String(l.id)===String(window.leadParaArchivar||leadParaArchivar||''));
    if(lead&&TEMPLATE_BY_CAUSE[cause])openOutcomeModal(lead,cause);
  };

  const toggleBase=window.toggleLeadOtros;
  if(typeof toggleBase==='function')window.toggleLeadOtros=function(){const result=toggleBase.apply(this,arguments);setTimeout(ensureArchiveTemplateHint,0);return result;};
  const archiveBase=window.archivarLead;
  if(typeof archiveBase==='function')window.archivarLead=function(){const result=archiveBase.apply(this,arguments);setTimeout(ensureArchiveTemplateHint,0);return result;};
  const confirmArchiveBase=window.confirmarArchivarLead;
  if(typeof confirmArchiveBase==='function')window.confirmarArchivarLead=function(){
    const leadId=window.leadParaArchivar||leadParaArchivar||null;
    const cause=String(document.getElementById('lead-causa-archivo')?.value||'');
    const leadBefore=(store?.leads||[]).find(l=>String(l.id)===String(leadId));
    const result=confirmArchiveBase.apply(this,arguments);
    if(leadBefore&&TEMPLATE_BY_CAUSE[cause])setTimeout(()=>openOutcomeModal(leadBefore,cause),80);
    return result;
  };

  function findClientForLead(lead){
    const clients=store?.clientes||[];
    const byOrigin=clients.find(c=>String(c.origenLeadId||c.prospectoId||c.origenProspectoId||'')===String(lead.id));if(byOrigin)return byOrigin;
    const curp=String(lead.curp||'').toUpperCase();if(curp){const c=clients.find(x=>String(x.curp||'').toUpperCase()===curp);if(c)return c;}
    const phone=normalizePhone(lead.telefono||lead.phone);if(phone){const c=clients.find(x=>normalizePhone(x.telefono||x.phone)===phone);if(c)return c;}
    return null;
  }
  function advisorLabel(id){return (store?.asesores||[]).find(a=>String(a.id)===String(id))?.nombre||'';}
  function collaboratorLabel(id){return (store?.colaboradores||[]).find(c=>String(c.id)===String(id))?.nombre||'';}
  function declaredText(lead){
    const obj=lead?.elegibilidadDeclarada?.respuestas||lead?.metaLead?.answers||{};
    try{return JSON.stringify(obj);}catch(_){return '';}
  }
  function clientCommission(client){
    if(!client)return '';
    for(const key of ['comision','comisionAsesor','comisionPropia','comisionEstimada']){
      const value=Number(client?.[key]);if(Number.isFinite(value)&&value!==0)return value;
    }
    return '';
  }
  function collaboratorCommission(client){
    if(!client?.colaboradorId)return '';
    try{
      const col=(store?.colaboradores||[]).find(c=>String(c.id)===String(client.colaboradorId));
      if(col&&typeof comisionDelColaborador==='function')return comisionDelColaborador(client,col);
    }catch(_){ }
    const raw=Number(client.comisionColaborador);return Number.isFinite(raw)&&raw!==0?raw:'';
  }

  window.exportarReporteMetaAds=function(){
    const visible=typeof leadsVistaActual==='function'?leadsVistaActual():(store?.leads||[]);
    const metaLeads=(visible||[]).filter(isMetaLead);
    const metaIds=new Set((store?.leads||[]).filter(isMetaLead).map(l=>String(l.id)));
    const metaClients=(typeof clientesVistaActual==='function'?clientesVistaActual():(store?.clientes||[])).filter(c=>isMetaClient(c,metaIds));
    const rows=[];const representedClients=new Set();

    for(const lead of metaLeads){
      const client=findClientForLead(lead);if(client)representedClients.add(String(client.id));
      const meta=lead.metaLead||lead.origenMeta||{};
      const result=client?'Convertido a cliente':lead.estado==='archivado'?(lead.archivoTipo==='temporal'?'No elegible por ahora':'Archivado definitivo'):(LEAD_ESTADOS?.[lead.estado]?.label||lead.estado||'');
      rows.push([
        lead.fechaRegistro||meta.createdTime||lead.fechaInicio||'',meta.externalId||'',meta.campaignName||'',meta.adsetName||'',meta.adName||'',meta.formName||'',meta.platform||'',
        meta.nombreRecibido||lead.nombreMeta||'',lead.nombreVerificado===true?lead.nombre:'',lead.telefono||lead.phone||'',lead.curp||'',lead.ciudad||lead.municipio||'',advisorLabel(lead.asesorId),collaboratorLabel(lead.colaboradorId),
        declaredText(lead),lead.precalificacionMeta||lead?.elegibilidadDeclarada?.clasificacion||'',lead.fechaRevisionSolicitada||'',LEAD_ESTADOS?.[lead.estado]?.label||lead.estado||'',result,lead.causaArchivo||'',lead.archivoTipo||'',lead.fechaRecontacto||'',
        client?'Sí':'No',client?stageLabel(client.etapa,client.servicio):'',client?.etapa==='concluido'?'Sí':'No',client?.honorarios||client?.honorariosCalc||'',clientCommission(client),collaboratorCommission(client)
      ]);
    }

    for(const client of metaClients){
      if(representedClients.has(String(client.id)))continue;
      const meta=client.metaLead||{};
      rows.push([client.fechaRegistro||'',meta.externalId||'',meta.campaignName||'',meta.adsetName||'',meta.adName||'',meta.formName||'',meta.platform||'',meta.nombreRecibido||'',client.nombre||'',client.telefono||'',client.curp||'',client.ciudad||'',advisorLabel(client.asesorId),collaboratorLabel(client.colaboradorId),'','','','', 'Convertido a cliente','','','', 'Sí',stageLabel(client.etapa,client.servicio),client.etapa==='concluido'?'Sí':'No',client.honorarios||client.honorariosCalc||'',clientCommission(client),collaboratorCommission(client)]);
    }

    if(!rows.length){showToast?.('No hay prospectos de Meta Ads para exportar en esta vista','info');return;}
    const headers=['Fecha de llegada','ID Meta','Campaña','Conjunto de anuncios','Anuncio','Formulario','Plataforma','Nombre recibido de Meta','Nombre verificado','Teléfono','CURP','Ciudad / municipio','Asesor','Colaborador','Respuestas declaradas','Precalificación Meta','Fecha solicitud de revisión','Etapa del prospecto','Resultado','Causa de archivo','Tipo de archivo','Fecha de recontacto','Convertido a cliente','Etapa actual del cliente','Cliente concluido','Honorarios','Comisión registrada','Comisión colaborador'];
    const csv='\uFEFF'+headers.map(escCsv).join(',')+'\n'+rows.map(row=>row.map(escCsv).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reporte_meta_ads_'+new Date().toISOString().split('T')[0]+'.csv';a.click();URL.revokeObjectURL(a.href);showToast?.('Reporte Meta Ads exportado','success');
  };

  function ensureExportButton(){
    if(document.getElementById('cya-meta-report-btn'))return;
    const actions=document.querySelector('.leads-toolbar-actions');if(!actions)return;
    const button=document.createElement('button');button.id='cya-meta-report-btn';button.type='button';button.className='btn';button.textContent='⬇ Reporte Meta Ads';button.onclick=window.exportarReporteMetaAds;
    actions.insertBefore(button,actions.firstChild);
  }

  if(!document.getElementById('cya-meta-outcomes-styles')){
    const style=document.createElement('style');style.id='cya-meta-outcomes-styles';style.textContent=`
      .cya-archive-template-hint{display:none;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 2px;padding:9px 10px;border:1px solid rgba(37,211,102,.28);background:rgba(37,211,102,.07);border-radius:6px;font-size:10px;color:var(--text-secondary)}
      .cya-outcome-modal{max-width:640px}.cya-outcome-sub{font-size:10px;color:var(--text-muted);margin-top:2px}.cya-outcome-template-name{font-size:10px;font-weight:700;color:var(--accent-blue);margin-bottom:8px}.cya-outcome-text{min-height:310px;line-height:1.55;font-size:12px}
      @media(max-width:700px){.cya-archive-template-hint{align-items:stretch;flex-direction:column}.cya-outcome-text{min-height:360px}}
    `;document.head.appendChild(style);
  }

  ensureOutcomeTemplates();ensureOutcomeModal();ensureExportButton();
  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;ensureExportButton();if(document.getElementById('modal-archivar-lead')?.classList.contains('open'))ensureArchiveTemplateHint();});}).observe(document.documentElement,{childList:true,subtree:true});
})();
