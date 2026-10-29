/* One-click manual Meta Ads sync. Requires the Apps Script web-app bridge configured in Mi cuenta. */
(function installMetaLeadManualSync(){
  if(window.__cyaMetaLeadManualSyncInstalled)return;
  window.__cyaMetaLeadManualSyncInstalled=true;

  let running=false;

  async function invoke(body){
    if(typeof supabaseClient==='undefined'||!supabaseClient)throw new Error('Supabase no está disponible');
    const {data,error}=await supabaseClient.functions.invoke('manage-lead-integration',{body});
    if(error){
      let msg=error.message||'No se pudo sincronizar Meta Ads';
      let setupRequired=false;
      try{
        if(error.context){const detail=await error.context.json();msg=detail?.error||msg;setupRequired=Boolean(detail?.setup_required);}
      }catch(_){}
      const e=new Error(msg);e.setupRequired=setupRequired;throw e;
    }
    if(data?.error){const e=new Error(data.error);e.setupRequired=Boolean(data.setup_required);throw e;}
    return data;
  }

  function findButton(){return document.getElementById('cya-meta-sync-now-btn');}
  function setButtonState(active){
    const btn=findButton();if(!btn)return;
    btn.disabled=active;
    btn.textContent=active?'↻ Sincronizando…':'↻ Sincronizar Meta Ads';
    btn.setAttribute('aria-busy',active?'true':'false');
  }

  function goToSetup(){
    try{
      const nav=document.querySelector('[data-page="cuenta"]');
      if(typeof navigate==='function'){navigate('cuenta',nav);return true;}
    }catch(_){}
    return false;
  }

  window.cyaMetaSyncAhora=async function(){
    if(running)return;
    running=true;setButtonState(true);
    try{
      const data=await invoke({action:'manual_sync'});
      const result=data?.result||{};
      const processed=Number(result.processed||0);
      const label=processed===1?'1 lead procesado':`${processed} leads procesados`;
      if(typeof showToast==='function')showToast(`Meta Ads actualizado · ${label}`,'success');
      setTimeout(()=>location.reload(),650);
    }catch(error){
      const message=error?.message||String(error);
      if(error?.setupRequired||/configuración única|configurad|aplicación web/i.test(message)){
        const moved=goToSetup();
        if(typeof showToast==='function')showToast(moved?'Falta activar una sola vez la sincronización manual. Completa la sección en Mi cuenta.':'Falta activar una sola vez la sincronización manual en Mi cuenta.','warn');
      }else if(typeof showToast==='function')showToast(message,'warn');
      else alert(message);
    }finally{
      running=false;setButtonState(false);
    }
  };

  function ensureButton(){
    if(findButton())return;
    const actions=document.querySelector('.leads-toolbar-actions');if(!actions)return;
    const button=document.createElement('button');
    button.id='cya-meta-sync-now-btn';
    button.type='button';
    button.className='btn';
    button.textContent='↻ Sincronizar Meta Ads';
    button.title='Buscar ahora nuevos leads de Meta Ads sin esperar al siguiente ciclo automático';
    button.onclick=window.cyaMetaSyncAhora;
    const report=document.getElementById('cya-meta-report-btn');
    if(report&&report.parentElement===actions)report.insertAdjacentElement('afterend',button);else actions.insertBefore(button,actions.firstChild);
  }

  ensureButton();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensureButton();});
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
