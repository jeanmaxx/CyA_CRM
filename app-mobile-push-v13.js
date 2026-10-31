/* Android 1.3 push hardening.
   Keeps the FCM token metadata current and lets older installed builds coexist
   with the server-side closed-app push dispatcher. */
(function installCyaMobilePushV13(){
  if(window.__cyaMobilePushV13Installed)return;
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native)return;
  window.__cyaMobilePushV13Installed=true;

  const register=name=>cap.registerPlugin?cap.registerPlugin(name):(cap.Plugins?.[name]||null);
  const Push=register('PushNotifications');
  const Mobile=register('CyaMobile');
  let platformInfoPromise=null;

  async function platformInfo(){
    if(!platformInfoPromise)platformInfoPromise=Promise.resolve(Mobile?.getPlatformInfo?.()).catch(()=>({}));
    return platformInfoPromise;
  }

  async function currentSession(){
    try{return (await supabaseClient?.auth?.getSession?.())?.data?.session||null;}catch(_){return null;}
  }

  async function refreshTokenMetadata(tokenValue){
    const token=String(tokenValue||'').trim();
    if(!token||typeof supabaseClient==='undefined')return;
    const session=await currentSession();
    if(!session?.user?.id)return;
    const info=await platformInfo();
    const version=String(info?.appVersion||'').trim()||'unknown';
    const org=typeof CA_ORG_ID!=='undefined'?CA_ORG_ID:null;
    if(!org)return;
    try{
      await supabaseClient.from('mobile_push_tokens').upsert({
        user_id:session.user.id,
        organization_id:org,
        token,
        platform:'android',
        app_version:version,
        active:true,
        last_seen_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      },{onConflict:'token'});
      window.__cyaMobilePushRegistration={registered:true,appVersion:version,updatedAt:new Date().toISOString()};
    }catch(error){
      console.warn('No se pudo refrescar el registro FCM',error);
    }
  }

  async function installRegistrationListener(){
    if(!Push?.addListener)return;
    try{
      await Push.addListener('registration',token=>{
        // app-mobile-native.js also owns this event. A short delay makes this
        // metadata refresh the final write, replacing its legacy 1.1.0 tag.
        setTimeout(()=>refreshTokenMetadata(token?.value),350);
      });
    }catch(error){console.warn('No se pudo instalar el refresco FCM 1.3',error);}
  }

  installRegistrationListener();
})();
