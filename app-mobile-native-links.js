/* Native URL routing for the C&A Android app. */
(function installCyaNativeLinks(){
  const cap=window.Capacitor;
  const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
  if(!native||window.__cyaNativeLinksInstalled)return;
  window.__cyaNativeLinksInstalled=true;
  const Mobile=cap.registerPlugin?cap.registerPlugin('CyaMobile'):cap.Plugins?.CyaMobile;
  const baseOpen=typeof window.open==='function'?window.open.bind(window):null;
  if(!baseOpen||!Mobile?.shareWhatsApp)return;

  function whatsappPayload(raw){
    try{
      const url=new URL(String(raw||''),location.href);
      const host=url.hostname.toLowerCase();
      if(host!=='wa.me'&&!host.endsWith('whatsapp.com'))return null;
      const digits=url.pathname.replace(/\D/g,'');
      return {phone:digits,text:url.searchParams.get('text')||''};
    }catch(_){return null;}
  }

  window.open=function(url,target,features){
    const payload=whatsappPayload(url);
    if(!payload)return baseOpen(url,target,features);
    Mobile.shareWhatsApp(payload).catch(error=>console.warn('WhatsApp nativo no disponible',error));
    return {closed:false,opener:null,close(){}};
  };
})();
