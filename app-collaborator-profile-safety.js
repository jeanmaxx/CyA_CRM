/* Conflict-safe collaborator profile save. Loaded after the profile enhancement module. */
(function installCollaboratorProfileSafety(){
  if(window.__cyaCollaboratorProfileSafetyLoaded)return;
  window.__cyaCollaboratorProfileSafetyLoaded=true;

  const upper=v=>String(v||'').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-MX');
  const emailNorm=v=>String(v||'').trim().toLowerCase();
  const emailValid=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  async function manage(body){
    const {data,error}=await supabaseClient.functions.invoke('manage-collaborator',{body});
    if(error){let message=error.message||'No se pudo gestionar el acceso';try{if(error.context){const detail=await error.context.json();message=detail?.error||message;}}catch(_){ }throw new Error(message);}
    if(data?.error)throw new Error(data.error);return data;
  }
  function restoreRecord(id,old,wasNew){
    if(wasNew)store.colaboradores=(store.colaboradores||[]).filter(c=>c.id!==id);
    else{
      const index=(store.colaboradores||[]).findIndex(c=>c.id===id);
      if(index>=0)store.colaboradores[index]=old;
    }
    try{saveStore();if(typeof syncJournal==='function'&&typeof syncDiff==='function')syncJournal(syncDiff());}catch(_){ }
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(!window.__cyaCollaboratorProfileMetadataInstalled||typeof guardarColaborador!=='function'||typeof cloudSyncNow!=='function'||typeof supabaseClient==='undefined'){
      if(attempts>500)clearInterval(timer);return;
    }
    clearInterval(timer);
    if(window.__cyaCollaboratorProfileSafetyInstalled)return;
    window.__cyaCollaboratorProfileSafetyInstalled=true;

    guardarColaborador=async function(){
      const nombres=upper(document.getElementById('col-nombre')?.value);
      const apellidos=upper(document.getElementById('col-apellidos')?.value);
      const nombre=[nombres,apellidos].filter(Boolean).join(' ');
      if(!nombres){showToast?.('El nombre es obligatorio','warn');document.getElementById('col-nombre')?.focus();return;}

      const email=emailNorm(document.getElementById('col-email')?.value||'');
      if(!emailValid(email)){showToast?.('Revisa el correo electrónico','warn');document.getElementById('col-email')?.focus();return;}
      const birthRaw=String(document.getElementById('col-fecha-nacimiento')?.value||'').trim();
      const birth=birthRaw?(typeof fechaMXaISO==='function'?fechaMXaISO(birthRaw):birthRaw):'';
      if(birthRaw&&!birth){showToast?.('La fecha de nacimiento no es válida. Usa dd/mm/aaaa','warn');document.getElementById('col-fecha-nacimiento')?.focus();return;}

      const id=editingColaboradorId||`col_${Date.now()}`;
      const old=editingColaboradorId?(store.colaboradores||[]).find(c=>c.id===editingColaboradorId):null;
      if(old&&!isAdmin()&&old.asesorId!==sesionActiva?.id){showToast?.('No puedes modificar colaboradores de otro asesor','warn');return;}

      let advisorId=old?.asesorId||sesionActiva?.id||null;
      if(isAdmin()){
        const selected=getVal('col-asesor');
        if(selected&&(store.asesores||[]).some(a=>a.id===selected))advisorId=selected;
      }else advisorId=sesionActiva?.id||advisorId;
      if(!advisorId){showToast?.('Selecciona un asesor responsable','warn');return;}

      const record={...(old||{}),id,nombres,apellidos,nombre,ciudad:upper(getVal('col-ciudad')),email,fechaNacimiento:birth,asesorId,pctComision:Number(getVal('col-pct'))||50,activo:getVal('col-activo')!=='false',fechaAlta:old?.fechaAlta||new Date().toISOString().split('T')[0]};
      const portalState=document.getElementById('col-portal-estado')?.value||'no_crear';
      const password=document.getElementById('col-portal-password')?.value||'';
      const msg=document.getElementById('col-portal-message');
      let known=null;
      if(portalState!=='no_crear'){
        if(!email){showToast?.('Captura el correo para habilitar el portal','warn');return;}
        try{
          const list=await manage({action:'list'});
          known=(list.collaborators||[]).find(r=>String(r.collaboratorId)===String(id))||null;
        }catch(error){if(msg)msg.textContent='No se pudo validar la cuenta del portal: '+error.message;showToast?.('No se pudo validar el acceso del colaborador','warn');return;}
        if(portalState==='activo'&&!known?.hasAccount&&!password){showToast?.('Captura una contraseña temporal para crear la cuenta','warn');document.getElementById('col-portal-password')?.focus();return;}
      }

      const wasNew=!old;
      const oldSnapshot=old?JSON.parse(JSON.stringify(old)):null;
      if(old){const index=store.colaboradores.findIndex(c=>c.id===id);if(index>=0)store.colaboradores[index]=record;}
      else store.colaboradores.push(record);

      try{
        if(msg)msg.textContent='Guardando colaborador…';
        saveStore();
        await cloudSyncNow({throwOnError:true});
      }catch(error){
        restoreRecord(id,oldSnapshot,wasNew);
        if(msg)msg.textContent='No se guardaron los cambios: '+error.message;
        showToast?.('No se guardaron los cambios del colaborador. Revisa e intenta nuevamente.','warn');
        return;
      }

      if(portalState!=='no_crear'){
        try{
          if(msg)msg.textContent='Configurando acceso al portal…';
          await manage({action:'upsert',collaboratorId:id,email,password,active:portalState==='activo'});
        }catch(error){
          if(msg)msg.textContent='Los datos del colaborador sí se guardaron. El acceso al portal requiere revisión: '+error.message;
          showToast?.('Perfil guardado; revisa el acceso al Portal','warn');
          return;
        }
      }

      closeModal('modal-colaborador');
      editingColaboradorId=null;
      showToast?.(old?'Colaborador actualizado':'Colaborador creado','success');
      renderPage('colaboradores');
    };
  },25);
})();
