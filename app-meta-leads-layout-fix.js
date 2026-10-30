/* Final layout/count alignment for Meta Leads prospect board. */
(function installMetaLeadsLayoutFix(){
  if(window.__cyaMetaLeadsLayoutFixInstalled)return;
  window.__cyaMetaLeadsLayoutFixInstalled=true;

  function visibleCardCount(col){
    const body=col?.querySelector(':scope > .lead-col-body');
    return body?body.querySelectorAll(':scope > .lead-card').length:0;
  }

  function updateStageCounter(col){
    if(!col||col.id==='cya-meta-new-column')return;
    const header=col.querySelector(':scope > .lead-col-header');
    if(!header)return;
    const spans=[...header.querySelectorAll(':scope > span')];
    if(spans.length<2)return;
    const counter=spans[spans.length-1];
    if(!/^\d+$/.test(String(counter.textContent||'').trim()))return;
    counter.textContent=String(visibleCardCount(col));
    counter.classList.add('cya-stage-count');
  }

  function apply(){
    const kanban=document.querySelector('.leads-kanban');
    if(!kanban)return;

    /* Keep the five main board areas proportional and visually consistent. */
    kanban.classList.add('cya-meta-board-grid');
    kanban.style.gridTemplateColumns='repeat(5,minmax(220px,1fr))';

    kanban.querySelectorAll('.lead-col').forEach(updateStageCounter);

    const meta=document.getElementById('cya-meta-new-column');
    if(meta){
      meta.style.width='auto';
      meta.style.minWidth='0';
      meta.style.maxWidth='none';
    }

    const stack=kanban.querySelector(':scope > .cya-special-leads-stack');
    if(stack){
      stack.style.width='auto';
      stack.style.minWidth='0';
      stack.style.maxWidth='none';
    }

    kanban.querySelectorAll('.cya-special-leads-stack > .lead-col').forEach(col=>{
      const header=col.querySelector(':scope > .lead-col-header');
      if(!header)return;
      const spans=[...header.querySelectorAll(':scope > span')];
      if(spans.length>1)spans[spans.length-1].classList.add('cya-stage-count');
    });
  }

  const style=document.createElement('style');
  style.id='cya-meta-leads-layout-fix-styles';
  style.textContent=`
    .leads-kanban.cya-meta-board-grid{grid-template-columns:repeat(5,minmax(220px,1fr))!important;align-items:start!important;}
    .cya-special-leads-stack{width:auto!important;min-width:0!important;max-width:none!important;}
    .cya-special-leads-stack .lead-col-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;}
    .cya-special-leads-stack .lead-col-header>span:first-child{min-width:0;flex:1 1 auto;}
    .cya-special-leads-stack .lead-col-header>.cya-stage-count{margin-left:auto!important;flex:0 0 auto!important;}
    .cya-special-leads-stack .lead-col-header::after{flex:0 0 auto;margin-left:0!important;}
    #cya-meta-new-column{width:auto!important;min-width:0!important;max-width:none!important;}
    #cya-meta-new-column .lead-col-body{padding-left:10px;padding-right:10px;}
    #cya-meta-new-column .lead-card{width:100%;box-sizing:border-box;}
    @media(max-width:1100px){
      .leads-kanban.cya-meta-board-grid{grid-template-columns:repeat(5,minmax(210px,1fr))!important;}
    }
    @media(max-width:700px){
      .leads-kanban.cya-meta-board-grid{grid-template-columns:repeat(5,220px)!important;}
      #cya-meta-new-column{width:auto!important;min-width:0!important;}
    }
  `;
  document.head.appendChild(style);

  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply();});
  }).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(apply,0);
  setTimeout(apply,150);
})();

/* Reactivation flow for discarded clients.
   Reuses the existing profile action, preserves the discard history and lets the
   advisor choose between reopening the client with a fresh registration date or
   returning the record to Prospects. */
(function installDiscardedClientReactivation(){
  if(window.__cyaDiscardedClientReactivationInstalled)return;
  window.__cyaDiscardedClientReactivationInstalled=true;

  let reactivationClientId=null;
  const clientById=id=>(window.store?.clientes||[]).find(c=>String(c.id)===String(id));
  const clone=value=>{
    try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
    catch(_){return JSON.parse(JSON.stringify(value));}
  };
  const localDate=()=>{
    const d=new Date();
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const safe=value=>typeof escapeHTMLBasico==='function'?escapeHTMLBasico(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function suggestedProspectStage(c){
    if(c?.servicio==='asesoria_pension')return 'pensiones';
    if(c?.servicio==='correccion_imss')return 'correccion_imss';
    return 'semanas';
  }

  function ensureModal(){
    if(document.getElementById('cya-reactivar-cliente-modal'))return;
    const modal=document.createElement('div');
    modal.id='cya-reactivar-cliente-modal';
    modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal" style="max-width:620px;" role="dialog" aria-modal="true" aria-labelledby="cya-reactivar-title">
      <div class="modal-header">
        <div><div class="modal-title" id="cya-reactivar-title">Reactivar cliente</div><div id="cya-reactivar-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;"></div></div>
        <button class="btn btn-icon" type="button" onclick="cyaCerrarReactivacionCliente()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">¿Cómo deseas continuar? <span>*</span></label>
          <select class="form-select" id="cya-reactivar-destino" onchange="cyaToggleDestinoReactivacion()">
            <option value="cliente">Reactivar como cliente</option>
            <option value="prospecto">Regresar a prospectos</option>
          </select>
          <div class="form-helper">Como cliente conserva su etapa actual. Como prospecto vuelve al tablero para una nueva revisión.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Nueva fecha de registro <span>*</span></label>
          <input class="form-input" id="cya-reactivar-fecha" type="date">
          <div class="form-helper">La fecha anterior se conservará en el historial del expediente.</div>
        </div>
        <div class="form-group" id="cya-reactivar-etapa-wrap" style="display:none;">
          <label class="form-label">Etapa de destino en Prospectos</label>
          <select class="form-select" id="cya-reactivar-etapa">
            <option value="pensiones">Pensiones</option>
            <option value="correccion_imss">Corrección ante IMSS</option>
            <option value="semanas">En revisión de semanas / NSS</option>
            <option value="sindos">En revisión de SINDOs</option>
            <option value="aprobado">Aprobado</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nota de reactivación</label>
          <textarea class="form-textarea" id="cya-reactivar-notas" placeholder="Ej. El cliente retomó contacto y desea continuar."></textarea>
        </div>
        <div id="cya-reactivar-causa" style="padding:10px 12px;border:1px solid var(--border);border-radius:7px;background:var(--bg-secondary);font-size:11px;color:var(--text-secondary);"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" type="button" onclick="cyaCerrarReactivacionCliente()">Cancelar</button>
        <button class="btn btn-primary" id="cya-reactivar-confirmar" type="button" onclick="cyaConfirmarReactivacionCliente()">Reactivar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }

  window.cyaToggleDestinoReactivacion=function(){
    const prospect=document.getElementById('cya-reactivar-destino')?.value==='prospecto';
    const wrap=document.getElementById('cya-reactivar-etapa-wrap');
    if(wrap)wrap.style.display=prospect?'':'none';
    const btn=document.getElementById('cya-reactivar-confirmar');
    if(btn)btn.textContent=prospect?'Regresar a prospectos':'Reactivar como cliente';
  };

  window.cyaAbrirReactivacionCliente=function(id){
    const c=clientById(id);
    if(!c||!c.descartado){showToast?.('Este expediente no está descartado','info');return;}
    ensureModal();
    reactivationClientId=c.id;
    const fecha=document.getElementById('cya-reactivar-fecha');if(fecha)fecha.value=localDate();
    const destino=document.getElementById('cya-reactivar-destino');if(destino)destino.value='cliente';
    const etapa=document.getElementById('cya-reactivar-etapa');if(etapa)etapa.value=suggestedProspectStage(c);
    const notas=document.getElementById('cya-reactivar-notas');if(notas)notas.value='';
    const sub=document.getElementById('cya-reactivar-sub');if(sub)sub.textContent=String(c.nombre||'Cliente');
    const causa=document.getElementById('cya-reactivar-causa');
    if(causa)causa.innerHTML=`<strong>Descarte anterior:</strong> ${safe(c.causaDescarte||'Sin causa registrada')}${c.fechaDescarte?` · ${safe(typeof fmtDate==='function'?fmtDate(c.fechaDescarte):c.fechaDescarte)}`:''}`;
    window.cyaToggleDestinoReactivacion();
    document.getElementById('cya-reactivar-cliente-modal')?.classList.add('open');
  };

  window.cyaCerrarReactivacionCliente=function(){
    document.getElementById('cya-reactivar-cliente-modal')?.classList.remove('open');
    reactivationClientId=null;
  };

  async function syncOrThrow(){
    if(typeof cloudSyncNow==='function')await cloudSyncNow({throwOnError:true});
  }

  window.cyaConfirmarReactivacionCliente=async function(){
    const c=clientById(reactivationClientId);
    if(!c||!c.descartado){showToast?.('No se encontró el cliente descartado','warn');return;}
    const destino=document.getElementById('cya-reactivar-destino')?.value||'cliente';
    const fecha=document.getElementById('cya-reactivar-fecha')?.value||localDate();
    const notas=String(document.getElementById('cya-reactivar-notas')?.value||'').trim();
    const now=new Date().toISOString();
    const previousCause=c.causaDescarte||'';
    const previousDiscardDate=c.fechaDescarte||'';
    const previousRegistration=c.fechaRegistro||'';
    const button=document.getElementById('cya-reactivar-confirmar');
    if(button){button.disabled=true;button.textContent='Guardando...';}

    if(destino==='cliente'){
      const before=clone(c);
      try{
        if(!c.fechaRegistroOriginal)c.fechaRegistroOriginal=previousRegistration;
        c.descartado=false;
        c.archivado=false;
        c.devueltoAProspectos=false;
        c.fechaRegistro=`${fecha}T12:00:00`;
        c.fechaReactivacion=now;
        c.fechaUltimoReingreso=fecha;
        c.historialReactivaciones=[...(Array.isArray(c.historialReactivaciones)?c.historialReactivaciones:[]),{
          fecha:now,destino:'cliente',fechaRegistroNueva:fecha,fechaRegistroAnterior:previousRegistration,
          causaDescarte:previousCause,fechaDescarte:previousDiscardDate,notas
        }];
        if(typeof addHist==='function')addHist(c,'reactivacion',`Reactivado como cliente${notas?' — '+notas:''}`);
        saveStore?.();
        await syncOrThrow();
        window.cyaCerrarReactivacionCliente();
        closeModal?.('modal-perfil');
        renderPage?.('clientes');
        showToast?.('Cliente reactivado con la nueva fecha de registro','success');
      }catch(error){
        Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,before);
        try{saveStore?.();}catch(_){ }
        showToast?.('No se pudo sincronizar la reactivación. No se modificó el expediente.','warn');
      }finally{
        if(button){button.disabled=false;button.textContent='Reactivar como cliente';}
      }
      return;
    }

    const beforeClients=clone(store.clientes||[]);
    const beforeLeads=clone(store.leads||[]);
    const beforeAgenda=clone(store.agenda||[]);
    try{
      const etapa=document.getElementById('cya-reactivar-etapa')?.value||suggestedProspectStage(c);
      const lead={
        id:'lead_'+Date.now(),
        nombre:c.nombre||'',telefono:c.telefono||'',curp:c.curp||'',email:c.email||c.correo||'',ciudad:c.ciudad||c.municipio||'',
        servicio:c.servicio||'retiro_desempleo',estado:etapa,
        colaboradorId:c.colaboradorId||null,asesorId:c.asesorId||sesionActiva?.id||null,
        notas:`REACTIVADO DESDE CLIENTES DESCARTADOS${notas?' — '+notas:''}${c.notas?'\n'+c.notas:''}`,
        fechaInicio:`${fecha}T12:00:00`,fechaRegistro:`${fecha}T12:00:00`,origenClienteId:c.id,
        historialClienteOrigen:[...(Array.isArray(c.historial)?c.historial:[])],
        historialReactivaciones:[...(Array.isArray(c.historialReactivaciones)?c.historialReactivaciones:[]),{
          fecha:now,destino:'prospecto',fechaRegistroNueva:fecha,fechaRegistroAnterior:previousRegistration,
          causaDescarte:previousCause,fechaDescarte:previousDiscardDate,notas
        }],
        fuenteContacto:c.fuenteContacto||c.fuente||c.origen?.fuente||'',
        metaAds:c.metaAds===true,
        metaLead:c.metaLead||undefined,
        origenMeta:c.origenMeta||undefined,
        nombreMeta:c.nombreMeta||undefined,
        nss:c.nss||'',afore:c.afore||'',domicilio:c.domicilio||''
      };
      store.leads.push(lead);
      store.clientes=store.clientes.filter(x=>String(x.id)!==String(c.id));
      store.agenda=(store.agenda||[]).filter(e=>String(e.clienteId||'')!==String(c.id));
      saveStore?.();
      await syncOrThrow();
      window.cyaCerrarReactivacionCliente();
      closeModal?.('modal-perfil');
      showToast?.('Cliente regresado a Prospectos con una nueva fecha de registro','success');
      navigate?.('leads',document.querySelector('[data-page="leads"]'));
    }catch(error){
      store.clientes=beforeClients;store.leads=beforeLeads;store.agenda=beforeAgenda;
      try{saveStore?.();}catch(_){ }
      showToast?.('No se pudo sincronizar el regreso a Prospectos. No se modificó el expediente.','warn');
    }finally{
      if(button){button.disabled=false;button.textContent='Regresar a prospectos';}
    }
  };

  function syncProfileButton(){
    const btn=document.getElementById('perfil-regresar-prospecto-btn');
    if(!btn)return;
    const c=clientById(window.perfilClienteActivo);
    if(c?.descartado){
      btn.dataset.cyaReactivation='1';
      btn.style.display='inline-flex';
      btn.style.color='var(--success)';
      btn.style.borderColor='rgba(34,197,94,.45)';
      btn.textContent='↩ Reactivar';
      btn.onclick=()=>window.cyaAbrirReactivacionCliente(c.id);
      return;
    }
    if(btn.dataset.cyaReactivation==='1'){
      delete btn.dataset.cyaReactivation;
      btn.style.color='var(--warning)';
      btn.style.borderColor='';
      btn.textContent='↩ Regresar a prospectos';
      btn.onclick=()=>typeof abrirRegresoProspecto==='function'&&abrirRegresoProspecto(window.perfilClienteActivo);
    }
  }

  const baseOpenPerfil=window.openPerfil;
  if(typeof baseOpenPerfil==='function')window.openPerfil=function(){
    const result=baseOpenPerfil.apply(this,arguments);
    setTimeout(syncProfileButton,0);
    setTimeout(syncProfileButton,80);
    return result;
  };

  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      if(document.getElementById('modal-perfil')?.classList.contains('open'))syncProfileButton();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});

  setTimeout(syncProfileButton,100);
})();
