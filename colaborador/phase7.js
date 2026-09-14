/* Phase 7 · Final portal polish: exclusive guide accordion + shared C&A logo. */
(function installCollaboratorFinalPolish(){
  if(window.__caCollaboratorFinalPolishInstalled)return;
  window.__caCollaboratorFinalPolishInstalled=true;

  // Single shared source for the C&A mark used by the login and portal profile/brand areas.
  // Replacing this existing asset updates every portal placement automatically.
  const SHARED_LOGO='../assets/icons/icon-192x192.png';

  function installSharedLogo(){
    if(!document.getElementById('ca-shared-logo-styles')){
      const style=document.createElement('style');
      style.id='ca-shared-logo-styles';
      style.textContent=`
        :root{--ca-portal-shared-logo:url("${SHARED_LOGO}");}
        .login-brand .brand-mark,
        .sidebar-brand .brand-mark,
        .sidebar-user .user-avatar{
          background-image:var(--ca-portal-shared-logo)!important;
          background-position:center!important;
          background-repeat:no-repeat!important;
          background-size:cover!important;
          color:transparent!important;
          font-size:0!important;
          text-shadow:none!important;
        }
        .login-brand .brand-mark{box-shadow:0 8px 22px rgba(0,0,0,.18);}
        .sidebar-brand .brand-mark{box-shadow:0 5px 14px rgba(0,0,0,.16);}
        .sidebar-user .user-avatar{
          border:1px solid rgba(201,169,110,.35);
          box-shadow:0 4px 12px rgba(0,0,0,.18);
        }
      `;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.login-brand .brand-mark,.sidebar-brand .brand-mark,.sidebar-user .user-avatar').forEach(el=>{
      el.setAttribute('role','img');
      el.setAttribute('aria-label','Logo de Casillas & Asociados');
      el.title='Casillas & Asociados';
    });
  }

  installSharedLogo();
  new MutationObserver(installSharedLogo).observe(document.documentElement,{childList:true,subtree:true});

  // Phase 4 originally allowed multiple cards to remain open. Keep the same content,
  // but normalize it to a true accordion: opening one card closes the previous one.
  const baseToggle=window.caToggleGuideCard;
  let activeGuideSlug='retiro_desempleo';

  if(typeof baseToggle==='function'){
    // Phase 4 starts with Retiro por desempleo + Proceso open. Close Proceso once so
    // the guide begins in a valid single-open state on desktop and mobile alike.
    try{baseToggle('proceso');}catch(_){ }

    window.caToggleGuideCard=function(slug){
      slug=String(slug||'');
      if(!slug)return;

      if(activeGuideSlug===slug){
        baseToggle(slug);
        activeGuideSlug='';
        return;
      }

      const previous=activeGuideSlug;
      if(previous)baseToggle(previous);
      baseToggle(slug);
      activeGuideSlug=slug;
    };
  }
})();
