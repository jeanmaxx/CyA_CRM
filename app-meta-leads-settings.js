/* Per-advisor Meta Leads configuration card for Mi cuenta.
   Feature branch only until Edge Functions and schema are validated. */
(function installMetaLeadSettings(){
  if(window.__cyaMetaLeadSettingsInstalled)return;
  window.__cyaMetaLeadSettingsInstalled=true;

  let state={loading:false,loaded:false,integration:null,revealed:null,error:''};
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
    state.loading=true;state.error='';renderCard();
    try{const data=await invoke({action:'status'});state.integration=data.integration||null;state.loaded=true;}
    catch(error){state.error=error.message||String(error);state.loaded=true;}
    finally{state.loading=false;renderCard();}
  }

  function statusText(){
    if(state.loading)return 'Consultando…';
    if(state.error)return 'No disponible';
    if(!state.integration)return 'Sin configurar';
    return state.integration.enabled?'Activa':'Desactivada';
  }

  function html(){
    const i=state.integration;const cfg=i?.config||{};
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
      </div>
    </section>`;
  }

  function renderCard(){
    const host=document.querySelector('.account-sections');if(!host)return;
    const old=document.getElementById('cya-meta-settings-card');
    const tmp=document.createElement('div');tmp.innerHTML=html();const next=tmp.firstElementChild;
    if(old)old.replaceWith(next);else host.appendChild(next);
  }

  window.cyaMetaCrearORotar=async function(){
    try{
      const sheet_url=String(document.getElementById('cya-meta-sheet-url')?.value||'').trim();
      const sheet_name=String(document.getElementById('cya-meta-sheet-name')?.value||'').trim();
      if(sheet_url&&!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(sheet_url))return showToast?.('Revisa la URL de Google Sheets','warn');
      const data=await invoke({action:'create_or_rotate',label:'Meta Ads',sheet_url,sheet_name});
      state.revealed={endpoint:data.endpoint,token:data.token};state.integration=data.integration||{enabled:true,config:{sheetUrl:sheet_url,sheetName:sheet_name}};state.error='';state.loaded=true;
      renderCard();showToast?.('Integración preparada. Copia los datos al Apps Script.','success');
    }catch(error){showToast?.(error.message||String(error),'warn');}
  };
  window.cyaMetaToggle=async function(){
    try{const enabled=Boolean(state.integration?.enabled);await invoke({action:enabled?'disable':'enable'});state.revealed=null;await refreshStatus(true);showToast?.(enabled?'Integración desactivada':'Integración activada','success');}catch(error){showToast?.(error.message||String(error),'warn');}
  };
  window.cyaMetaRefrescar=()=>refreshStatus(true);

  const style=document.createElement('style');style.id='cya-meta-settings-styles';style.textContent=`
    .cya-meta-settings-card{overflow:hidden}.cya-meta-settings-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:15px 17px;border-bottom:1px solid var(--border)}.cya-meta-settings-head strong{display:block;font-family:var(--font-display);font-size:14px}.cya-meta-settings-head span:not(.cya-meta-settings-status){display:block;font-size:10px;color:var(--text-muted);margin-top:2px}.cya-meta-settings-status{font-size:9px;font-weight:700;padding:5px 8px;border-radius:999px;background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border)}.cya-meta-settings-status.is-on{color:var(--success);border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.08)}.cya-meta-settings-body{padding:18px}.cya-meta-settings-body>p{font-size:11px;line-height:1.5;color:var(--text-muted);margin:0 0 14px}.cya-meta-settings-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.cya-meta-settings-meta{display:flex;flex-direction:column;gap:4px;padding:10px 12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:10px;color:var(--text-muted)}.cya-meta-secret{display:grid;gap:8px;margin-top:12px;padding:12px;border:1px solid rgba(24,119,242,.35);background:rgba(24,119,242,.06);border-radius:var(--radius-sm)}.cya-meta-secret>strong{font-size:11px;color:#60a5fa}.cya-meta-secret label{font-size:9px;color:var(--text-muted)}.cya-meta-secret input{display:block;width:100%;margin-top:3px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text-primary);padding:7px;border-radius:4px;font:inherit}.cya-meta-secret small{font-size:9px;color:var(--text-muted);line-height:1.4}.cya-meta-settings-error{padding:9px 10px;border-left:3px solid var(--warning);background:rgba(245,158,11,.06);font-size:10px;color:var(--warning);border-radius:4px}
    @media(max-width:700px){.cya-meta-settings-head{align-items:flex-start}.cya-meta-settings-body .form-row{grid-template-columns:1fr}.cya-meta-settings-actions .btn{flex:1}}
  `;document.head.appendChild(style);

  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(document.querySelector('.account-sections')){renderCard();refreshStatus();}})}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.querySelector('.account-sections')){renderCard();refreshStatus();}
})();

/* Load Meta outcome/report enhancements from the same feature-only chain. */
(function loadMetaLeadOutcomesFromSettings(){
  if(window.__cyaMetaLeadOutcomesLoaderStarted)return;
  window.__cyaMetaLeadOutcomesLoaderStarted=true;
  const script=document.createElement('script');
  script.src='/app-meta-lead-outcomes.js?v=20261026-meta2';
  script.async=false;
  script.dataset.cyaMetaLeadOutcomes='1';
  document.head.appendChild(script);
})();
