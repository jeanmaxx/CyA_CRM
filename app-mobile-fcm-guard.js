/* Android V2.2 safety guard.
   Prevents the Capacitor PushNotifications native plugin from being invoked
   until Firebase/FCM is actually configured for com.alvasd.cya.crm.
   This keeps local notifications and CRM login stable. */
(function installCyaFcmGuard(){
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native||window.__cyaFcmGuardInstalled)return;
  window.__cyaFcmGuardInstalled=true;

  const firebaseEnabled=localStorage.getItem('cya_mobile_fcm_enabled')==='1';
  if(firebaseEnabled)return;

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
      console.info('C&A CRM: FCM desactivado hasta completar la configuración de Firebase.');
      return safePushPlugin;
    }
    return originalRegister(name,implementations);
  };
})();
