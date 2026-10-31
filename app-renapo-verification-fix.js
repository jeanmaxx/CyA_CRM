/* RENAPO name-verification polish.
   - The warning is shown only while a Meta lead really remains unverified.
   - Android marks the name verified automatically when the internal RENAPO browser returns it.
   - Web gets an explicit confirmation button after the advisor has checked RENAPO. */
(function installRenapoVerificationPolish(){
  if(window.__cyaRenapoVerificationPolishInstalled)return;
  window.__cyaRenapoVerificationPolishInstalled=true;

  const isNative=Boolean(window.Capacitor&&(Capacitor.isNativePlatform?.()||Capacitor.getPlatform?.()==='android'));
  const PLACEHOLDER=/^nombre pendiente de validar$/i;

  function editingId(){
    try{return typeof editingLeadId!=='undefined'?editingLeadId:null;}catch(_){return null;}
  }
  function leadById(id){
    try{return (store?.leads||[]).find(l=>String(l.id)===String(id))||null;}catch(_){return null;}
  }
  function currentLead(){return leadById(editingId());}
  function isMetaLead(lead){
    const source=String(lead?.fuenteContacto||lead?.origen?.fuente||'').trim().toLowerCase();
    return Boolean(lead&&(lead.metaAds===true||source==='meta ads'||lead.metaLead||lead.origenMeta));
  }
  function needsVerification(lead){return isMetaLead(lead)&&lead?.nombreVerificado!==true;}
  function visibleName(){return String(document.getElementById('lead-nombre')?.value||'').trim().toUpperCase();}
  function setDisplay(el,value){if(el&&el.style.display!==value)el.style.display=value;}

  function updateModalState(){
    const lead=currentLead();
    const pending=needsVerification(lead);
    const helper=document.getElementById('cya-meta-name-helper');
    if(helper){
      setDisplay(helper,pending?'block':'none');
      if(pending&&helper.textContent!=='⚠ Verificar nombre mediante RENAPO.')helper.textContent='⚠ Verificar nombre mediante RENAPO.';
    }

    let button=document.getElementById('cya-confirm-renapo-name');
    const input=document.getElementById('lead-nombre');
    if(!isNative&&input&&!button){
      button=document.createElement('button');
      button.id='cya-confirm-renapo-name';
      button.type='button';
      button.className='btn';
      button.style.cssText='margin-top:6px;font-size:10px;padding:5px 9px;width:max-content;';
      button.textContent='✓ Confirmar nombre verificado';
      button.onclick=window.cyaConfirmarNombreRenapoWeb;
      (helper||input).insertAdjacentElement('afterend',button);
    }
    if(button)setDisplay(button,pending?'inline-flex':'none');
  }

  function updateCards(){
    document.querySelectorAll('.cya-meta-lead-card[data-lead-id]').forEach(card=>{
      const lead=leadById(card.dataset.leadId);
      const warning=card.querySelector('.cya-meta-raw-name');
      if(warning)setDisplay(warning,needsVerification(lead)?'block':'none');
    });
  }

  window.cyaConfirmarNombreRenapoWeb=async function(){
    const lead=currentLead();
    if(!lead||!isMetaLead(lead))return;
    const name=visibleName();
    if(!name||PLACEHOLDER.test(name)){
      showToast?.('Captura primero el nombre correcto obtenido de RENAPO.','warn');
      return;
    }
    const previous={
      nombre:lead.nombre,
      nombreVerificado:lead.nombreVerificado,
      nombrePendienteValidacion:lead.nombrePendienteValidacion,
      fechaNombreVerificado:lead.fechaNombreVerificado,
      origenNombreVerificado:lead.origenNombreVerificado
    };
    lead.nombre=name;
    lead.nombreVerificado=true;
    lead.nombrePendienteValidacion=false;
    lead.fechaNombreVerificado=new Date().toISOString();
    lead.origenNombreVerificado='RENAPO_MANUAL';
    try{
      await cloudSyncNow?.({throwOnError:true});
      updateModalState();updateCards();
      showToast?.('Nombre marcado como verificado en RENAPO.','success');
    }catch(error){
      Object.assign(lead,previous);
      updateModalState();
      showToast?.('No se pudo guardar la verificación del nombre.','warn');
    }
  };

  let scheduled=false;
  function refresh(){
    scheduled=false;
    try{updateModalState();updateCards();}catch(_){ }
  }
  function queueRefresh(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(refresh);
  }

  const observer=new MutationObserver(queueRefresh);
  const start=()=>{
    observer.observe(document.body,{childList:true,subtree:true});
    refresh();
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  document.addEventListener('input',event=>{if(event.target?.id==='lead-nombre')queueRefresh();});
  setInterval(refresh,1000);
})();
