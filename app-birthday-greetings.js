/* C&A birthday greeting workflow for web CRM.
   Reuses client data already stored in CRM, generates an SVG/PNG greeting,
   prepares (never sends) WhatsApp text, and records manual completion. */
(function installBirthdayGreetings(){
  if(window.__cyaBirthdayGreetingsInstalled)return;
  window.__cyaBirthdayGreetingsInstalled=true;

  const TEMPLATE={
    id:'pl_cumpleanos_cya',
    nombre:'Cumpleaños · Casillas & Asociados',
    etapa:'',tipo:'whatsapp',icono:'',
    texto:'Buen día, {{NOMBRE}}.\n\nEn este día tan especial, todo el equipo de *Casillas & Asociados* te desea un cumpleaños lleno de salud, alegría, éxito y muchas bendiciones.\n\nAgradecemos la confianza que nos brindaste al permitirnos apoyarte anteriormente, y seguimos a tus órdenes para cualquier cosa en la que podamos ayudarte.\n\nRecibe un cordial saludo y nuestros mejores deseos.\n\n*¡Feliz cumpleaños!*'
  };
  let activeClientId=null;
  let activeBirthdayDate='';

  const safe=v=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(v??'')):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clientById=id=>{try{return (store?.clientes||[]).find(c=>String(c.id)===String(id))||null;}catch(_){return null;}};
  function ensureTemplate(){
    try{
      if(typeof store==='undefined'||!store)return TEMPLATE;
      if(!Array.isArray(store.plantillas))store.plantillas=[];
      let tpl=store.plantillas.find(p=>p.id===TEMPLATE.id);
      if(!tpl){tpl={...TEMPLATE};store.plantillas.push(tpl);try{saveStore?.();}catch(_){}}
      return tpl||TEMPLATE;
    }catch(_){return TEMPLATE;}
  }
  function normalizePhone(v){let d=String(v||'').replace(/\D/g,'');if(d.length===13&&d.startsWith('521'))d=d.slice(3);else if(d.length===12&&d.startsWith('52'))d=d.slice(2);else if(d.length>10)d=d.slice(-10);return d.slice(0,10);}
  function naturalToken(s){s=String(s||'').trim();if(!s)return'';s=s.toLocaleLowerCase('es-MX');return s.charAt(0).toLocaleUpperCase('es-MX')+s.slice(1);}
  function greetingName(client){
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
  function renderMessage(client){
    const tpl=ensureTemplate();
    return String(tpl.texto||TEMPLATE.texto).replace(/{{NOMBRE}}/g,greetingName(client)).trim();
  }
  function wrapName(name){
    const words=String(name||'').toUpperCase().split(/\s+/).filter(Boolean);
    if(words.length<=3)return [words.join(' ')];
    const mid=Math.ceil(words.length/2);return [words.slice(0,mid).join(' '),words.slice(mid).join(' ')];
  }
  function svgFor(client,date){
    const nameLines=wrapName(client?.nombre||'CLIENTE');
    const fontSize=nameLines.join(' ').length>34?54:64;
    const y0=nameLines.length>1?770:800;
    const nameSvg=nameLines.map((line,i)=>`<text x="540" y="${y0+i*72}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF">${safe(line)}</text>`).join('');
    const dateText=displayDate(date||thisYearBirthday(client));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#06152c"/><stop offset=".55" stop-color="#0d2749"/><stop offset="1" stop-color="#051327"/></linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e08d"/><stop offset=".48" stop-color="#c79a2d"/><stop offset="1" stop-color="#f4d36b"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-opacity=".28"/></filter>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)"/>
      <path d="M0 1180 L1080 900 L1080 1350 L0 1350Z" fill="#0b315b" opacity=".65"/><path d="M0 1270 L1080 1020" stroke="#123e6f" stroke-width="95" opacity=".38"/>
      <g opacity=".9">${[[96,165,78],[232,104,58],[860,120,72],[960,245,58],[105,390,64],[930,440,70],[165,1120,63],[920,1120,58]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r*.78}" ry="${r}" fill="url(#gold)" filter="url(#shadow)"/><path d="M${x} ${y+r} q 18 28 -3 54" fill="none" stroke="#d8b351" stroke-width="3"/>`).join('')}</g>
      <g opacity=".75" fill="#d6ad45">${[[365,84],[615,126],[740,58],[315,300],[810,330],[240,580],[860,650],[340,1030],[720,1060]].map(([x,y])=>`<rect x="${x}" y="${y}" width="10" height="22" rx="2" transform="rotate(28 ${x} ${y})"/>`).join('')}</g>
      <g transform="translate(540 270)"><circle cx="0" cy="0" r="155" fill="none" stroke="url(#gold)" stroke-width="5" opacity=".9"/><text x="0" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="190" fill="url(#gold)" font-weight="700">CA</text></g>
      <text x="540" y="485" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="34" letter-spacing="10" fill="#FFFFFF">CASILLAS &amp; ASOCIADOS</text>
      <text x="540" y="535" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="12" fill="#D9DCE3">CONSULTORÍA</text>
      <text x="540" y="650" text-anchor="middle" font-family="Georgia,serif" font-size="47" fill="#E7C462">CASILLAS &amp; ASOCIADOS</text>
      <text x="540" y="708" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#E7C462">TE DESEA UN MUY</text>
      <text x="540" y="775" text-anchor="middle" font-family="Georgia,serif" font-size="66" font-weight="700" fill="#F1C84D">¡FELIZ CUMPLEAÑOS!</text>
      ${nameSvg}
      <line x1="320" y1="${nameLines.length>1?940:890}" x2="760" y2="${nameLines.length>1?940:890}" stroke="#DDBA56" stroke-width="3"/>
      <rect x="190" y="${nameLines.length>1?985:935}" width="700" height="140" rx="22" fill="none" stroke="#E7D38C" stroke-width="4"/>
      <text x="540" y="${nameLines.length>1?1040:990}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="34" font-style="italic" fill="#FFFFFF"><tspan x="540">Que este día sea especial</tspan><tspan x="540" dy="44">y lleno de bendiciones</tspan></text>
      <text x="540" y="1215" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="700" fill="#FFFFFF">${safe(dateText)}</text>
    </svg>`;
  }
  function svgDataUrl(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
  async function pngBlob(client,date){
    const svg=svgFor(client,date);const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=svgDataUrl(svg);});
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',0.95));
  }
  function ensureStyles(){if(document.getElementById('cya-birthday-styles'))return;const s=document.createElement('style');s.id='cya-birthday-styles';s.textContent=`
    .cya-birthday-btn{font-size:11px;padding:6px 10px;white-space:nowrap}.operational-birthday-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center}
    .cya-birthday-modal{width:min(1040px,96vw);max-height:92vh;display:flex;flex-direction:column}.cya-birthday-modal .modal-body{overflow:auto}.cya-birthday-grid{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(320px,1.1fr);gap:18px}.cya-birthday-preview{background:#07162b;border-radius:14px;overflow:hidden;border:1px solid rgba(201,169,110,.4)}.cya-birthday-preview svg{display:block;width:100%;height:auto}.cya-birthday-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.cya-birthday-message{min-height:310px;line-height:1.5}.cya-birthday-history{margin-top:10px;font-size:11px;color:var(--text-muted)}.cya-agenda-birthdays{margin-bottom:16px}.cya-agenda-birthday-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}.cya-agenda-birthday-row:last-child{border-bottom:0}.cya-agenda-birthday-name{font-weight:700}.cya-agenda-birthday-meta{font-size:11px;color:var(--text-muted)}
    @media(max-width:760px){.cya-birthday-grid{grid-template-columns:1fr}.operational-birthday-row{grid-template-columns:minmax(0,1fr) auto}.operational-birthday-row>span:nth-child(2){grid-column:1/2}.cya-birthday-btn{grid-column:2/3;grid-row:1/3}}
  `;document.head.appendChild(s);}
  function ensureModal(){if(document.getElementById('cya-birthday-modal'))return;const m=document.createElement('div');m.id='cya-birthday-modal';m.className='modal-overlay';m.innerHTML=`<div class="modal cya-birthday-modal" role="dialog" aria-modal="true"><div class="modal-header"><div><div class="modal-title">Felicitación de cumpleaños</div><div class="form-helper" id="cya-birthday-person"></div></div><button class="modal-close" type="button" onclick="cyaCerrarFelicitacionCumpleanos()">×</button></div><div class="modal-body"><div class="cya-birthday-grid"><div><div class="cya-birthday-preview" id="cya-birthday-preview"></div><div class="cya-birthday-actions"><button class="btn" type="button" onclick="cyaDescargarFelicitacionPNG()">Descargar PNG</button><button class="btn" type="button" onclick="cyaCompartirFelicitacionImagen()">Compartir imagen</button></div></div><div><label class="form-label">Mensaje de WhatsApp</label><textarea id="cya-birthday-message" class="form-textarea cya-birthday-message" spellcheck="true"></textarea><div class="form-helper">Puedes editar el texto. Abrir WhatsApp solo prepara el mensaje; el envío final siempre lo realizas tú.</div><div class="cya-birthday-actions"><button class="btn" type="button" onclick="cyaCopiarMensajeCumpleanos()">Copiar mensaje</button><button class="btn" style="background:#25d366;border-color:#25d366;color:#fff" type="button" onclick="cyaAbrirWhatsAppCumpleanos()">Abrir WhatsApp</button></div><div class="cya-birthday-history" id="cya-birthday-history"></div></div></div></div><div class="modal-footer"><button class="btn" type="button" onclick="cyaEditarPlantillaCumpleanos()">Editar mensaje en Plantillas</button><button class="btn btn-primary" type="button" onclick="cyaMarcarFelicitacionEnviada()">Marcar como enviada</button><button class="btn" type="button" onclick="cyaCerrarFelicitacionCumpleanos()">Cerrar</button></div></div>`;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)window.cyaCerrarFelicitacionCumpleanos();});}
  window.cyaAbrirFelicitacionCumpleanos=function(clientId,date){const c=clientById(clientId);if(!c){showToast?.('Cliente no encontrado','warn');return;}ensureTemplate();ensureStyles();ensureModal();activeClientId=c.id;activeBirthdayDate=date||thisYearBirthday(c);document.getElementById('cya-birthday-person').textContent=`${c.nombre||'Cliente'} · ${c.telefono||'Sin teléfono'}`;document.getElementById('cya-birthday-preview').innerHTML=svgFor(c,activeBirthdayDate);document.getElementById('cya-birthday-message').value=renderMessage(c);const hist=Array.isArray(c.historialCumpleanos)?c.historialCumpleanos:[];document.getElementById('cya-birthday-history').textContent=hist.length?`Última felicitación marcada como enviada: ${new Date(hist[hist.length-1].fecha).toLocaleString('es-MX')}`:'Sin felicitaciones registradas previamente.';document.getElementById('cya-birthday-modal').classList.add('open');};
  window.cyaCerrarFelicitacionCumpleanos=function(){document.getElementById('cya-birthday-modal')?.classList.remove('open');activeClientId=null;activeBirthdayDate='';};
  window.cyaCopiarMensajeCumpleanos=async function(){const t=document.getElementById('cya-birthday-message')?.value||'';try{await navigator.clipboard.writeText(t);showToast?.('Mensaje de cumpleaños copiado','success');}catch(_){showToast?.('No fue posible copiar el mensaje','warn');}};
  window.cyaAbrirWhatsAppCumpleanos=function(){const c=clientById(activeClientId);if(!c)return;const p=normalizePhone(c.telefono);if(p.length!==10){showToast?.('El cliente necesita un teléfono válido de 10 dígitos','warn');return;}const t=document.getElementById('cya-birthday-message')?.value||renderMessage(c);const tab=window.open(`https://wa.me/52${p}?text=${encodeURIComponent(t)}`,'_blank');if(tab)try{tab.opener=null;}catch(_){}showToast?.(tab?'WhatsApp abierto. Revisa y envía manualmente.':'El navegador bloqueó WhatsApp.',tab?'success':'warn');};
  window.cyaDescargarFelicitacionPNG=async function(){const c=clientById(activeClientId);if(!c)return;try{const blob=await pngBlob(c,activeBirthdayDate);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Cumpleanos_${String(c.nombre||'cliente').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g,'_')}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast?.('Imagen PNG generada','success');}catch(e){console.error(e);showToast?.('No fue posible generar la imagen','warn');}};
  window.cyaCompartirFelicitacionImagen=async function(){const c=clientById(activeClientId);if(!c)return;try{const blob=await pngBlob(c,activeBirthdayDate);const file=new File([blob],`Cumpleanos_${c.id}.png`,{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Felicitación de cumpleaños'});return;}await window.cyaDescargarFelicitacionPNG();showToast?.('Tu navegador no permite compartir archivos directamente; se descargó el PNG.','warn');}catch(e){if(e?.name!=='AbortError'){console.error(e);showToast?.('No fue posible compartir la imagen','warn');}}};
  window.cyaMarcarFelicitacionEnviada=async function(){const c=clientById(activeClientId);if(!c)return;const now=new Date().toISOString();const entry={fecha:now,cumpleanos:activeBirthdayDate||thisYearBirthday(c),asesorId:sesionActiva?.id||null,mensaje:document.getElementById('cya-birthday-message')?.value||renderMessage(c)};c.historialCumpleanos=[...(Array.isArray(c.historialCumpleanos)?c.historialCumpleanos:[]),entry];c.ultimaFelicitacionCumpleanos=now;try{saveStore?.();await cloudSyncNow?.({throwOnError:true});showToast?.('Felicitación marcada como enviada','success');window.cyaCerrarFelicitacionCumpleanos();if(typeof renderPage==='function')renderPage(currentPage);}catch(e){c.historialCumpleanos.pop();showToast?.('No se pudo guardar el registro de envío','warn');}};
  window.cyaEditarPlantillaCumpleanos=function(){window.cyaCerrarFelicitacionCumpleanos();try{navigate('plantillas',document.querySelector('[data-page="plantillas"]'));setTimeout(()=>{if(typeof seleccionarPlantilla==='function')seleccionarPlantilla(TEMPLATE.id);},100);}catch(_){}};

  function patchOperational(){const base=window.renderTableroOperativo;if(typeof base!=='function'||base.__cyaBirthdayWrapped)return;const wrapped=function(){const html=base.apply(this,arguments);try{const tpl=document.createElement('template');tpl.innerHTML=html;const rows=[...tpl.content.querySelectorAll('.operational-birthday-row')];const entries=typeof cumpleanosSemanales==='function'?cumpleanosSemanales().entries:[];rows.forEach((row,i)=>{const item=entries[i];if(!item)return;const b=document.createElement('button');b.type='button';b.className='btn cya-birthday-btn';b.textContent='Felicitación';b.setAttribute('onclick',`event.stopPropagation();cyaAbrirFelicitacionCumpleanos('${String(item.client.id).replace(/'/g,"\\'")}','${item.date}')`);row.appendChild(b);});return tpl.innerHTML;}catch(_){return html;}};wrapped.__cyaBirthdayWrapped=true;window.renderTableroOperativo=wrapped;}
  function birthdayAgendaCard(){try{const data=typeof cumpleanosSemanales==='function'?cumpleanosSemanales():null;if(!data||!data.entries.length)return'';return `<section class="card cya-agenda-birthdays"><div class="card-header"><div><div class="card-title">Cumpleaños de la semana</div><div class="form-helper">Acceso rápido para preparar una felicitación personalizada.</div></div><span class="operational-group-count">${data.entries.length}</span></div><div class="card-body">${data.entries.map(({client,date})=>`<div class="cya-agenda-birthday-row"><div><div class="cya-agenda-birthday-name">${safe(client.nombre||'Sin nombre')}</div><div class="cya-agenda-birthday-meta">${safe(displayDate(date))} · ${safe(client.telefono||'Sin teléfono')}</div></div><button class="btn cya-birthday-btn" type="button" onclick="cyaAbrirFelicitacionCumpleanos('${safe(client.id)}','${date}')">Felicitación</button></div>`).join('')}</div></section>`;}catch(_){return'';}}
  function patchAgenda(){const base=window.renderAgenda;if(typeof base!=='function'||base.__cyaBirthdayWrapped)return;const wrapped=function(){return birthdayAgendaCard()+base.apply(this,arguments);};wrapped.__cyaBirthdayWrapped=true;window.renderAgenda=wrapped;}
  function syncProfileButton(){const modal=document.getElementById('modal-perfil');const actions=modal?.querySelector('.profile-header-actions');if(!actions)return;let btn=document.getElementById('perfil-birthday-btn');let id=null;try{id=typeof perfilClienteActivo!=='undefined'?perfilClienteActivo:null;}catch(_){}const c=clientById(id);if(!c||!curpBirth(c)){btn?.remove();return;}if(!btn){btn=document.createElement('button');btn.id='perfil-birthday-btn';btn.className='btn';btn.type='button';btn.textContent='Felicitación';btn.onclick=()=>window.cyaAbrirFelicitacionCumpleanos(c.id,thisYearBirthday(c));actions.insertBefore(btn,actions.firstChild);}else btn.onclick=()=>window.cyaAbrirFelicitacionCumpleanos(c.id,thisYearBirthday(c));}

  ensureStyles();ensureTemplate();patchOperational();patchAgenda();syncProfileButton();
  let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchOperational();patchAgenda();syncProfileButton();});}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
