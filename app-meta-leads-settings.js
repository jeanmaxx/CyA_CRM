/* Per-advisor Meta Leads configuration card for Mi cuenta. */
(function installMetaLeadSettings(){
  if(window.__cyaMetaLeadSettingsInstalled)return;
  window.__cyaMetaLeadSettingsInstalled=true;

  let state={loading:false,loaded:false,integration:null,revealed:null,manualSyncKey:null,error:''};
  const safe=v=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(v??'')):String(v??'');

  async function invoke(body){
    if(typeof supabaseClient==='undefined'||!supabaseClient)throw new Error('Supabase no está disponible');
    const {data,error}=await supabaseClient.functions.invoke('manage-lead-integration',{body});
    if(error){let msg=error.message||'No se pudo gestionar la integración';try{if(error.context){const detail=await error.context.json();msg=detail?.error||msg;}}catch(_){}throw new Error(msg);}
    if(data?.error)throw new Error(data.error);
    return data;
  }

  async function refreshStatus(force=false){
    if(state.loading||(!force&&state.loaded))return;
    state.loading=true;state.error='';renderCard(true);
    try{const data=await invoke({action:'status'});state.integration=data.integration||null;state.loaded=true;}
    catch(error){state.error=error.message||String(error);state.loaded=true;}
    finally{state.loading=false;renderCard(true);}
  }

  function statusText(){
    if(state.loading)return 'Consultando…';
    if(state.error)return 'No disponible';
    if(!state.integration)return 'Sin configurar';
    return state.integration.enabled?'Activa':'Desactivada';
  }

  function html(){
    const i=state.integration;const cfg=i?.config||{};const manualReady=Boolean(cfg.manualSyncConfigured);
    return `<section class="card cya-meta-settings-card" id="cya-meta-settings-card">
      <div class="cya-meta-settings-head"><div><strong>Leads Meta Ads</strong><span>Google Sheets → CRM · configuración personal</span></div><span class="cya-meta-settings-status ${i?.enabled?'is-on':''}">${safe(statusText())}</span></div>
      <div class="cya-meta-settings-body">
        <p>Vincula la hoja que recibe tus formularios de Meta. Los prospectos nuevos se asignarán a tu usuario y la fuente quedará como <strong>Meta Ads</strong>.</p>
        <div class="form-row"><div class="form-group"><label class="form-label">URL de Google Sheets</label><input class="form-input" id="cya-meta-sheet-url" value="${safe(cfg.sheetUrl||'')}" placeholder="https://docs.google.com/spreadsheets/d/..."></div><div class="form-group"><label class="form-label">Nombre de la pestaña (opcional)</label><input class="form-input" id="cya-meta-sheet-name" value="${safe(cfg.sheetName||'')}" placeholder="Hoja 1"></div></div>
        ${state.error?`<div class="cya-meta-settings-error">${safe(state.error)}</div>`:''}
        ${i?`<div class="cya-meta-settings-meta"><span>Último lead: <strong>${safe(i.last_received_at?(typeof fmtDateTime==='function'?fmtDateTime(i.last_received_at):i.last_received_at):'Aún no recibido')}</strong></span>${i.last_error?`<span>Último error: ${safe(i.last_error)}</span>`:''}</div>`:''}
        ${state.revealed?`<div class="cya-meta-secret"><strong>Datos para Google Apps Script</strong><label>CRM_ENDPOINT<input readonly value="${safe(state.revealed.endpoint)}" onclick="this.select()"></label><label>CRM_INTEGRATION_TOKEN<input readonly value="${safe(state.revealed.token)}" onclick="this.select()"></label><small>Guarda estos dos valores en Propiedades del script. El token solo se muestra al generarlo o renovarlo.</small></div>`:''}
        <div class="cya-meta-settings-actions">
          <button class="btn btn-primary" type="button" onclick="cyaMetaCrearORotar()">${i?'Renovar clave':'Crear integración'}</button>
          ${i?`<button class="btn" type="button" onclick="cyaMetaToggle()">${i.enabled?'Desactivar':'Activar'}</button>`:''}
          <button class="btn" type="button" onclick="cyaMetaRefrescar()">Actualizar estado</button>
        </div>

        ${i?`<div class="cya-meta-manual-sync">
          <div class="cya-meta-manual-head"><div><strong>Sincronización manual</strong><span>Botón directo desde Prospectos, sin esperar al ciclo de 30 minutos.</span></div><span class="cya-meta-settings-status ${manualReady?'is-on':''}">${manualReady?'Lista':'Pendiente'}</span></div>
          <div class="form-group"><label class="form-label">URL de aplicación web de Apps Script</label><input class="form-input" id="cya-meta-manual-url" value="${safe(cfg.manualSyncUrl||'')}" placeholder="https://script.google.com/macros/s/.../exec"></div>
          ${state.manualSyncKey?`<div class="cya-meta-secret"><strong>Clave para la sincronización manual</strong><label>CRM_MANUAL_SYNC_KEY<input readonly value="${safe(state.manualSyncKey)}" onclick="this.select()"></label><small>Copia esta clave en Propiedades del script con el nombre exacto <strong>CRM_MANUAL_SYNC_KEY</strong>. Después despliega el proyecto como Aplicación web y pega arriba la URL terminada en /exec.</small></div>`:''}
          <div class="cya-meta-settings-actions">
            <button class="btn" type="button" onclick="cyaMetaPrepararSyncManual()">${manualReady?'Renovar clave manual':'Preparar sincronización manual'}</button>
            <button class="btn btn-primary" type="button" onclick="cyaMetaGuardarSyncUrl()">Guardar URL</button>
          </div>
          <small class="cya-meta-manual-note">Configuración única: el Apps Script debe incluir el complemento <code>manual-sync-webapp-addon.js</code> del repositorio y estar implementado como aplicación web ejecutada por ti. El sincronizador automático de 30 minutos permanece igual.</small>
        </div>`:''}
      </div>
    </section>`;
  }

  function renderCard(force=false){
    const host=document.querySelector('.account-sections');if(!host)return;
    const old=document.getElementById('cya-meta-settings-card');
    if(old&&!force)return;
    const focusedId=document.activeElement?.id||'';
    const liveUrl=document.getElementById('cya-meta-sheet-url')?.value;
    const liveName=document.getElementById('cya-meta-sheet-name')?.value;
    const liveManualUrl=document.getElementById('cya-meta-manual-url')?.value;
    const tmp=document.createElement('div');tmp.innerHTML=html();const next=tmp.firstElementChild;
    if(old)old.replaceWith(next);else host.appendChild(next);
    if(liveUrl!==undefined){const el=document.getElementById('cya-meta-sheet-url');if(el)el.value=liveUrl;}
    if(liveName!==undefined){const el=document.getElementById('cya-meta-sheet-name');if(el)el.value=liveName;}
    if(liveManualUrl!==undefined){const el=document.getElementById('cya-meta-manual-url');if(el)el.value=liveManualUrl;}
    if(focusedId){const el=document.getElementById(focusedId);if(el){el.focus();try{const n=el.value?.length||0;el.setSelectionRange(n,n);}catch(_){}}}
  }

  window.cyaMetaCrearORotar=async function(){
    try{
      const sheet_url=String(document.getElementById('cya-meta-sheet-url')?.value||'').trim();
      const sheet_name=String(document.getElementById('cya-meta-sheet-name')?.value||'').trim();
      if(sheet_url&&!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(sheet_url))return showToast?.('Revisa la URL de Google Sheets','warn');
      const data=await invoke({action:'create_or_rotate',label:'Meta Ads',sheet_url,sheet_name});
      state.revealed={endpoint:data.endpoint,token:data.token};state.integration=data.integration||{enabled:true,config:{sheetUrl:sheet_url,sheetName:sheet_name}};state.error='';state.loaded=true;
      renderCard(true);showToast?.('Integración preparada. Copia los datos al Apps Script.','success');
    }catch(error){showToast?.(error.message||String(error),'warn');}
  };
  window.cyaMetaToggle=async function(){
    try{const enabled=Boolean(state.integration?.enabled);await invoke({action:enabled?'disable':'enable'});state.revealed=null;await refreshStatus(true);showToast?.(enabled?'Integración desactivada':'Integración activada','success');}catch(error){showToast?.(error.message||String(error),'warn');}
  };
  window.cyaMetaRefrescar=()=>refreshStatus(true);
  window.cyaMetaPrepararSyncManual=async function(){
    try{
      const data=await invoke({action:'prepare_manual_sync'});
      state.manualSyncKey=data.manual_sync_key||null;
      if(data.integration)state.integration=data.integration;
      renderCard(true);
      showToast?.('Clave manual generada. Cópiala a Propiedades del script.','success');
    }catch(error){showToast?.(error.message||String(error),'warn');}
  };
  window.cyaMetaGuardarSyncUrl=async function(){
    try{
      const manual_sync_url=String(document.getElementById('cya-meta-manual-url')?.value||'').trim();
      if(manual_sync_url&&!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/i.test(manual_sync_url))return showToast?.('La URL debe ser la de una Aplicación web de Apps Script y terminar en /exec','warn');
      const data=await invoke({action:'set_manual_sync_url',manual_sync_url});
      if(data.integration)state.integration=data.integration;
      renderCard(true);
      showToast?.(state.integration?.config?.manualSyncConfigured?'Sincronización manual lista':'URL guardada. Falta preparar la clave manual.','success');
    }catch(error){showToast?.(error.message||String(error),'warn');}
  };

  const style=document.createElement('style');style.id='cya-meta-settings-styles';style.textContent=`
    .cya-meta-settings-card{overflow:hidden}.cya-meta-settings-head,.cya-meta-manual-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.cya-meta-settings-head{padding:15px 17px;border-bottom:1px solid var(--border)}.cya-meta-settings-head strong,.cya-meta-manual-head strong{display:block;font-family:var(--font-display);font-size:14px}.cya-meta-settings-head span:not(.cya-meta-settings-status),.cya-meta-manual-head span:not(.cya-meta-settings-status){display:block;font-size:10px;color:var(--text-muted);margin-top:2px}.cya-meta-settings-status{font-size:9px;font-weight:700;padding:5px 8px;border-radius:999px;background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border);white-space:nowrap}.cya-meta-settings-status.is-on{color:var(--success);border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.08)}.cya-meta-settings-body{padding:18px}.cya-meta-settings-body>p{font-size:11px;line-height:1.5;color:var(--text-muted);margin:0 0 14px}.cya-meta-settings-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.cya-meta-settings-meta{display:flex;flex-direction:column;gap:4px;padding:10px 12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:10px;color:var(--text-muted)}.cya-meta-secret{display:grid;gap:8px;margin-top:12px;padding:12px;border:1px solid rgba(24,119,242,.35);background:rgba(24,119,242,.06);border-radius:var(--radius-sm)}.cya-meta-secret>strong{font-size:11px;color:#60a5fa}.cya-meta-secret label{font-size:9px;color:var(--text-muted)}.cya-meta-secret input{display:block;width:100%;margin-top:3px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text-primary);padding:7px;border-radius:4px;font:inherit}.cya-meta-secret small{font-size:9px;color:var(--text-muted);line-height:1.4}.cya-meta-settings-error{padding:9px 10px;border-left:3px solid var(--warning);background:rgba(245,158,11,.06);font-size:10px;color:var(--warning);border-radius:4px}.cya-meta-manual-sync{margin-top:18px;padding-top:17px;border-top:1px solid var(--border)}.cya-meta-manual-sync>.form-group{margin-top:13px}.cya-meta-manual-note{display:block;margin-top:12px;font-size:9px;line-height:1.45;color:var(--text-muted)}.cya-meta-manual-note code{color:var(--accent-blue)}
    @media(max-width:700px){.cya-meta-settings-head,.cya-meta-manual-head{align-items:flex-start}.cya-meta-settings-body .form-row{grid-template-columns:1fr}.cya-meta-settings-actions .btn{flex:1}}
  `;document.head.appendChild(style);

  new MutationObserver(()=>{
    if(document.querySelector('.account-sections')&&!document.getElementById('cya-meta-settings-card')){
      renderCard(false);
      refreshStatus();
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.querySelector('.account-sections')){renderCard(false);refreshStatus();}
})();

/* Load Meta outcome/report enhancements from the same feature chain. */
(function loadMetaLeadOutcomesFromSettings(){
  if(window.__cyaMetaLeadOutcomesLoaderStarted)return;
  window.__cyaMetaLeadOutcomesLoaderStarted=true;
  const script=document.createElement('script');
  script.src='/app-meta-lead-outcomes.js?v=20261026-meta2';
  script.async=false;
  script.dataset.cyaMetaLeadOutcomes='1';
  document.head.appendChild(script);
})();

/* Add the on-demand Meta sync button beside Reporte Meta Ads. */
(function loadMetaLeadManualSyncFromSettings(){
  if(window.__cyaMetaLeadManualSyncLoaderStarted)return;
  window.__cyaMetaLeadManualSyncLoaderStarted=true;
  const script=document.createElement('script');
  script.src='/app-meta-leads-manual-sync.js?v=20261029-manual1';
  script.async=false;
  script.dataset.cyaMetaLeadManualSync='1';
  document.head.appendChild(script);
})();
