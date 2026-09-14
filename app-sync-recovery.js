/* Recovery guard for collaborator drafts created before portal/profile saves were separated. */
(function installCollaboratorDraftRecovery(){
  if(window.__cyaCollaboratorDraftRecoveryLoaded)return;
  window.__cyaCollaboratorDraftRecoveryLoaded=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof syncInitialize!=='function'||typeof syncDiff!=='function'||typeof syncJournal!=='function'){
      if(attempts>500)clearInterval(timer);
      return;
    }
    clearInterval(timer);
    if(window.__cyaCollaboratorDraftRecoveryInstalled)return;
    window.__cyaCollaboratorDraftRecoveryInstalled=true;

    const baseInitialize=syncInitialize;
    syncInitialize=function(userId){
      const result=baseInitialize.apply(this,arguments);
      try{
        const baseline=syncBaseline?.collaborators||{};
        let repaired=false;
        for(const col of (store?.colaboradores||[])){
          const knownOwner=Boolean(col?.asesorId&&(store?.asesores||[]).some(a=>a.id===col.asesorId));
          if(knownOwner)continue;
          const saved=baseline[col.id];
          const owner=saved?.advisor_id||saved?.payload?.asesorId||null;
          if(owner&&(store?.asesores||[]).some(a=>a.id===owner)){
            col.asesorId=owner;
            repaired=true;
          }
        }
        // Rebuild the durable draft after repairing only invalid/missing collaborator ownership.
        // If Supabase already contains the same profile data, syncDiff becomes empty and the stale draft disappears.
        if(repaired)syncJournal(syncDiff());
      }catch(error){console.warn('Collaborator draft recovery skipped',error);}
      return result;
    };
  },10);
})();

/* Load the CURP + client eligibility enhancement only after the final operational
   wrappers are installed. This keeps the deployment additive and avoids changing
   the numeric tab indexes used by the existing client workflow. */
(function loadCurpClientEligibilitySafely(){
  if(window.__cyaCurpClientEligibilityLoaderStarted)return;
  window.__cyaCurpClientEligibilityLoaderStarted=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const workflowReady=
      typeof openModalCliente==='function'&&
      typeof editCliente==='function'&&
      typeof openPerfil==='function'&&
      typeof sincronizarCitaAfore==='function'&&
      typeof renderElegContainer==='function';
    if(!workflowReady){
      if(attempts>500)clearInterval(timer);
      return;
    }
    clearInterval(timer);
    if(document.querySelector('script[data-cya-curp-client-eligibility]'))return;
    const script=document.createElement('script');
    script.src='app-curp-client-eligibility.js?v=20260914-1';
    script.async=false;
    script.dataset.cyaCurpClientEligibility='1';
    document.head.appendChild(script);
  },25);
})();

/* Load client ownership controls after the eligibility wrapper is active, so both
   additive modules keep their behavior without replacing the core CRM files. */
(function loadClientAdvisorOwnershipSafely(){
  if(window.__cyaClientAdvisorOwnershipLoaderStarted)return;
  window.__cyaClientAdvisorOwnershipLoaderStarted=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=
      window.__cyaCurpClientEligibilityInstalled===true&&
      typeof openModalCliente==='function'&&
      typeof editCliente==='function'&&
      typeof guardarCliente==='function'&&
      typeof openPerfil==='function'&&
      typeof renderBuscadorProspectos==='function'&&
      typeof irAProspecto==='function'&&
      typeof filtrarClientes==='function';
    if(!ready){
      if(attempts>500)clearInterval(timer);
      return;
    }
    clearInterval(timer);
    if(document.querySelector('script[data-cya-client-advisor]'))return;
    const script=document.createElement('script');
    script.src='app-client-advisor.js?v=20260914-1';
    script.async=false;
    script.dataset.cyaClientAdvisor='1';
    document.head.appendChild(script);
  },25);
})();

/* Advisor transfer requests depend on the ownership module above. Advisors only
   request; administrators remain the only users who can actually change ownership. */
(function loadClientAdvisorRequestsSafely(){
  if(window.__cyaClientAdvisorRequestsLoaderStarted)return;
  window.__cyaClientAdvisorRequestsLoaderStarted=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=
      window.__cyaClientAdvisorOwnershipInstalled===true&&
      typeof openPerfil==='function'&&
      typeof renderDashboard==='function'&&
      typeof cloudSyncNow==='function';
    if(!ready){
      if(attempts>500)clearInterval(timer);
      return;
    }
    clearInterval(timer);
    if(document.querySelector('script[data-cya-client-advisor-requests]'))return;
    const script=document.createElement('script');
    script.src='app-client-advisor-requests.js?v=20260914-1';
    script.async=false;
    script.dataset.cyaClientAdvisorRequests='1';
    document.head.appendChild(script);
  },25);
})();