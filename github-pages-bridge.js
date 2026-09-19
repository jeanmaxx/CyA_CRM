(function(){
  const host=String(window.location.hostname||'');
  if(!/github\.io$/i.test(host))return;

  const PRODUCT_ORIGIN='https://crm-alvasd.pages.dev';
  const REPO_PREFIX='/CyA_CRM';
  const VALID_SLUG=/^[a-z0-9][a-z0-9-]{1,59}$/i;

  let pathname=decodeURIComponent(window.location.pathname||'/');
  if(pathname.toLowerCase().startsWith(REPO_PREFIX.toLowerCase())){
    pathname=pathname.slice(REPO_PREFIX.length)||'/';
  }

  const lower=pathname.toLowerCase();
  const params=new URLSearchParams(window.location.search||'');
  const legacyTenant=String(params.get('tenant')||'').trim().toLowerCase();
  params.delete('tenant');

  let target='';

  if((pathname==='/'||lower==='/index.html')&&VALID_SLUG.test(legacyTenant)){
    target=legacyTenant==='casillas-asociados'
      ? '/C&ACRM/'
      : '/app/'+encodeURIComponent(legacyTenant)+'/';
  }else if(pathname==='/'||lower==='/index.html'){
    target='/C&ACRM/';
  }else if(lower==='/platform/site'||lower==='/platform/site/'||lower.startsWith('/platform/site/')){
    target='/';
  }else if(lower==='/platform/admin'||lower==='/platform/admin/'||lower.startsWith('/platform/admin/')){
    target='/admin/';
  }else if(lower==='/colaborador'||lower==='/colaborador/'||lower.startsWith('/colaborador/')){
    target='/C&ACRM/Colaboradores/';
  }else if(lower==='/admin'||lower==='/admin/'||lower.startsWith('/admin/')){
    target='/admin/';
  }else if(lower==='/demo'||lower==='/demo/'||lower.startsWith('/demo/')){
    target='/demo/';
  }else if(lower==='/c&acrm'||lower==='/c&acrm/'||lower.startsWith('/c&acrm/')){
    target=pathname.endsWith('/')?pathname:pathname+'/';
  }else if(lower==='/app'||lower==='/app/'||lower.startsWith('/app/')){
    target=pathname;
    if(!target.endsWith('/')&&!/\.[a-z0-9]+$/i.test(target))target+='/';
  }else{
    target='/C&ACRM/';
  }

  const query=params.toString();
  const destination=PRODUCT_ORIGIN+target+(query?'?'+query:'')+(window.location.hash||'');
  if(window.location.href!==destination)window.location.replace(destination);
})();