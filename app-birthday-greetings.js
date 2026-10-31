/* C&A birthday greeting workflow for web CRM.
   Reuses client data already stored in CRM, generates an official-brand PNG greeting,
   prepares (never sends) WhatsApp text, and records manual completion. */
(function installBirthdayGreetings(){
  if(window.__cyaBirthdayGreetingsInstalled)return;
  window.__cyaBirthdayGreetingsInstalled=true;

  const LOGO_PATH='/assets/brand/cya-logo-dark.svg';
  const TEMPLATES={
    principal:{
      id:'pl_cumpleanos_cya',
      nombre:'Cumpleaños · Casillas & Asociados',
      etapa:'',tipo:'whatsapp',icono:'',
      texto:'Buen día, {{NOMBRE}}.\n\nEn este día tan especial, todo el equipo de *Casillas & Asociados* te desea un cumpleaños lleno de salud, alegría, éxito y muchas bendiciones.\n\nAgradecemos la confianza que nos brindaste al permitirnos apoyarte anteriormente, y seguimos a tus órdenes para cualquier cosa en la que podamos ayudarte.\n\nRecibe un cordial saludo y nuestros mejores deseos.\n\n*¡Feliz cumpleaños!*'
    },
    corto:{
      id:'pl_cumpleanos_cya_corto',
      nombre:'Cumpleaños corto · Casillas & Asociados',
      etapa:'',tipo:'whatsapp',icono:'',
      texto:'Buen día, {{NOMBRE}}.\n\nEn *Casillas & Asociados* queremos desearte un día muy especial, lleno de salud, alegría y bendiciones.\n\nAgradecemos tu confianza y seguimos a tus órdenes.\n\n*¡Feliz cumpleaños!*'
    }
  };

  let activeClientId=null;
  let activeBirthdayDate='';
  let activeMessageType='principal';
  let messageDrafts={principal:'',corto:''};
  let logoDataUriPromise=null;

  const safe=v=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(v??'')):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clientById=id=>{try{return (store?.clientes||[]).find(c=>String(c.id)===String(id))||null;}catch(_){return null;}};

  function ensureTemplates(){
    try{
      if(typeof store==='undefined'||!store)return TEMPLATES;
      if(!Array.isArray(store.plantillas))store.plantillas=[];
      let changed=false;
      for(const tpl of Object.values(TEMPLATES)){
        if(!store.plantillas.some(p=>p.id===tpl.id)){store.plantillas.push({...tpl});changed=true;}
      }
      if(changed)try{saveStore?.();}catch(_){ }
      return {
        principal:store.plantillas.find(p=>p.id===TEMPLATES.principal.id)||TEMPLATES.principal,
        corto:store.plantillas.find(p=>p.id===TEMPLATES.corto.id)||TEMPLATES.corto
      };
    }catch(_){return TEMPLATES;}
  }

  function templateFor(type){const all=ensureTemplates();return all[type==='corto'?'corto':'principal'];}
  function normalizePhone(v){let d=String(v||'').replace(/\D/g,'');if(d.length===13&&d.startsWith('521'))d=d.slice(3);else if(d.length===12&&d.startsWith('52'))d=d.slice(2);else if(d.length>10)d=d.slice(-10);return d.slice(0,10);}
  function naturalToken(s){s=String(s||'').trim();if(!s)return'';s=s.toLocaleLowerCase('es-MX');return s.charAt(0).toLocaleUpperCase('es-MX')+s.slice(1);}
  function greetingName(client){
    const explicit=String(client?.nombrePila||client?.nombres||'').trim();
    if(explicit)return explicit.split(/\s+/).filter(Boolean).map(naturalToken).join(' ');
    const parts=String(client?.nombre||'').trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return 'Cliente';
    const count=parts.length>=4?2:1;
    return parts.slice(0,count).map(naturalToken).join(' ');
  }
  function curpBirth(client){
    try{const curp=String(client?.curp||'').trim().toUpperCase();if(typeof extraerFechaCurp==='function')return extraerFechaCurp(curp)||'';}catch(_){ }
    return '';
  }
  function thisYearBirthday(client){
    const birth=curpBirth(client);if(!birth)return'';
    const now=new Date();const year=new Intl.DateTimeFormat('en-US',{timeZone:'America/Mexico_City',year:'numeric'}).format(now);
    return `${year}-${birth.slice(5)}`;
  }
  function displayDate(date){
    if(!date)return'';
    try{return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')).toUpperCase();}catch(_){return date;}
  }
  function renderMessage(client,type='principal'){
    const tpl=templateFor(type);
    return String(tpl.texto||TEMPLATES[type]?.texto||TEMPLATES.principal.texto).replace(/{{NOMBRE}}/g,greetingName(client)).trim();
  }

  function textWidth(text,fontSize,fontFamily='Arial'){
    try{
      const canvas=textWidth.canvas||(textWidth.canvas=document.createElement('canvas'));
      const ctx=canvas.getContext('2d');ctx.font=`600 ${fontSize}px ${fontFamily}`;return ctx.measureText(String(text||'')).width;
    }catch(_){return String(text||'').length*fontSize*.58;}
  }
  function balancedTwoLines(words,fontSize){
    if(words.length<2)return [words.join(' ')];
    let best=null;
    for(let i=1;i<words.length;i++){
      const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');
      const wa=textWidth(a,fontSize),wb=textWidth(b,fontSize),score=Math.max(wa,wb)+Math.abs(wa-wb)*.28;
      if(!best||score<best.score)best={score,lines:[a,b]};
    }
    return best?.lines||[words.join(' ')];
  }
  function nameLayout(name){
    const upper=String(name||'CLIENTE').trim().toUpperCase().replace(/\s+/g,' ');
    const words=upper.split(' ').filter(Boolean);
    const maxWidth=820;
    for(let size=58;size>=40;size-=2){if(textWidth(upper,size)<=maxWidth)return {lines:[upper],fontSize:size,lineHeight:size+12};}
    let lines=balancedTwoLines(words,54);
    for(let size=54;size>=34;size-=2){
      if(lines.every(line=>textWidth(line,size)<=maxWidth))return {lines,fontSize:size,lineHeight:size+12};
    }
    lines=balancedTwoLines(words,34);
    return {lines:lines.slice(0,2),fontSize:34,lineHeight:46,forceFit:true};
  }

  function balloon(x,y,rx,ry,flip=1){
    const knotY=y+ry-2;
    return `<g filter="url(#balloonShadow)">
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#balloonGold)"/>
      <ellipse cx="${x-rx*.30}" cy="${y-ry*.30}" rx="${rx*.18}" ry="${ry*.28}" fill="#fff7c9" opacity=".50" filter="url(#softGlow)"/>
      <path d="M${x-9} ${knotY} L${x+9} ${knotY} L${x} ${knotY+15} Z" fill="#b77b0f"/>
      <path d="M${x} ${knotY+15} C ${x+26*flip} ${knotY+48}, ${x-18*flip} ${knotY+72}, ${x+8*flip} ${knotY+104}" fill="none" stroke="#d6a62f" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  }
  function confetti(){
    const pieces=[[66,95,18,42,-35],[295,82,12,28,25],[734,86,13,31,18],[1015,112,12,29,30],[250,318,12,29,-22],[836,354,14,34,24],[88,566,12,31,18],[1010,600,13,30,-18],[190,744,14,35,31],[914,765,12,29,24],[95,960,11,28,-28],[970,1000,14,34,22],[270,1212,13,30,26],[830,1240,13,32,-22]];
    return pieces.map(([x,y,w,h,r])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" transform="rotate(${r} ${x} ${y})" fill="url(#gold)" opacity=".88"/>`).join('');
  }

  function svgFor(client,date,logoHref=LOGO_PATH){
    const layout=nameLayout(client?.nombre||'CLIENTE');
    const dateText=displayDate(date||thisYearBirthday(client));
    const oneLine=layout.lines.length===1;
    const firstY=oneLine?868:838;
    const nameSvg=layout.lines.map((line,i)=>{
      const extra=layout.forceFit?' textLength="820" lengthAdjust="spacingAndGlyphs"':'';
      return `<text x="540" y="${firstY+i*layout.lineHeight}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${layout.fontSize}" font-weight="600" letter-spacing="2" fill="#FFFFFF"${extra}>${safe(line)}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#041225"/><stop offset=".48" stop-color="#09254a"/><stop offset="1" stop-color="#020b18"/></linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f3561" stop-opacity=".62"/><stop offset="1" stop-color="#06172d" stop-opacity=".08"/></linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a4"/><stop offset=".25" stop-color="#e6bd4d"/><stop offset=".56" stop-color="#b7780d"/><stop offset=".78" stop-color="#f2cf63"/><stop offset="1" stop-color="#8f5d0b"/></linearGradient>
        <radialGradient id="balloonGold" cx="34%" cy="23%" r="82%"><stop offset="0" stop-color="#fffbd6"/><stop offset=".12" stop-color="#ffe98b"/><stop offset=".42" stop-color="#d7a62b"/><stop offset=".72" stop-color="#f1c85a"/><stop offset="1" stop-color="#9b650b"/></radialGradient>
        <filter id="balloonShadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".36"/></filter>
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
        <filter id="goldGlow" x="-30%" y="-50%" width="160%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#f0c85b" flood-opacity=".35"/></filter>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)"/>
      <path d="M-120 240 L360 -60 L520 -60 L-20 340 Z" fill="#0d3460" opacity=".55"/>
      <path d="M760 1350 L1080 1120 L1080 1350 Z" fill="#0f3968" opacity=".60"/>
      <path d="M0 1250 L1080 1010" stroke="#0d3768" stroke-width="84" opacity=".45"/>
      <path d="M0 1320 L1080 1080" stroke="#123f72" stroke-width="28" opacity=".34"/>
      <path d="M15 0 L155 0 L0 155 Z" fill="url(#panel)" opacity=".7"/>
      <path d="M925 0 L1080 0 L1080 155 Z" fill="url(#panel)" opacity=".7"/>
      ${balloon(126,145,68,88,1)}${balloon(34,330,72,92,-1)}${balloon(116,590,67,86,1)}
      ${balloon(866,112,70,90,-1)}${balloon(1018,280,69,90,1)}${balloon(1005,520,72,92,-1)}
      ${balloon(110,1135,58,76,1)}${balloon(956,1120,60,78,-1)}
      <g>${confetti()}</g>
      <g opacity=".9"><path d="M0 0 L120 0 L0 120 Z" fill="none" stroke="#d4a73b" stroke-width="3"/><path d="M1080 0 L980 0 L1080 100 Z" fill="none" stroke="#d4a73b" stroke-width="3"/></g>
      <image href="${safe(logoHref)}" x="315" y="40" width="450" height="312" preserveAspectRatio="xMidYMid meet"/>
      <text x="540" y="492" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="47" fill="#E9C45B">CASILLAS &amp; ASOCIADOS</text>
      <text x="540" y="551" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="42" fill="#E9C45B">TE DESEA UN MUY</text>
      <text x="540" y="646" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="70" font-weight="700" fill="url(#gold)" filter="url(#goldGlow)">¡FELIZ CUMPLEAÑOS!</text>
      ${nameSvg}
      <g transform="translate(540 970)" stroke="#DDBA56" fill="#DDBA56"><line x1="-220" y1="0" x2="-24" y2="0" stroke-width="3"/><line x1="24" y1="0" x2="220" y2="0" stroke-width="3"/><path d="M0 -13 L6 -4 L16 0 L6 4 L0 13 L-6 4 L-16 0 L-6 -4 Z" stroke="none"/></g>
      <rect x="185" y="1010" width="710" height="150" rx="24" fill="#06182e" fill-opacity=".40" stroke="#E7C96F" stroke-width="4"/>
      <text x="540" y="1068" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="35" font-style="italic" fill="#FFFFFF"><tspan x="540">Que este día sea especial</tspan><tspan x="540" dy="46">y lleno de bendiciones</tspan></text>
      <text x="540" y="1250" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700" letter-spacing="1" fill="#FFFFFF">${safe(dateText)}</text>
    </svg>`;
  }

  function svgDataUrl(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
  async function getLogoDataUri(){
    if(!logoDataUriPromise)logoDataUriPromise=fetch(LOGO_PATH,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Logo unavailable');return r.text();}).then(svg=>svgDataUrl(svg)).catch(()=>LOGO_PATH);
    return logoDataUriPromise;
  }
  async function pngBlob(client,date){
    const logoHref=await getLogoDataUri();
    const svg=svgFor(client,date,logoHref);const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=svgDataUrl(svg);});
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',0.95));
  }
  function pngFileName(client){return `Cumpleanos_${String(client?.nombre||'cliente').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g,'_').replace(/^_+|_+$/g,'')||'cliente'}.png`;}
  function downloadBlob(blob,filename){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

  function ensureStyles(){if(document.getElementById('cya-birthday-styles'))return;const s=document.createElement('style');s.id='cya-birthday-styles';s.textContent=`
    .cya-birthday-btn{font-size:11px;padding:6px 10px;white-space:nowrap}.operational-birthday-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center}
    .cya-birthday-modal{width:min(1460px,92vw);max-width:1460px;max-height:94vh;display:flex;flex-direction:column}.cya-birthday-modal .modal-body{overflow:auto;padding:20px 22px}.cya-birthday-grid{display:grid;grid-template-columns:minmax(390px,.92fr) minmax(430px,1.08fr);gap:28px;align-items:start}.cya-birthday-preview{background:#041225;border-radius:16px;overflow:hidden;border:1px solid rgba(222,186,86,.42);box-shadow:0 18px 50px rgba(0,0,0,.20)}.cya-birthday-preview svg{display:block;width:100%;height:auto}.cya-birthday-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cya-birthday-message-panel{min-width:0}.cya-birthday-message-tabs{display:flex;gap:6px;margin:4px 0 10px;padding:4px;background:rgba(127,127,127,.08);border:1px solid var(--border);border-radius:10px;width:max-content;max-width:100%}.cya-birthday-message-tab{border:0;background:transparent;color:var(--text-muted);font:inherit;font-size:12px;font-weight:700;padding:8px 13px;border-radius:7px;cursor:pointer}.cya-birthday-message-tab.active{background:var(--surface);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.12)}.cya-birthday-message{display:block;width:100%;min-height:390px;overflow:hidden;line-height:1.58;resize:vertical}.cya-birthday-history{margin-top:12px;font-size:11px;color:var(--text-muted)}.cya-birthday-share-note{margin-top:7px;font-size:11px;color:var(--text-muted);line-height:1.45}.cya-agenda-birthdays{margin-bottom:16px}.cya-agenda-birthday-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}.cya-agenda-birthday-row:last-child{border-bottom:0}.cya-agenda-birthday-name{font-weight:700}.cya-agenda-birthday-meta{font-size:11px;color:var(--text-muted)}
    @media(max-width:1050px){.cya-birthday-modal{width:min(96vw,980px)}.cya-birthday-grid{grid-template-columns:minmax(330px,.9fr) minmax(360px,1.1fr);gap:18px}.cya-birthday-message{min-height:340px}}
    @media(max-width:760px){.cya-birthday-modal{width:96vw;max-height:94vh}.cya-birthday-modal .modal-body{padding:14px}.cya-birthday-grid{grid-template-columns:1fr;gap:16px}.cya-birthday-message{min-height:310px}.cya-birthday-message-tabs{width:100%}.cya-birthday-message-tab{flex:1}.operational-birthday-row{grid-template-columns:minmax(0,1fr) auto}.operational-birthday-row>span:nth-child(2){grid-column:1/2}.cya-birthday-btn{grid-column:2/3;grid-row:1/3}}
  `;document.head.appendChild(s);}

  function autoGrowMessage(){const el=document.getElementById('cya-birthday-message');if(!el)return;el.style.height='auto';el.style.height=`${Math.max(310,el.scrollHeight+4)}px`;}
  function storeCurrentDraft(){const el=document.getElementById('cya-birthday-message');if(el)messageDrafts[activeMessageType]=el.value;}
  function setMessageTab(type){
    const next=type==='corto'?'corto':'principal';
    if(next!==activeMessageType)storeCurrentDraft();
    activeMessageType=next;
    document.querySelectorAll('.cya-birthday-message-tab').forEach(btn=>{const on=btn.dataset.messageType===next;btn.classList.toggle('active',on);btn.setAttribute('aria-selected',on?'true':'false');});
    const el=document.getElementById('cya-birthday-message');if(el){el.value=messageDrafts[next]||'';requestAnimationFrame(autoGrowMessage);}
  }

  function ensureModal(){
    if(document.getElementById('cya-birthday-modal'))return;
    const m=document.createElement('div');m.id='cya-birthday-modal';m.className='modal-overlay';m.innerHTML=`<div class="modal cya-birthday-modal" role="dialog" aria-modal="true"><div class="modal-header"><div><div class="modal-title">Felicitación de cumpleaños</div><div class="form-helper" id="cya-birthday-person"></div></div><button class="modal-close" type="button" onclick="cyaCerrarFelicitacionCumpleanos()">×</button></div><div class="modal-body"><div class="cya-birthday-grid"><div><div class="cya-birthday-preview" id="cya-birthday-preview"></div><div class="cya-birthday-actions"><button class="btn" type="button" onclick="cyaDescargarFelicitacionPNG()">Descargar PNG</button><button class="btn" type="button" onclick="cyaCompartirFelicitacionWhatsApp()">Compartir por WhatsApp</button></div><div class="cya-birthday-share-note">En móvil se usa el menú seguro de compartir del dispositivo con el PNG. En escritorio, si no admite archivos compartidos, se descarga la imagen y se abre WhatsApp para que la adjuntes manualmente.</div></div><div class="cya-birthday-message-panel"><label class="form-label">Mensaje de WhatsApp</label><div class="cya-birthday-message-tabs" role="tablist" aria-label="Versión del mensaje"><button class="cya-birthday-message-tab active" type="button" role="tab" aria-selected="true" data-message-type="principal" onclick="cyaSeleccionarMensajeCumpleanos('principal')">Mensaje principal</button><button class="cya-birthday-message-tab" type="button" role="tab" aria-selected="false" data-message-type="corto" onclick="cyaSeleccionarMensajeCumpleanos('corto')">Mensaje corto</button></div><textarea id="cya-birthday-message" class="form-textarea cya-birthday-message" spellcheck="true"></textarea><div class="form-helper">Puedes editar el texto. Los caracteres * y _ se conservan para el formato de WhatsApp. Abrir o compartir WhatsApp solo prepara el contenido; el envío final siempre lo realizas tú.</div><div class="cya-birthday-actions"><button class="btn" type="button" onclick="cyaCopiarMensajeCumpleanos()">Copiar mensaje</button><button class="btn" style="background:#25d366;border-color:#25d366;color:#fff" type="button" onclick="cyaAbrirWhatsAppCumpleanos()">Abrir WhatsApp</button></div><div class="cya-birthday-history" id="cya-birthday-history"></div></div></div></div><div class="modal-footer"><button class="btn" type="button" onclick="cyaEditarPlantillaCumpleanos()">Editar mensaje en Plantillas</button><button class="btn btn-primary" type="button" onclick="cyaMarcarFelicitacionEnviada()">Marcar como enviada</button><button class="btn" type="button" onclick="cyaCerrarFelicitacionCumpleanos()">Cerrar</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)window.cyaCerrarFelicitacionCumpleanos();});
    document.getElementById('cya-birthday-message')?.addEventListener('input',()=>{storeCurrentDraft();autoGrowMessage();});
  }

  window.cyaSeleccionarMensajeCumpleanos=function(type){setMessageTab(type);};
  window.cyaAbrirFelicitacionCumpleanos=function(clientId,date){
    const c=clientById(clientId);if(!c){showToast?.('Cliente no encontrado','warn');return;}
    ensureTemplates();ensureStyles();ensureModal();activeClientId=c.id;activeBirthdayDate=date||thisYearBirthday(c);activeMessageType='principal';messageDrafts={principal:renderMessage(c,'principal'),corto:renderMessage(c,'corto')};
    document.getElementById('cya-birthday-person').textContent=`${c.nombre||'Cliente'} · ${c.telefono||'Sin teléfono'}`;
    document.getElementById('cya-birthday-preview').innerHTML=svgFor(c,activeBirthdayDate);
    setMessageTab('principal');
    const hist=Array.isArray(c.historialCumpleanos)?c.historialCumpleanos:[];document.getElementById('cya-birthday-history').textContent=hist.length?`Última felicitación marcada como enviada: ${new Date(hist[hist.length-1].fecha).toLocaleString('es-MX')}`:'Sin felicitaciones registradas previamente.';
    document.getElementById('cya-birthday-modal').classList.add('open');requestAnimationFrame(autoGrowMessage);
  };
  window.cyaCerrarFelicitacionCumpleanos=function(){document.getElementById('cya-birthday-modal')?.classList.remove('open');activeClientId=null;activeBirthdayDate='';activeMessageType='principal';messageDrafts={principal:'',corto:''};};
  window.cyaCopiarMensajeCumpleanos=async function(){const t=document.getElementById('cya-birthday-message')?.value||'';try{await navigator.clipboard.writeText(t);showToast?.('Mensaje de cumpleaños copiado','success');}catch(_){showToast?.('No fue posible copiar el mensaje','warn');}};
  window.cyaAbrirWhatsAppCumpleanos=function(){
    const c=clientById(activeClientId);if(!c)return;const p=normalizePhone(c.telefono);if(p.length!==10){showToast?.('El cliente necesita un teléfono válido de 10 dígitos','warn');return;}
    const t=document.getElementById('cya-birthday-message')?.value||renderMessage(c,activeMessageType);const tab=window.open(`https://wa.me/52${p}?text=${encodeURIComponent(t)}`,'_blank');if(tab)try{tab.opener=null;}catch(_){}showToast?.(tab?'WhatsApp abierto. Revisa y envía manualmente.':'El navegador bloqueó WhatsApp.',tab?'success':'warn');
  };
  window.cyaDescargarFelicitacionPNG=async function(){
    const c=clientById(activeClientId);if(!c)return;try{const blob=await pngBlob(c,activeBirthdayDate);downloadBlob(blob,pngFileName(c));showToast?.('Imagen PNG generada','success');}catch(e){console.error(e);showToast?.('No fue posible generar la imagen','warn');}
  };
  window.cyaCompartirFelicitacionWhatsApp=async function(){
    const c=clientById(activeClientId);if(!c)return;
    try{
      const blob=await pngBlob(c,activeBirthdayDate);const file=new File([blob],pngFileName(c),{type:'image/png'});const text=document.getElementById('cya-birthday-message')?.value||renderMessage(c,activeMessageType);
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
        try{await navigator.share({files:[file],text,title:'Felicitación de cumpleaños · Casillas & Asociados'});showToast?.('Contenido preparado para compartir. El envío final es manual.','success');return;}catch(e){if(e?.name==='AbortError')return;console.warn('Web Share fallback',e);}
      }
      downloadBlob(blob,pngFileName(c));
      const p=normalizePhone(c.telefono);if(p.length===10){const tab=window.open(`https://wa.me/52${p}?text=${encodeURIComponent(text)}`,'_blank');if(tab)try{tab.opener=null;}catch(_){}showToast?.(tab?'PNG descargado y WhatsApp abierto. Adjunta la imagen y envía manualmente.':'PNG descargado. El navegador bloqueó WhatsApp.','warn');}
      else showToast?.('PNG descargado. Comparte la imagen manualmente por WhatsApp.','warn');
    }catch(e){console.error(e);showToast?.('No fue posible preparar el contenido para WhatsApp','warn');}
  };
  window.cyaCompartirFelicitacionImagen=window.cyaCompartirFelicitacionWhatsApp;
  window.cyaMarcarFelicitacionEnviada=async function(){
    const c=clientById(activeClientId);if(!c)return;storeCurrentDraft();const now=new Date().toISOString();const entry={fecha:now,cumpleanos:activeBirthdayDate||thisYearBirthday(c),asesorId:sesionActiva?.id||null,tipoMensaje:activeMessageType,mensaje:document.getElementById('cya-birthday-message')?.value||renderMessage(c,activeMessageType)};c.historialCumpleanos=[...(Array.isArray(c.historialCumpleanos)?c.historialCumpleanos:[]),entry];c.ultimaFelicitacionCumpleanos=now;
    try{saveStore?.();await cloudSyncNow?.({throwOnError:true});showToast?.('Felicitación marcada como enviada','success');window.cyaCerrarFelicitacionCumpleanos();if(typeof renderPage==='function')renderPage(currentPage);}catch(e){c.historialCumpleanos.pop();showToast?.('No se pudo guardar el registro de envío','warn');}
  };
  window.cyaEditarPlantillaCumpleanos=function(){
    const templateId=templateFor(activeMessageType).id;window.cyaCerrarFelicitacionCumpleanos();try{navigate('plantillas',document.querySelector('[data-page="plantillas"]'));setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(templateId);},100);}catch(_){ }
  };

  function patchOperational(){const base=window.renderTableroOperativo;if(typeof base!=='function'||base.__cyaBirthdayWrapped)return;const wrapped=function(){const html=base.apply(this,arguments);try{const tpl=document.createElement('template');tpl.innerHTML=html;const rows=[...tpl.content.querySelectorAll('.operational-birthday-row')];const entries=typeof cumpleanosSemanales==='function'?cumpleanosSemanales().entries:[];rows.forEach((row,i)=>{const item=entries[i];if(!item)return;const b=document.createElement('button');b.type='button';b.className='btn cya-birthday-btn';b.textContent='Felicitación';b.setAttribute('onclick',`event.stopPropagation();cyaAbrirFelicitacionCumpleanos('${String(item.client.id).replace(/'/g,"\\'")}','${item.date}')`);row.appendChild(b);});return tpl.innerHTML;}catch(_){return html;}};wrapped.__cyaBirthdayWrapped=true;window.renderTableroOperativo=wrapped;}
  function birthdayAgendaCard(){try{const data=typeof cumpleanosSemanales==='function'?cumpleanosSemanales():null;if(!data||!data.entries.length)return'';return `<section class="card cya-agenda-birthdays"><div class="card-header"><div><div class="card-title">Cumpleaños de la semana</div><div class="form-helper">Acceso rápido para preparar una felicitación personalizada.</div></div><span class="operational-group-count">${data.entries.length}</span></div><div class="card-body">${data.entries.map(({client,date})=>`<div class="cya-agenda-birthday-row"><div><div class="cya-agenda-birthday-name">${safe(client.nombre||'Sin nombre')}</div><div class="cya-agenda-birthday-meta">${safe(displayDate(date))} · ${safe(client.telefono||'Sin teléfono')}</div></div><button class="btn cya-birthday-btn" type="button" onclick="cyaAbrirFelicitacionCumpleanos('${safe(client.id)}','${date}')">Felicitación</button></div>`).join('')}</div></section>`;}catch(_){return'';}}
  function patchAgenda(){const base=window.renderAgenda;if(typeof base!=='function'||base.__cyaBirthdayWrapped)return;const wrapped=function(){return birthdayAgendaCard()+base.apply(this,arguments);};wrapped.__cyaBirthdayWrapped=true;window.renderAgenda=wrapped;}
  function syncProfileButton(){const modal=document.getElementById('modal-perfil');const actions=modal?.querySelector('.profile-header-actions');if(!actions)return;let btn=document.getElementById('perfil-birthday-btn');let id=null;try{id=typeof perfilClienteActivo!=='undefined'?perfilClienteActivo:null;}catch(_){}const c=clientById(id);if(!c||!curpBirth(c)){btn?.remove();return;}if(!btn){btn=document.createElement('button');btn.id='perfil-birthday-btn';btn.className='btn';btn.type='button';btn.textContent='Felicitación';btn.onclick=()=>window.cyaAbrirFelicitacionCumpleanos(c.id,thisYearBirthday(c));actions.insertBefore(btn,actions.firstChild);}else btn.onclick=()=>window.cyaAbrirFelicitacionCumpleanos(c.id,thisYearBirthday(c));}

  ensureStyles();ensureTemplates();patchOperational();patchAgenda();syncProfileButton();
  let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchOperational();patchAgenda();syncProfileButton();});}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
