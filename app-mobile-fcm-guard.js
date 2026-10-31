/* Android Firebase safety guard.
   Only APKs that explicitly identify themselves as Firebase-enabled may use
   Capacitor PushNotifications. Older APKs remain protected from FCM startup. */
(function installCyaFcmGuard(){
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native||window.__cyaFcmGuardInstalled)return;
  window.__cyaFcmGuardInstalled=true;

  let firebaseEnabled=false;
  try{
    const params=new URL(location.href).searchParams;
    firebaseEnabled=params.get('firebase')==='1'&&params.get('native')==='android-v23';
  }catch(_){ }
  window.__CYA_FIREBASE_CONFIGURED__=firebaseEnabled;
  if(firebaseEnabled){
    console.info('C&A CRM: Firebase/FCM habilitado para Android V2.3.');
    return;
  }

  const originalRegister=typeof cap.registerPlugin==='function'?cap.registerPlugin.bind(cap):null;
  if(!originalRegister)return;
  const safePushPlugin={
    async checkPermissions(){return {receive:'denied'};},
    async requestPermissions(){return {receive:'denied'};},
    async createChannel(){return {};},
    async register(){return {};},
    async removeAllListeners(){return {};},
    async addListener(){return {remove:async()=>{}};}
  };
  cap.registerPlugin=function(name,implementations){
    if(name==='PushNotifications'){
      console.info('C&A CRM: FCM protegido para una APK sin configuración Firebase.');
      return safePushPlugin;
    }
    return originalRegister(name,implementations);
  };
})();
