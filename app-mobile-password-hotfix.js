/* Android V2.1 startup hotfix: password-only access by default.
   Biometrics remain available in the native bridge for a future explicit opt-in,
   but must never run automatically during app startup. */
(function installCyaPasswordStartupHotfix(){
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native||window.__cyaPasswordStartupHotfixInstalled)return;
  window.__cyaPasswordStartupHotfixInstalled=true;

  const EMAIL_KEY='cya_mobile_last_email';

  function showPasswordLogin(){
    try{
      window.cloudPrepareLogin?.();
      document.getElementById('login-password-input')?.focus();
    }catch(error){
      console.error('No se pudo mostrar el acceso por contraseña',error);
    }
  }

  window.initCloudApp=async function(){
    try{
      loadNavOrder();
      applyTheme(localStorage.getItem('ca_crm_theme')||'dark');

      // Read the current Supabase session only to remember the account email.
      // Never use an existing session to bypass the password screen on Android.
      try{
        const {data:{session},error}=await supabaseClient.auth.getSession();
        if(error)console.warn('Sesión móvil',error);
        const email=String(session?.user?.email||'').trim().toLowerCase();
        if(email)localStorage.setItem(EMAIL_KEY,email);
      }catch(error){
        console.warn('No se pudo leer la cuenta guardada',error);
      }

      showPasswordLogin();
    }catch(error){
      console.error('Inicio Android V2.1',error);
      showPasswordLogin();
    }
  };

  // Safety watchdog: a native biometric/system dialog must never leave the app
  // on a blank WebView. If startup has not reached CRM or login, force login.
  setTimeout(()=>{
    try{
      const ready=typeof cloudReady!=='undefined'&&cloudReady;
      const login=document.getElementById('login-screen');
      const loginVisible=login&&getComputedStyle(login).display!=='none';
      if(!ready&&!loginVisible)showPasswordLogin();
    }catch(_){ }
  },1800);
})();
