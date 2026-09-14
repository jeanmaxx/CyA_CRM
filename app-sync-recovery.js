/* Recovery guard for collaborator drafts created before portal/profile saves were separated. */
(function installCollaboratorDraftRecovery(){
  if(window.__cyaCollaboratorDraftRecoveryLoaded)return;
  window.__cyaCollaboratorDraftRecoveryLoaded=true;
  if(typeof syncInitialize!=='function')return;

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
      // If the server already contains the same profile data, this also clears the stale conflict automatically.
      if(repaired&&typeof syncJournal==='function'&&typeof syncDiff==='function')syncJournal(syncDiff());
    }catch(error){console.warn('Collaborator draft recovery skipped',error);}
    return result;
  };
})();
