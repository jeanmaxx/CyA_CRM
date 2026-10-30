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
    dirtyValues[target.id]=target.value;
  }

  function restoreManualValues(){
    if(!modalOpen())return;
    ensureEditable();
    if(activeLeadKey!==leadKey())return;
    for(const [id,value] of Object.entries(dirtyValues)){
      const el=document.getElementById(id);
      if(el&&el.value!==value)el.value=value;
    }
  }

  document.addEventListener('input',rememberManualValue,true);
  document.addEventListener('change',rememberManualValue,true);

  const baseOpenModalLead=window.openModalLead;
  if(typeof baseOpenModalLead==='function')window.openModalLead=function(){
    dirtyValues={};
    activeLeadKey='';
    const result=baseOpenModalLead.apply(this,arguments);
    activeLeadKey=leadKey();
    setTimeout(()=>{ensureEditable();restoreManualValues();},0);
    setTimeout(()=>{ensureEditable();restoreManualValues();},80);
    return result;
  };

  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      restoreManualValues();
    });
  }).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(ensureEditable,100);
})();
