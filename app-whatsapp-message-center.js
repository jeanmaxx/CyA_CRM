/* C&A WhatsApp message center for prospects and existing clients.
   - A single center with context-specific WhatsApp entry points.
   - Grouped, editable templates with one or more intentional message blocks.
   - Preserves WhatsApp *bold* and _italic_ markup.
   - Removes emoji / replacement glyphs from outbound template text.
   - Never sends automatically: the advisor always reviews and presses Send in WhatsApp. */
(function installWhatsAppMessageCenter(){
  if(window.__cyaWhatsAppMessageCenterInstalled)return;
  window.__cyaWhatsAppMessageCenterInstalled=true;
  // The official SINDOS module must not inject its legacy side-button into the new 6-column layout.
  window.__cyaWhatsAppSindosIntegrated=true;

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
      id:'pl_wa_sindos_1',nombre:'WhatsApp · Revisión SINDOS',etapa:'sindos',tipo:'whatsapp',icono:'',cyaGrupo:'sindos',cyaOrden:1,
      texto:'Hola, {{NOMBRE}}.\n\nQueremos informarte que tu trámite *continúa en proceso de revisión*.\nAl realizar la primera validación de tus semanas cotizadas, el sistema nos indica que _anteriormente ya realizaste un retiro por desempleo_.\n\nPor este motivo, es necesario realizar una segunda revisión, con la finalidad de confirmar la fecha en que se efectuó tu último retiro y validar que actualmente ya cumplas nuevamente con el tiempo requerido para solicitar este beneficio.\n\nEsta revisión se realiza únicamente en días hábiles. En cuanto tengamos la confirmación, me comunicaré contigo para informarte si ya eres apto para continuar.\n\nAgradecemos tu paciencia y confianza.'
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
      id:'pl_wa_alta_15_1',nombre:'WhatsApp · Seguimiento · 15 días después del alta',etapa:'dado_alta',tipo:'whatsapp',icono:'',cyaGrupo:'alta_15',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}!\n\nTe escribo para recordarte que ya pasaron dos semanas desde tu alta y me gustaría que nos organicemos esta semana para realizar la actualización de tu expediente en la AFORE.\n\n¿Qué día y en qué horario te quedaría mejor? Así podemos coordinar la visita y preparar tu documentación con anticipación.\n\nTambién quisiera saber si ya tienes lista tu cuenta bancaria. Si es así, ¿me podrías compartir únicamente la carátula de tu estado de cuenta más reciente? Es para verificar que el tipo de cuenta sea adecuado para recibir tu recurso.\n\nQuedo pendiente de tus comentarios. ¡Muchas gracias!'
    },
    {
      id:'pl_wa_finalizacion_1',nombre:'WhatsApp · Finalización (1/3) · Depósito recibido',etapa:'deposito',tipo:'whatsapp',icono:'',cyaGrupo:'finalizacion',cyaOrden:1,
      texto:'¡Qué alegría, {{NOMBRE}}! 🎉🙌\n\nMe da muchísimo gusto saber que ya recibiste tu depósito.\n\nDespués de todo el proceso y la espera, me da mucho gusto saber que ya cuentas con este recurso.\n\nTambién quiero agradecerte, a nombre de todo el equipo de *Casillas & Asociados*, la confianza y paciencia que depositaste en nosotros para acompañarte hasta este momento.\n\nDe corazón, espero que este dinero te brinde tranquilidad, te ayude a resolver aquello que tienes pendiente o te permita dar ese paso hacia algún proyecto que tengas en mente.\n\n*¡Muchas felicidades, {{NOMBRE}}!* 🎊\nFue un verdadero gusto acompañarte y ser parte de este proceso.'
    },
    {
      id:'pl_wa_finalizacion_2',nombre:'WhatsApp · Finalización (2/3) · Pago de honorarios',etapa:'cobro_honorarios',tipo:'whatsapp',icono:'',cyaGrupo:'finalizacion',cyaOrden:2,
      texto:'Ahora que hemos concluido satisfactoriamente tu trámite, te comparto los datos para realizar el pago de los honorarios de acompañamiento y asesoría que acordamos.\n\nJorge Casillas Avila\nClip\n730969400005611793'
    },
    {
      id:'pl_wa_finalizacion_3',nombre:'WhatsApp · Finalización (3/3) · Pago confirmado',etapa:'cobro_honorarios',tipo:'whatsapp',icono:'',cyaGrupo:'finalizacion',cyaOrden:3,
      texto:'¡Te confirmo de recibido el pago, {{NOMBRE}}!\n\nMuchas gracias nuevamente por tu confianza.\n\nTe dejo mi tarjeta digital por si algún amigo, conocido o familiar necesita de este o de otros servicios de consultoría; ya sabes que con gusto los podemos apoyar.\n\nhttps://ttd-alvasd.pages.dev/?asesor=emmanuel-alvarez\n\nSeguimos a tus órdenes para cualquier duda. 🤝 ¡Que tengas un excelente día!\n\n*Emmanuel Alvarez* | _Consultor Previsional_'
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
      id:'pl_wa_sin_semanas_1',nombre:'WhatsApp · Sin semanas suficientes',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'sin_semanas',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}! {{SALUDO}}.\n\nTe informo que hemos terminado de revisar tu información y encontramos lo siguiente:\n\n*Por el momento no cumples con el criterio inicial de semanas cotizadas para continuar con tu solicitud de retiro por desempleo.*\n\nActualmente registras *{{SEMANAS_COTIZADAS}} semanas cotizadas* y el criterio inicial que utilizamos para esta revisión es de *105 semanas*. La elegibilidad definitiva depende de la modalidad y los requisitos aplicables a tu cuenta AFORE.\n\n¡Seguimos a tus órdenes para cualquier duda sobre tu AFORE o trámites de pensión!\n\nSaludos.\n\n*{{ASESOR}}*\n_Consultor previsional_\n*Casillas & Asociados*'
    },
    {
      id:'pl_wa_retiro_5_1',nombre:'WhatsApp · Retiro hace menos de 5 años',etapa:'',tipo:'whatsapp',icono:'',cyaGrupo:'retiro_5',cyaOrden:1,
      texto:'¡Hola, {{NOMBRE}}!\n\nRevisamos tus datos en el sistema respecto a tu solicitud de Retiro por Desempleo de AFORE.\n\nPor disposición legal, para acceder nuevamente a este beneficio es obligatorio que hayan transcurrido al menos 5 años desde tu último retiro.\n\nLamentablemente, en tu caso aún no se cumple el plazo y la ley establece que solo es posible ejercer este derecho una vez cada 5 años, por lo que *no es viable iniciar el proceso por ahora.*\n\nCon gusto dejamos tu registro guardado para cuando se cumpla este plazo y te contactamos para intentarlo nuevamente.\n\n¡Coméntame si tienes alguna duda, que tengas un excelente día!'
    }
  ];

  // Same institutional categories and order used by the collaborator portal.
  // Keep source templates editable and never duplicate their saved content.
  const GROUPS=[
    {key:'bienvenida',label:'Bienvenida',kind:'main',ids:['pl_wa_bienvenida_1','pl_wa_bienvenida_2']},
    {key:'revision',label:'Revisión',kind:'main',ids:['pl_wa_revision_1']},
    {key:'sindos',label:'Revisión SINDOS',kind:'main',ids:['pl_wa_sindos_1']},
    {key:'aprobado',label:'Aprobado',kind:'main',ids:['pl_wa_aprobado_1','pl_wa_aprobado_2']},
    {key:'finalizacion',label:'Finalización',kind:'main',ids:['pl_wa_finalizacion_1','pl_wa_finalizacion_2','pl_wa_finalizacion_3']},
    {key:'despedida',label:'Despedida',kind:'main',ids:['pl_wa_despedida_1']},
    {key:'curp_mal',label:'CURP mal',kind:'reject',ids:['pl_wa_curp_mal_1']},
    {key:'imss_activo',label:'IMSS activo',kind:'reject',ids:['pl_wa_imss_activo_1']},
    {key:'inconsistencias',label:'Inconsistencias',kind:'reject',ids:['pl_wa_inconsistencias_1','pl_wa_inconsistencias_2']},
    {key:'retiro_5',label:'Retiro -5 años',kind:'reject',ids:['pl_wa_retiro_5_1']},
    {key:'sin_semanas',label:'Sin semanas suficientes',kind:'reject',ids:['pl_wa_sin_semanas_1']},
    {key:'alta_15',label:'Seguimiento alta',kind:'reject',ids:['pl_wa_alta_15_1']}
  ];

  let currentGroupKey='';
  let currentMessageIndex=0;
  let currentDrafts=Object.create(null);
  let selectionSuggested=false;
  let messageContactId=null;
  let messageContactType='lead';
  let archivedMessageMode=false;
  window.cyaTipoContactoWhatsApp=()=>messageContactType;

  function safe(value){
    return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function sanitizeWhatsAppText(value,preserveEmoji=false){
    let text=String(value??'').replace(/\uFFFD/g,'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
    if(!preserveEmoji){
      try{text=text.replace(/\p{Extended_Pictographic}/gu,'');}catch(_){text=text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'');}
      text=text.replace(/[\uFE0E\uFE0F\u200D\u20E3]/g,'');
    }
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

  function clientById(id){
    try{return (store?.clientes||[]).find(c=>String(c.id)===String(id))||null;}catch(_){return null;}
  }

  function activeContact(){
    return messageContactType==='client'?clientById(messageContactId):leadById(messageContactId)||currentLead();
  }

  function daysSinceClientAlta(client,now=new Date()){
    if(!client)return null;
    let raw=String(client.fechaAltaAfore||'').trim();
    if(!raw&&typeof fechaEntradaEtapaDadoAlta==='function'){
      try{raw=String(fechaEntradaEtapaDadoAlta(client)||'').trim();}catch(_){ }
    }
    let year,month,day;
    let match=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
    if(match){year=Number(match[1]);month=Number(match[2]);day=Number(match[3]);}
    else{
      match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(!match)return null;
      day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);
    }
    const utc=Date.UTC(year,month-1,day);
    const verified=new Date(utc);
    if(!Number.isFinite(utc)||verified.getUTCFullYear()!==year||verified.getUTCMonth()!==month-1||verified.getUTCDate()!==day)return null;
    const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.floor((today-utc)/86400000);
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
      // Remove only the obsolete duplicate; never touch the user's saved review text.
      const obsolete=arr.findIndex(p=>p?.id==='pl_meta_revision_en_proceso');
      if(obsolete>=0){arr.splice(obsolete,1);changed=true;}
      for(const tpl of TEMPLATE_DEFAULTS){
        if(!arr.some(p=>p.id===tpl.id)){arr.push({...tpl});changed=true;}
      }
      for(const tpl of arr){
        if(String(tpl?.tipo||'').toLowerCase()!=='whatsapp'||typeof tpl.texto!=='string')continue;
        const clean=sanitizeWhatsAppText(tpl.texto,tpl.cyaGrupo==='finalizacion');
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

  function renderText(template,contact){
    const visibleName=String(messageContactType==='client'
      ?(contact?.nombre||contact?.name||'')
      :((archivedMessageMode||String(currentLead()?.id)!==String(contact?.id))?(contact?.nombre||contact?.name||''):(document.getElementById('lead-nombre')?.value||contact?.nombre||contact?.name||''))).trim();
    let templateText=String(template?.texto||'');
    // Un prospecto nuevo de este equipo no debe recibir la cotización
    // antigua de $8,000 ni el límite obsoleto de $35,190. No modifica
    // el texto guardado de la plantilla ni el esquema de otros asesores.
    if(messageContactType==='lead'&&template?.cyaGrupo==='aprobado'
       &&typeof tarifaEquipoEmmanuel==='function'&&tarifaEquipoEmmanuel(contact?.asesorId)){
      templateText=templateText
        .replace('(hasta $35,190 pesos)','(según el monto autorizado para tu caso)')
        .replace(
          'Nuestros honorarios de asesoría _($8,000 pesos)_ se liquidan únicamente hasta que el dinero esté depositado en tu cuenta bancaria.',
          'Los honorarios por nuestro acompañamiento y asesoría se calculan según el monto de retiro y se acuerdan contigo antes de formalizar el contrato. Se liquidan únicamente después de que el recurso esté depositado en tu cuenta bancaria.'
        );
    }
    const personalized=templateText
      .replace(/\{\{NOMBRE\}\}/g,firstName(visibleName))
      .replace(/\{\{ASESOR\}\}/g,advisorName())
      .replace(/\{\{SALUDO\}\}/g,greeting())
      .replace(/\{\{SEMANAS_COTIZADAS\}\}/g,(()=>{const raw=contact?.elegibilidad?.porServicio?.retiro_desempleo?.semanas??contact?.elegibilidad?.semanas;const n=Number(raw);return raw!==undefined&&raw!==null&&String(raw).trim()!==''&&Number.isFinite(n)&&n>=0?String(n):'pendientes de confirmar';})())
      .replace(/ +([,.!?])/g,'$1');
    const dated=template?.cyaGrupo==='retiro_5'&&messageContactType==='lead'&&typeof window.cyaCompletarFechasRetiroWhatsApp==='function'
      ?window.cyaCompletarFechasRetiroWhatsApp(personalized,contact)
      :personalized;
    return sanitizeWhatsAppText(dated,template?.cyaGrupo==='finalizacion');
  }

  async function copyText(value,preserveEmoji=false){
    const text=sanitizeWhatsAppText(value,preserveEmoji);if(!text)return false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch(_){ }
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,text.length);
    let ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}ta.remove();return ok;
  }

  function openWhatsApp(contact,text,preserveEmoji=false){
    const rawPhone=messageContactType==='client'
      ?(contact?.telefono||contact?.phone||'')
      :(String(currentLead()?.id)===String(contact?.id)?(document.getElementById('lead-tel')?.value||contact?.telefono||contact?.phone||''):(contact?.telefono||contact?.phone||''));
    const phone=normalizePhone(rawPhone);
    if(phone.length!==10){showToast?.('El '+(messageContactType==='client'?'cliente':'prospecto')+' necesita un teléfono válido de 10 dígitos para abrir WhatsApp','warn');return null;}
    const clean=sanitizeWhatsAppText(text,preserveEmoji);
    const tab=window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(clean)}`,'_blank');
    if(tab)try{tab.opener=null;}catch(_){ }
    showToast?.(tab?'WhatsApp abierto. Revisa el mensaje y pulsa Enviar manualmente.':'El navegador bloqueó la apertura de WhatsApp.',tab?'success':'warn');
    return tab;
  }

  function recommendedGroup(lead){
    const state=String(lead?.estado||lead?.status||'').toLowerCase();
    const cause=String(lead?.causaArchivo||lead?.motivoArchivo||lead?.archiveCause||'').toLowerCase();
    if(cause==='sin_semanas'||cause.includes('sin semanas'))return 'sin_semanas';
    if(cause.includes('imss'))return 'imss_activo';
    if(cause.includes('incons'))return 'inconsistencias';
    if(cause.includes('5')||cause.includes('retiro'))return 'retiro_5';
    if(state==='aprobado')return 'aprobado';
    if(state==='sindos'||state.includes('sindos'))return 'sindos';
    if(state==='semanas'||state.includes('revision'))return 'revision';
    return 'bienvenida';
  }

  function recommendedClientGroup(client){
    const stage=String(client?.etapa||'');
    const pay=String(client?.estadoPago||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-MX');
    // Shared 12-step evidence may confirm a deposit before the legacy stage is
    // refreshed. Never interpret externally verified HONORARIOS as a paid invoice.
    const operations=client?.etapasOperativasV2||{};
    const deposited=operations.deposito?.done===true;
    const collected=/cobrado|pago recibido|pagado|liquidado/.test(pay);
    if(client?.archivado||deposited||['deposito_recibido','honorarios_recibidos','concluido'].includes(stage)||collected)return 'finalizacion';
    return 'alta_15';
  }

  function ensureStyles(){
    if(document.getElementById('cya-wa-message-center-styles'))return;
    const style=document.createElement('style');style.id='cya-wa-message-center-styles';
    style.textContent=[
      '#cya-client-message-actions{display:none!important}',
      '#perfil-whatsapp-btn{background:#188653;border-color:#188653;color:white;font-weight:700}',
      '#perfil-whatsapp-btn:hover{background:#157648;border-color:#157648}',
      '#cya-wa-center-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
      '#cya-wa-center-actions .cya-wa-open{background:#25d366;border-color:#25d366;color:#fff;font-weight:700}',
      '#cya-wa-message-center{z-index:30020!important;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '#cya-wa-message-center .modal.cya-wa-center-modal{width:min(1280px,calc(100vw - 32px))!important;max-width:1280px!important;max-height:94dvh!important;min-width:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:var(--bg-card,#17202d)!important;border-radius:15px}',
      '#cya-wa-message-center .cya-wa-center-modal .modal-header{flex:0 0 auto;align-items:flex-start;min-height:0!important;padding:17px 22px 14px!important}',
      '#cya-wa-message-center .cya-wa-eyebrow{font-size:10px;font-weight:750;letter-spacing:.1em;color:#d7ae57;text-transform:uppercase;margin-bottom:4px}',
      '#cya-wa-message-center .cya-wa-center-modal .modal-title{font-size:22px!important;line-height:1.25!important}',
      '#cya-wa-message-center .cya-wa-center-modal #cya-wa-center-person{font-size:12px;line-height:1.4;color:var(--text-muted,#a4b1c5);margin:5px 0 0}',
      '#cya-wa-message-center .cya-wa-center-modal .modal-body{flex:1 1 auto;min-height:0!important;overflow-x:hidden!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;gap:13px!important;padding:16px 22px!important;align-items:stretch!important}',
      '#cya-wa-message-center .cya-wa-nav{display:flex!important;flex-direction:column!important;grid-column:auto!important;grid-row:auto!important;position:static!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important;min-width:0!important;gap:6px!important}',
      '#cya-wa-message-center .cya-wa-section-label{font-size:11px!important;letter-spacing:.075em;text-transform:uppercase;color:var(--text-muted,#b7c3d5);font-weight:750;margin:0 0 4px!important}',
      '#cya-wa-message-center .cya-wa-template-row{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:8px!important;width:100%!important;min-width:0!important;margin:0 0 8px!important}',
      '#cya-wa-message-center .cya-wa-template-row .btn{display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:50px!important;white-space:normal!important;text-align:center!important;overflow-wrap:anywhere;line-height:1.3!important;font-size:12px!important;padding:8px 7px!important;border-radius:10px!important;background:var(--bg-secondary,#202c3d);color:var(--text,#e7ecf4);font-weight:650}',
      '#cya-wa-message-center .cya-wa-template-row .btn.active{border-color:#25d366!important;background:rgba(37,211,102,.13)!important;color:#44de99!important}',
      '#cya-wa-message-center .cya-wa-template-row .btn:focus-visible,#cya-wa-message-center .cya-wa-part:focus-visible{outline:2px solid #d7ae57;outline-offset:2px}',
      '#cya-wa-message-center .cya-wa-selected-note{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:12px;color:var(--text-muted,#a4b1c5);margin:0!important}',
      '#cya-wa-message-center .cya-wa-selected-note strong{color:#d7ae57}',
      '#cya-wa-message-center .cya-wa-content{display:block!important;grid-column:auto!important;min-width:0!important}',
      '#cya-wa-message-center .cya-wa-part-title{font-size:11px;letter-spacing:.05em;font-weight:750;text-transform:uppercase;color:var(--text-muted,#b7c3d5);margin:2px 0 7px}',
      '#cya-wa-message-center .cya-wa-parts{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 13px}',
      '#cya-wa-message-center .cya-wa-part{border:1px solid var(--border,#344359);color:var(--text,#d3dce8);background:var(--bg-secondary,#202c3d);padding:8px 12px;font:inherit;font-size:11px;font-weight:600;border-radius:9px;cursor:pointer;max-width:100%;overflow-wrap:anywhere}',
      '#cya-wa-message-center .cya-wa-part.active{border-color:#d7ad46!important;background:rgba(196,150,50,.12);color:#f3c967}',
      '#cya-wa-message-center .cya-wa-message-label{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px;font-weight:700;margin:0 0 8px}',
      '#cya-wa-message-center .cya-wa-message-count{color:var(--text-muted,#8494ab);font-size:11px;font-weight:400}',
      '#cya-wa-message-center #cya-wa-block-list{min-width:0}',
      '#cya-wa-message-center .cya-wa-block{border:0!important;border-radius:0!important;background:transparent!important;margin:0!important;padding:0!important;min-width:0!important}',
      '#cya-wa-message-center .cya-wa-block textarea{display:block;width:100%;min-width:0;max-width:100%;min-height:220px!important;height:235px!important;max-height:42dvh;resize:vertical;box-sizing:border-box;line-height:1.55!important;font-size:13px!important;padding:12px!important;border:1px solid var(--border,#39485d);border-radius:10px;background:var(--bg-secondary,#101722)!important;color:var(--text,#f5f5f5)!important}',
      '#cya-wa-message-center .cya-wa-human-note{font-size:11px!important;color:var(--text-muted,#91a1b7);margin:9px 0 0!important;line-height:1.4}',
      '#cya-wa-message-center .cya-wa-alta-status{padding:10px 12px;margin:0 0 12px;border:1px solid rgba(202,158,56,.45);border-radius:8px;font-size:12px;line-height:1.5;color:var(--text-secondary,#cbd5e1);background:rgba(202,158,56,.08)}',
      '#cya-wa-message-center .cya-wa-center-modal .modal-footer{flex:0 0 auto;position:static!important;bottom:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;flex-wrap:wrap;padding:13px 22px!important;background:var(--bg-card,#17202d)!important;border-top:1px solid var(--border,#344359)!important}',
      '#cya-wa-message-center .cya-wa-center-modal .modal-footer .btn{min-height:38px!important;font-size:12px!important}',
      '#cya-wa-message-center .cya-wa-footer-copy{display:inline-flex;align-items:center;justify-content:center;width:40px;min-width:40px;padding:0!important}',
      '#cya-wa-message-center .cya-wa-footer-copy svg{width:17px;height:17px}',
      '#cya-wa-message-center .cya-wa-direct{background:#16a85e!important;border-color:#16a85e!important;color:white!important;font-weight:750!important}',
      '#cya-wa-message-center .cya-wa-direct:hover{background:#13884f!important;border-color:#13884f!important}',
      '@media(max-width:1079px){#cya-wa-message-center .cya-wa-template-row{grid-template-columns:repeat(3,minmax(0,1fr))!important}}',
      '@media(max-width:640px){#cya-wa-message-center{padding:6px}#cya-wa-message-center .modal.cya-wa-center-modal{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;max-height:96dvh!important}#cya-wa-message-center .cya-wa-center-modal .modal-header{padding:12px!important}#cya-wa-message-center .cya-wa-center-modal .modal-body{padding:10px 12px!important;gap:8px!important}#cya-wa-message-center .cya-wa-template-row{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}#cya-wa-message-center .cya-wa-template-row .btn{min-height:44px!important;font-size:11px!important}#cya-wa-message-center .cya-wa-center-modal .modal-footer{padding:10px 12px!important}#cya-wa-message-center .cya-wa-block textarea{min-height:180px!important;height:190px!important}#cya-wa-message-center .cya-wa-center-modal .modal-footer .btn{flex:0 1 auto}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensureCenterModal(){
    if(document.getElementById('cya-wa-message-center'))return;
    const modal=document.createElement('div');modal.id='cya-wa-message-center';modal.className='modal-overlay';
    modal.innerHTML='<div class="modal cya-wa-center-modal" role="dialog" aria-modal="true" aria-labelledby="cya-wa-center-title">'+
      '<div class="modal-header"><div><div class="cya-wa-eyebrow">MENSAJES INSTITUCIONALES</div><div class="modal-title" id="cya-wa-center-title">Mensajes WhatsApp</div><div class="form-helper" id="cya-wa-center-person"></div></div>'+
      '<button class="modal-close" type="button" aria-label="Cerrar mensajes WhatsApp" onclick="cyaCerrarCentroMensajesWhatsApp()">×</button></div>'+
      '<div class="modal-body">'+
        '<nav class="cya-wa-nav" aria-label="Categorías de mensajes"><div class="cya-wa-section-label">SEGUIMIENTO</div><div class="cya-wa-template-row" id="cya-wa-main-buttons"></div>'+
        '<div class="cya-wa-section-label" id="cya-wa-reject-label">NO VIABLE / SEGUIMIENTO FUTURO</div><div class="cya-wa-template-row" id="cya-wa-reject-buttons"></div></nav>'+
        '<p class="cya-wa-selected-note" role="status" id="cya-wa-selected-note"></p>'+
        '<section class="cya-wa-content" aria-label="Mensajes de la categoría seleccionada"><div id="cya-wa-block-list"></div></section>'+
      '</div>'+
      '<div class="modal-footer"><button class="btn" type="button" onclick="cyaEditarPlantillaWhatsAppSeleccionada()">Editar en Plantillas</button>'+
      '<button class="btn cya-wa-footer-copy" type="button" title="Copiar mensaje" aria-label="Copiar mensaje" onclick="cyaCopiarBloqueWhatsApp(0)">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>'+
      '<button class="btn cya-wa-direct" type="button" onclick="cyaAbrirBloqueWhatsApp(0)">Abrir WhatsApp</button></div>'+
    '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)window.cyaCerrarCentroMensajesWhatsApp();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))window.cyaCerrarCentroMensajesWhatsApp();});
  }

  function renderGroupButtons(){
    const main=document.getElementById('cya-wa-main-buttons');
    const reject=document.getElementById('cya-wa-reject-buttons');
    if(!main||!reject)return;
    const button=g=>'<button class="btn'+(g.key===currentGroupKey?' active':'')+'" type="button" aria-pressed="'+(g.key===currentGroupKey?'true':'false')+'" data-cya-wa-group="'+safe(g.key)+'">'+safe(g.label)+'</button>';
    main.innerHTML=GROUPS.filter(g=>g.kind==='main').map(button).join('');
    reject.innerHTML=GROUPS.filter(g=>g.kind==='reject').map(button).join('');
    const notice=document.getElementById('cya-wa-selected-note');
    const group=GROUPS.find(g=>g.key===currentGroupKey);
    if(notice)notice.innerHTML='<span aria-hidden="true">✧</span> '+(selectionSuggested?'Selección sugerida según etapa actual: ':'Categoría seleccionada: ')+'<strong>'+safe(group?.label||'')+'</strong>';
    document.querySelectorAll('#cya-wa-message-center [data-cya-wa-group]').forEach(el=>el.onclick=()=>selectGroup(el.dataset.cyaWaGroup));
  }

  function currentTemplates(){
    const group=GROUPS.find(g=>g.key===currentGroupKey)||GROUPS[0];
    return group.ids.map(templateById).filter(Boolean);
  }

  function saveMessageDraft(){
    const tpl=currentTemplates()[currentMessageIndex];
    const area=document.getElementById('cya-wa-text-0');
    if(tpl&&area)currentDrafts[tpl.id]=area.value;
  }

  function renderSelectedGroup(){
    const group=GROUPS.find(g=>g.key===currentGroupKey)||GROUPS[0];
    const contact=activeContact();
    const list=document.getElementById('cya-wa-block-list');if(!list||!contact)return;
    const templates=currentTemplates();
    currentMessageIndex=Math.min(Math.max(0,currentMessageIndex),Math.max(0,templates.length-1));
    const tpl=templates[currentMessageIndex];
    const altaDays=group.key==='alta_15'&&messageContactType==='client'?daysSinceClientAlta(contact):null;
    const altaNote=group.key==='alta_15'&&messageContactType==='client'
      ?(altaDays===null?'No hay una fecha de alta válida registrada. Confirma la fecha antes de enviar este recordatorio.'
        :altaDays<15?'Han transcurrido '+Math.max(0,altaDays)+' días desde el alta. Este recordatorio corresponde a partir del día 15; '+(15-Math.max(0,altaDays)===1?'falta 1 día':'faltan '+(15-Math.max(0,altaDays))+' días')+'.'
        :'Han transcurrido '+altaDays+' días desde el alta. Revisa si ya se realizó la actualización AFORE antes de enviar el recordatorio.')
      :group.key==='alta_15'?'Esta plantilla es para seguimiento posterior al alta de clientes. Confirma la etapa antes de utilizarla.':'';
    const tabs=templates.map((item,index)=>
      '<button class="cya-wa-part'+(index===currentMessageIndex?' active':'')+'" type="button" data-cya-wa-part="'+index+'" aria-pressed="'+(index===currentMessageIndex?'true':'false')+'">'+
      safe((index+1)+' / '+templates.length+' · '+item.nombre)+'</button>'
    ).join('');
    const text=tpl?(Object.prototype.hasOwnProperty.call(currentDrafts,tpl.id)?currentDrafts[tpl.id]:renderText(tpl,contact)):'';
    list.innerHTML=(altaNote?'<div class="cya-wa-alta-status" role="status">'+safe(altaNote)+'</div>':'')+
      '<div class="cya-wa-part-title">MENSAJES DISPONIBLES</div><div class="cya-wa-parts" role="tablist" aria-label="Mensajes de la categoría">'+tabs+'</div>'+
      '<div class="cya-wa-block"><label class="cya-wa-message-label" for="cya-wa-text-0">Mensaje editable <span class="cya-wa-message-count">Plantilla '+(templates.length?currentMessageIndex+1:0)+' de '+templates.length+'</span></label>'+
      '<textarea class="form-textarea" id="cya-wa-text-0" spellcheck="true">'+safe(text)+'</textarea>'+
      '<p class="cya-wa-human-note">Revisa los datos y el mensaje antes de abrir WhatsApp; nada se envía automáticamente.</p></div>';
    list.querySelectorAll('[data-cya-wa-part]').forEach(el=>el.onclick=()=>window.cyaSeleccionarMensajeWhatsApp(Number(el.dataset.cyaWaPart)));
    const copy=document.querySelector('#cya-wa-message-center .cya-wa-footer-copy');
    const open=document.querySelector('#cya-wa-message-center .cya-wa-direct');
    if(copy)copy.disabled=!tpl;
    if(open)open.disabled=!tpl;
  }

  window.cyaSeleccionarMensajeWhatsApp=function(index){
    const templates=currentTemplates();
    if(!Number.isInteger(index)||index<0||index>=templates.length)return;
    saveMessageDraft();
    currentMessageIndex=index;
    renderSelectedGroup();
  };

  function selectGroup(key){
    if(!GROUPS.some(g=>g.key===key))return;
    saveMessageDraft();
    currentGroupKey=key;
    currentMessageIndex=0;
    selectionSuggested=false;
    renderGroupButtons();
    renderSelectedGroup();
  }

  function openContactCenter(type,contact,groupKey){
    ensureTemplates();ensureStyles();ensureCenterModal();
    messageContactType=type;
    messageContactId=contact.id;
    const validGroup=GROUPS.some(g=>g.key===groupKey);
    selectionSuggested=!validGroup;
    currentGroupKey=validGroup?groupKey:(type==='client'?recommendedClientGroup(contact):recommendedGroup(contact));
    currentMessageIndex=0;
    currentDrafts=Object.create(null);
    const person=document.getElementById('cya-wa-center-person');
    const phone=normalizePhone(type==='client'?contact.telefono:(String(currentLead()?.id)===String(contact?.id)?(document.getElementById('lead-tel')?.value||contact.telefono):contact.telefono));
    if(person)person.textContent=`${type==='client'?'Cliente':'Prospecto'}: ${contact.nombre||'Sin nombre'} · ${phone||'sin teléfono'}`;
    renderGroupButtons();renderSelectedGroup();
    document.getElementById('cya-wa-message-center')?.classList.add('open');
  }

  // Open a specific prospect without relying on an editor that may be closed.
  window.cyaWhatsAppContactoActivo=function(){return activeContact();};
  window.cyaAbrirWhatsAppProspectoPorId=function(leadId,groupKey){
    const lead=leadById(leadId);
    if(!lead)return false;
    archivedMessageMode=false;
    openContactCenter('lead',lead,groupKey);
    return true;
  };

  window.cyaAbrirWhatsAppArchivado=function(leadId,groupKey){
    const lead=leadById(leadId);
    if(!lead){showToast?.('No se encontró el prospecto archivado','warn');return false;}
    openContactCenter('lead',lead,groupKey);
    archivedMessageMode=true;
    renderSelectedGroup();
    return true;
  };

  window.cyaAbrirCentroMensajesWhatsApp=function(groupKey){
    archivedMessageMode=false;
    const lead=currentLead();
    if(!lead){showToast?.('Guarda primero el prospecto para preparar mensajes de WhatsApp','warn');return;}
    openContactCenter('lead',lead,groupKey);
  };

  window.cyaAbrirWhatsAppCliente=function(groupKey){
    const profile=document.getElementById('modal-perfil');
    const id=typeof perfilClienteActivo!=='undefined'?perfilClienteActivo:null;
    const client=clientById(id);
    if(!client||!profile?.classList.contains('open')){
      showToast?.('Abre primero el expediente del cliente para preparar el mensaje.','warn');
      return;
    }
    archivedMessageMode=false;
    openContactCenter('client',client,groupKey);
  };

  window.cyaCerrarCentroMensajesWhatsApp=function(){
    document.getElementById('cya-wa-message-center')?.classList.remove('open');
    messageContactId=null;
    messageContactType='lead';
    archivedMessageMode=false;
    currentDrafts=Object.create(null);
    currentMessageIndex=0;
  };

  window.cyaCopiarBloqueWhatsApp=async function(index){
    // The approved layout keeps exactly one active, editable message. The
    // index argument is retained for legacy callers.
    const area=document.getElementById('cya-wa-text-0');if(!area)return;
    const clean=sanitizeWhatsAppText(area.value,currentGroupKey==='finalizacion');area.value=clean;
    saveMessageDraft();
    const ok=await copyText(clean,currentGroupKey==='finalizacion');
    showToast?.(ok?'Mensaje copiado':'No fue posible copiar el mensaje',ok?'success':'warn');
  };

  window.cyaAbrirBloqueWhatsApp=function(index){
    const area=document.getElementById('cya-wa-text-0');const contact=activeContact();
    if(!area||!contact)return;
    const clean=sanitizeWhatsAppText(area.value,currentGroupKey==='finalizacion');
    area.value=clean;saveMessageDraft();
    openWhatsApp(contact,clean,currentGroupKey==='finalizacion');
  };

  window.cyaEditarPlantillaWhatsAppSeleccionada=function(){
    const templateId=currentTemplates()[currentMessageIndex]?.id||null;
    if(!templateId)return;
    const contactType=messageContactType;
    window.cyaCerrarCentroMensajesWhatsApp();
    try{
      closeModal?.(contactType==='client'?'modal-perfil':'modal-lead');
      navigate('plantillas',document.querySelector('[data-page="plantillas"]'));
      setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(templateId);},100);
    }catch(_){ }
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
