/* Phase 7 · Final portal polish: exclusive guide accordion. */
(function installCollaboratorFinalPolish(){
  if(window.__caCollaboratorFinalPolishInstalled)return;
  window.__caCollaboratorFinalPolishInstalled=true;

  const baseToggle=window.caToggleGuideCard;
  let activeGuideSlug='retiro_desempleo';

  if(typeof baseToggle==='function'){
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
