/* C&A CRM login branding bootstrap.
   Runs once before cloud-config.js. It locks only the public C&A branding
   without observing or rewriting the application DOM continuously. */
(function installCyaBrandBootstrap(){
  if(window.__cyaBrandBootstrapInstalled)return;

  const route=window.ALVA_TENANT_ROUTE||null;
  const pathname=String(location.pathname||'').toLowerCase();
  const tenant=String(route?.tenantSlug||'').toLowerCase();
  const isCya=tenant==='casillas-asociados'||pathname.includes('/app/casillas-asociados/')||pathname.includes('/c&acrm/')||(!tenant&&(pathname==='/app/'||pathname==='/app'));
  if(!isCya)return;

  window.__cyaBrandBootstrapInstalled=true;

  const CYA_BRAND=Object.freeze({
    companyName:'Casillas & Asociados',
    appName:'C&A CRM Suite',
    logoUrl:'https://crm-alvasd.pages.dev/assets/brand/cya-logo-dark.svg?v=20260919-brand-clean1',
    isTenant:false,
  });

  let currentBrand=CYA_BRAND;
  try{
    Object.defineProperty(window,'CA_TENANT_PUBLIC_BRAND',{
      configurable:true,
      enumerable:true,
      get(){return currentBrand;},
      set(value){
        if(value&&typeof value==='object'){
          currentBrand={...value,...CYA_BRAND};
        }
      },
    });
  }catch(_){
    window.CA_TENANT_PUBLIC_BRAND=CYA_BRAND;
  }

  const style=document.createElement('style');
  style.id='cya-login-brand-static-style';
  style.textContent=`
    #login-screen .login-unified-brand-panel,
    #login-screen .login-unified-copy,
    #login-screen .login-pin-wrap{
      text-align:center!important;
    }
    #login-screen .login-unified-brand-panel,
    #login-screen .login-unified-copy{
      align-items:center!important;
      justify-content:center!important;
    }
    #login-screen .login-eyebrow,
    #login-screen #login-app-name,
    #login-screen .login-sub,
    #login-screen #login-pin-title,
    #login-screen #login-pin-sub{
      width:100%!important;
      text-align:center!important;
    }
    #login-screen #login-logo-wrap{
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #login-screen #login-logo-wrap img{
      object-fit:contain!important;
      background:transparent!important;
    }
  `;
  (document.head||document.documentElement).appendChild(style);
})();
