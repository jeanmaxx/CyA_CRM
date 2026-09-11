/* Final visual refinements for Dashboard profile header and Mi cuenta. */
(function installProfileVisualPolish(){
  if(window.__cyaProfileVisualPolishInstalled)return;
  window.__cyaProfileVisualPolishInstalled=true;

  const style=document.createElement('style');
  style.id='cya-profile-visual-polish';
  style.textContent=`
    /* Dashboard: same visual weight as the rest of the cards. */
    .dashboard-personal-hero{
      align-items:center!important;
      padding:12px 14px!important;
      border:1px solid var(--border)!important;
      border-radius:var(--radius-md)!important;
      background-color:var(--bg-card)!important;
      box-shadow:none!important;
    }
    /* Clear the legacy Dashboard gradient/image when no managed banner exists. */
    .dashboard-personal-hero:not(.cya-has-banner){
      background:var(--bg-card)!important;
      background-image:none!important;
    }
    .dashboard-personal-left{gap:15px!important;}
    .dashboard-personal-avatar{
      width:72px!important;
      height:72px!important;
      flex:0 0 72px!important;
      border:1px solid rgba(201,169,110,.32)!important;
      box-shadow:none!important;
      background:var(--bg-secondary)!important;
      color:var(--text-primary)!important;
    }
    .dashboard-personal-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;}
    .dashboard-personal-date{color:var(--text-muted)!important;}
    .dashboard-personal-hero .dashboard-greeting{color:var(--text-primary)!important;}
    .dashboard-personal-sub{color:var(--text-muted)!important;}

    /* Mi cuenta: compatibility base; the managed banner module may replace the image. */
    .account-profile-hero{
      position:relative!important;
      overflow:hidden!important;
      isolation:isolate!important;
      min-height:310px!important;
      background-color:var(--bg-card)!important;
      border-color:var(--border)!important;
      box-shadow:none!important;
    }
    .account-profile-hero::before{
      content:'';
      position:absolute;
      inset:0;
      z-index:0;
      background:
        linear-gradient(rgba(7,14,30,.43),rgba(7,14,30,.62)),
        url('assets/account-profile-bg.svg?v=20260911-1154') center center/cover no-repeat;
      pointer-events:none;
    }
    .account-profile-accent{display:none!important;}
    .account-profile-content{
      position:relative!important;
      z-index:1!important;
      padding:30px 24px 28px!important;
    }
    .account-profile-photo{
      width:136px!important;
      height:136px!important;
      margin-top:0!important;
      border:1px solid rgba(201,169,110,.38)!important;
      box-shadow:0 8px 22px rgba(0,0,0,.24)!important;
      background:rgba(255,255,255,.10)!important;
    }
    .account-profile-name{color:#fff!important;text-shadow:0 1px 8px rgba(0,0,0,.28);}
    .account-profile-role{color:#e1c886!important;border-color:rgba(225,200,134,.38)!important;background:rgba(7,14,30,.28)!important;}
    .account-profile-email{color:rgba(255,255,255,.76)!important;}
    .account-profile-helper{color:rgba(255,255,255,.62)!important;}
    .account-profile-actions .btn:not(.btn-primary){
      color:#fff!important;
      border-color:rgba(255,255,255,.34)!important;
      background:rgba(7,14,30,.22)!important;
    }
    .account-ribbon,.profile-ribbon,.account-profile-ribbon{display:none!important;}

    @media(max-width:700px){
      .dashboard-personal-avatar{width:62px!important;height:62px!important;flex-basis:62px!important;}
      .dashboard-personal-hero{padding:11px 12px!important;}
      .account-profile-hero{min-height:285px!important;}
      .account-profile-content{padding:24px 16px!important;}
      .account-profile-photo{width:118px!important;height:118px!important;}
    }
  `;
  document.head.appendChild(style);

  function removeLegacyRibbon(){
    document.querySelectorAll('.account-profile-accent,.account-ribbon,.profile-ribbon,.account-profile-ribbon').forEach(el=>el.remove());
  }
  removeLegacyRibbon();
  const observer=new MutationObserver(removeLegacyRibbon);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();

// Load the organization-managed banners, messages and birthday personalization last,
// so its settings can safely override the static compatibility styles above.
(function loadDashboardCustomization(){
  if(document.querySelector('script[data-cya-dashboard-customization]'))return;
  const script=document.createElement('script');
  script.src='app-dashboard-customization.js?v=20260911-1504';
  script.async=false;
  script.dataset.cyaDashboardCustomization='1';
  document.head.appendChild(script);
})();
