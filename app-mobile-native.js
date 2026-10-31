/* C&A CRM Android bridge. Loaded only has effect inside Capacitor. */
(function installCyaMobileNative(){
  if(window.__cyaMobileNativeInstalled)return;
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native)return;
  window.__cyaMobileNativeInstalled=true;
  document.documentElement.classList.add('cya-native-app');

  const register=name=>cap.registerPlugin?cap.registerPlugin(name):(cap.Plugins?.[name]||null);
  const Mobile=register('CyaMobile');
  const Push=register('PushNotifications');
  const EMAIL_KEY='cya_mobile_last_email';
  let leadChannel=null;
  let currentPushToken='';
  const basePrepare=window.cloudPrepareLogin;
  const baseEnter=window.cloudEnterSession;
  const baseInit=window.initCloudApp;
  const baseLogout=window.cerrarSesion;

  function injectStyles(){
    if(document.getElementById('cya-native-mobile-styles'))return;
    const style=document.createElement('style');
    style.id='cya-native-mobile-styles';
    style.textContent=`
      html.cya-native-app{--cya-native-top-inset:24px;--cya-native-bottom-inset:0px}
      @media(max-width:700px){
        html.cya-native-app .topbar{height:calc(60px + var(--cya-native-top-inset))!important;padding-top:var(--cya-native-top-inset)!important;box-sizing:border-box!important}
        html.cya-native-app .sidebar{padding-top:var(--cya-native-top-inset)!important;box-sizing:border-box!important}
        html.cya-native-app #login-screen{padding-top:var(--cya-native-top-inset)!important;padding-bottom:max(20px,var(--cya-native-bottom-inset))!important;box-sizing:border-box!important}
      }
      .cya-mobile-saved-account{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border);background:var(--bg-secondary);border-radius:9px;padding:9px 10px;margin:0 0 10px;font-size:11px;color:var(--text-secondary)}
      .cya-mobile-saved-account strong{display:block;color:var(--text-primary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}
      .cya-mobile-change-account{border:0;background:transparent;color:var(--accent-blue);font:inherit;cursor:pointer;white-space:nowrap;padding:4px}
    `;
    document.head.appendChild(style);
  }

  async function configureInsets(){
    try{
      const info=await Mobile?.getPlatformInfo?.();
      if(info?.statusBarInsetTop)document.documentElement.style.setProperty('--cya-native-top-inset',`${info.statusBarInsetTop}px`);
      if(info?.navigationBarInsetBottom)document.documentElement.style.setProperty('--cya-native-bottom-inset',`${info.navigationBarInsetBottom}px`);
    }catch(_){ }
  }

  function rememberedEmail(){return String(localStorage.getItem(EMAIL_KEY)||'').trim().toLowerCase();}
  function rememberEmail(email){if(email)localStorage.setItem(EMAIL_KEY,String(email).trim().toLowerCase());}

  function decoratePasswordOnlyLogin(){
    const email=document.getElementById('login-email-input');
    const password=document.getElementById('login-password-input');
    if(!email||!password)return;
    const saved=rememberedEmail();
    document.getElementById('cya-mobile-saved-account')?.remove();
    if(saved){
      email.value=saved;
      email.style.display='none';
      const box=document.createElement('div');
      box.id='cya-mobile-saved-account';box.className='cya-mobile-saved-account';
      box.innerHTML=`<div><span>Cuenta guardada</span><strong>${saved.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong></div><button class="cya-mobile-change-account" type="button">Cambiar</button>`;
      box.querySelector('button').onclick=()=>{
        localStorage.removeItem(EMAIL_KEY);
        box.remove();email.value='';email.style.display='block';email.focus();
        const sub=document.getElementById('login-pin-sub');if(sub)sub.textContent='Ingresa tu correo y contraseña';
      };
      email.insertAdjacentElement('beforebegin',box);
      const sub=document.getElementById('login-pin-sub');if(sub)sub.textContent='Ingresa tu contraseña para continuar';
      setTimeout(()=>password.focus(),80);
    }else{
      email.style.display='block';
    }
  }

  window.cloudPrepareLogin=function(){
    const result=basePrepare?.apply(this,arguments);
    decoratePasswordOnlyLogin();
    return result;
  };
  window.mostrarLogin=window.cloudPrepareLogin;
  window.volverLoginGrid=window.cloudPrepareLogin;

  async function biometricUnlock(session){
    const email=session?.user?.email||'';if(email)rememberEmail(email);
    try{
      const available=await Mobile?.isBiometricAvailable?.();
      if(!available?.available)return false;
      const result=await Mobile.authenticate({subtitle:'Usa tu huella o biometría para abrir tu sesión guardada'});
      return result?.authenticated===true;
    }catch(_){return false;}
  }

  window.cloudEnterSession=async function(session){
    if(session?.user?.email)rememberEmail(session.user.email);
    const result=await baseEnter.call(this,session);
    if(window.cloudReady&&window.sesionActiva)await onSessionReady(session);
    return result;
  };

  window.initCloudApp=async function(){
    try{
      loadNavOrder();
      applyTheme(localStorage.getItem('ca_crm_theme')||'dark');
      const {data:{session},error}=await supabaseClient.auth.getSession();
      if(error)console.error(error);
      if(session){
        rememberEmail(session.user?.email);
        if(await biometricUnlock(session))await window.cloudEnterSession(session);
        else window.cloudPrepareLogin();
      }else window.cloudPrepareLogin();
    }catch(error){console.error('Inicio móvil',error);window.cloudPrepareLogin();}
  };

  window.cyaMobileOpenRenapo=async function(curp){
    if(!Mobile?.openRenapo)return null;
    try{return await Mobile.openRenapo({curp:String(curp||'').toUpperCase()});}
    catch(error){console.error(error);showToast?.('No se pudo abrir RENAPO dentro de la aplicación','warn');return null;}
  };

  window.cyaMobileShareWhatsApp=async function(options={}){
    try{return await Mobile?.shareWhatsApp?.({text:options.text||'',phone:options.phone||'',dataUrl:options.dataUrl||'',fileName:options.fileName||'cya-crm.png'});}
    catch(error){console.error(error);return null;}
  };

  function hashId(value,seed=0){let h=2166136261+seed;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h%1800000000)+1000;}
  function advisorAllows(item){
    if(typeof isAdmin==='function'&&isAdmin())return true;
    const advisor=String(item?.asesorId||item?.advisor_id||'');
    return !advisor||advisor===String(sesionActiva?.id||'');
  }
  function curpBirthday(curp,year){
    const value=String(curp||'').toUpperCase();if(value.length<10)return null;
    const mm=Number(value.slice(6,8)),dd=Number(value.slice(8,10));
    if(mm<1||mm>12||dd<1||dd>31)return null;
    const d=new Date(year,mm-1,dd,9,0,0,0);
    return d.getMonth()===mm-1&&d.getDate()===dd?d:null;
  }

  async function scheduleNativeNotifications(){
    if(!Mobile?.scheduleNotifications||!window.store)return;
    const now=Date.now();const limit=now+1000*60*60*24*90;const list=[];
    for(const e of (store.agenda||[])){
      if(e.completado||e.cancelarRecordatorio||!e.fecha||!e.hora||!advisorAllows(e))continue;
      const at=new Date(`${e.fecha}T${String(e.hora).slice(0,5)}:00`).getTime();
      if(!Number.isFinite(at)||at<=now+5000||at>limit)continue;
      const client=e.clienteId?(store.clientes||[]).find(c=>String(c.id)===String(e.clienteId)):null;
      list.push({id:hashId(`agenda:${e.id}`),at,title:e.titulo||'Actividad programada',body:[client?.nombre,e.hora].filter(Boolean).join(' · ')||'Tienes una actividad en C&A CRM',deepLink:e.clienteId?`client:${e.clienteId}`:'agenda',channel:'agenda'});
    }
    const seen=new Set();
    for(const c of (store.clientes||[])){
      if(!c?.curp||seen.has(String(c.id)))continue;seen.add(String(c.id));
      let date=curpBirthday(c.curp,new Date().getFullYear());if(!date)continue;
      if(date.getTime()<=now+5000)date=curpBirthday(c.curp,new Date().getFullYear()+1);
      if(!date||date.getTime()>limit)continue;
      list.push({id:hashId(`birthday:${c.id}:${date.getFullYear()}`,73),at:date.getTime(),title:'🎂 Cumpleaños de cliente',body:`Hoy cumple años ${c.nombre||'un cliente'}. Abre el CRM para preparar su felicitación.`,deepLink:`client:${c.id}`,channel:'birthday'});
    }
    try{await Mobile.scheduleNotifications({notifications:list});}catch(error){console.warn('No se pudieron programar avisos nativos',error);}
  }

  async function registerPush(session){
    if(!Push||!session?.user?.id)return;
    try{
      const perm=await Push.checkPermissions?.();
      let receive=perm?.receive;
      if(receive!=='granted')receive=(await Push.requestPermissions?.())?.receive;
      if(receive!=='granted')return;
      await Push.createChannel?.({id:'cya_general',name:'Nuevos leads y avisos',description:'Nuevos prospectos y avisos importantes',importance:5,visibility:1,vibration:true});
      await Push.addListener?.('registration',async token=>{
        currentPushToken=String(token?.value||'');if(!currentPushToken)return;
        try{await supabaseClient.from('mobile_push_tokens').upsert({user_id:session.user.id,organization_id:CA_ORG_ID,token:currentPushToken,platform:'android',app_version:'1.1.0',active:true,last_seen_at:new Date().toISOString()},{onConflict:'token'});}catch(error){console.warn('Token push pendiente de registrar',error);}
      });
      await Push.addListener?.('registrationError',error=>console.warn('FCM no disponible todavía',error));
      await Push.addListener?.('pushNotificationActionPerformed',action=>handleDeepLink(action?.notification?.data?.deepLink||action?.notification?.data?.deep_link||'leads'));
      await Push.register?.();
    }catch(error){console.warn('Push remoto no configurado todavía',error);}
  }

  async function requestNativeNotifications(){
    try{await Mobile?.requestNotificationPermission?.();}catch(_){ }
  }

  function subscribeLeadNotifications(){
    try{if(leadChannel)supabaseClient.removeChannel(leadChannel);}catch(_){ }
    try{
      leadChannel=supabaseClient.channel(`cya-mobile-leads-${sesionActiva?.id||Date.now()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'leads',filter:`organization_id=eq.${CA_ORG_ID}`},payload=>{
        const lead=payload?.new||{};
        if(!(typeof isAdmin==='function'&&isAdmin())&&lead.advisor_id&&String(lead.advisor_id)!==String(sesionActiva?.id||''))return;
        Mobile?.showNotification?.({id:hashId(`lead:${lead.id}:${Date.now()}`),title:'🔔 Nuevo lead recibido',body:[lead.name&&lead.name!=='Nombre pendiente de validar'?lead.name:'Prospecto nuevo',lead.phone].filter(Boolean).join(' · '),deepLink:`lead:${lead.id}`,channel:'general'}).catch(()=>{});
      }).subscribe();
    }catch(error){console.warn('Realtime de leads no disponible',error);}
  }

  function handleDeepLink(deepLink){
    const value=String(deepLink||'dashboard');
    if(!window.cloudReady){sessionStorage.setItem('cya_pending_deep_link',value);return;}
    if(value.startsWith('client:')){
      navigate('clientes',document.querySelector('[data-page="clientes"]'));
      const id=value.slice(7);setTimeout(()=>{try{openPerfil(id);}catch(_){}},180);return;
    }
    if(value.startsWith('lead:')){
      navigate('leads',document.querySelector('[data-page="leads"]'));
      const id=value.slice(5);setTimeout(()=>{try{editLead(id);}catch(_){}},180);return;
    }
    if(['agenda','leads','clientes','dashboard'].includes(value))navigate(value,document.querySelector(`[data-page="${value}"]`));
  }
  window.cyaMobileHandleDeepLink=handleDeepLink;

  async function onSessionReady(session){
    if(!window.cloudReady||!window.sesionActiva)return;
    await requestNativeNotifications();
    await scheduleNativeNotifications();
    subscribeLeadNotifications();
    await registerPush(session);
    try{
      Mobile?.addListener?.('notificationAction',event=>handleDeepLink(event?.deepLink));
      const pending=await Mobile?.getPendingAction?.();if(pending?.deepLink)handleDeepLink(pending.deepLink);
    }catch(_){ }
    const queued=sessionStorage.getItem('cya_pending_deep_link');if(queued){sessionStorage.removeItem('cya_pending_deep_link');handleDeepLink(queued);}
  }

  window.cerrarSesion=async function(){
    try{
      if(currentPushToken&&window.supabaseClient)await supabaseClient.from('mobile_push_tokens').update({active:false,last_seen_at:new Date().toISOString()}).eq('token',currentPushToken);
      if(leadChannel)await supabaseClient.removeChannel(leadChannel);
      await Push?.removeAllListeners?.();
    }catch(_){ }
    return baseLogout?.apply(this,arguments);
  };

  injectStyles();
  configureInsets();
})();
