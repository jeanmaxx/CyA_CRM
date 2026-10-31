/* Android V2.3 startup controller.
   Biometric unlock is enabled again for an existing session, but password is
   always the safe fallback. No biometric failure/cancel/timeout may block CRM. */
(function installCyaStartupController(){
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native||window.__cyaPasswordStartupHotfixInstalled)return;
  window.__cyaPasswordStartupHotfixInstalled=true;

  const EMAIL_KEY='cya_mobile_last_email';
  const Mobile=cap.registerPlugin?cap.registerPlugin('CyaMobile'):cap.Plugins?.CyaMobile;
  let startupFinished=false;

  function showPasswordLogin(){
    if(startupFinished)return;
    startupFinished=true;
    try{
      window.cloudPrepareLogin?.();
      setTimeout(()=>document.getElementById('login-password-input')?.focus(),80);
    }catch(error){
      console.error('No se pudo mostrar el acceso por contraseña',error);
    }
  }

  function withTimeout(promise,ms){
    return Promise.race([
      promise,
      new Promise(resolve=>setTimeout(()=>resolve({authenticated:false,timeout:true}),ms))
    ]);
  }

  async function tryBiometric(session){
    if(!session||!Mobile?.isBiometricAvailable||!Mobile?.authenticate)return false;
    try{
      const availability=await withTimeout(Mobile.isBiometricAvailable(),3500);
      if(!availability?.available)return false;
      const result=await withTimeout(Mobile.authenticate({subtitle:'Confirma tu identidad para abrir C&A CRM'}),12000);
      return result?.authenticated===true;
    }catch(error){
      console.warn('Biometría no disponible; se usará contraseña',error);
      return false;
    }
  }

  window.initCloudApp=async function(){
    try{
      loadNavOrder();
      applyTheme(localStorage.getItem('ca_crm_theme')||'dark');
      const {data:{session},error}=await supabaseClient.auth.getSession();
      if(error)console.warn('Sesión móvil',error);

      const email=String(session?.user?.email||'').trim().toLowerCase();
      if(email)localStorage.setItem(EMAIL_KEY,email);

      if(session&&await tryBiometric(session)){
        try{
          await window.cloudEnterSession(session);
          if(typeof cloudReady!=='undefined'&&cloudReady){startupFinished=true;return;}
        }catch(error){
          console.error('No se pudo abrir la sesión después de biometría',error);
        }
      }
      showPasswordLogin();
    }catch(error){
      console.error('Inicio Android V2.3',error);
      showPasswordLogin();
    }
  };

  // Final escape hatch: even a stalled native dialog must never leave a blank app.
  setTimeout(()=>{
    try{
      if(startupFinished)return;
      const ready=typeof cloudReady!=='undefined'&&cloudReady;
      const login=document.getElementById('login-screen');
      const loginVisible=login&&getComputedStyle(login).display!=='none';
      if(ready){startupFinished=true;return;}
      if(!loginVisible)showPasswordLogin();
    }catch(_){showPasswordLogin();}
  },14500);
})();
