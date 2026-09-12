/* Technical settings workspace: grouped accordions, office cards and uppercase data. */
(function installTechnicalConfigWorkspace(){
  if(window.__cyaTechnicalConfigWorkspaceLoaded)return;
  window.__cyaTechnicalConfigWorkspaceLoaded=true;

  const escValue=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'');
  const SECTION_DEFAULTS={appearance:true,account:false,offices:true,catalogs:false,data:false,advanced:false};
  const sectionState={...SECTION_DEFAULTS};
  let openOfficeId=null;
  let editingOfficeId=null;
  let matrixOpen=false;
  let matrixEditing=false;

  try{
    const saved=JSON.parse(localStorage.getItem('cya_config_sections')||'{}');
    Object.assign(sectionState,saved||{});
  }catch(e){}

  function upper(value){return String(value??'').trim().toLocaleUpperCase('es-MX');}
  function normalize(value){return upper(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
  function stateLabel(value){
    const raw=upper(value);
    if(raw==='QUERÉTARO'||raw==='QUERETARO')return 'Querétaro';
    if(raw==='HIDALGO')return 'Hidalgo';
    return raw.toLocaleLowerCase('es-MX').replace(/(^|\s)([a-záéíóúüñ])/g,(_,s,c)=>s+c.toLocaleUpperCase('es-MX'));
  }
  function inferState(office){
    const text=normalize(`${office?.estado||''} ${office?.ciudad||''} ${office?.domicilio||''}`);
    if(text.includes('HIDALGO'))return 'HIDALGO';
    if(text.includes('QUERETARO'))return 'QUERÉTARO';
    return upper(office?.estado||'');
  }

  function ensureOfficeModel(){
    if(!store.configuracion)store.configuracion={};
    const offices=Array.isArray(store.configuracion.oficinas)?store.configuracion.oficinas:[];
    store.configuracion.oficinas=offices.map((office,index)=>({
      ...office,
      id:String(office.id||`office_${index}_${Date.now()}`),
      nombre:upper(office.nombre||`OFICINA ${index+1}`),
      encargado:upper(office.encargado||''),
      domicilio:upper(office.domicilio||''),
      ciudad:upper(office.ciudad||''),
      estado:inferState(office),
    }));
    for(const key of ['empresa_nombre','empresa_representante','empresa_domicilio','ciudad_contrato']){
      if(store.configuracion[key]!=null)store.configuracion[key]=upper(store.configuracion[key]);
    }
  }

  async function persistConfig(successMessage){
    ensureOfficeModel();
    try{
      if(typeof saveStore==='function')saveStore();
      if(typeof cloudSyncNow==='function')await cloudSyncNow({throwOnError:true});
      if(successMessage)showToast?.(successMessage,'success');
      return true;
    }catch(error){
      showToast?.('No se pudo guardar la configuración: '+error.message,'warn');
      return false;
    }
  }

  window.cyaConfigUpper=function(input){
    if(!input)return;
    const start=input.selectionStart,end=input.selectionEnd;
    input.value=String(input.value||'').toLocaleUpperCase('es-MX');
    try{input.setSelectionRange(start,end);}catch(e){}
  };

  window.cyaToggleConfigSection=function(key){
    sectionState[key]=!sectionState[key];
    try{localStorage.setItem('cya_config_sections',JSON.stringify(sectionState));}catch(e){}
    renderPage('configuracion');
  };

  function accordion(key,title,subtitle,body,extraClass=''){
    const open=sectionState[key]!==false;
    return `<section class="cya-config-section ${extraClass}">
      <button class="cya-config-section-head" type="button" onclick="cyaToggleConfigSection('${key}')" aria-expanded="${open}">
        <span class="cya-config-section-arrow">${open?'▾':'▸'}</span>
        <span class="cya-config-section-copy"><strong>${escValue(title)}</strong><small>${escValue(subtitle)}</small></span>
      </button>
      ${open?`<div class="cya-config-section-body">${body}</div>`:''}
    </section>`;
  }

  function fieldView(label,value){
    return `<div class="cya-office-field-view"><span>${escValue(label)}</span><strong>${escValue(value||'—')}</strong></div>`;
  }
  function inputField(id,label,value,textarea=false){
    const common=`id="${id}" class="${textarea?'form-textarea':'form-input'} cya-uppercase-input" oninput="cyaConfigUpper(this)"`;
    return `<div class="form-group"><label class="form-label" for="${id}">${escValue(label)}</label>${textarea?`<textarea ${common} rows="3">${escValue(value||'')}</textarea>`:`<input ${common} value="${escValue(value||'')}">`}</div>`;
  }

  function matrixCard(){
    const cfg=store.configuracion||{};
    const summary=[cfg.empresa_nombre,cfg.ciudad_contrato].filter(Boolean).join(' · ');
    let body='';
    if(matrixOpen){
      body=matrixEditing?`<div class="cya-office-editor cya-matrix-editor">
        <div class="form-row">${inputField('cya-matrix-name','RAZÓN / NOMBRE',cfg.empresa_nombre)}${inputField('cya-matrix-rep','REPRESENTANTE',cfg.empresa_representante)}</div>
        ${inputField('cya-matrix-address','DIRECCIÓN DE LA EMPRESA / OFICINA MATRIZ',cfg.empresa_domicilio,true)}
        ${inputField('cya-matrix-city','CIUDAD DE LA OFICINA MATRIZ',cfg.ciudad_contrato)}
        <div class="cya-office-actions"><button class="btn" type="button" onclick="cyaCancelarMatriz(event)">Cancelar</button><button class="btn btn-primary" type="button" onclick="cyaGuardarMatriz(event)">Guardar</button></div>
      </div>`:`<div class="cya-office-details">
        <div class="cya-office-details-grid">${fieldView('RAZÓN / NOMBRE',cfg.empresa_nombre)}${fieldView('REPRESENTANTE',cfg.empresa_representante)}${fieldView('DIRECCIÓN',cfg.empresa_domicilio)}${fieldView('CIUDAD',cfg.ciudad_contrato)}</div>
        <div class="cya-office-actions"><button class="btn btn-primary" type="button" onclick="cyaEditarMatriz(event)">Editar</button></div>
      </div>`;
    }
    return `<article class="card cya-matrix-card ${matrixOpen?'is-open':''}" onclick="cyaToggleMatriz(event)">
      <div class="cya-matrix-summary"><div><span class="cya-office-kicker">OFICINA MATRIZ</span><strong>${escValue(cfg.empresa_nombre||'DATOS DE LA EMPRESA')}</strong><small>${escValue(summary||'CONFIGURA LOS DATOS CORPORATIVOS')}</small></div><span class="cya-office-chevron">${matrixOpen?'▴':'▾'}</span></div>
      ${body}
    </article>`;
  }

  window.cyaToggleMatriz=function(event){
    if(event?.target?.closest('button,input,textarea,select,label'))return;
    matrixOpen=!matrixOpen;
    if(!matrixOpen)matrixEditing=false;
    renderPage('configuracion');
  };
  window.cyaEditarMatriz=function(event){event?.stopPropagation();matrixOpen=true;matrixEditing=true;renderPage('configuracion');};
  window.cyaCancelarMatriz=function(event){event?.stopPropagation();matrixEditing=false;renderPage('configuracion');};
  window.cyaGuardarMatriz=async function(event){
    event?.stopPropagation();
    const name=upper(getVal('cya-matrix-name')),rep=upper(getVal('cya-matrix-rep')),address=upper(getVal('cya-matrix-address')),city=upper(getVal('cya-matrix-city'));
    if(!name||!address||!city)return showToast?.('RAZÓN / NOMBRE, DIRECCIÓN Y CIUDAD SON OBLIGATORIOS','warn');
    Object.assign(store.configuracion,{empresa_nombre:name,empresa_representante:rep,empresa_domicilio:address,ciudad_contrato:city});
    if(await persistConfig('DATOS DE OFICINA MATRIZ GUARDADOS')){matrixEditing=false;matrixOpen=true;renderPage('configuracion');}
  };

  function officeCard(office){
    const opened=openOfficeId===office.id;
    const editing=editingOfficeId===office.id;
    let details='';
    if(opened){
      details=editing?`<div class="cya-office-editor">
        ${inputField(`cya-office-name-${office.id}`,'NOMBRE DE LA OFICINA',office.nombre)}
        ${inputField(`cya-office-manager-${office.id}`,'ENCARGADO DE OFICINA',office.encargado)}
        ${inputField(`cya-office-address-${office.id}`,'DIRECCIÓN DE LA OFICINA',office.domicilio,true)}
        <div class="form-row">${inputField(`cya-office-city-${office.id}`,'CIUDAD DE LA OFICINA',office.ciudad)}${inputField(`cya-office-state-${office.id}`,'ESTADO DE LA OFICINA',office.estado)}</div>
        <div class="cya-office-actions"><button class="btn" type="button" onclick="cyaCancelarEdicionOficina('${office.id}',event)">Cancelar</button><button class="btn btn-primary" type="button" onclick="cyaGuardarOficina('${office.id}',event)">Guardar</button></div>
      </div>`:`<div class="cya-office-details">
        <div class="cya-office-details-grid">${fieldView('ENCARGADO DE OFICINA',office.encargado)}${fieldView('DIRECCIÓN DE LA OFICINA',office.domicilio)}${fieldView('CIUDAD DE LA OFICINA',office.ciudad)}${fieldView('ESTADO DE LA OFICINA',office.estado)}</div>
        <div class="cya-office-actions"><button class="btn btn-primary" type="button" onclick="cyaEditarOficina('${office.id}',event)">Editar</button></div>
      </div>`;
    }
    return `<article class="card cya-office-card ${opened?'is-open':''}" onclick="cyaToggleOficina('${office.id}',event)">
      <div class="cya-office-card-summary"><div class="cya-office-card-title"><span>OFICINA</span><strong>${escValue(String(office.nombre||'OFICINA').replace(/^OFICINA\s+/i,''))}</strong></div><span class="cya-office-chevron">${opened?'▴':'▾'}</span></div>
      ${details}
    </article>`;
  }

  function officesWorkspace(){
    ensureOfficeModel();
    const offices=store.configuracion.oficinas||[];
    return `<div class="cya-offices-workspace">${matrixCard()}<div class="cya-offices-grid">${offices.map(officeCard).join('')}</div><div class="cya-add-office-wrap"><button class="btn cya-add-office" type="button" onclick="cyaAgregarOficina()">+ Agregar oficina</button></div></div>`;
  }

  window.cyaToggleOficina=function(id,event){
    if(event?.target?.closest('button,input,textarea,select,label'))return;
    openOfficeId=openOfficeId===id?null:id;
    if(openOfficeId!==id)editingOfficeId=null;
    renderPage('configuracion');
  };
  window.cyaEditarOficina=function(id,event){event?.stopPropagation();openOfficeId=id;editingOfficeId=id;renderPage('configuracion');};
  window.cyaCancelarEdicionOficina=function(id,event){
    event?.stopPropagation();
    const office=(store.configuracion.oficinas||[]).find(x=>x.id===id);
    if(office?._cyaNew)store.configuracion.oficinas=store.configuracion.oficinas.filter(x=>x.id!==id);
    editingOfficeId=null;
    openOfficeId=office?._cyaNew?null:id;
    renderPage('configuracion');
  };
  window.cyaAgregarOficina=function(){
    ensureOfficeModel();
    const id=`office_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    store.configuracion.oficinas.push({id,nombre:'NUEVA OFICINA',encargado:'',domicilio:'',ciudad:'',estado:'',_cyaNew:true});
    openOfficeId=id;editingOfficeId=id;sectionState.offices=true;renderPage('configuracion');
  };
  window.cyaGuardarOficina=async function(id,event){
    event?.stopPropagation();
    const office=(store.configuracion.oficinas||[]).find(x=>x.id===id);if(!office)return;
    const name=upper(getVal(`cya-office-name-${id}`)),manager=upper(getVal(`cya-office-manager-${id}`)),address=upper(getVal(`cya-office-address-${id}`)),city=upper(getVal(`cya-office-city-${id}`)),state=upper(getVal(`cya-office-state-${id}`));
    if(!name||!address||!city||!state)return showToast?.('NOMBRE, DIRECCIÓN, CIUDAD Y ESTADO SON OBLIGATORIOS','warn');
    Object.assign(office,{nombre:name.startsWith('OFICINA ')?name:`OFICINA ${name}`,encargado:manager,domicilio:address,ciudad:city,estado:state});
    delete office._cyaNew;
    if(await persistConfig('OFICINA GUARDADA')){editingOfficeId=null;openOfficeId=id;renderPage('configuracion');}
  };

  function classifyCards(html){
    const tpl=document.createElement('template');tpl.innerHTML=String(html||'');
    const cards=[...tpl.content.querySelectorAll('.card')].filter(el=>!el.parentElement?.closest('.card'));
    const groups={appearance:[],account:[],catalogs:[],data:[],advanced:[]};
    for(const card of cards){
      const text=normalize(card.textContent||'');
      const hasOldOffice=Boolean(card.querySelector('[id^="cfg-empresa-"],#cfg-ciudad-contrato,[id*="oficina"]'))||(/DATOS DE LA EMPRESA|OFICINAS/.test(text)&&!card.classList.contains('cya-customization-card'));
      if(hasOldOffice)continue;
      const out=card.outerHTML;
      if(card.classList.contains('cya-customization-card')||/LOGO DE LA EMPRESA|APARIENCIA Y MENSAJES|IDENTIDAD/.test(text))groups.appearance.push(out);
      else if(/MI ACCESO|CONTRASENA|SEGURIDAD|BLOQUEO DE FIRMA|ACCESO/.test(text))groups.account.push(out);
      else if(/DIRECTORIO AFORE|CATALOGO|DIRECTORIO/.test(text))groups.catalogs.push(out);
      else if(/DATOS DEL SISTEMA|BACKUP|RESPALDO|REPOSITORIO|EXPORTAR DATOS|IMPORTAR/.test(text))groups.data.push(out);
      else groups.advanced.push(out);
    }
    return groups;
  }

  function grid(items,wide=false){
    if(!items.length)return '<div class="cya-config-empty">SIN OPCIONES ADICIONALES EN ESTA SECCIÓN.</div>';
    return `<div class="cya-config-grid ${wide?'is-wide':''}">${items.map(item=>`<div class="cya-config-grid-item">${item}</div>`).join('')}</div>`;
  }

  function renderWorkspace(baseHtml){
    ensureOfficeModel();
    const groups=classifyCards(baseHtml);
    return `<div class="cya-config-workspace">
      <div class="cya-config-page-heading"><div class="section-title">Configuración</div><div class="section-sub">Administración general, apariencia y operación del CRM</div></div>
      ${accordion('appearance','Identidad y apariencia','Logo, banners y mensajes visuales del CRM',grid(groups.appearance))}
      ${accordion('account','Cuenta y seguridad','Acceso del administrador técnico y controles de seguridad',grid(groups.account))}
      ${accordion('offices','Oficinas y datos de la empresa','Oficina matriz y sedes operativas utilizadas por contratos y documentos',officesWorkspace(),'cya-offices-section')}
      ${accordion('catalogs','Directorios y catálogos','Referencias operativas y Directorio AFORE',grid(groups.catalogs,true))}
      ${accordion('data','Datos y respaldos','Exportación, respaldos e información del sistema',grid(groups.data))}
      ${accordion('advanced','Configuración avanzada','Parámetros técnicos y opciones de mantenimiento',grid(groups.advanced))}
    </div>`;
  }

  const style=document.createElement('style');style.id='cya-technical-config-workspace-styles';style.textContent=`
    .cya-config-workspace{width:100%;max-width:1400px;margin:0 auto 42px;}
    .cya-config-page-heading{margin-bottom:16px;}
    .cya-config-section{border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);margin-bottom:14px;overflow:hidden;}
    .cya-config-section-head{width:100%;border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:11px;padding:15px 17px;cursor:pointer;text-align:left;font:inherit;}
    .cya-config-section-head:hover{background:var(--bg-hover);}
    .cya-config-section-arrow{width:16px;flex:0 0 16px;color:var(--text-muted);font-size:14px;text-align:center;}
    .cya-config-section-copy strong{display:block;font-family:var(--font-display);font-size:14px;letter-spacing:.25px;color:var(--text-primary);}
    .cya-config-section-copy small{display:block;margin-top:3px;font-size:10px;color:var(--text-muted);font-weight:400;}
    .cya-config-section-body{border-top:1px solid var(--border);padding:16px;}
    .cya-config-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;}
    .cya-config-grid.is-wide{grid-template-columns:1fr;}
    .cya-config-grid-item>.card,.cya-config-grid-item>section.card{margin:0!important;width:100%!important;max-width:none!important;}
    .cya-config-empty{font-size:11px;color:var(--text-muted);padding:7px 2px;}
    .cya-offices-workspace{display:grid;gap:15px;}
    .cya-matrix-card,.cya-office-card{margin:0!important;max-width:none!important;overflow:hidden;box-shadow:none!important;cursor:pointer;transition:border-color .16s ease,background .16s ease;}
    .cya-matrix-card:hover,.cya-office-card:hover{border-color:var(--border-strong);}
    .cya-matrix-card.is-open,.cya-office-card.is-open{border-color:rgba(201,169,110,.48);}
    .cya-matrix-summary{min-height:88px;padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;}
    .cya-matrix-summary>div{min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;}
    .cya-office-kicker{font-size:9px;letter-spacing:1.3px;color:#C9A96E;font-weight:700;}
    .cya-matrix-summary strong{font-family:var(--font-display);font-size:18px;color:var(--text-primary);margin-top:4px;}
    .cya-matrix-summary small{font-size:10px;color:var(--text-muted);margin-top:5px;max-width:900px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cya-office-chevron{flex:0 0 auto;color:var(--text-muted);font-size:14px;}
    .cya-offices-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start;}
    .cya-office-card-summary{min-height:112px;padding:17px;display:flex;align-items:center;justify-content:center;position:relative;}
    .cya-office-card-title{text-align:center;display:flex;flex-direction:column;gap:4px;}
    .cya-office-card-title span{font-size:10px;letter-spacing:1.5px;color:var(--text-muted);font-weight:600;}
    .cya-office-card-title strong{font-family:var(--font-display);font-size:20px;color:var(--text-primary);letter-spacing:.35px;}
    .cya-office-card-summary .cya-office-chevron{position:absolute;right:15px;top:50%;transform:translateY(-50%);}
    .cya-office-details,.cya-office-editor{border-top:1px solid var(--border);padding:15px;cursor:default;}
    .cya-office-details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
    .cya-office-field-view{background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 11px;min-width:0;}
    .cya-office-field-view span{display:block;font-size:9px;color:var(--text-muted);letter-spacing:.4px;margin-bottom:4px;}
    .cya-office-field-view strong{display:block;font-size:11px;color:var(--text-primary);line-height:1.45;overflow-wrap:anywhere;}
    .cya-office-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:14px;}
    .cya-uppercase-input{text-transform:uppercase;}
    .cya-add-office-wrap{display:flex;justify-content:center;padding:2px 0 0;}
    .cya-add-office{min-width:190px;}
    .cya-matrix-editor .form-row,.cya-office-editor .form-row{margin-bottom:0;}
    @media(max-width:1050px){.cya-offices-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media(max-width:800px){.cya-config-grid,.cya-offices-grid,.cya-office-details-grid{grid-template-columns:1fr;}.cya-config-section-body{padding:12px;}.cya-matrix-summary{min-height:82px;padding:13px}.cya-matrix-summary small{white-space:normal}.cya-office-card-summary{min-height:92px}.cya-office-card-title strong{font-size:18px;}}
  `;document.head.appendChild(style);

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=typeof renderConfiguracion==='function'&&typeof renderPage==='function'&&typeof cloudSyncNow==='function'&&window.__cyaDashboardCustomizationInstalled;
    if(!ready){if(attempts>500)clearInterval(installer);return;}
    if(window.__cyaTechnicalConfigWorkspaceInstalled){clearInterval(installer);return;}
    window.__cyaTechnicalConfigWorkspaceInstalled=true;clearInterval(installer);
    ensureOfficeModel();

    const baseRender=renderConfiguracion;
    renderConfiguracion=function(){return renderWorkspace(baseRender.apply(this,arguments));};

    if(typeof estadoOficinaContrato==='function'){
      const baseOfficeState=estadoOficinaContrato;
      estadoOficinaContrato=function(){
        try{
          const city=normalize(document.getElementById('ct-word-ciudad')?.value||'');
          const address=normalize(document.getElementById('ct-word-empresa-dom')?.value||'');
          const offices=store?.configuracion?.oficinas||[];
          const office=offices.find(o=>{
            const oc=normalize(o.ciudad||''),oa=normalize(o.domicilio||'');
            return (city&&oc&&(city===oc||city.includes(oc)||oc.includes(city)))||(address&&oa&&(address===oa||address.includes(oa)||oa.includes(address)));
          });
          if(office?.estado)return stateLabel(office.estado);
        }catch(e){}
        return baseOfficeState.apply(this,arguments);
      };
    }

    if(typeof currentPage!=='undefined'&&currentPage==='configuracion')renderPage('configuracion');
  },30);
})();
