(function(){
  const aliasMap=Object.freeze({'c&acrm':'casillas-asociados'});
  const validSlug=value=>/^[a-z0-9][a-z0-9-]{1,59}$/i.test(String(value||''));
  const rawPath=decodeURIComponent(window.location.pathname||'/');
  let segments=rawPath.split('/').filter(Boolean);
  if(/github\.io$/i.test(window.location.hostname||'')&&segments[0]==='CyA_CRM')segments=segments.slice(1);

  let tenantSlug='',surface='unknown',source='none',alias='';
  const first=String(segments[0]||'');
  const firstLower=first.toLowerCase();

  if(aliasMap[firstLower]){
    tenantSlug=aliasMap[firstLower];
    alias=first;
    surface=String(segments[1]||'').toLowerCase()==='colaboradores'?'collaborators':'crm';
    source='alias';
  }else if(firstLower==='app'){
    const candidate=String(segments[1]||'').toLowerCase();
    if(validSlug(candidate)){
      tenantSlug=candidate;
      surface=String(segments[2]||'').toLowerCase()==='colaboradores'?'collaborators':'crm';
      source='canonical';
    }else{
      surface='crm';
      source='app-root';
    }
  }else if(firstLower==='colaborador'){
    tenantSlug='casillas-asociados';
    surface='collaborators';
    source='legacy-collaborator';
  }

  if(!tenantSlug){
    try{
      const legacy=new URLSearchParams(window.location.search).get('tenant')||'';
      if(validSlug(legacy)){
        tenantSlug=legacy.toLowerCase();
        source='query';
        if(surface==='unknown')surface='crm';
      }
    }catch(_){}
  }

  const canonicalCrmPath=tenantSlug?'/app/'+tenantSlug+'/':'/app/';
  const canonicalCollaboratorPath=tenantSlug?'/app/'+tenantSlug+'/colaboradores/':'/app/';
  const cyaAlias=tenantSlug==='casillas-asociados'?'/C&ACRM/':'';
  const cyaCollaboratorsAlias=tenantSlug==='casillas-asociados'?'/C&ACRM/Colaboradores/':'';

  window.ALVA_TENANT_ROUTE=Object.freeze({
    tenantSlug,surface,source,alias,rawPath,
    canonicalCrmPath,canonicalCollaboratorPath,
    cyaAlias,cyaCollaboratorsAlias,
    isTenantScoped:Boolean(tenantSlug),
  });
})();