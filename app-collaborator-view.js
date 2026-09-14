/* Collaborators view scope: own / director / specific advisor. */
(function installCollaboratorViewScope(){
  if(window.__cyaCollaboratorViewScopeModuleLoaded)return;
  window.__cyaCollaboratorViewScopeModuleLoaded=true;

  let contextualViewActive=false;
  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=typeof renderColaboradores==='function'&&typeof getSelectorVistaHTML==='function'&&typeof cambiarVista==='function'&&typeof isAdmin==='function'&&typeof renderPage==='function'&&window.__cyaPersonnelWorkspaceInstalled;
    if(!ready){if(attempts>500)clearInterval(installer);return;}
    if(window.__cyaCollaboratorViewScopeInstalled){clearInterval(installer);return;}
    window.__cyaCollaboratorViewScopeInstalled=true;
    clearInterval(installer);

    function advisorScope(){
      if(!sesionActiva?.id)return null;
      if(!isAdmin())return sesionActiva.id;
      if(vistaActual==='director')return null;
      if(vistaActual==='propia')return sesionActiva.id;
      return vistaActual||sesionActiva.id;
    }

    function injectSelector(html){
      if(!isAdmin())return html;
      const selector=getSelectorVistaHTML(true);
      if(!selector)return html;
      const target='<button class="btn btn-primary" onclick="openModalColaborador()">+ Nuevo colaborador</button>';
      if(!html.includes(target))return html;
      return html.replace(target,`<div class="cya-collab-toolbar-actions">${selector}${target}</div>`);
    }

    const renderCollaboratorsScopedBase=renderColaboradores;
    renderColaboradores=function(){
      const original=store.colaboradores;
      const scope=advisorScope();
      if(scope)store.colaboradores=(original||[]).filter(c=>c.asesorId===scope);
      let html='';
      try{html=renderCollaboratorsScopedBase.apply(this,arguments);}
      finally{store.colaboradores=original;}
      return injectSelector(html);
    };

    if(typeof window.cyaAbrirColaboradoresAsesor==='function'){
      const openFromPersonnelBase=window.cyaAbrirColaboradoresAsesor;
      window.cyaAbrirColaboradoresAsesor=function(id){
        contextualViewActive=true;
        if(typeof vistaActual!=='undefined')vistaActual=id;
        return openFromPersonnelBase.apply(this,arguments);
      };
    }

    if(typeof window.cyaQuitarFiltroColaboradores==='function'){
      const clearContextBase=window.cyaQuitarFiltroColaboradores;
      window.cyaQuitarFiltroColaboradores=function(){
        contextualViewActive=false;
        if(typeof vistaActual!=='undefined'&&isAdmin())vistaActual='director';
        return clearContextBase.apply(this,arguments);
      };
    }

    const cambiarVistaBase=cambiarVista;
    cambiarVista=function(value){
      if(currentPage==='colaboradores'&&contextualViewActive&&typeof window.cyaQuitarFiltroColaboradores==='function'){
        contextualViewActive=false;
        const clear=window.cyaQuitarFiltroColaboradores;
        const previous=vistaActual;
        try{
          if(typeof vistaActual!=='undefined')vistaActual=previous;
          clear();
        }catch(e){}
      }
      return cambiarVistaBase.apply(this,arguments);
    };

    if(!document.getElementById('cya-collaborator-view-styles')){
      const style=document.createElement('style');
      style.id='cya-collaborator-view-styles';
      style.textContent=`
        .cya-collab-toolbar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;}
        .cya-collab-toolbar-actions #selector-vista{min-width:155px;}
        @media(max-width:760px){
          .collaborators-toolbar{align-items:flex-start!important;}
          .cya-collab-toolbar-actions{width:100%;justify-content:space-between;}
          .cya-collab-toolbar-actions>div{flex:1 1 auto;}
        }
      `;
      document.head.appendChild(style);
    }

    if(currentPage==='colaboradores')renderPage('colaboradores');
  },30);
})();

// Portal account controls are loaded after the view-scope wrapper so both features compose safely.
(function loadCollaboratorPortalAccess(){
  if(document.querySelector('script[data-cya-collaborator-access]'))return;
  const script=document.createElement('script');
  script.src='app-collaborator-access.js?v=20260914-2';
  script.async=false;
  script.dataset.cyaCollaboratorAccess='1';
  document.head.appendChild(script);
})();

// Profile metadata is kept in the collaborator record and is shared with the portal.
(function loadCollaboratorProfileMetadata(){
  if(document.querySelector('script[data-cya-collaborator-profile]'))return;
  const script=document.createElement('script');
  script.src='app-collaborator-profile.js?v=20260914-3';
  script.async=false;
  script.dataset.cyaCollaboratorProfile='1';
  document.head.appendChild(script);
})();

// Administration can maintain the educational content shown in Información / Guía.
(function loadCollaboratorGuideAdmin(){
  if(document.querySelector('script[data-cya-collaborator-guide-admin]'))return;
  const script=document.createElement('script');
  script.src='app-collaborator-guide-admin.js?v=20260914-1';
  script.async=false;
  script.dataset.cyaCollaboratorGuideAdmin='1';
  document.head.appendChild(script);
})();
