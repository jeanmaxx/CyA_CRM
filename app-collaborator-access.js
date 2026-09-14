/* Manage collaborator portal accounts from the existing Collaborators workspace. */
(function installCollaboratorPortalAccess(){
  if(window.__cyaCollaboratorPortalAccessModuleLoaded)return;
  window.__cyaCollaboratorPortalAccessModuleLoaded=true;

  let accountsOpen=false;
  let accountRows=[];
  let editingCollaboratorId=null;
  try{accountsOpen=localStorage.getItem('cya_collab_accounts_open')==='1';}catch(_){ }

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  function currentRole(){return String(sesionActiva?.rol||sesionActiva?.role||'');}
  function canManage(){return Boolean(sesionActiva)&&['asesor','advisor','admin','tech_admin'].includes(currentRole());}
  function visibleScope(rows){
    if(!isAdmin())return rows.filter(r=>r.advisorId===sesionActiva?.id);
    if(typeof vistaActual==='undefined'||vistaActual==='director')return rows;
    if(vistaActual==='propia')return rows.filter(r=>r.advisorId===sesionActiva?.id);
    return rows.filter(r=>r.advisorId===vistaActual);
  }
  function statusChip(row){
    if(!row.hasAccount)return '<span class="cya-access-chip is-none">Sin cuenta</span>';
    return row.accountActive?'<span class="cya-access-chip is-active">Acceso activo</span>':'<span class="cya-access-chip is-inactive">Acceso suspendido</span>';
  }
  function accountCard(){
    if(!canManage())return '';
    return `<section class="card cya-collab-access-card">
      <button class="cya-collab-access-head" type="button" onclick="cyaToggleCollaboratorAccounts()" aria-expanded="${accountsOpen}">
        <span><b>${accountsOpen?'▾':'▸'}</b><span><strong>Accesos al Portal de Colaboradores</strong><small>Correo, contraseña y alta o baja de las cuentas vinculadas</small></span></span>
        <span class="cya-collab-access-hint">${accountsOpen?'Minimizar':'Administrar'}</span>
      </button>
      ${accountsOpen?'<div id="cya-collab-access-body" class="cya-collab-access-body"><div class="cya-access-loading">Cargando accesos…</div></div>':''}
    </section>`;
  }

  async function invokeManage(body){
    const {data,error}=await supabaseClient.functions.invoke('manage-collaborator',{body});
    if(error){
      let message=error.message||'No se pudo gestionar la cuenta';
      try{if(error.context){const detail=await error.context.json();message=detail?.error||message;}}catch(_){ }
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  }

  function renderAccounts(){
    const body=document.getElementById('cya-collab-access-body');if(!body)return;
    const rows=visibleScope(accountRows);
    if(!rows.length){body.innerHTML='<div class="cya-access-empty">No hay colaboradores en la vista seleccionada.</div>';return;}
    body.innerHTML=`<div class="cya-access-list">${rows.map(row=>`<div class="cya-access-row">
      <div class="cya-access-person"><div class="cya-access-avatar">${safe(typeof initials==='function'?initials(row.name):String(row.name||'?').slice(0,2))}</div><div><strong>${safe(row.name)}</strong><span>${row.email?safe(row.email):'Sin correo de acceso'}</span></div></div>
      <div>${statusChip(row)}</div>
      <button class="btn" type="button" onclick="cyaOpenCollaboratorAccount('${safe(row.collaboratorId)}')">${row.hasAccount?'Administrar':'Crear acceso'}</button>
    </div>`).join('')}</div>`;
  }

  async function loadAccounts(force=false){
    if(!accountsOpen&&!force)return;
    const body=document.getElementById('cya-collab-access-body');if(body)body.innerHTML='<div class="cya-access-loading">Cargando accesos…</div>';
    try{const data=await invokeManage({action:'list'});accountRows=data.collaborators||[];renderAccounts();}
    catch(error){if(body)body.innerHTML=`<div class="cya-access-error">${safe(error.message)}</div>`;}
  }
  window.cyaLoadCollaboratorAccounts=loadAccounts;
  window.cyaToggleCollaboratorAccounts=function(){accountsOpen=!accountsOpen;try{localStorage.setItem('cya_collab_accounts_open',accountsOpen?'1':'0');}catch(_){ }renderPage('colaboradores');};

  function ensureModal(){
    if(document.getElementById('cya-collab-account-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="cya-collab-account-modal" style="display:none;">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header"><div><div class="modal-title" id="cya-collab-account-title">Acceso al portal</div><div id="cya-collab-account-sub" style="font-size:10px;color:var(--text-muted);margin-top:3px;"></div></div><button class="btn btn-icon" type="button" onclick="cyaCloseCollaboratorAccount()">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Correo de acceso</label><input id="cya-collab-account-email" class="form-input" type="email" autocomplete="off" placeholder="correo@ejemplo.com"></div>
          <div class="form-group"><label class="form-label" id="cya-collab-password-label">Contraseña temporal</label><input id="cya-collab-account-password" class="form-input" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres"><div class="form-helper">Mayúscula, minúscula, número y símbolo. En una cuenta existente déjala vacía para conservar la contraseña actual.</div></div>
          <div class="form-group"><label class="form-label">Estado de acceso</label><select id="cya-collab-account-active" class="form-select"><option value="true">Activo</option><option value="false">Suspendido</option></select></div>
          <div id="cya-collab-account-message" style="font-size:11px;color:var(--danger);min-height:16px;margin-top:6px;"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:space-between;gap:10px;">
          <button id="cya-collab-account-deactivate" class="btn" type="button" style="color:var(--danger);display:none;" onclick="cyaDeactivateCollaboratorAccount()">Dar de baja</button>
          <div style="display:flex;gap:8px;margin-left:auto;"><button class="btn" type="button" onclick="cyaCloseCollaboratorAccount()">Cancelar</button><button id="cya-collab-account-save" class="btn btn-primary" type="button" onclick="cyaSaveCollaboratorAccount()">Guardar acceso</button></div>
        </div>
      </div>
    </div>`);
  }

  window.cyaOpenCollaboratorAccount=function(id){
    ensureModal();const row=accountRows.find(x=>x.collaboratorId===id);if(!row)return;
    editingCollaboratorId=id;
    document.getElementById('cya-collab-account-title').textContent=row.hasAccount?'Administrar acceso':'Crear acceso';
    document.getElementById('cya-collab-account-sub').textContent=row.name;
    document.getElementById('cya-collab-account-email').value=row.email||'';
    document.getElementById('cya-collab-account-password').value='';
    document.getElementById('cya-collab-account-active').value=row.accountActive?'true':'false';
    if(!row.hasAccount)document.getElementById('cya-collab-account-active').value='true';
    document.getElementById('cya-collab-account-message').textContent='';
    document.getElementById('cya-collab-account-deactivate').style.display=row.hasAccount&&row.accountActive?'':'none';
    document.getElementById('cya-collab-password-label').textContent=row.hasAccount?'Nueva contraseña (opcional)':'Contraseña temporal';
    document.getElementById('cya-collab-account-modal').style.display='flex';
    setTimeout(()=>document.getElementById('cya-collab-account-email')?.focus(),20);
  };
  window.cyaCloseCollaboratorAccount=function(){const modal=document.getElementById('cya-collab-account-modal');if(modal)modal.style.display='none';editingCollaboratorId=null;};
  window.cyaSaveCollaboratorAccount=async function(){
    if(!editingCollaboratorId)return;const message=document.getElementById('cya-collab-account-message');const save=document.getElementById('cya-collab-account-save');
    const email=document.getElementById('cya-collab-account-email').value.trim();const password=document.getElementById('cya-collab-account-password').value;const active=document.getElementById('cya-collab-account-active').value==='true';
    if(!email){message.textContent='Captura el correo de acceso.';return;}
    try{save.disabled=true;message.textContent='Guardando…';await invokeManage({action:'upsert',collaboratorId:editingCollaboratorId,email,password,active});showToast?.('Acceso del colaborador actualizado','success');window.cyaCloseCollaboratorAccount();await loadAccounts(true);}
    catch(error){message.textContent=error.message;}finally{save.disabled=false;}
  };
  window.cyaDeactivateCollaboratorAccount=async function(){
    if(!editingCollaboratorId||!confirm('¿Dar de baja el acceso al Portal de Colaboradores? El registro del colaborador y sus clientes se conservarán.'))return;
    const message=document.getElementById('cya-collab-account-message');
    try{message.textContent='Suspendiendo acceso…';await invokeManage({action:'deactivate',collaboratorId:editingCollaboratorId});showToast?.('Acceso suspendido','info');window.cyaCloseCollaboratorAccount();await loadAccounts(true);}
    catch(error){message.textContent=error.message;}
  };

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof renderColaboradores!=='function'||typeof renderPage!=='function'||typeof supabaseClient==='undefined'||!window.__cyaCollaboratorViewScopeInstalled){if(attempts>500)clearInterval(installer);return;}
    if(window.__cyaCollaboratorPortalAccessInstalled){clearInterval(installer);return;}
    window.__cyaCollaboratorPortalAccessInstalled=true;clearInterval(installer);
    const base=renderColaboradores;
    renderColaboradores=function(){const html=base.apply(this,arguments);setTimeout(()=>loadAccounts(),30);return `${html}${accountCard()}`;};

    if(!document.getElementById('cya-collab-access-styles')){
      const style=document.createElement('style');style.id='cya-collab-access-styles';style.textContent=`
        .cya-collab-access-card{margin-top:16px;overflow:hidden;}
        .cya-collab-access-head{width:100%;border:0;background:transparent;color:inherit;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left;cursor:pointer;}
        .cya-collab-access-head>span:first-child{display:flex;align-items:center;gap:10px}.cya-collab-access-head b{color:var(--text-muted);width:12px}.cya-collab-access-head strong{display:block;font-size:13px}.cya-collab-access-head small{display:block;color:var(--text-muted);font-size:10px;font-weight:400;margin-top:2px}.cya-collab-access-hint{font-size:10px;color:var(--text-muted)}
        .cya-collab-access-body{border-top:1px solid var(--border)}.cya-access-list{display:grid}.cya-access-row{display:grid;grid-template-columns:minmax(220px,1fr) 150px auto;gap:14px;align-items:center;padding:11px 14px;border-bottom:1px solid var(--border)}.cya-access-row:last-child{border-bottom:0}.cya-access-person{display:flex;align-items:center;gap:10px;min-width:0}.cya-access-avatar{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--bg-secondary);font-size:10px;font-weight:600}.cya-access-person strong{display:block;font-size:11px}.cya-access-person span{display:block;color:var(--text-muted);font-size:9px;margin-top:2px;overflow:hidden;text-overflow:ellipsis}.cya-access-chip{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:9px}.cya-access-chip.is-active{background:rgba(16,185,129,.1);color:var(--success)}.cya-access-chip.is-inactive{background:rgba(239,68,68,.1);color:var(--danger)}.cya-access-chip.is-none{background:var(--bg-secondary);color:var(--text-muted)}.cya-access-loading,.cya-access-empty,.cya-access-error{padding:18px;text-align:center;font-size:10px;color:var(--text-muted)}.cya-access-error{color:var(--danger)}
        @media(max-width:720px){.cya-access-row{grid-template-columns:1fr auto}.cya-access-row>div:nth-child(2){grid-column:1}.cya-access-row>.btn{grid-row:1/3;grid-column:2;align-self:center}.cya-collab-access-head{padding:12px}.cya-collab-access-hint{display:none}}
      `;document.head.appendChild(style);
    }
    if(currentPage==='colaboradores')renderPage('colaboradores');
  },30);
})();
