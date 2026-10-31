/* Loader bundle for profile polish + client profile stages. */
(function loadProfileVisualPolishBundle(){
  if(window.__cyaProfilePolishBundleLoaderStarted)return;
  window.__cyaProfilePolishBundleLoaderStarted=true;

  function loadCompact(){
    if(document.querySelector('script[data-cya-client-profile-compact]'))return;
    const compact=document.createElement('script');
    compact.src='/app-client-profile-compact.js?v=20261031-compact1';
    compact.async=false;
    compact.dataset.cyaClientProfileCompact='1';
    document.head.appendChild(compact);
  }

  function loadStage2(){
    if(document.querySelector('script[data-cya-client-profile-stage2]')){loadCompact();return;}
    const script=document.createElement('script');
    script.src='/app-client-profile-stage2.js?v=20261030-stage2';
    script.async=false;
    script.dataset.cyaClientProfileStage2='1';
    script.onload=loadCompact;
    document.head.appendChild(script);
  }

  function waitForStage1ThenLoadStage2(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(window.__cyaClientProfileStage1Installed===true||attempts>400){
        clearInterval(timer);
        loadStage2();
      }
    },25);
  }

  if(document.querySelector('script[data-cya-profile-polish-core]')){
    waitForStage1ThenLoadStage2();
    return;
  }

  const core=document.createElement('script');
  core.src='/app-ui-profile-polish-core.js?v=20261030-stage2-core';
  core.async=false;
  core.dataset.cyaProfilePolishCore='1';
  core.onload=waitForStage1ThenLoadStage2;
  document.head.appendChild(core);
})();
