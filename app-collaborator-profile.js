/* Collaborator profile metadata: email, birthday, portal-aware deletion and compact card details. */
(function installCollaboratorProfileMetadata(){
  if(window.__cyaCollaboratorProfileMetadataLoaded)return;
  window.__cyaCollaboratorProfileMetadataLoaded=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const normalizeEmail=value=>String(value||'').trim().toLowerCase();
  function emailValid(value){return !value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
  function birthLabel(value){if(!value)return '';const mx=typeof fechaISOaMX==='function'?fechaISOaMX(value):value;return mx||'';}

  function ensureFields(){
    const active=document.getElementById('col-activo');
    if(!active||document.getElementById('cya-col-profile-fields'))return;
    const anchor=active.closest('.form-group');
    if(!anchor)return;
    anchor.insertAdjacentHTML('beforebegin',`<div class="form-row cya-col-profile-fields" id="cya-col-profile-fields">
      <div class="form-group"><label class="form-label">Correo electrónico</label><input class="form-input" id="col-email" type="email" autocomplete="off" placeholder="correo@ejemplo.com"><div class="form-helper">Se usará como correo sugerido para el Portal de Colaboradores.</div></div>
      <div class="form-group"><label class="form-label">Fecha de nacimiento</label><input class="form-input" id="col-fecha-nacimiento" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)"><div class="form-helper">Permite mostrar la felicitación de cumpleaños en su portal.</div></div>
    </div>`);
  }

  async function invokeManage(body){
    const {data,error}=await supabaseClient.functions.invoke('manage-collaborator',{body});
    if(error){let message=error.message||'No se pudo gestionar el acceso';try{if(error.context){const detail=await error.context.json();message=detail?.error||message;}}catch(_){ }throw new Error(message);}
    if(data?.error)throw new Error(data.error);return data;
  }

  function enhanceCards(){
    for(const col of (store.colaboradores||[])){
      const email=normalizeEmail(col.email);const birth=birthLabel(col.fechaNacimiento);
      const buttons=[...document.querySelectorAll(`button[onclick="openModalColaborador('${CSS.escape(String(col.id))}')"]`)];
      for(const button of buttons){
        const tr=button.closest('tr');
        if(tr&&tr.cells?.[0]&&!tr.cells[0].querySelector('.cya-collab-profile-meta')){
          const values=[email,birth?`Nacimiento ${birth}`:''].filter(Boolean);
          if(values.length)tr.cells[0].insertAdjacentHTML('beforeend',`<div class="cya-collab-profile-meta">${values.map(safe).join(' · ')}</div>`);
        }
        const card=button.closest('.collaborator-mobile-card');
        const identity=card?.querySelector('.collaborator-mobile-identity');
        if(identity&&!identity.querySelector('.cya-collab-profile-meta')){
          const values=[email,birth?`Nacimiento ${birth}`:''].filter(Boolean);
          if(values.length)identity.insertAdjacentHTML('beforeend',`<div class="cya-collab-profile-meta">${values.map(safe).join(' · ')}</div>`);
        }
      }
    }
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=typeof openModalColaborador==='function'&&typeof guardarColaborador==='function'&&typeof eliminarColaborador==='function'&&typeof renderColaboradores==='function'&&typeof supabaseClient!=='undefined';
    if(!ready){if(attempts>500)clearInterval(timer);return;}
    if(window.__cyaCollaboratorProfileMetadataInstalled){clearInterval(timer);return;}
    window.__cyaCollaboratorProfileMetadataInstalled=true;clearInterval(timer);

    const openBase=openModalColaborador;
    openModalColaborador=function(id){
      const result=openBase.apply(this,arguments);ensureFields();
      const col=id?(store.colaboradores||[]).find(x=>x.id===id):null;
      const email=document.getElementById('col-email'),birth=document.getElementById('col-fecha-nacimiento');
      if(email)email.value=col?.email||'';
      if(birth)birth.value=birthLabel(col?.fechaNacimiento);
      return result;
    };

    const saveBase=guardarColaborador;
    guardarColaborador=function(){
      ensureFields();
      const name=String(document.getElementById('col-nombre')?.value||'').trim();
      if(!name){showToast?.('El nombre es obligatorio','warn');return;}
      const email=normalizeEmail(document.getElementById('col-email')?.value||'');
      if(!emailValid(email)){showToast?.('Revisa el correo electrónico del colaborador','warn');document.getElementById('col-email')?.focus();return;}
      const birthRaw=String(document.getElementById('col-fecha-nacimiento')?.value||'').trim();
      const birth=birthRaw?(typeof fechaMXaISO==='function'?fechaMXaISO(birthRaw):birthRaw):'';
      if(birthRaw&&!birth){showToast?.('La fecha de nacimiento no es válida. Usa dd/mm/aaaa','warn');document.getElementById('col-fecha-nacimiento')?.focus();return;}
      const existingId=editingColaboradorId||null;
      const beforeIds=new Set((store.colaboradores||[]).map(c=>c.id));
      const old=existingId?(store.colaboradores||[]).find(c=>c.id===existingId):null;
      if(old&&!isAdmin()&&old.asesorId!==sesionActiva?.id){showToast?.('No puedes modificar colaboradores de otro asesor','warn');return;}
      const result=saveBase.apply(this,arguments);
      let saved=existingId?(store.colaboradores||[]).find(c=>c.id===existingId):(store.colaboradores||[]).find(c=>!beforeIds.has(c.id));
      if(!saved)return result;
      saved.email=email;saved.fechaNacimiento=birth;
      saveStore();
      if(typeof currentPage!=='undefined'&&currentPage==='colaboradores')setTimeout(()=>renderPage('colaboradores'),0);
      return result;
    };

    eliminarColaborador=async function(){
      if(!editingColaboradorId)return;
      const id=editingColaboradorId;
      const col=(store.colaboradores||[]).find(c=>c.id===id);if(!col)return;
      if(!isAdmin()&&col.asesorId!==sesionActiva?.id){showToast?.('No puedes eliminar colaboradores de otro asesor','warn');return;}
      if(!confirm('¿Eliminar este colaborador? Su acceso al portal también será eliminado y los prospectos/clientes vinculados quedarán sin colaborador.'))return;
      try{
        await invokeManage({action:'delete_account',collaboratorId:id});
      }catch(error){showToast?.('No se eliminó el colaborador: '+error.message,'warn');return;}
      store.colaboradores=(store.colaboradores||[]).filter(c=>c.id!==id);
      (store.clientes||[]).forEach(c=>{if(c.colaboradorId===id){c.colaboradorId=null;c.colPct=0;}});
      (store.leads||[]).forEach(l=>{if(l.colaboradorId===id)l.colaboradorId=null;});
      saveStore();
      closeModal('modal-colaborador');
      editingColaboradorId=null;
      showToast?.('Colaborador y acceso al portal eliminados','info');
      renderPage('colaboradores');
    };

    const renderBase=renderColaboradores;
    renderColaboradores=function(){const html=renderBase.apply(this,arguments);setTimeout(enhanceCards,0);return html;};

    if(!document.getElementById('cya-collab-profile-styles')){
      const style=document.createElement('style');style.id='cya-collab-profile-styles';style.textContent=`
        .cya-collab-profile-meta{font-size:9px;color:var(--text-muted);margin-top:3px;line-height:1.35;overflow-wrap:anywhere;}
        .collaborator-mobile-identity .cya-collab-profile-meta{max-width:240px;}
        @media(max-width:700px){.cya-col-profile-fields{grid-template-columns:1fr!important}.cya-collab-profile-meta{font-size:8.5px}}
      `;document.head.appendChild(style);
    }
    ensureFields();
    if(typeof currentPage!=='undefined'&&currentPage==='colaboradores')renderPage('colaboradores');
  },30);
})();
