/* C&A WhatsApp template: Revisión SINDOs.
   Internal label mentions SINDOs; outbound customer text intentionally does not.
   Adds itself to persisted templates and to the prospect WhatsApp center under Seguimiento. */
(function installSindosTemplate(){
  if(window.__cyaSindosTemplateInstalled)return;
  window.__cyaSindosTemplateInstalled=true;

  const TEMPLATE={
    id:'pl_wa_sindos_1',
    nombre:'WhatsApp · Revisión SINDOs',
    etapa:'sindos',
    tipo:'whatsapp',
    icono:'',
    cyaGrupo:'sindos',
    cyaOrden:1,
    texto:'Hola, {{NOMBRE}}.\n\nQueremos informarte que tu trámite *continúa en proceso de revisión*.\nAl realizar la primera validación de tus semanas cotizadas, el sistema nos indica que _anteriormente ya realizaste un retiro por desempleo_.\n\nPor este motivo, es necesario realizar una segunda revisión, con la finalidad de confirmar la fecha en que se efectuó tu último retiro y validar que actualmente ya cumplas nuevamente con el tiempo requerido para solicitar este beneficio.\n\nEsta revisión se realiza únicamente en días hábiles. En cuanto tengamos la confirmación, me comunicaré contigo para informarte si ya eres apto para continuar.\n\nAgradecemos tu paciencia y confianza.'
  };

  let persisted=false;
  let wrappedOpen=false;
  let wrappedEdit=false;

  function safe(value){
    try{return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
    catch(_){return String(value??'');}
  }

  function firstName(value){
    const token=String(value||'').trim().split(/\s+/)[0]||'';
    if(!token)return '';
    const lower=token.toLocaleLowerCase('es-MX');
    return lower.charAt(0).toLocaleUpperCase('es-MX')+lower.slice(1);
  }

  function currentLead(){
    try{
      if(typeof editingLeadId==='undefined'||!editingLeadId)return null;
      return (store?.leads||[]).find(l=>String(l.id)===String(editingLeadId))||null;
    }catch(_){return null;}
  }

  function ensurePersistedTemplate(){
    try{
      if(typeof store==='undefined'||!store)return false;
      if(!Array.isArray(store.plantillas)){
        try{store.plantillas=typeof PLANTILLAS_DEFAULT!=='undefined'?PLANTILLAS_DEFAULT.map(p=>({...p})):[];}catch(_){store.plantillas=[];}
      }
      const existing=store.plantillas.find(p=>p?.id===TEMPLATE.id);
      if(!existing){
        store.plantillas.push({...TEMPLATE});
        if(typeof saveStore==='function')saveStore();
      }
      persisted=true;
      return true;
    }catch(error){
      console.warn('No se pudo registrar plantilla SINDOs',error);
      return false;
    }
  }

  function templateFromStore(){
    try{return (store?.plantillas||[]).find(p=>p?.id===TEMPLATE.id)||TEMPLATE;}catch(_){return TEMPLATE;}
  }

  function renderedText(){
    const lead=currentLead();
    const visibleName=String(document.getElementById('lead-nombre')?.value||lead?.nombre||lead?.name||'').trim();
    return String(templateFromStore().texto||TEMPLATE.texto).replace(/\{\{NOMBRE\}\}/g,firstName(visibleName)||'{{NOMBRE}}');
  }

  function sindosButton(){return document.querySelector('[data-cya-wa-sindos="1"]');}

  function renderSindos(){
    ensurePersistedTemplate();
    document.querySelectorAll('#cya-wa-main-buttons .btn').forEach(btn=>btn.classList.remove('active'));
    const btn=sindosButton();if(btn)btn.classList.add('active');
    const list=document.getElementById('cya-wa-block-list');if(!list)return;
    list.innerHTML=`<div class="cya-wa-block" data-cya-wa-sindos-block="1"><div class="cya-wa-block-head"><span class="cya-wa-block-name">Revisión SINDOs · Mensaje 1</span><span>Plantilla editable</span></div><textarea class="form-textarea" id="cya-wa-text-0" spellcheck="true">${safe(renderedText())}</textarea><div class="cya-wa-block-actions"><button class="btn" type="button" onclick="cyaCopiarBloqueWhatsApp(0)">Copiar</button><button class="btn cya-wa-direct" type="button" onclick="cyaAbrirBloqueWhatsApp(0)">Abrir WhatsApp</button></div></div>`;
  }
  window.cyaSeleccionarPlantillaSindos=renderSindos;

  function ensureButton(){
    const row=document.getElementById('cya-wa-main-buttons');
    if(!row||sindosButton())return;
    const btn=document.createElement('button');
    btn.className='btn';
    btn.type='button';
    btn.dataset.cyaWaSindos='1';
    btn.textContent='Revisión SINDOs';
    btn.onclick=renderSindos;
    const approved=row.querySelector('[data-cya-wa-group="aprobado"]');
    if(approved)row.insertBefore(btn,approved);else row.appendChild(btn);
  }

  function wrapOpen(){
    if(wrappedOpen||typeof window.cyaAbrirCentroMensajesWhatsApp!=='function')return;
    const base=window.cyaAbrirCentroMensajesWhatsApp;
    if(base.__cyaSindosWrapped){wrappedOpen=true;return;}
    const wrapped=function(){
      const result=base.apply(this,arguments);
      setTimeout(()=>{
        ensureButton();
        const lead=currentLead();
        const state=String(lead?.estado||lead?.status||'').toLowerCase();
        if(state==='sindos')renderSindos();
      },50);
      return result;
    };
    wrapped.__cyaSindosWrapped=true;
    window.cyaAbrirCentroMensajesWhatsApp=wrapped;
    wrappedOpen=true;
  }

  function wrapEdit(){
    if(wrappedEdit||typeof window.cyaEditarPlantillaWhatsAppSeleccionada!=='function')return;
    const base=window.cyaEditarPlantillaWhatsAppSeleccionada;
    if(base.__cyaSindosWrapped){wrappedEdit=true;return;}
    const wrapped=function(){
      if(sindosButton()?.classList.contains('active')){
        try{
          window.cyaCerrarCentroMensajesWhatsApp?.();
          closeModal?.('modal-lead');
          navigate('plantillas',document.querySelector('[data-page="plantillas"]'));
          setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(TEMPLATE.id);},120);
        }catch(_){ }
        return;
      }
      return base.apply(this,arguments);
    };
    wrapped.__cyaSindosWrapped=true;
    window.cyaEditarPlantillaWhatsAppSeleccionada=wrapped;
    wrappedEdit=true;
  }

  function tick(){
    if(!persisted)ensurePersistedTemplate();
    ensureButton();wrapOpen();wrapEdit();
  }

  const observer=new MutationObserver(()=>tick());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  let tries=0;const timer=setInterval(()=>{
    tick();tries++;
    if(tries>300&&persisted&&wrappedOpen&&wrappedEdit){clearInterval(timer);}
  },100);
})();
