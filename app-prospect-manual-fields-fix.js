/* Keep manually edited prospect fields stable while the Meta workflow refreshes modal UI. */
(function installProspectManualFieldsFix(){
  if(window.__cyaProspectManualFieldsFixInstalled)return;
  window.__cyaProspectManualFieldsFixInstalled=true;

  const FIELD_IDS=['lead-email','lead-ciudad','lead-fuente','lead-nss','lead-afore','lead-domicilio'];
  let dirtyValues={};
  let activeLeadKey='';
  let scheduled=false;

  function modalOpen(){
    return document.getElementById('modal-lead')?.classList.contains('open')===true;
  }

  function leadKey(){
    try{return typeof editingLeadId!=='undefined'&&editingLeadId?String(editingLeadId):'__new__';}
    catch(_){return '__new__';}
  }

  function currentLead(){
    try{
      if(typeof editingLeadId==='undefined'||!editingLeadId)return null;
      return (store?.leads||[]).find(l=>String(l.id)===String(editingLeadId))||null;
    }catch(_){return null;}
  }

  function ensureStyles(){
    if(document.getElementById('cya-prospect-manual-fields-fix-styles'))return;
    const style=document.createElement('style');
    style.id='cya-prospect-manual-fields-fix-styles';
    style.textContent=`
      .cya-lead-extra-fields[data-cya-meta-origin]::after{
        content:attr(data-cya-meta-origin);display:block;margin-top:8px;padding:9px 10px;
        border-left:3px solid #1877f2;background:rgba(24,119,242,.07);border-radius:4px;
        font-size:10px;font-weight:600;color:#60a5fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
    `;
    document.head.appendChild(style);
  }

  function metaOriginLabel(){
    const lead=currentLead();
    const meta=lead?.metaLead||lead?.origenMeta||null;
    if(!meta)return '';
    const campaign=String(meta.campaignName||'Campaña no registrada').trim();
    return `Origen Meta Ads · ${campaign}`;
  }

  function stabilizeOriginBox(){
    const wrap=document.getElementById('cya-lead-extra-fields');
    if(!wrap)return;
    const label=metaOriginLabel();
    if(label)wrap.dataset.cyaMetaOrigin=label;
    else delete wrap.dataset.cyaMetaOrigin;

    /* app-meta-leads-workflow rebuilt this child on every MutationObserver pass.
       Removing it once breaks that self-triggering refresh loop. The same origin
       information remains visible through the CSS pseudo-element above. */
    const box=document.getElementById('cya-meta-origin-box');
    if(box)box.remove();
  }

  function ensureEditable(){
    for(const id of FIELD_IDS){
      const el=document.getElementById(id);
      if(!el)continue;
      el.disabled=false;
      el.readOnly=false;
      el.removeAttribute('disabled');
      el.removeAttribute('readonly');
      el.removeAttribute('aria-disabled');
      if(el.style.pointerEvents==='none')el.style.pointerEvents='';
    }
  }

  function rememberManualValue(event){
    const target=event?.target;
    if(!modalOpen()||!target||!FIELD_IDS.includes(target.id))return;
    const key=leadKey();
    if(activeLeadKey!==key){dirtyValues={};activeLeadKey=key;}
    dirtyValues[target.id]={
      value:target.value,
      start:typeof target.selectionStart==='number'?target.selectionStart:null,
      end:typeof target.selectionEnd==='number'?target.selectionEnd:null,
      direction:target.selectionDirection||'none'
    };
  }

  function restoreManualValues(){
    if(!modalOpen())return;
    ensureEditable();
    stabilizeOriginBox();
    if(activeLeadKey!==leadKey())return;
    for(const [id,state] of Object.entries(dirtyValues)){
      const el=document.getElementById(id);
      if(!el)continue;
      if(el.value!==state.value)el.value=state.value;
      if(document.activeElement===el&&state.start!==null&&typeof el.setSelectionRange==='function'){
        try{el.setSelectionRange(state.start,state.end,state.direction);}catch(_){ }
      }
    }
  }

  document.addEventListener('input',rememberManualValue,true);
  document.addEventListener('change',rememberManualValue,true);
  document.addEventListener('focusin',event=>{
    if(FIELD_IDS.includes(event?.target?.id)){
      ensureEditable();
      stabilizeOriginBox();
    }
  },true);

  const baseOpenModalLead=window.openModalLead;
  if(typeof baseOpenModalLead==='function')window.openModalLead=function(){
    dirtyValues={};
    activeLeadKey='';
    const result=baseOpenModalLead.apply(this,arguments);
    activeLeadKey=leadKey();
    setTimeout(()=>{ensureEditable();stabilizeOriginBox();restoreManualValues();},0);
    setTimeout(()=>{ensureEditable();stabilizeOriginBox();restoreManualValues();},40);
    setTimeout(()=>{ensureEditable();stabilizeOriginBox();restoreManualValues();},120);
    return result;
  };

  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      stabilizeOriginBox();
      restoreManualValues();
    });
  }).observe(document.documentElement,{childList:true,subtree:true});

  ensureStyles();
  setTimeout(()=>{ensureEditable();stabilizeOriginBox();},100);
})();

/* Load the unified prospect WhatsApp message center only after the prospect modal
   stability fix is active. This keeps the message UX additive and easy to roll back. */
(function loadWhatsAppMessageCenterSafely(){
  if(window.__cyaWhatsAppMessageCenterLoaderStarted)return;
  window.__cyaWhatsAppMessageCenterLoaderStarted=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=window.__cyaProspectManualFieldsFixInstalled===true&&typeof openModalLead==='function'&&typeof renderPage==='function';
    if(!ready){if(attempts>500)clearInterval(timer);return;}
    clearInterval(timer);
    if(document.querySelector('script[data-cya-whatsapp-message-center]'))return;
    const script=document.createElement('script');
    script.src='/app-whatsapp-message-center.js?v=20261030-wa1';
    script.async=false;
    script.dataset.cyaWhatsappMessageCenter='1';
    document.head.appendChild(script);
  },25);
})();

/* Birthday greeting workflow: waits for Agenda + Operational Board + client profile
   so the same feature is available from all three web CRM surfaces. */
(function loadBirthdayGreetingsSafely(){
  if(window.__cyaBirthdayGreetingsLoaderStarted)return;
  window.__cyaBirthdayGreetingsLoaderStarted=true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=window.__cyaOperationalBoardModuleLoaded===true&&typeof renderAgenda==='function'&&typeof openPerfil==='function'&&typeof cloudSyncNow==='function';
    if(!ready){if(attempts>800)clearInterval(timer);return;}
    clearInterval(timer);
    if(document.querySelector('script[data-cya-birthday-greetings]'))return;
    const script=document.createElement('script');
    script.src='/app-birthday-greetings.js?v=20261030-birthday1';
    script.async=false;
    script.dataset.cyaBirthdayGreetings='1';
    document.head.appendChild(script);
  },25);
})();
