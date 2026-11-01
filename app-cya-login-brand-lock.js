/* C&A login brand lock
   Prevents the generic ALVA platform fallback from flashing while the
   casillas-asociados tenant branding resolves. Runs before cloud-config.js. */
(function installCyaLoginBrandLock(){
  if(window.__cyaLoginBrandLockInstalled)return;

  const route=window.ALVA_TENANT_ROUTE||null;
  const pathname=String(location.pathname||'').toLowerCase();
  const tenant=String(route?.tenantSlug||'').toLowerCase();
  const isCya=tenant==='casillas-asociados'||pathname.includes('/app/casillas-asociados/')||pathname.includes('/c&acrm/')||(!tenant&&pathname.includes('/app/'));
  if(!isCya)return;
  window.__cyaLoginBrandLockInstalled=true;

  const LOGO='/assets/brand/cya-logo-dark.svg?v=20260919-brand-clean1';
  const APP_NAME='C&A CRM Suite';
  const COMPANY='Casillas & Asociados';

  function installStyle(){
    if(document.getElementById('cya-login-brand-lock-style'))return;
    const style=document.createElement('style');
    style.id='cya-login-brand-lock-style';
    style.textContent=`
      #login-screen .login-unified-brand-panel,
      #login-screen .login-unified-copy{
        text-align:center!important;
        align-items:center!important;
        justify-content:center!important;
      }
      #login-screen #login-app-name,
      #login-screen .login-sub,
      #login-screen .login-eyebrow{
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
  }

  function enforce(){
    installStyle();
    document.title='C&A CRM Suite';

    const appName=document.getElementById('login-app-name');
    if(appName&&appName.textContent!==APP_NAME)appName.textContent=APP_NAME;

    const sub=document.querySelector('#login-screen .login-sub');
    const subText=`${COMPANY} — Acceso seguro`;
    if(sub&&sub.textContent!==subText){sub.textContent=subText;sub.style.display='block';}

    const wrap=document.getElementById('login-logo-wrap');
    if(!wrap)return;
    let img=wrap.querySelector('img');
    const src=img?.getAttribute('src')||'';
    if(!img||!src.includes('/assets/brand/cya-logo-dark.svg')){
      wrap.innerHTML=`<img src="${LOGO}" alt="${COMPANY}" data-public-brand-url="${LOGO}" style="width:100%;height:100%;object-fit:contain;background:transparent;">`;
      img=wrap.querySelector('img');
    }
    if(img){
      img.alt=COMPANY;
      img.dataset.publicBrandUrl=LOGO;
    }
  }

  installStyle();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enforce,{once:true});
  else enforce();

  const observer=new MutationObserver(()=>queueMicrotask(enforce));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style','class']});
  setTimeout(()=>{enforce();observer.disconnect();},8000);
})();
