/* Dashboard, account banners, organization messages and advisor birthdays. */
(function installDashboardCustomizationModule(){
  if(window.__cyaDashboardCustomizationModuleLoaded)return;
  window.__cyaDashboardCustomizationModuleLoaded=true;

  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const bannerKeys={
    dashboard:{url:'dashboard_banner_url',text:'dashboard_banner_text',position:'dashboard_banner_position',path:'dashboard-banner.webp'},
    account:{url:'account_banner_url',text:'account_banner_text',position:'account_banner_position',path:'account-banner.webp'},
  };

  function firstName(user){
    const value=typeof asesorNombres==='function'?asesorNombres(user):String(user?.nombre||'').trim().split(/\s+/)[0];
    return String(value||'Asesor').trim().split(/\s+/)[0]||'Asesor';
  }

  function longDate(date=new Date()){
    const days=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`;
  }

  function isBirthday(user,date=new Date()){
    const raw=String(user?.fechaNacimiento||'');
    const match=raw.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if(!match)return false;
    return Number(match[1])===date.getMonth()+1&&Number(match[2])===date.getDate();
  }

  function personalizeMessage(text,user){
    return String(text||'')
      .replace(/\{\{\s*nombre\s*\}\}/gi,firstName(user))
      .replace(/\{\s*nombre\s*\}/gi,firstName(user));
  }

  function bannerTextClass(kind){
    const cfg=store?.configuracion||{};
    const def=bannerKeys[kind];
    const hasBanner=Boolean(cfg[def.url]);
    const mode=cfg[def.text]||'auto';
    if(!hasBanner)return 'cya-banner-text-theme';
    if(mode==='dark')return 'cya-banner-text-dark';
    return 'cya-banner-text-light';
  }

  function bannerPosition(kind){
    const cfg=store?.configuracion||{};
    const value=cfg[bannerKeys[kind].position]||'center';
    return ['left','center','right'].includes(value)?value:'center';
  }

  function bannerStyle(kind){
    const cfg=store?.configuracion||{};
    const url=String(cfg[bannerKeys[kind].url]||'').trim();
    if(!url)return '';
    const cssUrl=url.replace(/['"()\\]/g,ch=>encodeURIComponent(ch));
    return `background-image:url('${cssUrl}');background-position:${bannerPosition(kind)} center;background-size:cover;background-repeat:no-repeat;`;
  }

  function dashboardHero(){
    const user=sesionActiva||{};
    const today=new Date();
    const birthday=isBirthday(user,today);
    const name=firstName(user);
    const configured=personalizeMessage(store?.configuracion?.dashboard_mensaje_general,user).trim();
    const greeting=birthday?`¡Feliz cumpleaños, ${name}!`:(typeof saludoDashboardActual==='function'?saludoDashboardActual(user,today):`¡Hola, ${name}!`);
    const subtitle=birthday?'Todo el equipo de Casillas & Asociados te desea un excelente día.':(configured||'Resumen de tu cartera y prioridades del día.');
    const avatar=user.foto?`<img src="${safe(user.foto)}" alt="Foto de ${safe(name)}">`:`<span>${safe(typeof initials==='function'?initials(user.nombre||name):name.slice(0,2).toUpperCase())}</span>`;
    const hasBanner=Boolean(store?.configuracion?.dashboard_banner_url);
    const className=`dashboard-hero dashboard-personal-hero cya-dashboard-hero ${hasBanner?'cya-has-banner':''} ${bannerTextClass('dashboard')}`;
    return `<div class="${className}" style="${bannerStyle('dashboard')}">
      <div class="dashboard-personal-left">
        <div class="dashboard-personal-avatar">${avatar}</div>
        <div class="dashboard-personal-copy">
          <div class="dashboard-personal-date">${safe(longDate(today))}</div>
          <div class="section-title dashboard-greeting">${safe(greeting)}</div>
          <div class="section-sub dashboard-personal-sub">${safe(subtitle)}</div>
        </div>
      </div>
      <div class="dashboard-view-selector">${getSelectorVistaHTML(true)}</div>
    </div>`;
  }

  function birthdaySelfCard(){
    const value=fechaISOaMX?.(sesionActiva?.fechaNacimiento||'')||'';
    return `<section class="card account-personal-data-card">
      <div class="card-header"><div><div class="card-title">Datos personales</div><div class="section-sub" style="margin:2px 0 0;">Se usan únicamente para personalizar tu experiencia en el CRM.</div></div></div>
      <div class="card-body account-birthday-body">
        <div class="form-group" style="margin:0;flex:1;max-width:360px;">
          <label class="form-label" for="cya-my-birthday">Fecha de nacimiento</label>
          <input class="form-input" id="cya-my-birthday" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" value="${safe(value)}" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)">
          <div class="form-helper">Se utilizará para mostrar una felicitación en tu Dashboard el día de tu cumpleaños.</div>
        </div>
        <button class="btn btn-primary" type="button" onclick="cyaGuardarMiNacimiento()">Guardar fecha</button>
      </div>
    </section>`;
  }

  function decorateAccount(html){
    const cfg=store?.configuracion||{};
    const hasBanner=Boolean(cfg.account_banner_url);
    const opening=`<section class="card account-profile-hero ${hasBanner?'cya-has-banner':''} ${bannerTextClass('account')}" style="${bannerStyle('account')}">`;
    html=String(html).replace('<section class="card account-profile-hero">',opening);
    if(!html.includes('account-personal-data-card')){
      html=html.replace(/(<section class="card account-profile-hero[\s\S]*?<\/section>)/,`$1${birthdaySelfCard()}`);
    }
    return html;
  }

  function bannerPreview(kind,label,recommended){
    const cfg=store?.configuracion||{};
    const def=bannerKeys[kind];
    const url=String(cfg[def.url]||'');
    const text=cfg[def.text]||'auto';
    const position=cfg[def.position]||'center';
    const preview=url?`background-image:url('${url.replace(/'/g,'%27')}');background-position:${position} center;background-size:cover;`:'background:var(--bg-secondary);';
    return `<div class="cya-banner-editor">
      <div class="cya-banner-editor-head"><div><strong>${safe(label)}</strong><small>Recomendado: ${safe(recommended)}</small></div><span class="${url?'chip chip-green':'chip'}">${url?'Configurado':'Sin imagen'}</span></div>
      <div class="cya-banner-preview" style="${preview}">${url?'':'Vista previa del banner'}</div>
      <div class="cya-banner-controls">
        <label class="btn btn-primary" for="cya-${kind}-banner-file">${url?'Cambiar imagen':'Subir imagen'}</label>
        <input id="cya-${kind}-banner-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="cyaSubirBanner('${kind}',this)">
        ${url?`<button class="btn" type="button" onclick="cyaQuitarBanner('${kind}')">Quitar imagen</button>`:''}
      </div>
      <div class="form-row cya-banner-options">
        <div class="form-group"><label class="form-label">Color del texto</label><select class="form-select" id="cya-${kind}-text"><option value="auto" ${text==='auto'?'selected':''}>Automático</option><option value="light" ${text==='light'?'selected':''}>Claro / blanco</option><option value="dark" ${text==='dark'?'selected':''}>Oscuro / negro</option></select></div>
        <div class="form-group"><label class="form-label">Posición de la imagen</label><select class="form-select" id="cya-${kind}-position"><option value="left" ${position==='left'?'selected':''}>Izquierda</option><option value="center" ${position==='center'?'selected':''}>Centro</option><option value="right" ${position==='right'?'selected':''}>Derecha</option></select></div>
      </div>
    </div>`;
  }

  function customizationCard(){
    const message=String(store?.configuracion?.dashboard_mensaje_general||'');
    return `<section class="card cya-customization-card">
      <div class="card-header"><div><div class="card-title">Apariencia y mensajes del CRM</div><div class="section-sub" style="margin:2px 0 0;">Banners administrables y mensaje general del Dashboard</div></div></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label" for="cya-dashboard-message">Mensaje general del Dashboard</label>
          <textarea class="form-textarea" id="cya-dashboard-message" maxlength="220" placeholder="Ej. Excelente semana para todo el equipo. ¡Vamos por nuestros objetivos!">${safe(message)}</textarea>
          <div class="form-helper">Se muestra a todos los usuarios. Puedes usar <strong>{nombre}</strong>. El día del cumpleaños del asesor, la felicitación tendrá prioridad.</div>
        </div>
        <div class="cya-banner-grid">
          ${bannerPreview('dashboard','Banner del Dashboard','1600 × 400 px')}
          ${bannerPreview('account','Banner de Mi cuenta','1600 × 600 px')}
        </div>
        <div class="cya-customization-actions"><button class="btn btn-primary" type="button" onclick="cyaGuardarPersonalizacion()">Guardar apariencia y mensaje</button></div>
      </div>
    </section>`;
  }

  function readCustomizationInputs(){
    if(!store.configuracion)store.configuracion={};
    const message=document.getElementById('cya-dashboard-message');
    if(message)store.configuracion.dashboard_mensaje_general=String(message.value||'').trim();
    for(const kind of Object.keys(bannerKeys)){
      const def=bannerKeys[kind];
      const text=document.getElementById(`cya-${kind}-text`);
      const position=document.getElementById(`cya-${kind}-position`);
      if(text)store.configuracion[def.text]=text.value||'auto';
      if(position)store.configuracion[def.position]=position.value||'center';
    }
  }

  window.cyaGuardarPersonalizacion=async function(showSuccess=true){
    if(typeof isTechnicalAdmin!=='function'||!isTechnicalAdmin())return showToast?.('Acceso reservado al administrador técnico','warn');
    readCustomizationInputs();
    try{
      await cloudSyncNow({throwOnError:true});
      if(showSuccess)showToast?.('Apariencia y mensaje guardados','success');
      if(typeof currentPage!=='undefined'&&currentPage==='configuracion')renderPage('configuracion');
    }catch(error){showToast?.('No se pudo guardar la personalización: '+error.message,'warn');}
  };

  function fileToBannerDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('No se pudo leer la imagen'));
      reader.onload=()=>{
        const image=new Image();
        image.onerror=()=>reject(new Error('La imagen no es válida'));
        image.onload=()=>{
          const maxWidth=2000;
          const scale=Math.min(1,maxWidth/image.width);
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.width*scale));
          canvas.height=Math.max(1,Math.round(image.height*scale));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/webp',0.92));
        };
        image.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  window.cyaSubirBanner=async function(kind,input){
    if(typeof isTechnicalAdmin!=='function'||!isTechnicalAdmin())return showToast?.('Acceso reservado al administrador técnico','warn');
    const def=bannerKeys[kind];
    const file=input?.files?.[0];
    if(!def||!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){input.value='';return showToast?.('Usa JPG, PNG o WebP de hasta 8 MB','warn');}
    try{
      readCustomizationInputs();
      const dataUrl=await fileToBannerDataUrl(file);
      const path=`${CA_ORG_ID}/${def.path}`;
      await cloudUploadDataUrl('crm-branding',path,dataUrl);
      const {data}=supabaseClient.storage.from('crm-branding').getPublicUrl(path);
      store.configuracion[def.url]=(data?.publicUrl||'')+`?v=${Date.now()}`;
      await cloudSyncNow({throwOnError:true});
      input.value='';
      showToast?.('Banner actualizado','success');
      if(typeof currentPage!=='undefined')renderPage(currentPage);
    }catch(error){input.value='';showToast?.('No se pudo subir el banner: '+error.message,'warn');}
  };

  window.cyaQuitarBanner=async function(kind){
    if(typeof isTechnicalAdmin!=='function'||!isTechnicalAdmin())return showToast?.('Acceso reservado al administrador técnico','warn');
    const def=bannerKeys[kind];if(!def)return;
    readCustomizationInputs();
    store.configuracion[def.url]='';
    try{await cloudSyncNow({throwOnError:true});showToast?.('Banner retirado','success');if(typeof currentPage!=='undefined')renderPage(currentPage);}
    catch(error){showToast?.('No se pudo retirar el banner: '+error.message,'warn');}
  };

  window.cyaGuardarMiNacimiento=async function(){
    if(!sesionActiva)return;
    const value=leerFechaMX('cya-my-birthday');
    if(value===null)return;
    if(value&&value>fechaISOLocal(new Date()))return showToast?.('La fecha de nacimiento no puede estar en el futuro','warn');
    try{
      const {error}=await supabaseClient.from('profiles').update({birth_date:value||null}).eq('id',sesionActiva.id);
      if(error)throw error;
      sesionActiva.fechaNacimiento=value||'';
      const profile=(store.asesores||[]).find(a=>a.id===sesionActiva.id);if(profile)profile.fechaNacimiento=value||'';
      showToast?.('Fecha de nacimiento guardada','success');
      renderPage('cuenta');
    }catch(error){showToast?.('No se pudo guardar la fecha: '+error.message,'warn');}
  };

  async function loadBirthdays(){
    if(!cloudReady||!sesionActiva)return false;
    try{
      const {data,error}=await supabaseClient.from('profiles').select('id,birth_date');
      if(error)throw error;
      for(const row of (data||[])){
        const profile=(store.asesores||[]).find(a=>a.id===row.id);
        if(profile)profile.fechaNacimiento=row.birth_date||'';
        if(sesionActiva?.id===row.id)sesionActiva.fechaNacimiento=row.birth_date||'';
      }
      if(typeof currentPage!=='undefined'&&['dashboard','cuenta','asesores'].includes(currentPage))renderPage(currentPage);
      return true;
    }catch(error){console.warn('No se pudieron cargar las fechas de nacimiento',error);return false;}
  }

  function scheduleBirthdayLoad(){
    let tries=0;
    const timer=setInterval(async()=>{
      tries++;
      if(cloudReady&&sesionActiva){clearInterval(timer);await loadBirthdays();}
      else if(tries>300)clearInterval(timer);
    },50);
  }

  const style=document.createElement('style');
  style.id='cya-dashboard-customization-styles';
  style.textContent=`
    .cya-dashboard-hero{min-height:118px!important;padding:17px 19px!important;margin-bottom:14px!important;box-shadow:none!important;}
    .cya-dashboard-hero.cya-has-banner{background-color:var(--bg-card)!important;}
    .cya-dashboard-hero .dashboard-personal-left{gap:18px!important;}
    .cya-dashboard-hero .dashboard-personal-avatar{width:88px!important;height:88px!important;flex:0 0 88px!important;border:1px solid rgba(201,169,110,.30)!important;box-shadow:none!important;}
    .cya-dashboard-hero .dashboard-greeting{font-size:28px!important;line-height:1.05!important;margin:2px 0 0!important;}
    .cya-dashboard-hero .dashboard-personal-date{font-size:12px!important;margin-bottom:5px!important;text-transform:none!important;}
    .cya-dashboard-hero .dashboard-personal-sub{font-size:12px!important;line-height:1.45!important;margin-top:7px!important;max-width:720px;}
    .cya-dashboard-hero.cya-banner-text-light .dashboard-personal-date{color:rgba(255,255,255,.78)!important;}
    .cya-dashboard-hero.cya-banner-text-light .dashboard-greeting{color:#fff!important;text-shadow:0 1px 7px rgba(0,0,0,.28);}
    .cya-dashboard-hero.cya-banner-text-light .dashboard-personal-sub{color:rgba(255,255,255,.86)!important;text-shadow:0 1px 5px rgba(0,0,0,.24);}
    .cya-dashboard-hero.cya-banner-text-dark .dashboard-personal-date{color:rgba(12,22,36,.72)!important;}
    .cya-dashboard-hero.cya-banner-text-dark .dashboard-greeting{color:#111827!important;text-shadow:none!important;}
    .cya-dashboard-hero.cya-banner-text-dark .dashboard-personal-sub{color:rgba(17,24,39,.78)!important;text-shadow:none!important;}
    .cya-dashboard-hero.cya-banner-text-theme .dashboard-personal-date{color:var(--text-muted)!important;}
    .cya-dashboard-hero.cya-banner-text-theme .dashboard-greeting{color:var(--text-primary)!important;text-shadow:none!important;}
    .cya-dashboard-hero.cya-banner-text-theme .dashboard-personal-sub{color:var(--text-muted)!important;text-shadow:none!important;}

    .account-profile-hero::before{display:none!important;background:none!important;}
    .account-profile-hero{min-height:340px!important;background-color:var(--bg-card)!important;background-image:none;background-size:cover!important;background-repeat:no-repeat!important;}
    .account-profile-hero.cya-has-banner{background-image:inherit;}
    .account-profile-hero:not(.cya-has-banner) .account-profile-name{color:var(--text-primary)!important;text-shadow:none!important;}
    .account-profile-hero:not(.cya-has-banner) .account-profile-email,.account-profile-hero:not(.cya-has-banner) .account-profile-helper{color:var(--text-muted)!important;}
    .account-profile-hero.cya-banner-text-light .account-profile-name{color:#fff!important;text-shadow:0 1px 7px rgba(0,0,0,.28);}
    .account-profile-hero.cya-banner-text-light .account-profile-email,.account-profile-hero.cya-banner-text-light .account-profile-helper{color:rgba(255,255,255,.82)!important;}
    .account-profile-hero.cya-banner-text-dark .account-profile-name{color:#111827!important;text-shadow:none!important;}
    .account-profile-hero.cya-banner-text-dark .account-profile-email,.account-profile-hero.cya-banner-text-dark .account-profile-helper{color:rgba(17,24,39,.78)!important;}
    .account-profile-content{padding-top:30px!important;}
    .account-profile-photo{width:140px!important;height:140px!important;border:1px solid rgba(201,169,110,.34)!important;}
    .account-birthday-body{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;}

    .cya-customization-card{margin-top:18px;}
    .cya-banner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px;}
    .cya-banner-editor{border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;background:var(--bg-secondary);}
    .cya-banner-editor-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;}
    .cya-banner-editor-head strong{display:block;font-size:13px;color:var(--text-primary);}
    .cya-banner-editor-head small{display:block;font-size:10px;color:var(--text-muted);margin-top:2px;}
    .cya-banner-preview{height:120px;border:1px dashed var(--border-strong);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:10px;overflow:hidden;}
    .cya-banner-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
    .cya-banner-options{margin-top:12px!important;margin-bottom:0!important;}
    .cya-customization-actions{display:flex;justify-content:flex-end;margin-top:18px;}

    @media(max-width:760px){
      .cya-dashboard-hero{min-height:0!important;padding:14px!important;}
      .cya-dashboard-hero .dashboard-personal-avatar{width:72px!important;height:72px!important;flex-basis:72px!important;}
      .cya-dashboard-hero .dashboard-greeting{font-size:23px!important;}
      .cya-banner-grid{grid-template-columns:1fr;}
      .account-profile-hero{min-height:300px!important;}
      .account-birthday-body{align-items:stretch;flex-direction:column;}
      .account-birthday-body .form-group{max-width:none!important;}
    }
  `;
  document.head.appendChild(style);

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=typeof renderDashboard==='function'&&typeof renderMiCuenta==='function'&&typeof renderConfiguracion==='function'&&
      typeof openModalAsesor==='function'&&typeof guardarAsesor==='function'&&typeof cloudSyncNow==='function'&&
      typeof cloudUploadDataUrl==='function'&&typeof supabaseClient!=='undefined'&&window.__cyaOperationalBoardModuleLoaded&&window.__cyaAccountWorkspaceInstalled;
    if(!ready){if(attempts>400)clearInterval(installer);return;}
    if(window.__cyaDashboardCustomizationInstalled){clearInterval(installer);return;}
    window.__cyaDashboardCustomizationInstalled=true;
    clearInterval(installer);

    const dashboardBase=renderDashboard;
    renderDashboard=function(){
      let html=dashboardBase.apply(this,arguments);
      return String(html).replace(/<div class="dashboard-hero dashboard-personal-hero">[\s\S]*?<div class="dashboard-priority-stack">/,dashboardHero()+'\n<div class="dashboard-priority-stack">');
    };

    const accountBase=renderMiCuenta;
    renderMiCuenta=function(){return decorateAccount(accountBase.apply(this,arguments));};

    const configBase=renderConfiguracion;
    renderConfiguracion=function(){
      const html=configBase.apply(this,arguments);
      return typeof isTechnicalAdmin==='function'&&isTechnicalAdmin()?String(html)+customizationCard():html;
    };

    const openAdvisorBase=openModalAsesor;
    openModalAsesor=function(id){
      const result=openAdvisorBase.apply(this,arguments);
      const modal=document.getElementById('modal-asesor');
      if(!modal?.classList.contains('open'))return result;
      document.getElementById('as-birthday-row')?.remove();
      const advisor=id?(store.asesores||[]).find(a=>a.id===id):null;
      const anchor=document.getElementById('as-ciudad')?.closest('.form-row');
      if(anchor){
        const canEdit=typeof isTechnicalAdmin==='function'&&isTechnicalAdmin();
        anchor.insertAdjacentHTML('afterend',`<div class="form-row" id="as-birthday-row"><div class="form-group" style="grid-column:span 2;"><label class="form-label" for="as-fecha-nacimiento">Fecha de nacimiento</label><input class="form-input" id="as-fecha-nacimiento" type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" value="${safe(fechaISOaMX(advisor?.fechaNacimiento||''))}" oninput="mascaraFechaMX(this)" onblur="validarVisualFechaMX(this)" ${canEdit?'':'disabled'}><div class="form-helper">${canEdit?'Se utilizará para la felicitación automática anual en el Dashboard.':'Solo el administrador técnico puede modificar este dato desde el perfil del asesor.'}</div></div></div>`);
      }
      return result;
    };

    const saveAdvisorBase=guardarAsesor;
    guardarAsesor=async function(){
      const targetId=editingAsesorId||null;
      const previous=targetId?(store.asesores||[]).find(a=>a.id===targetId):null;
      const previousBirth=previous?.fechaNacimiento||'';
      const email=String(getVal('as-email')||'').trim().toLowerCase();
      const canEditBirth=typeof isTechnicalAdmin==='function'&&isTechnicalAdmin();
      let birth=previousBirth;
      if(canEditBirth&&document.getElementById('as-fecha-nacimiento')){
        birth=leerFechaMX('as-fecha-nacimiento');
        if(birth===null)return;
        if(birth&&birth>fechaISOLocal(new Date()))return showToast?.('La fecha de nacimiento no puede estar en el futuro','warn');
      }
      const result=await Promise.resolve(saveAdvisorBase.apply(this,arguments));
      if(document.getElementById('modal-asesor')?.classList.contains('open'))return result;
      const saved=(targetId&&(store.asesores||[]).find(a=>a.id===targetId))||(store.asesores||[]).find(a=>String(a.email||'').toLowerCase()===email);
      if(saved)saved.fechaNacimiento=canEditBirth?(birth||''):previousBirth;
      if(canEditBirth&&saved&&typeof cloudIsUuid==='function'&&cloudIsUuid(saved.id)){
        try{
          const {error}=await supabaseClient.from('profiles').update({birth_date:birth||null}).eq('id',saved.id);
          if(error)throw error;
          if(sesionActiva?.id===saved.id)sesionActiva.fechaNacimiento=birth||'';
        }catch(error){showToast?.('El asesor se guardó, pero no se pudo actualizar su fecha de nacimiento: '+error.message,'warn');}
      }
      return result;
    };

    if(typeof cloudEnterSession==='function'){
      const enterBase=cloudEnterSession;
      cloudEnterSession=async function(){const result=await enterBase.apply(this,arguments);await loadBirthdays();return result;};
    }

    scheduleBirthdayLoad();
    if(typeof currentPage!=='undefined'&&['dashboard','cuenta','configuracion'].includes(currentPage))renderPage(currentPage);
  },30);
})();
