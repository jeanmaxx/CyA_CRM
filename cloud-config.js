window.CA_CLOUD_CONFIG = Object.freeze({
  supabaseUrl: 'https://ibhgisndtaclvwznqugu.supabase.co',
  supabasePublishableKey: 'sb_publishable_grQYYOgYg0WR9gmn3QBHpg_UyieIrZ8',
  organizationId: 'ca000000-0000-4000-8000-000000000001',
  siteUrl: 'https://jeanmaxx.github.io/CyA_CRM/',
});

// Branding is public, so the login screen can use the same company logo
// before authentication and after logout. This avoids two different logos
// depending on whether app settings have already been loaded in the session.
(function installSessionConsistencyFixes(){
  const cfg=window.CA_CLOUD_CONFIG;
  const brandingUrl=`${cfg.supabaseUrl}/storage/v1/object/public/crm-branding/${cfg.organizationId}/logo.png`;

  function setLoginBranding(){
    const el=document.getElementById('login-logo-wrap');
    if(!el)return;
    const img=el.querySelector('img');
    if(img&&img.src===brandingUrl)return;
    el.innerHTML=`<img src="${brandingUrl}" alt="Casillas & Asociados" style="width:100%;height:100%;object-fit:contain;background:#fff;">`;
  }
  window.cyaSetLoginBranding=setLoginBranding;
  setLoginBranding();

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    setLoginBranding();
    if(typeof window.cloudPrepareLogin!=='function'||typeof window.sincronizarCitaAfore!=='function'||typeof window.completarEvento!=='function'||typeof window.cloudRepairOperationalOwnership!=='function'){
      if(attempts>120)clearInterval(installer);
      return;
    }
    if(window.__cyaSessionConsistencyInstalled){clearInterval(installer);return;}
    window.__cyaSessionConsistencyInstalled=true;
    clearInterval(installer);

    const prepareLoginBase=window.cloudPrepareLogin;
    window.cloudPrepareLogin=function(){
      const result=prepareLoginBase.apply(this,arguments);
      setLoginBranding();
      return result;
    };
    window.mostrarLogin=window.cloudPrepareLogin;
    window.volverLoginGrid=window.cloudPrepareLogin;

    const syncCitaBase=window.sincronizarCitaAfore;
    window.sincronizarCitaAfore=function(cliente){
      const result=syncCitaBase.apply(this,arguments);
      if(!cliente||cliente.servicio!=='retiro_desempleo')return result;
      const evento=(window.store?.agenda||[]).find(e=>e.id==='ev_cita_afore_'+cliente.id);
      if(!evento)return result;
      const etapas=typeof window.stagesFor==='function'?window.stagesFor(cliente.servicio):[];
      const etapaActual=etapas.findIndex(s=>s.id===cliente.etapa);
      const etapaActualizada=etapas.findIndex(s=>s.id==='afore_actualizada');
      if(etapaActualizada>=0&&etapaActual>=etapaActualizada){
        evento.completado=true;
        evento.completadoEn=evento.completadoEn||new Date().toISOString();
        evento.cancelarRecordatorio=false;
      }
      return result;
    };

    const repairBase=window.cloudRepairOperationalOwnership;
    window.cloudRepairOperationalOwnership=function(){
      const before=JSON.stringify(window.store?.agenda||[]);
      const originalChanged=repairBase.apply(this,arguments);
      for(const cliente of (window.store?.clientes||[]))window.sincronizarCitaAfore(cliente);
      return Boolean(originalChanged||before!==JSON.stringify(window.store?.agenda||[]));
    };

    const completarBase=window.completarEvento;
    window.completarEvento=async function(id){
      const result=await Promise.resolve(completarBase.apply(this,arguments));
      const evento=(window.store?.agenda||[]).find(e=>e.id===id);
      if(evento?.completado&&window.cloudReady&&typeof window.cloudSyncNow==='function'){
        try{await window.cloudSyncNow({throwOnError:true});}
        catch(error){window.showToast?.('El evento se marcó como hecho, pero la sincronización quedó pendiente.','warn');}
      }
      return result;
    };
  },25);
})();
