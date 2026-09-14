/* Additive CRM enhancement: prospect CURP utilities + client eligibility visibility/prefill.
   No migrations and no destructive writes. Existing records are only modified when a user explicitly saves a client. */
(function installCurpAndClientEligibility(){
  if(window.__cyaCurpClientEligibilityInstalled)return;
  window.__cyaCurpClientEligibilityInstalled=true;

  const RENAPO_CURP_URL='https://www.gob.mx/curp/';

  function safe(value){
    return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  }
  function firstValue(...values){
    for(const value of values){if(value!==undefined&&value!==null&&String(value)!=='')return value;}
    return '';
  }
  function leadEligibilityForService(lead,serviceId){
    const root=lead?.elegibilidad||{};
    return root?.porServicio?.[serviceId]||root||{};
  }
  function clientEligibility(c){
    const fromLead=leadEligibilityForService(c?.prospectoOrigen,c?.servicio);
    return {
      semanas:firstValue(c?.el_semanas,fromLead.semanas),
      cotizaImss:firstValue(c?.el_imss,fromLead.cotizaImss),
      retiro5:firstValue(c?.el_retiro,fromLead.retiro5),
      fechaRetiro:firstValue(c?.el_fecha,fromLead.fechaRetiro,c?.fechaUltimoRetiro),
      fechaNacimiento:firstValue(c?.el_fecha_nac,fromLead.fechaNacimiento),
      primeraCotizacion:firstValue(c?.el_primera_cotizacion,fromLead.primeraCotizacion),
      ley:firstValue(c?.el_ley,fromLead.ley),
      conservacionDerechos:firstValue(c?.el_conservacion,fromLead.conservacionDerechos),
      notas:firstValue(c?.el_notas,fromLead.notas),
      desdeProspecto:Boolean(c?.origenProspecto||c?.prospectoOrigen),
    };
  }

  async function copyText(text){
    const value=String(text||'').trim();
    if(!value)return false;
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}
    }catch(_){ }
    const area=document.createElement('textarea');
    area.value=value;area.setAttribute('readonly','');
    area.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(area);area.select();area.setSelectionRange(0,value.length);
    let ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}area.remove();return ok;
  }

  window.cyaCopiarCurpProspecto=async function(){
    const curp=String(document.getElementById('lead-curp')?.value||'').trim().toUpperCase();
    if(!curp){if(typeof showToast==='function')showToast('Captura una CURP antes de copiar','warn');return;}
    const ok=await copyText(curp);
    if(typeof showToast==='function')showToast(ok?'CURP copiada al portapapeles':'No fue posible copiar automáticamente. Selecciona la CURP y cópiala manualmente.',ok?'success':'warn');
  };

  window.cyaVerificarCurpProspecto=function(){
    const curp=String(document.getElementById('lead-curp')?.value||'').trim().toUpperCase();
    if(!curp){if(typeof showToast==='function')showToast('Captura una CURP antes de verificar','warn');return;}
    // Open synchronously from the user click so browsers do not treat it as a popup created after an async task.
    const tab=window.open(RENAPO_CURP_URL,'_blank');
    if(tab)try{tab.opener=null;}catch(_){ }
    copyText(curp).then(ok=>{
      if(!tab){if(typeof showToast==='function')showToast(ok?'CURP copiada. El navegador bloqueó la pestaña de RENAPO; permite ventanas emergentes e inténtalo nuevamente.':'El navegador bloqueó RENAPO y no fue posible copiar la CURP.','warn');return;}
      if(typeof showToast==='function')showToast(ok?'CURP copiada. Pégala en RENAPO y pulsa Buscar.':'RENAPO abierto. Copia la CURP manualmente y pulsa Buscar.',ok?'success':'warn');
    });
  };

  function ensureCurpButtons(){
    const input=document.getElementById('lead-curp');
    if(!input||document.getElementById('lead-curp-actions'))return;
    const warning=document.getElementById('lead-curp-warning');
    const actions=document.createElement('div');
    actions.id='lead-curp-actions';actions.className='cya-curp-actions';
    actions.innerHTML='<button class="btn" type="button" onclick="cyaCopiarCurpProspecto()">⧉ Copiar CURP</button><button class="btn btn-primary" type="button" onclick="cyaVerificarCurpProspecto()">✓ Verificar en RENAPO</button>';
    (warning||input).insertAdjacentElement('afterend',actions);
  }

  function ensureClientEligibilityTab(){
    const tabs=document.getElementById('modal-tabs');
    const panel=document.getElementById('tab-elegibilidad');
    if(!tabs||!panel||document.getElementById('cya-client-eligibility-tab'))return;
    const tab=document.createElement('div');
    tab.className='tab';tab.id='cya-client-eligibility-tab';tab.textContent='Elegibilidad';tab.tabIndex=0;tab.setAttribute('role','button');
    tab.onclick=()=>window.cyaOpenClientEligibilityTab(tab);
    tab.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();window.cyaOpenClientEligibilityTab(tab);}};
    tabs.appendChild(tab); // Append to preserve the numeric indexes used by existing tabs.
  }

  window.cyaOpenClientEligibilityTab=function(tab){
    document.querySelectorAll('#modal-tabs .tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#modal-cliente .tab-panel').forEach(p=>p.classList.remove('active'));
    tab?.classList.add('active');
    const panel=document.getElementById('tab-elegibilidad');if(panel)panel.classList.add('active');
    const svc=typeof getVal==='function'?getVal('fc-servicio'):document.getElementById('fc-servicio')?.value;
    if(svc&&!document.querySelector('#eleg-container input,#eleg-container select,#eleg-container textarea')&&typeof renderElegContainer==='function')renderElegContainer(svc);
  };

  function applyEligibilityToClientForm(source,force=false){
    if(!source)return;
    const svc=source.servicio||source.serviceId||(typeof getVal==='function'?getVal('fc-servicio'):'')||'';
    const e=source.elegibilidad?leadEligibilityForService(source,svc):clientEligibility(source);
    const set=(id,value)=>{const el=document.getElementById(id);if(!el)return;if(force||!String(el.value||''))el.value=value??'';};
    set('el-semanas',e.semanas);
    set('el-imss',e.cotizaImss);
    set('el-retiro',e.retiro5);
    set('el-fecha',e.fechaRetiro);
    set('el-fecha-nac',e.fechaNacimiento);
    set('el-ley',e.ley);
    const fechaWrap=document.getElementById('el-fecha-wrap');if(fechaWrap&&document.getElementById('el-retiro')?.value==='si')fechaWrap.style.display='block';
    if(svc==='retiro_desempleo'&&typeof checkElegibilidad==='function')checkElegibilidad();
    if(svc==='asesoria_pension'&&typeof checkElegibilidadPension==='function')checkElegibilidadPension();
  }

  function prefillFromLead(leadId){
    const lead=(store?.leads||[]).find(l=>String(l.id)===String(leadId));if(!lead)return;
    if(typeof getVal==='function'&&typeof setVal==='function'&&!getVal('fc-servicio'))setVal('fc-servicio',lead.servicio||'retiro_desempleo');
    if(typeof onServicioChange==='function')onServicioChange();
    // Core conversion logic may still be completing its own field population, so apply after its synchronous work and again after legacy restoration timers.
    applyEligibilityToClientForm(lead,true);
    setTimeout(()=>applyEligibilityToClientForm(lead,true),80);
  }

  const baseOpenClient=window.openModalCliente;
  if(typeof baseOpenClient==='function')window.openModalCliente=function(origenLeadId=null){
    const result=baseOpenClient.apply(this,arguments);
    ensureClientEligibilityTab();
    if(origenLeadId)setTimeout(()=>prefillFromLead(origenLeadId),0);
    return result;
  };

  const baseEditClient=window.editCliente;
  if(typeof baseEditClient==='function')window.editCliente=function(id){
    const result=baseEditClient.apply(this,arguments);
    ensureClientEligibilityTab();
    const c=(store?.clientes||[]).find(x=>String(x.id)===String(id));
    if(c)setTimeout(()=>applyEligibilityToClientForm(c,false),80);
    return result;
  };

  function eligibilityProfileHtml(c){
    const e=clientEligibility(c);const hasAny=[e.semanas,e.cotizaImss,e.retiro5,e.fechaRetiro,e.fechaNacimiento,e.primeraCotizacion,e.ley,e.conservacionDerechos,e.notas].some(v=>String(v||'')!=='');
    const origin=e.desdeProspecto?'Precargada desde Prospectos':hasAny?'Captura directa / cliente':'Sin datos capturados';
    const yesNo=value=>value==='si'?'Sí':value==='no'?'No':'Por verificar';
    let rows='';
    if(c.servicio==='retiro_desempleo'){
      const evaluation=typeof evaluarCriteriosIniciales==='function'?evaluarCriteriosIniciales('retiro_desempleo',{semanas:e.semanas,cotizaImss:e.cotizaImss,retiro5:e.retiro5,fechaRetiro:e.fechaRetiro}):null;
      rows=[['Semanas cotizadas',e.semanas||'—'],['¿Cotiza actualmente ante el IMSS?',yesNo(e.cotizaImss)],['¿Retiró en los últimos 5 años?',yesNo(e.retiro5)],['Fecha del último retiro',e.fechaRetiro?fmtDate(e.fechaRetiro):'—']].map(([l,v])=>`<div class="info-row"><span class="ir-label">${safe(l)}</span><span class="ir-value">${safe(v)}</span></div>`).join('');
      if(evaluation)rows+=`<div class="cya-eligibility-summary ${evaluation.cumple?'is-ok':''}"><strong>${evaluation.cumple?'✓ Cumple criterios iniciales':'Por revisar'}</strong><span>${safe(evaluation.detalle||'')}</span></div>`;
    }else if(c.servicio==='asesoria_pension'){
      rows=[['Fecha de nacimiento',e.fechaNacimiento?fmtDate(e.fechaNacimiento):'—'],['Semanas cotizadas',e.semanas||'—'],['Primera cotización',e.primeraCotizacion?fmtDate(e.primeraCotizacion):'—'],['Régimen',e.ley==='73'?'Ley 73':e.ley==='97'?'Ley 97':'Por verificar'],['Conservación de derechos',yesNo(e.conservacionDerechos)]].map(([l,v])=>`<div class="info-row"><span class="ir-label">${safe(l)}</span><span class="ir-value">${safe(v)}</span></div>`).join('');
    }else{
      rows=`<div class="info-row"><span class="ir-label">Notas de elegibilidad</span><span class="ir-value">${safe(e.notas||'—')}</span></div>`;
    }
    return `<div class="cya-eligibility-origin"><span>Origen de la información</span><strong>${safe(origin)}</strong></div><div class="info-rows">${rows}</div>${!hasAny?'<p class="form-helper" style="margin-top:12px;">Abre Editar → Elegibilidad para capturar esta información.</p>':''}`;
  }

  function injectProfileEligibility(c){
    const tabs=document.getElementById('perfil-tabs');if(!tabs||document.getElementById('cya-profile-eligibility-tab'))return;
    const tab=document.createElement('div');tab.className='tab';tab.id='cya-profile-eligibility-tab';tab.textContent='Elegibilidad';
    const dataTab=[...tabs.querySelectorAll('.tab')].find(t=>/Datos adicionales/i.test(t.textContent||''));
    if(dataTab)dataTab.insertAdjacentElement('afterend',tab);else tabs.appendChild(tab);
    const panel=document.createElement('div');panel.className='tab-panel';panel.id='pd-elegibilidad';panel.innerHTML=eligibilityProfileHtml(c);
    const dataPanel=document.getElementById('pd-datos');if(dataPanel)dataPanel.insertAdjacentElement('afterend',panel);else document.getElementById('perfil-body')?.appendChild(panel);
    tab.onclick=()=>pTab('pd-elegibilidad',tab);
  }

  const baseOpenProfile=window.openPerfil;
  if(typeof baseOpenProfile==='function')window.openPerfil=function(id){
    const result=baseOpenProfile.apply(this,arguments);
    const c=(store?.clientes||[]).find(x=>String(x.id)===String(id));if(c)injectProfileEligibility(c);
    return result;
  };

  function installStyles(){
    if(document.getElementById('cya-curp-client-eligibility-styles'))return;
    const style=document.createElement('style');style.id='cya-curp-client-eligibility-styles';style.textContent=`
      .cya-curp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.cya-curp-actions .btn{font-size:11px;padding:7px 10px}
      .cya-eligibility-origin{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary)}
      .cya-eligibility-origin span{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}.cya-eligibility-origin strong{font-size:11px;color:var(--accent-blue);text-align:right}
      .cya-eligibility-summary{margin-top:12px;padding:10px 12px;border-left:3px solid var(--warning);border-radius:var(--radius-sm);background:rgba(245,158,11,.06)}.cya-eligibility-summary.is-ok{border-left-color:var(--success);background:rgba(16,185,129,.06)}.cya-eligibility-summary strong{display:block;font-size:11px}.cya-eligibility-summary span{display:block;font-size:10px;color:var(--text-muted);line-height:1.45;margin-top:3px}
      @media(max-width:700px){.cya-curp-actions{display:grid;grid-template-columns:1fr 1fr}.cya-curp-actions .btn{width:100%;white-space:normal}.cya-eligibility-origin{align-items:flex-start;flex-direction:column;gap:4px}.cya-eligibility-origin strong{text-align:left}}
    `;document.head.appendChild(style);
  }

  installStyles();ensureCurpButtons();
  new MutationObserver(()=>{ensureCurpButtons();if(document.getElementById('modal-cliente')?.classList.contains('open'))ensureClientEligibilityTab();}).observe(document.documentElement,{childList:true,subtree:true});
})();
