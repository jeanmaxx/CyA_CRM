/* C&A WhatsApp message center for prospects.
   - One WhatsApp entry point in the prospect modal.
   - Grouped, editable templates with one or two intentional message blocks.
   - Preserves WhatsApp *bold* and _italic_ markup.
   - Removes emoji / replacement glyphs from outbound template text.
   - Never sends automatically: the advisor always reviews and presses Send in WhatsApp. */
(function installWhatsAppMessageCenter(){
  if(window.__cyaWhatsAppMessageCenterInstalled)return;
  window.__cyaWhatsAppMessageCenterInstalled=true;

  const TEMPLATE_DEFAULTS=[
    {
      id:'pl_wa_bienvenida_1',nombre:'WhatsApp · Bienvenida / requisitos (1/2)',etapa:'perfilamiento',tipo:'whatsapp',icono:'',cyaGrupo:'bienvenida',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! {{SALUDO}}.\n\nTe saluda *{{ASESOR}}*, _Consultor Previsional_ de *Casillas & Asociados*.\n\nComo viste en nuestra publicidad, para tramitar tu *Retiro por Desempleo de AFORE* es necesario cumplir con 3 puntos clave:\n\n*1. Contar con al menos 1 semana sin cotizar ante el IMSS* (baja laboral).\n*2. Haber cotizado aproximadamente 2 años o más ante el IMSS* a lo largo de tu vida laboral.\n*3. No haber tramitado retiro por desempleo en los últimos 5 años.*'
    },
    {
      id:'pl_wa_bienvenida_2',nombre:'WhatsApp · Bienvenida / requisitos (2/2)',etapa:'perfilamiento',tipo:'whatsapp',icono:'',cyaGrupo:'bienvenida',cyaOrden:2,
      texto:'Si cumples con estos requisitos o tienes duda con alguno, con gusto te apoyo con tu diagnóstico.\n\nPor favor, compárteme tu CURP a 18 dígitos (en texto, captura, PDF o foto de tu INE) para consultar tu viabilidad y monto disponible en sistema.\n\n*Ubicación:* Por el momento nuestra atención y firma presencial es en Irapuato, Querétaro, San Juan del Río, Tequisquiapan, Ezequiel Montes, Cadereyta y Tepeji.\n\n¡Quedo a tus órdenes para iniciar tu evaluación sin costo ni compromiso!'
    },
    {
      id:'pl_wa_revision_1',nombre:'WhatsApp · Revisión en proceso',etapa:'semanas',tipo:'whatsapp',icono:'',cyaGrupo:'revision',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! {{SALUDO}}.\n\nTe saluda *{{ASESOR}}*, _Consultor Previsional_ de *Casillas & Asociados* y soy tu asesor asignado para brindarte la información.\n\nRecibimos tu solicitud para la revisión de tu *Retiro por Desempleo de AFORE*. Ya estamos validando tus datos en el sistema para calcular el monto al que puedes acceder.\n\n*Cobertura:* Nuestra atención y firma presencial se realiza en Querétaro, San Juan del Río, Tequisquiapan, Ezequiel Montes, Cadereyta, Tepeji e Irapuato.\n\nEn unos momentos te comparto los resultados de tu consulta y cómo podemos iniciar tu trámite.\n\n¡Quedo a tus órdenes!'
    },
    {
      id:'pl_wa_aprobado_1',nombre:'WhatsApp · Aprobado (1/2)',etapa:'aprobado',tipo:'whatsapp',icono:'',cyaGrupo:'aprobado',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! Te tengo muy buenas noticias: terminamos de realizar la consulta en el sistema y cumples al 100% con los requisitos de ley para tramitar tu *Retiro por Desempleo de AFORE*.\n\n*¿Cómo es el proceso y cuáles son los pasos a seguir?*\n\n*1. Gestión del monto máximo:* Optimizamos tu expediente para que puedas acceder al beneficio mayor permitido por ley (hasta $35,190 pesos).\n\n*2. Cero anticipos:* Nosotros absorbemos el inicio del trámite; no pagas nada por adelantado. Nuestros honorarios de asesoría _($8,000 pesos)_ se liquidan únicamente hasta que el dinero esté depositado en tu cuenta bancaria. _(Si tú no cobras, nosotros no cobramos)._'
    },
    {
      id:'pl_wa_aprobado_2',nombre:'WhatsApp · Aprobado (2/2)',etapa:'aprobado',tipo:'whatsapp',icono:'',cyaGrupo:'aprobado',cyaOrden:2,
      texto:'*3. Respaldo legal:* Para total seguridad y transparencia de ambas partes, nos reunimos de manera presencial para formalizar el trámite mediante la firma de un contrato de prestación de servicios y un pagaré como garantía.\n\n*4. Trámite y depósito:* Iniciamos el proceso operativo y en cuanto la AFORE libere tu dinero, quedas listo.\n\n*Siguiente paso:*\nPara arrancar con la gestión, compárteme una foto o PDF de tu INE para elaborar el contrato.\n\nPosterior a esto, debemos agendar una cita presencial para la firma de los documentos.\n\n¿Qué día prefieres que nos veamos? ¿Entre semana o en día sábado?\n\nComéntame para organizarnos.'
    },
    {
      id:'pl_wa_despedida_1',nombre:'WhatsApp · Despedida / servicios',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'despedida',cyaOrden:1,
      texto:'¡Muy bien!\n\nQuedo a tus enteras órdenes para cualquier duda que llegue a surgir en el futuro.\n\nAprovecho para recordarte los servicios en los que nos especializamos aquí en *Casillas & Asociados*:\n\n*Retiros por Desempleo de AFORE* (para quienes necesiten liquidez y tengan más de 45 días sin empleo).\n*Estrategias y Trámites de Pensiones.*\n*Corrección de Datos y Documentos ante el IMSS/AFORE.*\n\nTe dejo mi tarjeta digital por si algún amigo, conocido o familiar necesita de este o de otros servicios de consultoría; con gusto los podemos apoyar.\n\nhttps://ttd-alvasd.pages.dev/?asesor=emmanuel-alvarez\n\n¡Que tengas un excelente día!\n\n*{{ASESOR}}* | _Consultor Previsional_'
    },
    {
      id:'pl_wa_curp_mal_1',nombre:'WhatsApp · CURP incorrecta',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'curp_mal',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}!\n\nYa estamos validando tus datos en el sistema para calcular el monto al que puedes acceder, pero nos arroja un *error en la CURP*.\n\nTe agradecería si nos puedes escribir nuevamente la CURP o bien compartirnos una fotografía desde tu INE o una captura desde el archivo PDF.\n\nQuedo pendiente para continuar cuanto antes el proceso.'
    },
    {
      id:'pl_wa_imss_activo_1',nombre:'WhatsApp · IMSS activo',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'imss_activo',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! {{SALUDO}}.\n\nAl revisar tu solicitud en el sistema, detectamos que actualmente te encuentras cotizando como trabajador activo ante el IMSS.\n\nPor disposición oficial y de acuerdo con la Ley del Seguro Social, uno de los requisitos indispensables para poder tramitar el retiro es contar con un mínimo de 7 días naturales en estatus de baja laboral (sin cotizar ante el IMSS).\n\n*Por esta razón, por el momento no es posible iniciar tu trámite.*\n\n*¿Qué podemos hacer?* Si en algún momento cambias de situación laboral o concluyes tu relación de trabajo formal, con gusto guardamos tu expediente para dar inicio a tu gestión en cuanto cumplas el plazo requerido.\n\n¡Seguimos a tus órdenes para cualquier duda sobre tu AFORE o trámites de pensión!'
    },
    {
      id:'pl_wa_inconsistencias_1',nombre:'WhatsApp · Inconsistencias CURP / NSS (1/2)',etapa:'correccion_imss',tipo:'whatsapp',icono:'',cyaGrupo:'inconsistencias',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! Te saluda _{{ASESOR}}_ de *Casillas & Asociados*.\n\nValidamos tus datos en el sistema para tu solicitud de Retiro de AFORE y detectamos una inconsistencia en tus registros oficiales ante el IMSS/AFORE (asociada a tu CURP o Número de Seguridad Social - NSS).\n\nPor normativa institucional, mientras exista este detalle en tu expediente, el sistema no permite autorizar ninguna disposición de recursos.'
    },
    {
      id:'pl_wa_inconsistencias_2',nombre:'WhatsApp · Inconsistencias CURP / NSS (2/2)',etapa:'correccion_imss',tipo:'whatsapp',icono:'',cyaGrupo:'inconsistencias',cyaOrden:2,
      texto:'*¿Cuáles son las opciones para solucionarlo?*\n\n*1. Por tu cuenta* (directo en ventanilla):\nPuedes acudir personalmente a tu Subdelegación del IMSS y a las oficinas de tu AFORE para ingresar la aclaración y unificación de datos. Una vez que queden corregidos y actualizados en el sistema, con mucho gusto retomamos tu trámite de retiro aquí con nosotros.\n\n*2. Con nuestro apoyo* (gestoría especializada):\nSi prefieres evitar las vueltas, filas y trámites burocráticos, en la consultora nos encargamos de realizar la corrección y saneamiento de tu expediente para dejar tu cuenta 100% limpia y proceder con el retiro.\n\nDime con total confianza cómo prefieres manejarlo y con gusto te orientamos.\n\n¡Quedo a tus órdenes!'
    },
    {
      id:'pl_wa_retiro_5_1',nombre:'WhatsApp · Retiro hace menos de 5 años',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'retiro_5',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}!\n\nRevisamos tus datos en el sistema respecto a tu solicitud de Retiro por Desempleo de AFORE.\n\nPor disposición legal, para acceder nuevamente a este beneficio es obligatorio que hayan transcurrido al menos 5 años desde tu último retiro.\n\nLamentablemente, en tu caso aún no se cumple el plazo y la ley establece que solo es posible ejercer este derecho una vez cada 5 años, por lo que *no es viable iniciar el proceso por ahora.*\n\nCon gusto dejamos tu registro guardado para cuando se cumpla este plazo y te contactamos para intentarlo nuevamente.\n\n¡Coméntame si tienes alguna duda, que tengas un excelente día!'
    }
  ];

  const GROUPS=[
    {key:'bienvenida',label:'Bienvenida',kind:'main',ids:['pl_wa_bienvenida_1','pl_wa_bienvenida_2']},
    {key:'revision',label:'Revisión',kind:'main',ids:['pl_wa_revision_1']},
    {key:'aprobado',label:'Aprobado',kind:'main',ids:['pl_wa_aprobado_1','pl_wa_aprobado_2']},
    {key:'despedida',label:'Despedida',kind:'main',ids:['pl_wa_despedida_1']},
    {key:'curp_mal',label:'CURP mal',kind:'reject',ids:['pl_wa_curp_mal_1']},
    {key:'imss_activo',label:'IMSS activo',kind:'reject',ids:['pl_wa_imss_activo_1']},
    {key:'inconsistencias',label:'Inconsistencias',kind:'reject',ids:['pl_wa_inconsistencias_1','pl_wa_inconsistencias_2']},
    {key:'retiro_5',label:'Retiro -5 años',kind:'reject',ids:['pl_wa_retiro_5_1']}
  ];

  let currentGroupKey='';
  let messageLeadId=null;

  function safe(value){
    return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function sanitizeWhatsAppText(value){
    let text=String(value??'').replace(/\uFFFD/g,'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
    try{text=text.replace(/\p{Extended_Pictographic}/gu,'');}catch(_){text=text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'');}
    text=text.replace(/[\uFE0E\uFE0F\u200D\u20E3]/g,'');
    return text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  window.cyaSanitizeWhatsAppText=sanitizeWhatsAppText;

  function currentLead(){
    try{
      if(typeof editingLeadId==='undefined'||!editingLeadId)return null;
      return (store?.leads||[]).find(l=>String(l.id)===String(editingLeadId))||null;
    }catch(_){return null;}
  }

  function leadById(id){
    try{return (store?.leads||[]).find(l=>String(l.id)===String(id))||null;}catch(_){return null;}
  }

  function normalizePhone(value){
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.length===13&&digits.startsWith('521'))digits=digits.slice(3);
    else if(digits.length===12&&digits.startsWith('52'))digits=digits.slice(2);
    else if(digits.length>10)digits=digits.slice(-10);
    return digits.slice(0,10);
  }

  function firstName(value){
    const token=String(value||'').trim().split(/\s+/)[0]||'';
    if(!token)return '';
    const lower=token.toLocaleLowerCase('es-MX');
    return lower.charAt(0).toLocaleUpperCase('es-MX')+lower.slice(1);
  }

  function advisorName(){
    try{
      const value=typeof asesorNombreCompleto==='function'?asesorNombreCompleto(sesionActiva):(sesionActiva?.nombre||'');
      return String(value||'').trim()||'Emmanuel Álvarez';
    }catch(_){return 'Emmanuel Álvarez';}
  }

  function greeting(){
    const hour=new Date().getHours();
    if(hour>=5&&hour<12)return 'Buen día';
    if(hour>=12&&hour<20)return 'Buenas tardes';
    return 'Buenas noches';
  }

  function ensureTemplates(){
    try{
      if(typeof store==='undefined'||!store)return;
      let arr=Array.isArray(store.plantillas)?store.plantillas:null;
      if(!arr){
        try{arr=typeof PLANTILLAS_DEFAULT!=='undefined'?PLANTILLAS_DEFAULT.map(p=>({...p})):[];}catch(_){arr=[];}
        store.plantillas=arr;
      }
      let changed=false;
      for(const tpl of TEMPLATE_DEFAULTS){
        if(!arr.some(p=>p.id===tpl.id)){arr.push({...tpl});changed=true;}
      }
      for(const tpl of arr){
        if(String(tpl?.tipo||'').toLowerCase()!=='whatsapp'||typeof tpl.texto!=='string')continue;
        const clean=sanitizeWhatsAppText(tpl.texto);
        if(clean!==tpl.texto){tpl.texto=clean;changed=true;}
      }
      if(changed&&typeof saveStore==='function')saveStore();
    }catch(error){console.warn('WhatsApp templates could not be initialized',error);}
  }

  function templateById(id){
    ensureTemplates();
    try{return (store?.plantillas||[]).find(p=>p.id===id)||TEMPLATE_DEFAULTS.find(p=>p.id===id)||null;}
    catch(_){return TEMPLATE_DEFAULTS.find(p=>p.id===id)||null;}
  }

  function renderText(template,lead){
    const visibleName=String(document.getElementById('lead-nombre')?.value||lead?.nombre||lead?.name||'').trim();
    return sanitizeWhatsAppText(String(template?.texto||'')
      .replace(/\{\{NOMBRE\}\}/g,firstName(visibleName))
      .replace(/\{\{ASESOR\}\}/g,advisorName())
      .replace(/\{\{SALUDO\}\}/g,greeting())
      .replace(/ +([,.!?])/g,'$1'));
  }

  async function copyText(value){
    const text=sanitizeWhatsAppText(value);if(!text)return false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch(_){ }
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,text.length);
    let ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}ta.remove();return ok;
  }

  function openWhatsApp(lead,text){
    const phone=normalizePhone(document.getElementById('lead-tel')?.value||lead?.telefono||lead?.phone||'');
    if(phone.length!==10){showToast?.('El prospecto necesita un teléfono válido de 10 dígitos para abrir WhatsApp','warn');return null;}
    const clean=sanitizeWhatsAppText(text);
    const tab=window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(clean)}`,'_blank');
    if(tab)try{tab.opener=null;}catch(_){ }
    showToast?.(tab?'WhatsApp abierto. Revisa el mensaje y pulsa Enviar manualmente.':'El navegador bloqueó la apertura de WhatsApp.',tab?'success':'warn');
    return tab;
  }

  function recommendedGroup(lead){
    const state=String(lead?.estado||lead?.status||'').toLowerCase();
    const cause=String(lead?.causaArchivo||lead?.motivoArchivo||lead?.archiveCause||'').toLowerCase();
    if(cause.includes('imss'))return 'imss_activo';
    if(cause.includes('incons'))return 'inconsistencias';
    if(cause.includes('5')||cause.includes('retiro'))return 'retiro_5';
    if(state==='aprobado')return 'aprobado';
    if(state==='semanas'||state==='sindos'||state.includes('revision'))return 'revision';
    return 'bienvenida';
  }

  function ensureStyles(){
    if(document.getElementById('cya-wa-message-center-styles'))return;
    const style=document.createElement('style');style.id='cya-wa-message-center-styles';
    style.textContent=`
      #cya-client-message-actions{display:none!important}
      #cya-wa-center-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
      #cya-wa-center-actions .cya-wa-open{background:#25d366;border-color:#25d366;color:#fff;font-weight:700}
      .cya-wa-center-modal{width:min(780px,94vw);max-height:90vh;display:flex;flex-direction:column}
      .cya-wa-center-modal .modal-body{overflow:auto}
      .cya-wa-section-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted,#94a3b8);margin:4px 0 8px;font-weight:700}
      .cya-wa-template-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      .cya-wa-template-row .btn.active{border-color:#25d366;background:rgba(37,211,102,.12);color:#25d366;font-weight:700}
      .cya-wa-helper{padding:10px 12px;border:1px solid rgba(148,163,184,.22);border-radius:8px;margin-bottom:14px;font-size:12px;line-height:1.45;color:var(--text-muted,#94a3b8)}
      .cya-wa-block{border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:12px;margin-top:10px;background:rgba(15,23,42,.08)}
      .cya-wa-block-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;font-size:12px}
      .cya-wa-block-name{font-weight:700}
      .cya-wa-block textarea{min-height:170px;line-height:1.48;resize:vertical}
      .cya-wa-block-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}
      .cya-wa-block-actions .cya-wa-direct{background:#25d366;border-color:#25d366;color:#fff}
      .cya-wa-human-note{font-size:11px;color:var(--text-muted,#94a3b8)}
      @media(max-width:640px){.cya-wa-center-modal{width:96vw}.cya-wa-block textarea{min-height:190px}.cya-wa-block-actions .btn{flex:1}}
    `;document.head.appendChild(style);
  }

  function ensureCenterModal(){
    if(document.getElementById('cya-wa-message-center'))return;
    const modal=document.createElement('div');modal.id='cya-wa-message-center';modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal cya-wa-center-modal" role="dialog" aria-modal="true" aria-labelledby="cya-wa-center-title">
      <div class="modal-header"><div><div class="modal-title" id="cya-wa-center-title">Mensajes WhatsApp</div><div class="form-helper" id="cya-wa-center-person"></div></div><button class="modal-close" type="button" onclick="cyaCerrarCentroMensajesWhatsApp()">×</button></div>
      <div class="modal-body">
        <div class="cya-wa-section-label">Seguimiento</div><div class="cya-wa-template-row" id="cya-wa-main-buttons"></div>
        <div class="cya-wa-section-label">No viable / seguimiento futuro</div><div class="cya-wa-template-row" id="cya-wa-reject-buttons"></div>
        <div class="cya-wa-helper">Los mensajes conservan *negritas* y _cursivas_ de WhatsApp. Los emojis se eliminan antes de copiar o abrir WhatsApp para evitar rombos o símbolos incompatibles. El CRM nunca envía automáticamente: revisa el texto y pulsa Enviar manualmente en WhatsApp.</div>
        <div id="cya-wa-block-list"></div>
      </div>
      <div class="modal-footer"><span class="cya-wa-human-note">Última acción siempre manual.</span><button class="btn" type="button" onclick="cyaEditarPlantillaWhatsAppSeleccionada()">Editar en Plantillas</button><button class="btn btn-primary" type="button" onclick="cyaCerrarCentroMensajesWhatsApp()">Cerrar</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)window.cyaCerrarCentroMensajesWhatsApp();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))window.cyaCerrarCentroMensajesWhatsApp();});
  }

  function renderGroupButtons(){
    const main=document.getElementById('cya-wa-main-buttons');const reject=document.getElementById('cya-wa-reject-buttons');
    if(!main||!reject)return;
    const button=g=>`<button class="btn${g.key===currentGroupKey?' active':''}" type="button" data-cya-wa-group="${safe(g.key)}">${safe(g.label)}</button>`;
    main.innerHTML=GROUPS.filter(g=>g.kind==='main').map(button).join('');
    reject.innerHTML=GROUPS.filter(g=>g.kind==='reject').map(button).join('');
    document.querySelectorAll('[data-cya-wa-group]').forEach(el=>el.onclick=()=>selectGroup(el.dataset.cyaWaGroup));
  }

  function renderSelectedGroup(){
    const group=GROUPS.find(g=>g.key===currentGroupKey)||GROUPS[0];
    const lead=leadById(messageLeadId)||currentLead();
    const list=document.getElementById('cya-wa-block-list');if(!list||!lead)return;
    const templates=group.ids.map(templateById).filter(Boolean);
    list.innerHTML=templates.map((tpl,index)=>{
      const text=renderText(tpl,lead);
      return `<div class="cya-wa-block"><div class="cya-wa-block-head"><span class="cya-wa-block-name">${safe(group.label)} · Mensaje ${index+1}${templates.length>1?' de '+templates.length:''}</span><span>Plantilla editable</span></div><textarea class="form-textarea" id="cya-wa-text-${index}" spellcheck="true">${safe(text)}</textarea><div class="cya-wa-block-actions"><button class="btn" type="button" onclick="cyaCopiarBloqueWhatsApp(${index})">Copiar</button><button class="btn cya-wa-direct" type="button" onclick="cyaAbrirBloqueWhatsApp(${index})">Abrir WhatsApp</button></div></div>`;
    }).join('');
  }

  function selectGroup(key){
    if(!GROUPS.some(g=>g.key===key))return;
    currentGroupKey=key;renderGroupButtons();renderSelectedGroup();
  }

  window.cyaAbrirCentroMensajesWhatsApp=function(groupKey){
    const lead=currentLead();if(!lead){showToast?.('Guarda primero el prospecto para preparar mensajes de WhatsApp','warn');return;}
    ensureTemplates();ensureStyles();ensureCenterModal();
    messageLeadId=lead.id;
    currentGroupKey=GROUPS.some(g=>g.key===groupKey)?groupKey:recommendedGroup(lead);
    const person=document.getElementById('cya-wa-center-person');if(person)person.textContent=`Prospecto: ${lead.nombre||'Sin nombre'} · ${normalizePhone(document.getElementById('lead-tel')?.value||lead.telefono||'')||'sin teléfono'}`;
    renderGroupButtons();renderSelectedGroup();
    document.getElementById('cya-wa-message-center')?.classList.add('open');
  };

  window.cyaCerrarCentroMensajesWhatsApp=function(){
    document.getElementById('cya-wa-message-center')?.classList.remove('open');messageLeadId=null;
  };

  window.cyaCopiarBloqueWhatsApp=async function(index){
    const area=document.getElementById(`cya-wa-text-${Number(index)}`);if(!area)return;
    const clean=sanitizeWhatsAppText(area.value);area.value=clean;
    const ok=await copyText(clean);showToast?.(ok?'Mensaje copiado':'No fue posible copiar el mensaje',ok?'success':'warn');
  };

  window.cyaAbrirBloqueWhatsApp=function(index){
    const area=document.getElementById(`cya-wa-text-${Number(index)}`);const lead=leadById(messageLeadId);if(!area||!lead)return;
    const clean=sanitizeWhatsAppText(area.value);area.value=clean;openWhatsApp(lead,clean);
  };

  window.cyaEditarPlantillaWhatsAppSeleccionada=function(){
    const group=GROUPS.find(g=>g.key===currentGroupKey);const templateId=group?.ids?.[0]||null;if(!templateId)return;
    window.cyaCerrarCentroMensajesWhatsApp();
    try{closeModal?.('modal-lead');navigate('plantillas',document.querySelector('[data-page="plantillas"]'));setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(templateId);},100);}catch(_){ }
  };

  function ensureProspectButton(){
    const tel=document.getElementById('lead-tel');if(!tel)return;
    const lead=currentLead();
    let actions=document.getElementById('cya-wa-center-actions');
    if(!actions){actions=document.createElement('div');actions.id='cya-wa-center-actions';actions.innerHTML='<button class="btn cya-wa-open" type="button" onclick="cyaAbrirCentroMensajesWhatsApp()">WhatsApp</button>';tel.insertAdjacentElement('afterend',actions);}
    actions.style.display=lead?'flex':'none';
  }

  function patchReviewFlow(){
    const base=window.cyaMarcarRevisionEnviada;
    if(typeof base!=='function'||base.__cyaWaCenterWrapped)return false;
    const wrapped=async function(){
      const result=await base.apply(this,arguments);
      setTimeout(()=>{
        const old=document.getElementById('cya-client-review-message-modal');
        if(old?.classList.contains('open')){
          old.classList.remove('open');
          window.cyaAbrirCentroMensajesWhatsApp('revision');
        }
      },0);
      return result;
    };
    wrapped.__cyaWaCenterWrapped=true;window.cyaMarcarRevisionEnviada=wrapped;return true;
  }

  function patchLegacyTemplateActions(){
    const pairs=[
      ['cyaCopiarAvisoRevisionPopup','cya-client-review-text'],
      ['cyaAbrirWhatsAppAvisoRevision','cya-client-review-text'],
      ['cyaCopiarRespuestaArchivo','cya-outcome-text'],
      ['cyaAbrirWhatsAppArchivo','cya-outcome-text']
    ];
    for(const [name,id] of pairs){
      const base=window[name];if(typeof base!=='function'||base.__cyaEmojiSanitized)continue;
      const wrapped=function(){const area=document.getElementById(id);if(area)area.value=sanitizeWhatsAppText(area.value);return base.apply(this,arguments);};
      wrapped.__cyaEmojiSanitized=true;window[name]=wrapped;
    }
  }

  ensureStyles();ensureTemplates();ensureProspectButton();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensureProspectButton();patchReviewFlow();patchLegacyTemplateActions();});
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});

  let tries=0;const patchTimer=setInterval(()=>{
    tries++;patchReviewFlow();patchLegacyTemplateActions();ensureProspectButton();
    if(tries>200||(window.__cyaMetaLeadOutcomesInstalled===true&&patchReviewFlow()===false))clearInterval(patchTimer);
  },100);
})();
