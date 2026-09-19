const VALID_SLUG=/^[a-z0-9][a-z0-9-]{1,59}$/i;

function routeTarget(pathname){
  let decoded=pathname;
  try{decoded=decodeURIComponent(pathname)}catch(_){}
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

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const target=routeTarget(url.pathname);
    if(!target)return env.ASSETS.fetch(request);
    const assetUrl=new URL(request.url);
    assetUrl.pathname=target;
    assetUrl.search='';
    return env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  }
};

export {routeTarget};
