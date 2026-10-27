/* Carry known prospect data into the client form during conversion.
   Additive feature-branch module: it never makes fields mandatory. */
(function installMetaLeadClientPrefill(){
  if(window.__cyaMetaLeadClientPrefillInstalled)return;
  window.__cyaMetaLeadClientPrefillInstalled=true;

  function ensureMetaSourceOption(){
    const sel=document.getElementById('fc-fuente');
    if(!sel)return;
    if(![...sel.options].some(o=>String(o.value||o.textContent).trim().toLowerCase()==='meta ads')){
      const option=document.createElement('option');option.value='Meta Ads';option.textContent='Meta Ads';sel.appendChild(option);
    }
  }
  function fill(id,value){
    if(value===undefined||value===null||String(value)==='')return;
    const el=document.getElementById(id);if(!el)return;
    if(!String(el.value||'').trim())el.value=value;
  }
  function prefillFromLead(leadId){
    const lead=(store?.leads||[]).find(l=>String(l.id)===String(leadId));
    if(!lead)return;
    ensureMetaSourceOption();
    fill('fc-email',lead.email||lead.correo);
    fill('fc-ciudad',lead.ciudad||lead.municipio);
    fill('fc-nss',lead.nss);
    fill('fc-afore',lead.afore);
    fill('fc-domicilio',lead.domicilio);
    const source=lead.fuenteContacto||lead?.origen?.fuente||(lead.metaAds||lead.metaLead?'Meta Ads':'');
    if(source){const sel=document.getElementById('fc-fuente');if(sel&&!String(sel.value||'').trim())sel.value=source;}
    if(lead.curp)fill('fc-curp',String(lead.curp).toUpperCase());
    if(lead.telefono)fill('fc-telefono',lead.telefono);
    // The formal name remains under advisor control; do not promote the Facebook profile name as verified identity.
    if(lead.nombreVerificado===true&&lead.nombre)fill('fc-nombre',lead.nombre);
  }

  const baseOpen=window.openModalCliente;
  if(typeof baseOpen==='function')window.openModalCliente=function(origenLeadId=null){
    const result=baseOpen.apply(this,arguments);
    if(origenLeadId){setTimeout(()=>prefillFromLead(origenLeadId),0);setTimeout(()=>prefillFromLead(origenLeadId),100);}
    return result;
  };

  /* Meta leads must never be lost just because Meta omitted a display name.
     The core CRM keeps its normal required-name rule for every other source. */
  const baseGuardarLead=window.guardarLead;
  if(typeof baseGuardarLead==='function')window.guardarLead=async function(){
    const fuente=String(document.getElementById('lead-fuente')?.value||'').trim().toLowerCase();
    const editing=(typeof editingLeadId!=='undefined'&&editingLeadId)?(store?.leads||[]).find(l=>String(l.id)===String(editingLeadId)):null;
    const esMeta=fuente==='meta ads'||editing?.metaAds===true||Boolean(editing?.metaLead)||Boolean(editing?.origenMeta);
    const inputNombre=document.getElementById('lead-nombre');
    const originalNombre=String(inputNombre?.value||'').trim();
    const placeholder='Nombre pendiente de validar';
    const usedPlaceholder=Boolean(esMeta&&inputNombre&&!originalNombre);
    if(usedPlaceholder)inputNombre.value=placeholder;
    try{
      const result=await baseGuardarLead.apply(this,arguments);
      const savedId=typeof editingLeadId!=='undefined'?editingLeadId:null;
      const lead=savedId?(store?.leads||[]).find(l=>String(l.id)===String(savedId)):null;
      if(lead&&esMeta){
        if(usedPlaceholder){lead.nombre=placeholder;lead.nombreVerificado=false;lead.nombrePendienteValidacion=true;}
        else if(originalNombre&&originalNombre!==placeholder&&lead.nombreVerificado!==true){lead.nombrePendienteValidacion=false;}
        lead.metaAds=true;
      }
      return result;
    }finally{
      if(usedPlaceholder&&inputNombre)inputNombre.value='';
    }
  };
})();
