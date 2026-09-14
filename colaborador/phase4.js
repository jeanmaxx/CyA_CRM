/* Phase 4 · Information library + interactive 11-step client explanation guide. */
(function installCollaboratorGuide(){
  if(window.__caCollaboratorGuideInstalled)return;
  window.__caCollaboratorGuideInstalled=true;

  const GUIDE_STEPS=[
    {id:1,title:'Revisión de elegibilidad (CURP)',text:'Validamos si el prospecto cumple los criterios necesarios para continuar y enviamos la CURP a revisión.'},
    {id:2,title:'Documentación del cliente para contrato',text:'Si el perfil es viable, solicitamos INE y comprobante de domicilio. El equipo completa y revisa el resto del expediente necesario.'},
    {id:3,title:'Descarga de AFORE Móvil',text:'Ayudamos al cliente a instalar AFORE Móvil y a identificar en qué AFORE se encuentra registrado.'},
    {id:4,title:'Revisar cuenta bancaria Nivel 4',text:'Confirmamos que el cliente tenga una cuenta a su nombre adecuada para recibir el depósito. Si no conoce el nivel, se deja pendiente para revisión.'},
    {id:5,title:'Firma de contrato',text:'Explicamos honorarios, obligaciones y alcance del servicio antes de la firma del contrato y documentos asociados.'},
    {id:6,title:'Inicio de trámite',text:'Casillas & Asociados inicia el seguimiento operativo del expediente conforme a los requisitos aplicables al caso.'},
    {id:7,title:'Crear cita en AFORE',text:'Se genera y agenda la cita correspondiente cuando el expediente requiere actualización o atención presencial en la AFORE.'},
    {id:8,title:'Actualización de datos en AFORE',text:'El cliente acude a su AFORE con identificación, comprobante y los documentos que correspondan para actualizar su expediente.'},
    {id:9,title:'Solicitud en aplicación',text:'La solicitud se realiza cuando ya se cumplen los requisitos legales; para retiro por desempleo deben existir al menos 46 días naturales de desempleo.'},
    {id:10,title:'Recepción de depósito',text:'Una vez autorizada la solicitud, el recurso se entrega por el medio aprobado y puede depositarse en la cuenta bancaria del cliente.'},
    {id:11,title:'Pago de honorarios',text:'El cliente cubre los honorarios pactados conforme al contrato una vez que corresponde el cierre financiero del servicio.'},
  ];
  let guideTarget='free';
  let freeSteps={};
  const openCards=new Set(['retiro_desempleo','proceso']);
  try{freeSteps=JSON.parse(sessionStorage.getItem('ca-collab-free-guide')||'{}')||{};}catch(_){freeSteps={};}

  function guideContent(){return Array.isArray(state?.bootstrap?.guideContent)?state.bootstrap.guideContent:[];}
  function targetOptions(){
    const options=[{key:'free',label:'Guía libre · no vinculada a expediente'}];
    for(const p of (state?.prospects||[]))options.push({key:`lead:${p.id}`,label:`Prospecto · ${p.name}`});
    for(const c of (state?.bootstrap?.clients||[]))options.push({key:`client:${c.id}`,label:`Cliente · ${c.name}`});
    return options;
  }
  function selectedTarget(){
    if(guideTarget==='free')return{type:'free',id:'free',steps:freeSteps};
    const [type,id]=guideTarget.split(':');
    const row=type==='lead'?(state?.prospects||[]).find(x=>String(x.id)===id):(state?.bootstrap?.clients||[]).find(x=>String(x.id)===id);
    return row?{type,id,row,steps:row.guideSteps||{}}:{type:'free',id:'free',steps:freeSteps};
  }
  function checked(steps,id){const v=steps?.[String(id)];return v===true||v?.checked===true;}
  function safeUrl(value){try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.href:'';}catch(_){return'';}}

  function bodyHTML(body){
    const lines=String(body||'').split(/\r?\n/);let html='',inList=false;
    const closeList=()=>{if(inList){html+='</ul>';inList=false;}};
    for(const raw of lines){const line=raw.trim();if(!line){closeList();continue;}
      if(line.startsWith('## ')){closeList();html+=`<h4>${esc(line.slice(3))}</h4>`;continue;}
      if(line.startsWith('- ')){if(!inList){html+='<ul>';inList=true;}html+=`<li>${esc(line.slice(2))}</li>`;continue;}
      if(line.startsWith('! ')){closeList();html+=`<div class="guide-warning">${esc(line.slice(2))}</div>`;continue;}
      closeList();html+=`<p>${esc(line)}</p>`;
    }closeList();return html;
  }

  function knowledgeCard(item){
    const open=openCards.has(item.slug),url=safeUrl(item.source_url);
    return `<section class="guide-card ${open?'open':''}">
      <button class="guide-card-head" type="button" onclick="caToggleGuideCard('${esc(item.slug)}')" aria-expanded="${open}">
        <span class="guide-card-icon">${esc(item.icon||'▤')}</span><span class="guide-card-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle||'')}</small></span><span class="guide-arrow">${open?'▾':'▸'}</span>
      </button>
      ${open?`<div class="guide-card-body"><div class="guide-richtext">${bodyHTML(item.body)}</div>${url?`<a class="guide-source" href="${esc(url)}" target="_blank" rel="noopener">Fuente de referencia: ${esc(item.source_label||'Consultar fuente oficial')} ↗</a>`:''}</div>`:''}
    </section>`;
  }

  function processGuide(){
    const target=selectedTarget(),steps=target.steps||{},done=GUIDE_STEPS.filter(s=>checked(steps,s.id)).length,open=openCards.has('proceso');
    const options=targetOptions();if(!options.some(o=>o.key===guideTarget))guideTarget='free';
    return `<section class="guide-card process-card ${open?'open':''}">
      <button class="guide-card-head" type="button" onclick="caToggleGuideCard('proceso')" aria-expanded="${open}">
        <span class="guide-card-icon">✓</span><span class="guide-card-copy"><strong>Guía del proceso de retiro</strong><small>Checklist de los 11 temas que conviene explicar al cliente</small></span><span class="guide-progress-pill">${done}/11</span><span class="guide-arrow">${open?'▾':'▸'}</span>
      </button>
      ${open?`<div class="guide-card-body">
        <div class="guide-controls"><label><span>Usar esta guía con</span><select onchange="caSelectGuideTarget(this.value)">${options.map(o=>`<option value="${esc(o.key)}" ${o.key===guideTarget?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label><button class="btn guide-reset" type="button" onclick="caResetGuide()">Reiniciar guía</button></div>
        <div class="guide-progress"><i style="width:${Math.round(done/11*100)}%"></i></div>
        <div class="guide-steps">${GUIDE_STEPS.map(step=>{const isDone=checked(steps,step.id);return `<label class="guide-step ${isDone?'done':''}"><input type="checkbox" ${isDone?'checked':''} onchange="caToggleGuideStep(${step.id},this.checked)"><span class="guide-check">${isDone?'✓':''}</span><span class="guide-step-number">${step.id}</span><span class="guide-step-copy"><strong>${esc(step.title)}</strong><small>${esc(step.text)}</small></span></label>`;}).join('')}</div>
        <div class="guide-helper">Esta lista sirve únicamente para confirmar qué temas ya explicaste. No cambia las etapas reales del prospecto o cliente en el CRM.</div>
      </div>`:''}
    </section>`;
  }

  function renderGuide(){
    const items=guideContent();const first=items.find(x=>x.slug==='retiro_desempleo');const rest=items.filter(x=>x.slug!=='retiro_desempleo');
    return `<div class="guide-toolbar"><div><h1>Información / Guía</h1><p>Material de apoyo para explicar el proceso con claridad y consultar conceptos clave desde campo.</p></div></div>
      <div class="guide-stack">${first?knowledgeCard(first):''}${processGuide()}${rest.map(knowledgeCard).join('')}</div>
      <div class="guide-disclaimer">Información general para apoyo comercial y operativo. Los requisitos, montos, efectos fiscales y derechos deben confirmarse en el expediente individual y en las fuentes oficiales vigentes.</div>`;
  }

  window.caToggleGuideCard=function(slug){if(openCards.has(slug))openCards.delete(slug);else openCards.add(slug);if(state.page==='guia')window.navigate('guia',true);};
  window.caSelectGuideTarget=function(value){guideTarget=value||'free';if(state.page==='guia')window.navigate('guia',true);};
  window.caToggleGuideStep=async function(step,value){
    const target=selectedTarget();
    if(target.type==='free'){freeSteps[String(step)]={checked:Boolean(value),at:new Date().toISOString()};try{sessionStorage.setItem('ca-collab-free-guide',JSON.stringify(freeSteps));}catch(_){ }window.navigate('guia',true);return;}
    try{setBusy(true,'Guardando guía…');const data=await portalAction({action:'guide_toggle',recordType:target.type,recordId:target.id,step,checked:Boolean(value)});target.row.guideSteps=data.steps||{};window.navigate('guia',true);}catch(error){toast(error.message,'error');}finally{setBusy(false);}
  };
  window.caResetGuide=async function(){if(!confirm('¿Reiniciar todos los checks de esta guía?'))return;const target=selectedTarget();if(target.type==='free'){freeSteps={};try{sessionStorage.removeItem('ca-collab-free-guide');}catch(_){ }window.navigate('guia',true);return;}try{setBusy(true,'Reiniciando guía…');const data=await portalAction({action:'guide_reset',recordType:target.type,recordId:target.id});target.row.guideSteps=data.steps||{};window.navigate('guia',true);toast('Guía reiniciada','success');}catch(error){toast(error.message,'error');}finally{setBusy(false);}};

  const baseNavigate=window.navigate;
  window.navigate=function(page,silent=false){
    if(page==='guia'){
      state.page='guia';document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='guia'));
      const title=document.getElementById('page-title');if(title)title.textContent='Información / Guía';const add=document.getElementById('new-prospect-top');if(add)add.style.display='none';const content=document.getElementById('page-content');if(content)content.innerHTML=renderGuide();window.scrollTo({top:0,behavior:silent?'auto':'smooth'});return;
    }
    return baseNavigate(page,silent);
  };

  function bindGuideNav(){document.querySelectorAll('[data-page="guia"]').forEach(el=>{if(el.dataset.guideBound)return;el.dataset.guideBound='1';el.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();window.navigate('guia');},true);});}
  bindGuideNav();new MutationObserver(bindGuideNav).observe(document.documentElement,{childList:true,subtree:true});
})();
