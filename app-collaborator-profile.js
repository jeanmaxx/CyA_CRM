/* Formal collaborator profile: names, surnames, email, birthday and inline portal access. */
(function installCollaboratorProfileMetadata(){
  if(window.__cyaCollaboratorProfileMetadataLoaded)return;
  window.__cyaCollaboratorProfileMetadataLoaded=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const normalizeEmail=value=>String(value||'').trim().toLowerCase();
  const upper=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-MX');
  let accountRows=[];
  let accountLoading=false;
  function emailValid(value){return !value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
  function birthLabel(value){if(!value)return '';const mx=typeof fechaISOaMX==='function'?fechaISOaMX(value):value;return mx||'';}
  function accountFor(id){return accountRows.find(row=>String(row.collaboratorId)===String(id))||null;}

  async function invokeManage(body){
    const {data,error}=await supabaseClient.functions.invoke('manage-collaborator',{body});
    if(error){let message=error.message||'No se pudo gestionar el acceso';try{if(error.context){const detail=await error.context.json();message=detail?.error||message;}}catch(_){ }throw new Error(message);}
    if(data?.error)throw new Error(data.error);return data;
  }
  async function loadAccounts(){
    if(accountLoading)return accountRows;
    accountLoading=true;
    try{const data=await invokeManage({action:'list'});accountRows=data.collaborators||[];return accountRows;}
    finally{accountLoading=false;}
  }

  function ensureFields(){
    const name=document.getElementById('col-nombre');
    const active=document.getElementById('col-activo');
    if(!name||!active)return;
    const nameGroup=name.closest('.form-group');
    const nameLabel=nameGroup?.querySelector('.form-label');if(nameLabel)nameLabel.innerHTML='Nombre(s) <span>*</span>';
    if(nameGroup&&!document.getElementById('col-apellidos')){
      nameGroup.insertAdjacentHTML('afterend',`<div class="form-group"><label class="form-label">Apellidos</label><input class="form-input input-upper" id="col-apellidos" oninput="this.value=this.value.toUpperCase()" placeholder="Apellidos del colaborador"></div>`);
    }
    const anchor=active.closest('.form-group');
    if(anchor&&!document.getElementById('cya-col-profile-fields')){
      anchor.insertAdjacentHTML('beforebegin',`<div class="form-row cya-col-profile-fields" id="cya-col-profile-fields">
        <div class="form-group"><label class="form-label">Correo electrónico</label><input class="form-input" id="col-email" type="email" autocomplete="off" placeholder="correo@ejemplo.com"><div class="form-helper">También será el correo de acceso al Portal si habilitas la cuenta.</div></div>
        <div class="form-group"><label class="form-label">Fecha de nacimiento</label><input class="form-input" id="col-fecha-nacimiento" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)"><div class="form-helper">Se usa para la felicitación de cumpleaños en su portal.</div></div>
      </div>
      <div class="cya-col-portal-box" id="cya-col-portal-box">
        <div class="cya-col-portal-title"><div><strong>Acceso al Portal de Colaboradores</strong><span>Crea o administra su cuenta sin salir de esta ficha.</span></div><span id="col-portal-chip" class="cya-access-chip is-none">Sin cuenta</span></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Estado del acceso</label><select class="form-select" id="col-portal-estado" onchange="cyaCollaboratorPortalStateChanged()"><option value="no_crear">No crear todavía</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option></select></div>
          <div class="form-group"><label class="form-label" id="col-portal-password-label">Contraseña temporal</label><input class="form-input" id="col-portal-password" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" oninput="cyaCollaboratorPasswordTyped()"><div class="form-helper">Mayúscula, minúscula, número y símbolo. Nunca se almacena en la ficha.</div></div>
        </div>
        <div class="cya-col-portal-message" id="col-portal-message"></div>
      </div>`);
    }
  }

  function setPortalVisual(row){
    const state=document.getElementById('col-portal-estado'),chip=document.getElementById('col-portal-chip'),label=document.getElementById('col-portal-password-label'),msg=document.getElementById('col-portal-message');
    if(!state||!chip)return;
    if(!row?.hasAccount){state.innerHTML='<option value="no_crear">No crear todavía</option><option value="activo">Activo — crear cuenta</option>';state.value='no_crear';chip.className='cya-access-chip is-none';chip.textContent='Sin cuenta';if(label)label.textContent='Contraseña temporal';}
    else{state.innerHTML='<option value="activo">Activo</option><option value="suspendido">Suspendido</option>';state.value=row.accountActive?'activo':'suspendido';chip.className='cya-access-chip '+(row.accountActive?'is-active':'is-inactive');chip.textContent=row.accountActive?'Acceso activo':'Acceso suspendido';if(label)label.textContent='Nueva contraseña (opcional)';}
    if(msg)msg.textContent='';
  }
  window.cyaCollaboratorPortalStateChanged=function(){const state=document.getElementById('col-portal-estado')?.value;const password=document.getElementById('col-portal-password');if(state==='no_crear'&&password)password.value='';};
  window.cyaCollaboratorPasswordTyped=function(){const password=document.getElementById('col-portal-password'),state=document.getElementById('col-portal-estado');if(password?.value&&state?.value==='no_crear'){state.value='activo';}};

  function enhanceCards(){
    for(const col of (store.colaboradores||[])){
      const email=normalizeEmail(col.email);const birth=birthLabel(col.fechaNacimiento);
      const buttons=[...document.querySelectorAll(`button[onclick="openModalColaborador('${CSS.escape(String(col.id))}')"]`)];
      for(const button of buttons){
        const tr=button.closest('tr');
        if(tr&&tr.cells?.[0]&&!tr.cells[0].querySelector('.cya-collab-profile-meta')){
          const values=[email,birth?`Nacimiento ${birth}`:''].filter(Boolean);if(values.length)tr.cells[0].insertAdjacentHTML('beforeend',`<div class="cya-collab-profile-meta">${values.map(safe).join(' · ')}</div>`);
        }
        const card=button.closest('.collaborator-mobile-card'),identity=card?.querySelector('.collaborator-mobile-identity');
        if(identity&&!identity.querySelector('.cya-collab-profile-meta')){const values=[email,birth?`Nacimiento ${birth}`:''].filter(Boolean);if(values.length)identity.insertAdjacentHTML('beforeend',`<div class="cya-collab-profile-meta">${values.map(safe).join(' · ')}</div>`);}
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
      const names=document.getElementById('col-nombre'),last=document.getElementById('col-apellidos'),email=document.getElementById('col-email'),birth=document.getElementById('col-fecha-nacimiento'),password=document.getElementById('col-portal-password');
      if(names)names.value=col?.nombres||col?.nombre||'';if(last)last.value=col?.apellidos||'';if(email)email.value=col?.email||'';if(birth)birth.value=birthLabel(col?.fechaNacimiento);if(password)password.value='';setPortalVisual(null);
      loadAccounts().then(()=>{const row=id?accountFor(id):null;if(row&&email&&!email.value)email.value=row.email||'';setPortalVisual(row);}).catch(error=>{const msg=document.getElementById('col-portal-message');if(msg)msg.textContent='No se pudo consultar el estado del acceso: '+error.message;});
      return result;
    };

    guardarColaborador=async function(){
      ensureFields();
      const nombres=upper(document.getElementById('col-nombre')?.value),apellidos=upper(document.getElementById('col-apellidos')?.value),nombre=[nombres,apellidos].filter(Boolean).join(' ');
      if(!nombres){showToast?.('El nombre es obligatorio','warn');document.getElementById('col-nombre')?.focus();return;}
      const email=normalizeEmail(document.getElementById('col-email')?.value||'');if(!emailValid(email)){showToast?.('Revisa el correo electrónico','warn');document.getElementById('col-email')?.focus();return;}
      const birthRaw=String(document.getElementById('col-fecha-nacimiento')?.value||'').trim(),birth=birthRaw?(typeof fechaMXaISO==='function'?fechaMXaISO(birthRaw):birthRaw):'';if(birthRaw&&!birth){showToast?.('La fecha de nacimiento no es válida. Usa dd/mm/aaaa','warn');return;}
      const id=editingColaboradorId||'col_'+Date.now(),old=editingColaboradorId?(store.colaboradores||[]).find(c=>c.id===editingColaboradorId):null;
      if(old&&!isAdmin()&&old.asesorId!==sesionActiva?.id){showToast?.('No puedes modificar colaboradores de otro asesor','warn');return;}
      const advisorId=isAdmin()?(getVal('col-asesor')||sesionActiva?.id):sesionActiva?.id;
      const record={...(old||{}),id,nombres,apellidos,nombre,ciudad:upper(getVal('col-ciudad')),email,fechaNacimiento:birth,asesorId,pctComision:Number(getVal('col-pct'))||50,activo:getVal('col-activo')!=='false',fechaAlta:old?.fechaAlta||new Date().toISOString().split('T')[0]};
      const portalState=document.getElementById('col-portal-estado')?.value||'no_crear',password=document.getElementById('col-portal-password')?.value||'',known=accountFor(id);
      if(portalState!=='no_crear'&&!email){showToast?.('Captura el correo para habilitar el portal','warn');return;}
      if(portalState==='activo'&&!known?.hasAccount&&!password){showToast?.('Captura una contraseña temporal para crear la cuenta','warn');document.getElementById('col-portal-password')?.focus();return;}
      const msg=document.getElementById('col-portal-message');if(msg)msg.textContent='Guardando colaborador…';
      if(old){const index=store.colaboradores.findIndex(c=>c.id===id);if(index>=0)store.colaboradores[index]=record;}else store.colaboradores.push(record);
      try{
        saveStore();if(typeof cloudSyncNow==='function'&&typeof cloudReady!=='undefined'&&cloudReady)await cloudSyncNow({throwOnError:true});
        if(portalState!=='no_crear'){
          if(msg)msg.textContent='Configurando acceso al portal…';
          await invokeManage({action:'upsert',collaboratorId:id,email,password,active:portalState==='activo'});await loadAccounts();
        }
        closeModal('modal-colaborador');editingColaboradorId=null;showToast?.(old?'Colaborador actualizado':'Colaborador creado','success');renderPage('colaboradores');
      }catch(error){if(msg)msg.textContent='El colaborador se guardó, pero revisa el acceso: '+error.message;showToast?.('Revisa la configuración del Portal de Colaboradores','warn');}
    };

    eliminarColaborador=async function(){
      if(!editingColaboradorId)return;const id=editingColaboradorId,col=(store.colaboradores||[]).find(c=>c.id===id);if(!col)return;
      if(!isAdmin()&&col.asesorId!==sesionActiva?.id){showToast?.('No puedes eliminar colaboradores de otro asesor','warn');return;}
      if(!confirm('¿Eliminar este colaborador? Su cuenta del portal también será eliminada. Los clientes y prospectos permanecerán en el CRM, pero quedarán sin colaborador.'))return;
      try{await invokeManage({action:'delete_account',collaboratorId:id});}catch(error){showToast?.('No se eliminó el colaborador: '+error.message,'warn');return;}
      store.colaboradores=(store.colaboradores||[]).filter(c=>c.id!==id);(store.clientes||[]).forEach(c=>{if(c.colaboradorId===id){c.colaboradorId=null;c.colPct=0;}});(store.leads||[]).forEach(l=>{if(l.colaboradorId===id)l.colaboradorId=null;});saveStore();
      closeModal('modal-colaborador');editingColaboradorId=null;showToast?.('Colaborador y acceso eliminados','info');renderPage('colaboradores');
    };

    const renderBase=renderColaboradores;
    renderColaboradores=function(){const html=renderBase.apply(this,arguments);setTimeout(()=>{enhanceCards();loadAccounts().then(enhanceCards).catch(()=>{});},0);return html;};

    if(!document.getElementById('cya-collab-profile-styles')){
      const style=document.createElement('style');style.id='cya-collab-profile-styles';style.textContent=`
        .cya-collab-profile-meta{font-size:9px;color:var(--text-muted);margin-top:3px;line-height:1.35;overflow-wrap:anywhere}.collaborator-mobile-identity .cya-collab-profile-meta{max-width:250px}
        .cya-col-portal-box{margin:12px 0;padding:13px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary)}.cya-col-portal-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.cya-col-portal-title strong{display:block;font-size:11px}.cya-col-portal-title span:not(.cya-access-chip){display:block;color:var(--text-muted);font-size:9px;margin-top:2px}.cya-col-portal-message{font-size:10px;color:var(--warning);min-height:14px}.cya-access-chip{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:9px;white-space:nowrap}.cya-access-chip.is-active{background:rgba(16,185,129,.1);color:var(--success)}.cya-access-chip.is-inactive{background:rgba(239,68,68,.1);color:var(--danger)}.cya-access-chip.is-none{background:var(--bg-card);color:var(--text-muted)}
        @media(max-width:700px){.cya-col-profile-fields{grid-template-columns:1fr!important}.cya-col-portal-title{align-items:flex-start}.cya-collab-profile-meta{font-size:8.5px}}
      `;document.head.appendChild(style);
    }
    ensureFields();if(typeof currentPage!=='undefined'&&currentPage==='colaboradores')renderPage('colaboradores');
  },30);
})();
