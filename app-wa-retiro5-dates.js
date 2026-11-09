/* Dynamic dates for "Retiro -5 años" WhatsApp responses.
   Uses the dates already stored on the prospect record and agenda; it does not
   recalculate eligibility or change archive/recontact business rules. */
(function installRetiro5DynamicDates(){
  if(window.__cyaRetiro5DynamicDatesStarted)return;
  window.__cyaRetiro5DynamicDatesStarted=true;

  const WA_TEMPLATE_ID='pl_wa_retiro_5_1';
  const OUTCOME_TEMPLATE_ID='pl_no_elegible_retiro_5';
  const REVISION='retiro5-dates-v2';
  const TEMPLATE_TEXT='¡Hola, {{NOMBRE}}!\n\nAl revisar tu información encontramos que _ya realizaste anteriormente un retiro por desempleo_.\n\nDe acuerdo con tu expediente, la fecha de tu último retiro es *{{FECHA_ULTIMO_RETIRO}}*.\n\nPor ello, hemos programado una nueva revisión para el *{{FECHA_RECONTACTO}}*. En esa fecha te contactaremos para revisar nuevamente tu información y confirmar si ya cumples con los requisitos vigentes para iniciar un nuevo retiro por desempleo.\n\nPor el momento no es posible continuar con el trámite, pero con gusto dejaremos tu registro guardado para dar seguimiento en la fecha indicada.\n\nSi en ese momento continúas interesado y cumples con los requisitos vigentes, podremos comenzar nuevamente con tu trámite.\n\nAgradecemos tu confianza y quedamos a tus órdenes.';

  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let patchedWa=false;
  let patchedOutcome=false;
  let lastOutcomeLead=null;

  function leadIdFromContext(){
    try{
      if(typeof editingLeadId!=='undefined'&&editingLeadId)return String(editingLeadId);
    }catch(_){ }
    try{
      const id=window.leadParaArchivar||(typeof leadParaArchivar!=='undefined'?leadParaArchivar:null);
      if(id)return String(id);
    }catch(_){ }
    try{
      const active=window.cyaWhatsAppContactoActivo?.();
      if(active?.id)return String(active.id);
    }catch(_){ }
    return '';
  }

  function currentLead(){
    try{
      const id=leadIdFromContext();
      if(!id)return null;
      return (store?.leads||[]).find(l=>String(l.id)===id)||null;
    }catch(_){return null;}
  }

  function parseDateParts(value){
    const raw=String(value||'').trim();
    let match=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
    if(match)return {year:Number(match[1]),month:Number(match[2]),day:Number(match[3])};
    match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(match)return {year:Number(match[3]),month:Number(match[2]),day:Number(match[1])};
    return null;
  }

  function longDate(value){
    const p=parseDateParts(value);
    if(!p||p.month<1||p.month>12||p.day<1||p.day>31)return '';
    return `${p.day} de ${MONTHS[p.month-1]} de ${p.year}`;
  }

  function isoDate(value){
    const p=parseDateParts(value);
    if(!p||p.month<1||p.month>12||p.day<1||p.day>31)return '';
    const d=new Date(Date.UTC(p.year,p.month-1,p.day));
    if(d.getUTCFullYear()!==p.year||d.getUTCMonth()!==p.month-1||d.getUTCDate()!==p.day)return '';
    return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }

  function rawLastWithdrawal(lead){
    if(!lead)return '';
    const leadId=String(lead.id||'');
    const archiveOpen=document.getElementById('modal-archivar-lead')?.classList.contains('open');
    const selectedArchive=String(window.leadParaArchivar||'')===leadId||
      (typeof leadParaArchivar!=='undefined'&&String(leadParaArchivar||'')===leadId);
    if(archiveOpen&&selectedArchive){
      const candidate=isoDate(document.getElementById('lead-fecha-ultimo-retiro')?.value);
      if(candidate)return candidate;
    }
    const editingCurrent=typeof editingLeadId!=='undefined'&&String(editingLeadId||'')===leadId;
    if(editingCurrent&&document.getElementById('modal-lead')?.classList.contains('open')){
      const draft=isoDate(document.getElementById('lead-el-fecha-retiro')?.value);
      if(draft)return draft;
    }
    return isoDate(lead.fechaUltimoRetiro)||isoDate(lead.elegibilidad?.fechaRetiro)||'';
  }

  function rawRecontactDate(lead){
    if(!lead)return '';
    // Lo almacenado o agendado siempre es la fuente prioritaria.
    const scheduled=isoDate(lead.fechaRecontacto);
    if(scheduled)return scheduled;
    try{
      const event=(store?.agenda||[]).find(e=>
        String(e?.leadId||'')===String(lead.id)&&
        (String(e?.id||'')===`ev_recontacto_${lead.id}`||String(e?.titulo||'').toLowerCase().includes('recontactar prospecto'))
      );
      const calendarDate=isoDate(event?.fecha);
      if(calendarDate)return calendarDate;
    }catch(_){ }
    // Mientras el prospecto aún no se archiva, la evaluación de
    // elegibilidad ya conoce el último retiro y calcula 59 meses.
    const last=rawLastWithdrawal(lead);
    if(!last)return '';
    try{
      if(typeof sumarMesesISO==='function')return isoDate(sumarMesesISO(last,59));
    }catch(_){ }
    return '';
  }

  function hydrateText(value,lead){
    const last=longDate(rawLastWithdrawal(lead))||'pendiente de confirmar';
    const recontact=longDate(rawRecontactDate(lead))||'una fecha pendiente de confirmar';
    return String(value||'')
      .replace(/\{\{FECHA_ULTIMO_RETIRO\}\}/g,last)
      .replace(/\{\{FECHA_RECONTACTO\}\}/g,recontact);
  }

  // También se usa al generar el mensaje en el centro, sin esperar
  // eventos de clic o temporizadores que puedan mostrar una fecha vacía.
  window.cyaCompletarFechasRetiroWhatsApp=hydrateText;

  function migrateStoredTemplates(){
    try{
      if(typeof store==='undefined'||!Array.isArray(store.plantillas))return false;
      let changed=false;
      for(const id of [WA_TEMPLATE_ID,OUTCOME_TEMPLATE_ID]){
        const tpl=store.plantillas.find(p=>p?.id===id);
        if(!tpl)continue;
        if(tpl.cyaRevision!==REVISION){
          tpl.texto=TEMPLATE_TEXT;
          tpl.cyaRevision=REVISION;
          changed=true;
        }
      }
      if(changed){
        try{if(typeof saveStore==='function')saveStore();}catch(_){ }
      }
      return changed;
    }catch(_){return false;}
  }

  function hydrateWhatsAppCenter(){
    const modal=document.getElementById('cya-wa-message-center');
    if(!modal?.classList.contains('open'))return;
    const retiroButton=modal.querySelector('[data-cya-wa-group="retiro_5"].active');
    if(!retiroButton)return;
    // Al archivar se cierra el editor y editingLeadId deja de apuntar al prospecto.
    // El centro de mensajes conserva el contacto real por su ID interno.
    const lead=window.cyaWhatsAppContactoActivo?.()||currentLead();
    modal.querySelectorAll('textarea[id^="cya-wa-text-"]').forEach(area=>{
      const next=hydrateText(area.value,lead);
      if(next!==area.value)area.value=next;
    });
  }

  function hydrateOutcomeModal(leadOverride){
    const modal=document.getElementById('cya-outcome-message-modal');
    if(!modal?.classList.contains('open'))return;
    const cause=String(document.getElementById('cya-outcome-cause')?.textContent||'').toLowerCase();
    const area=document.getElementById('cya-outcome-text');
    if(!area||(!area.value.includes('{{FECHA_ULTIMO_RETIRO}}')&&!area.value.includes('{{FECHA_RECONTACTO}}'))){
      if(!cause.includes('5 años')&&!cause.includes('retiro'))return;
      if(!area)return;
    }
    const lead=leadOverride||lastOutcomeLead||window.cyaWhatsAppContactoActivo?.()||currentLead();
    const next=hydrateText(area.value,lead);
    if(next!==area.value)area.value=next;
  }

  function patchWhatsAppCenter(){
    if(patchedWa||window.__cyaWhatsAppMessageCenterInstalled!==true||typeof window.cyaAbrirCentroMensajesWhatsApp!=='function')return false;
    const base=window.cyaAbrirCentroMensajesWhatsApp;
    window.cyaAbrirCentroMensajesWhatsApp=function(){
      migrateStoredTemplates();
      const result=base.apply(this,arguments);
      setTimeout(hydrateWhatsAppCenter,0);
      setTimeout(hydrateWhatsAppCenter,60);
      return result;
    };
    patchedWa=true;
    return true;
  }

  function patchOutcomeFlow(){
    if(patchedOutcome||window.__cyaMetaLeadOutcomesInstalled!==true)return false;
    if(typeof window.cyaPrevisualizarRespuestaArchivo==='function'){
      const previewBase=window.cyaPrevisualizarRespuestaArchivo;
      window.cyaPrevisualizarRespuestaArchivo=function(){
        lastOutcomeLead=currentLead()||lastOutcomeLead;
        migrateStoredTemplates();
        const result=previewBase.apply(this,arguments);
        setTimeout(()=>hydrateOutcomeModal(lastOutcomeLead),0);
        setTimeout(()=>hydrateOutcomeModal(lastOutcomeLead),100);
        return result;
      };
    }
    if(typeof window.confirmarArchivarLead==='function'){
      const archiveBase=window.confirmarArchivarLead;
      window.confirmarArchivarLead=function(){
        const leadBefore=currentLead();
        if(leadBefore)lastOutcomeLead=leadBefore;
        migrateStoredTemplates();
        const result=archiveBase.apply(this,arguments);
        setTimeout(()=>hydrateOutcomeModal(leadBefore||lastOutcomeLead),100);
        setTimeout(()=>hydrateOutcomeModal(leadBefore||lastOutcomeLead),180);
        return result;
      };
    }
    patchedOutcome=true;
    return true;
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-cya-wa-group="retiro_5"]');
    if(button){migrateStoredTemplates();setTimeout(hydrateWhatsAppCenter,0);setTimeout(hydrateWhatsAppCenter,50);}
  },true);

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    migrateStoredTemplates();
    patchWhatsAppCenter();
    patchOutcomeFlow();
    if((patchedWa&&patchedOutcome)||attempts>600)clearInterval(timer);
  },50);
})();
