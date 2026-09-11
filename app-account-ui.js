/* Visual account workspace. Keeps profile personal, compact and ready for centralized backups. */
(function installAccountWorkspace(){
  if(window.__cyaAccountWorkspaceModuleLoaded)return;
  window.__cyaAccountWorkspaceModuleLoaded=true;

  const sectionOpen={access:false,backup:false,history:false,technical:false};
  const historyKey=()=>`cya-backup-history-v1:${typeof CA_ORG_ID!=='undefined'?CA_ORG_ID:'local'}`;

  function safe(value){
    return typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  }

  function roleLabel(user){
    if(typeof isTechnicalAdmin==='function'&&isTechnicalAdmin())return 'Administrador técnico';
    return user?.rol==='admin'?'Administrador':'Asesor';
  }

  function readBackupHistory(){
    try{
      const parsed=JSON.parse(localStorage.getItem(historyKey())||'[]');
      return Array.isArray(parsed)?parsed:[];
    }catch(_){return [];}
  }

  function writeBackupHistory(items){
    try{localStorage.setItem(historyKey(),JSON.stringify(items.slice(0,30)));}catch(_){}
  }

  function recordLocalBackup(){
    const user=typeof sesionActiva!=='undefined'?sesionActiva:null;
    const stamp=new Date();
    const filename='ca_crm_backup_'+stamp.toISOString().split('T')[0]+'.json';
    const entry={
      id:'bk_'+Date.now(),
      at:stamp.toISOString(),
      type:'Manual local',
      status:'Generado',
      filename,
      user:user?.nombre||'Usuario',
      clients:(store?.clientes||[]).length,
      leads:(store?.leads||[]).length,
      events:(store?.agenda||[]).length,
    };
    writeBackupHistory([entry,...readBackupHistory()]);
    return entry;
  }

  window.toggleAccountSection=function(key){
    if(!Object.prototype.hasOwnProperty.call(sectionOpen,key))return;
    sectionOpen[key]=!sectionOpen[key];
    if(typeof renderPage==='function')renderPage('cuenta');
  };

  window.cyaDescargarRespaldoLocal=function(){
    if(typeof isTechnicalAdmin==='function'&&!isTechnicalAdmin())return showToast?.('Acceso reservado al administrador técnico','warn');
    if(typeof exportar!=='function')return showToast?.('La función de respaldo no está disponible','warn');
    exportar();
    recordLocalBackup();
    if(typeof currentPage!=='undefined'&&currentPage==='cuenta')setTimeout(()=>renderPage('cuenta'),0);
  };

  function collapseCard(key,title,subtitle,body,extraClass=''){
    const open=Boolean(sectionOpen[key]);
    return `<section class="card account-section-card ${extraClass}">
      <button class="account-section-header" type="button" onclick="toggleAccountSection('${safe(key)}')" aria-expanded="${open}">
        <span class="account-section-heading"><span class="account-section-arrow">${open?'▾':'▸'}</span><span><strong>${safe(title)}</strong>${subtitle?`<small>${safe(subtitle)}</small>`:''}</span></span>
      </button>
      ${open?`<div class="account-section-body">${body}</div>`:''}
    </section>`;
  }

  function renderAccessCard(){
    const body=`<div class="account-setting-row">
      <div><div class="account-setting-title">Contraseña de acceso</div><div class="account-setting-help">Actualiza la contraseña de tu propia cuenta cuando lo necesites.</div></div>
      <button class="btn" onclick="document.getElementById('popup-pin-config').classList.add('open')">🔑 Cambiar contraseña</button>
    </div>`;
    return collapseCard('access','Acceso y seguridad','Contraseña y protección de tu cuenta',body);
  }

  function renderBackupHistory(){
    const items=readBackupHistory();
    const open=Boolean(sectionOpen.history);
    return `<div class="account-backup-history">
      <button class="account-history-header" type="button" onclick="toggleAccountSection('history')" aria-expanded="${open}">
        <span><span class="account-section-arrow">${open?'▾':'▸'}</span><strong>Historial de respaldos</strong></span>
        <span class="account-history-count">${items.length}</span>
      </button>
      ${open?`<div class="account-history-body">${items.length?items.map(item=>`
        <div class="account-history-row">
          <div class="account-history-main"><strong>${safe(item.type||'Respaldo')}</strong><span>${safe(typeof fmtDateTime==='function'?fmtDateTime(item.at):item.at)}</span></div>
          <div class="account-history-meta"><span>${safe(item.filename||'—')}</span><span>${Number(item.clients||0)} clientes · ${Number(item.leads||0)} prospectos · ${Number(item.events||0)} eventos</span></div>
          <span class="account-history-status">${safe(item.status||'Generado')}</span>
        </div>`).join(''):`<div class="account-history-empty">Aún no hay respaldos manuales registrados en este navegador.</div>`}</div>`:''}
    </div>`;
  }

  function renderBackupCard(){
    if(typeof isTechnicalAdmin!=='function'||!isTechnicalAdmin())return '';
    const body=`
      <div class="account-backup-intro">
        <div><strong>Respaldo manual de la organización</strong><p>Descarga una copia local de la información disponible en el CRM. La automatización externa se configurará en una fase posterior.</p></div>
        <span class="account-tech-badge">ADMIN TÉCNICO</span>
      </div>
      <div class="account-backup-actions">
        <button class="btn btn-primary account-backup-btn" onclick="cyaDescargarRespaldoLocal()"><span>⬇</span><span><strong>Descargar respaldo local</strong><small>Generar archivo JSON</small></span></button>
        <button class="btn account-backup-btn" onclick="importar()"><span>⬆</span><span><strong>Importar respaldo</strong><small>Seleccionar archivo JSON</small></span></button>
        ${typeof descargarCapturasPendientes==='function'?`<button class="btn account-backup-btn" onclick="descargarCapturasPendientes()"><span>◫</span><span><strong>Capturas pendientes</strong><small>Descargar cambios locales</small></span></button>`:''}
      </div>
      <input type="file" id="importar-input" accept=".json,application/json" hidden onchange="procesarImport(this)">
      <div class="account-backup-note">La restauración completa y los respaldos automáticos en almacenamiento externo se incorporarán en la siguiente etapa del proyecto.</div>
      ${renderBackupHistory()}`;
    return collapseCard('backup','Copias de seguridad','Respaldo manual y herramientas de recuperación',body,'account-backup-card');
  }

  function renderTechnicalBootstrap(){
    if(typeof canBootstrapTechnicalAdmin!=='function'||!canBootstrapTechnicalAdmin())return '';
    const body=`<div class="account-setting-row">
      <div><div class="account-setting-title">Separar la administración técnica</div><div class="account-setting-help">Crea una cuenta independiente para gestionar usuarios y configuración técnica. Tu cuenta actual conservará la operación y la vista Director.</div></div>
      <button class="btn btn-primary" onclick="abrirAltaTecnica()">Crear cuenta técnica</button>
    </div>`;
    return collapseCard('technical','Cuenta de administrador técnico','Administración independiente del CRM',body);
  }

  function renderAccount(){
    const user=sesionActiva;
    if(!user)return '';
    const role=roleLabel(user);
    const initialsText=typeof initials==='function'?initials(user.nombre):'?';
    return `<div class="account-page">
      <div class="account-page-heading"><div class="section-title">Mi cuenta</div><div class="section-sub">Perfil, acceso y herramientas personales del CRM</div></div>
      <section class="card account-profile-hero">
        <div class="account-profile-accent"></div>
        <div class="account-profile-content">
          <div class="account-profile-photo">${user.foto?`<img src="${safe(user.foto)}" alt="Foto de perfil de ${safe(user.nombre)}">`:`<span>${safe(initialsText)}</span>`}</div>
          <div class="account-profile-name">${safe(user.nombre)}</div>
          <div class="account-profile-role">${safe(role)}</div>
          <div class="account-profile-email">${safe(user.email||'Sin correo registrado')}</div>
          <div class="account-profile-actions">
            <label class="btn btn-primary" for="account-photo-file">📷 Cambiar foto</label>
            <input id="account-photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="guardarMiFoto(this)">
            <button class="btn" onclick="quitarMiFoto()" ${user.foto?'':'disabled'}>Quitar foto</button>
          </div>
          <div class="account-profile-helper">JPG, PNG o WebP · máximo 5 MB</div>
        </div>
      </section>
      <div class="account-sections">
        ${renderAccessCard()}
        ${renderBackupCard()}
        ${renderTechnicalBootstrap()}
      </div>
    </div>`;
  }

  if(!document.getElementById('cya-account-workspace-styles')){
    const style=document.createElement('style');
    style.id='cya-account-workspace-styles';
    style.textContent=`
      .account-page{width:100%;max-width:980px;margin:0 auto 40px;}
      .account-page-heading{margin-bottom:16px;}
      .account-profile-hero{width:100%;position:relative;overflow:hidden;margin-bottom:22px;}
      .account-profile-accent{height:52px;background:linear-gradient(90deg,#0f2744,#18395f 58%,#C9A96E);opacity:.96;}
      .account-profile-content{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 24px 28px;}
      .account-profile-photo{width:124px;height:124px;border-radius:50%;margin-top:-38px;border:5px solid var(--bg-card);background:linear-gradient(135deg,#1d4ed8,#0ea5e9);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.2);font-family:var(--font-display);font-size:34px;font-weight:700;color:#fff;}
      .account-profile-photo img{width:100%;height:100%;object-fit:cover;}
      .account-profile-name{font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-primary);margin-top:13px;line-height:1.1;}
      .account-profile-role{display:inline-flex;align-items:center;justify-content:center;margin-top:7px;padding:4px 10px;border-radius:999px;background:rgba(201,169,110,.13);border:1px solid rgba(201,169,110,.35);color:#C9A96E;font-size:10px;font-weight:700;letter-spacing:.65px;text-transform:uppercase;}
      .account-profile-email{margin-top:8px;font-size:12px;color:var(--text-muted);}
      .account-profile-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:18px;}
      .account-profile-helper{font-size:10px;color:var(--text-muted);margin-top:9px;}
      .account-sections{display:grid;gap:16px;}
      .account-section-card{overflow:hidden;}
      .account-section-header{width:100%;border:0;background:transparent;color:inherit;padding:15px 17px;display:flex;align-items:center;cursor:pointer;text-align:left;font:inherit;}
      .account-section-header:hover{background:var(--bg-hover);}
      .account-section-heading{display:flex;align-items:center;gap:9px;min-width:0;}
      .account-section-heading strong{display:block;font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--text-primary);letter-spacing:.25px;}
      .account-section-heading small{display:block;margin-top:2px;font-size:10px;font-weight:400;color:var(--text-muted);}
      .account-section-arrow{display:inline-flex;width:14px;justify-content:center;color:var(--text-muted);font-size:13px;flex:0 0 auto;}
      .account-section-body{padding:18px;border-top:1px solid var(--border);}
      .account-setting-row{display:flex;align-items:center;justify-content:space-between;gap:22px;}
      .account-setting-title{font-size:13px;font-weight:600;color:var(--text-primary);}
      .account-setting-help{font-size:11px;color:var(--text-muted);margin-top:4px;max-width:620px;line-height:1.5;}
      .account-backup-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:2px 0 16px;}
      .account-backup-intro strong{font-size:13px;}
      .account-backup-intro p{font-size:11px;color:var(--text-muted);line-height:1.5;margin-top:5px;max-width:650px;}
      .account-tech-badge{flex:0 0 auto;font-size:9px;font-weight:700;letter-spacing:.7px;color:#C9A96E;border:1px solid rgba(201,169,110,.34);background:rgba(201,169,110,.08);padding:5px 8px;border-radius:999px;}
      .account-backup-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:4px 0 16px;}
      .account-backup-btn{min-height:66px;justify-content:flex-start;text-align:left;padding:12px 14px;white-space:normal;gap:10px;}
      .account-backup-btn>span:first-child{font-size:18px;flex:0 0 auto;}
      .account-backup-btn strong{display:block;font-size:11px;line-height:1.25;}
      .account-backup-btn small{display:block;margin-top:3px;font-size:9px;font-weight:400;color:inherit;opacity:.72;line-height:1.3;}
      .account-backup-note{padding:10px 12px;border-radius:var(--radius-sm);background:var(--bg-secondary);font-size:10px;line-height:1.45;color:var(--text-muted);margin-bottom:16px;}
      .account-backup-history{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
      .account-history-header{width:100%;border:0;background:var(--bg-secondary);color:inherit;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;font:inherit;}
      .account-history-header>span:first-child{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary);}
      .account-history-count{min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:var(--bg-hover);display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-muted);}
      .account-history-body{border-top:1px solid var(--border);}
      .account-history-row{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(260px,1.5fr) auto;gap:14px;align-items:center;padding:11px 12px;border-bottom:1px solid var(--border);}
      .account-history-row:last-child{border-bottom:0;}
      .account-history-main,.account-history-meta{display:flex;flex-direction:column;gap:3px;min-width:0;}
      .account-history-main strong{font-size:11px;color:var(--text-primary);}
      .account-history-main span,.account-history-meta span{font-size:9px;color:var(--text-muted);overflow-wrap:anywhere;}
      .account-history-status{font-size:9px;font-weight:700;color:var(--success);background:rgba(16,185,129,.10);padding:4px 7px;border-radius:999px;}
      .account-history-empty{padding:14px 12px;font-size:10px;color:var(--text-muted);text-align:center;}
      @media(max-width:760px){
        .account-profile-accent{height:44px;}
        .account-profile-photo{width:106px;height:106px;margin-top:-31px;font-size:30px;}
        .account-profile-content{padding-left:16px;padding-right:16px;}
        .account-setting-row,.account-backup-intro{align-items:stretch;flex-direction:column;}
        .account-backup-actions{grid-template-columns:1fr;gap:10px;}
        .account-history-row{grid-template-columns:1fr;gap:6px;}
        .account-history-status{justify-self:start;}
      }
    `;
    document.head.appendChild(style);
  }

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    if(typeof renderMiCuenta!=='function'||typeof guardarMiFoto!=='function'||typeof quitarMiFoto!=='function'||typeof renderPage!=='function'){
      if(attempts>240)clearInterval(installer);
      return;
    }
    if(window.__cyaAccountWorkspaceInstalled){clearInterval(installer);return;}
    window.__cyaAccountWorkspaceInstalled=true;
    clearInterval(installer);
    renderMiCuenta=renderAccount;
    if(typeof currentPage!=='undefined'&&currentPage==='cuenta')renderPage('cuenta');
  },25);
})();
