const VALID_SLUG=/^[a-z0-9][a-z0-9-]{1,59}$/i;

function cleanPath(pathname){
  let decoded=pathname;
  try{decoded=decodeURIComponent(pathname)}catch(_){}
  return decoded;
}

function legacyRedirectPath(url){
  const pathname=cleanPath(url.pathname);
  const lower=pathname.toLowerCase();

  if(lower==='/platform/site'||lower==='/platform/site/'||lower==='/platform/site/index.html')return '/';
  if(lower==='/platform/admin'||lower==='/platform/admin/'||lower==='/platform/admin/index.html')return '/admin/';
  if(lower==='/colaborador'||lower==='/colaborador/'||lower==='/colaborador/index.html')return '/C&ACRM/Colaboradores/';

  if(pathname==='/'||pathname==='/index.html'){
    const tenant=String(url.searchParams.get('tenant')||'').trim().toLowerCase();
    if(VALID_SLUG.test(tenant)){
      return tenant==='casillas-asociados'
        ? '/C&ACRM/'
        : '/app/'+encodeURIComponent(tenant)+'/';
    }
  }

  return '';
}

function routeTarget(pathname){
  const decoded=cleanPath(pathname);
  const parts=decoded.split('/').filter(Boolean);
  if(!parts.length)return null;

  if(String(parts[0]).toLowerCase()==='c&acrm'){
    return String(parts[1]||'').toLowerCase()==='colaboradores'
      ? '/colaborador/index.html'
      : '/app/index.html';
  }

  if(String(parts[0]).toLowerCase()==='app'){
    const tenant=String(parts[1]||'');
    if(!VALID_SLUG.test(tenant))return null;
    return String(parts[2]||'').toLowerCase()==='colaboradores'
      ? '/colaborador/index.html'
      : '/app/index.html';
  }

  return null;
}

function redirectResponse(request,url,path){
  const destination=new URL(path,url.origin);
  const sourceParams=new URLSearchParams(url.search);
  sourceParams.delete('tenant');
  const query=sourceParams.toString();
  if(query)destination.search=query;
  destination.hash=url.hash;
  return Response.redirect(destination.toString(),308);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);

    const legacy=legacyRedirectPath(url);
    if(legacy)return redirectResponse(request,url,legacy);

    const target=routeTarget(url.pathname);
    if(!target)return env.ASSETS.fetch(request);

    const assetUrl=new URL(request.url);
    assetUrl.pathname=target;
    assetUrl.search='';
    return env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  }
};

export {legacyRedirectPath,routeTarget};
