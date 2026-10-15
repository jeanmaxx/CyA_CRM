/* Unified collaborator administration: the main collaborator list is the single entry point.
   Portal email/password/status stay inside the collaborator profile modal. */
(function installUnifiedCollaboratorAdministration(){
  if(window.__cyaCollaboratorPortalAccessModuleLoaded)return;
  window.__cyaCollaboratorPortalAccessModuleLoaded=true;

  let accountRows=[];
  let loading=false;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  function rowFor(id){return accountRows.find(row=>String(row.collaboratorId)===String(id))||null;}
  function statusMarkup(row){
    if(!row?.hasAccount)return '<span class="cya-unified-access-chip is-none" title="Sin cuenta en el Portal de Colaboradores">Sin acceso</span>';
    return row.accountActive
      ?'<span class="cya-unified-access-chip is-active" title="Acceso activo al Portal de Colaboradores">Portal activo</span>'
      :'<span class="cya-unified-access-chip is-inactive" title="Acceso suspendido al Portal de Colaboradores">Portal suspendido</span>';
  }

  async function invokeManage(body){
    const {data,error}=await supabaseClient.functions.invoke('manage-collaborator',{body});
    if(error){
      let message=error.message||'No se pudo consultar el acceso del colaborador';
      try{if(error.context){const detail=await error.context.json();message=detail?.error||message;}}catch(_){ }
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  }

  function collaboratorIdFromButton(button){
    const onclick=String(button.getAttribute('onclick')||'');
    const match=onclick.match(/openModalColaborador\((['"])(.*?)\1\)/);
    return match?match[2]:null;
  }

  function decorateButton(button,id){
    if(!button||!id)return;
    button.classList.add('btn-icon','cya-collaborator-config-button');
    button.textContent='⚙';
    button.title='Configurar colaborador';
    button.setAttribute('aria-label','Configurar colaborador');
    button.dataset.cyaUnifiedCollaborator='1';

    const row=rowFor(id);
    const parent=button.parentElement;
    if(parent){
      let chip=parent.querySelector(`.cya-unified-access-chip[data-collaborator-id="${CSS.escape(String(id))}"]`);
      if(!chip){
        const holder=document.createElement('span');
        holder.innerHTML=statusMarkup(row);
        chip=holder.firstElementChild;
        if(chip){chip.dataset.collaboratorId=String(id);parent.insertBefore(chip,button);}
      }else{
        const holder=document.createElement('span');holder.innerHTML=statusMarkup(row);const fresh=holder.firstElementChild;
        if(fresh){fresh.dataset.collaboratorId=String(id);chip.replaceWith(fresh);}
      }
    }
  }

  function decorateList(){
    document.querySelectorAll('button[onclick*="openModalColaborador("]').forEach(button=>{
      const id=collaboratorIdFromButton(button);
      if(id)decorateButton(button,id);
    });

    // Remove the old duplicated access panel if an older cached script rendered it before this module loaded.
    document.querySelectorAll('.cya-collab-access-card').forEach(node=>node.remove());
  }

  async function loadAccounts(force=false){
    if(loading&&!force){decorateList();return accountRows;}
    loading=true;
    decorateList();
    try{
      const data=await invokeManage({action:'list'});
      accountRows=data.collaborators||[];
      decorateList();
      return accountRows;
    }catch(error){
      console.warn('No se pudo consultar el estado de accesos de colaboradores:',error);
      decorateList();
      return accountRows;
    }finally{loading=false;}
  }
  window.cyaLoadCollaboratorAccounts=loadAccounts;

  // Compatibility: old controls no longer open a second list. The main list is authoritative.
  window.cyaToggleCollaboratorAccounts=function(){
    if(typeof renderPage==='function')renderPage('colaboradores');
    setTimeout(()=>loadAccounts(true),20);
  };
  window.cyaOpenCollaboratorAccount=function(id){
    if(typeof openModalColaborador==='function')openModalColaborador(id);
  };
  window.cyaCloseCollaboratorAccount=function(){};
  window.cyaSaveCollaboratorAccount=function(){};
  window.cyaDeactivateCollaboratorAccount=function(){};

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof renderColaboradores!=='function'||typeof renderPage!=='function'||typeof supabaseClient==='undefined'||!window.__cyaCollaboratorViewScopeInstalled){
      if(attempts>500)clearInterval(installer);return;
    }
    if(window.__cyaCollaboratorPortalAccessInstalled){clearInterval(installer);return;}
    window.__cyaCollaboratorPortalAccessInstalled=true;
    clearInterval(installer);

    const base=renderColaboradores;
    renderColaboradores=function(){
      const html=base.apply(this,arguments);
      setTimeout(()=>{decorateList();loadAccounts();},0);
      return html;
    };

    if(!document.getElementById('cya-collab-access-styles')){
      const style=document.createElement('style');
      style.id='cya-collab-access-styles';
      style.textContent=`
        .cya-collaborator-config-button{font-size:14px!important;line-height:1!important;min-width:30px;}
        .cya-unified-access-chip{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 8px;font-size:9px;white-space:nowrap;margin-right:6px;vertical-align:middle;}
        .cya-unified-access-chip.is-active{background:rgba(16,185,129,.1);color:var(--success)}
        .cya-unified-access-chip.is-inactive{background:rgba(239,68,68,.1);color:var(--danger)}
        .cya-unified-access-chip.is-none{background:var(--bg-secondary);color:var(--text-muted)}
        @media(max-width:720px){.cya-unified-access-chip{padding:3px 6px;font-size:8px;margin-right:4px}.cya-collaborator-config-button{min-width:28px}}
      `;
      document.head.appendChild(style);
    }

    if(typeof currentPage!=='undefined'&&currentPage==='colaboradores'){
      setTimeout(()=>{decorateList();loadAccounts(true);},20);
    }
  },30);
})();
