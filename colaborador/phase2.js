/* Phase 2 · Mis Clientes for collaborator portal */
(function installCollaboratorClients(){
  if(window.__caCollaboratorClientsInstalled)return;
  window.__caCollaboratorClientsInstalled=true;

  const CLIENT_PHASES=[
    {id:6,title:'Inicio de trámite',tip:'Casillas & Asociados inicia el proceso operativo del cliente.'},
    {id:7,title:'Crear cita en AFORE',tip:'El asesor agenda la cita correspondiente y aquí podrás consultar los datos.'},
    {id:8,title:'Actualización de datos en AFORE',tip:'Seguimiento a la actualización o atención en la AFORE.'},
    {id:9,title:'Solicitud en aplicación',tip:'La solicitud de retiro se realiza cuando corresponde dentro del proceso.'},
    {id:10,title:'Recepción de depósito',tip:'El recurso es depositado directamente al cliente.'},
    {id:11,title:'Pago de honorarios',tip:'Cierre del proceso una vez liquidados los honorarios.'},
  ];
  let activeClientId=null;
  let contractBuffer=null;
  let contractClientId=null;

  function clients(){return Array.isArray(state?.bootstrap?.clients)?state.bootstrap.clients:[];}
  function serviceName(id){return state?.bootstrap?.services?.find(s=>s.id===id)?.name||id||'Servicio';}
  function phaseInfo(client){const id=Number(client?.progress?.current||6);return CLIENT_PHASES.find(p=>p.id===id)||CLIENT_PHASES[0];}
  function completed(client,id){return client?.progress?.done?.[String(id)]===true||client?.progress?.done?.[id]===true;}
  function visibleClients(){
    return clients().filter(c=>{
      if(c.serviceId!=='retiro_desempleo')return true;
      return !['generando_contrato','contrato_firmas'].includes(String(c.stage||''));
    });
  }
  function fmtDateTime(value){
    if(!value)return '—';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return dateMX(value);
    return `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`;
  }
  function phaseStrip(client){
    return `<div class="client-phase-strip">${CLIENT_PHASES.map(p=>{
      const done=completed(client,p.id);const current=Number(client?.progress?.current||6)===p.id&&!done;
      return `<div class="client-phase ${done?'is-done':''} ${current?'is-current':''}"><span>${done?'✓':p.id}</span><small>${esc(p.title)}</small></div>`;
    }).join('')}</div>`;
  }
  function appointmentSummary(client){
    const a=client.appointment||{};
    if(!a.date&&!a.time&&!a.branch&&!client.afore)return '';
    return `<div class="client-appointment-mini"><strong>Cita / AFORE</strong><span>${esc(client.afore||'AFORE por confirmar')}</span>${a.date?`<span>${dateMX(a.date)}${a.time?' · '+esc(a.time):''}</span>`:''}${a.branch?`<span>${esc(a.branch)}</span>`:''}</div>`;
  }
  function clientCard(client){
    const phase=phaseInfo(client);const finished=completed(client,11);
    return `<article class="client-card">
      <div class="client-card-top"><div><span class="client-service">${esc(serviceName(client.serviceId))}</span><h3>${esc(client.name)}</h3><p>${esc(client.curp||'CURP sin dato')}</p></div><span class="client-status ${finished?'is-finished':''}">${finished?'Concluido':esc(phase.title)}</span></div>
      ${phaseStrip(client)}
      ${client.progress?.rejected?'<div class="client-warning">Solicitud rechazada · el asesor continúa con el seguimiento.</div>':''}
      ${appointmentSummary(client)}
      <div class="client-card-foot"><span>Actualizado ${dateMX(client.updatedAt||client.createdAt)}</span><button class="btn" type="button" onclick="caOpenClient('${esc(client.id)}')">Ver seguimiento</button></div>
    </article>`;
  }
  function renderClients(){
    const list=visibleClients();
    const waiting=Math.max(0,clients().length-list.length);
    return `<div class="clients-toolbar"><div><h1>Mis clientes</h1><p>Consulta el avance del trámite. Las etapas son informativas y las actualiza tu asesor o administración.</p></div></div>
      <section class="client-process-guide">${CLIENT_PHASES.map(p=>`<div><span>${p.id}</span><strong>${esc(p.title)}</strong></div>`).join('')}</section>
      ${waiting?`<div class="clients-note">${waiting} expediente${waiting===1?'':'s'} convertido${waiting===1?'':'s'} todavía no aparece${waiting===1?'':'n'} aquí porque la firma de contrato aún no ha sido confirmada.</div>`:''}
      <section class="client-list">${list.length?list.map(clientCard).join(''):'<div class="section-card"><div class="empty-state">Todavía no tienes clientes con contrato firmado. Cuando tu asesor confirme la firma, aparecerán automáticamente aquí.</div></div>'}</section>`;
  }

  function safeTimeline(history){
    if(!history?.length)return '<div class="client-empty-small">Sin movimientos visibles todavía.</div>';
    return `<div class="client-timeline">${[...history].reverse().map(h=>`<div class="client-timeline-row"><i></i><div><strong>${esc(h.text||'Actualización')}</strong><span>${fmtDateTime(h.date)}</span></div></div>`).join('')}</div>`;
  }
  function appointmentBlock(client){
    const a=client.appointment||{};
    return `<section class="client-detail-section"><div class="client-detail-title"><span>7</span><div><strong>Cita en AFORE</strong><small>Información registrada por tu asesor</small></div></div>
      <div class="client-detail-grid"><div><small>AFORE</small><strong>${esc(client.afore||'Por confirmar')}</strong></div><div><small>Fecha</small><strong>${a.date?dateMX(a.date):'Por confirmar'}</strong></div><div><small>Hora</small><strong>${esc(a.time||'Por confirmar')}</strong></div><div><small>Sucursal / lugar</small><strong>${esc(a.branch||'Por confirmar')}</strong></div></div></section>`;
  }
  function contractBlock(client){
    return `<section class="client-detail-section"><div class="client-detail-title"><span>▤</span><div><strong>Contrato</strong><small>Última versión oficial guardada en el expediente</small></div></div>
      ${client.contract?.available?`<div class="contract-summary"><div><strong>Contrato disponible</strong><span>${client.contract.date?fmtDateTime(client.contract.date):''}</span></div><button class="btn btn-primary" type="button" onclick="caViewContract('${esc(client.id)}')">Ver contrato</button></div>`:'<div class="client-empty-small">Todavía no hay una versión contractual guardada para consulta.</div>'}</section>`;
  }
  function clientModalHtml(client){
    const phase=phaseInfo(client);
    return `<div class="client-modal-hero"><div><span>${esc(serviceName(client.serviceId))}</span><h2>${esc(client.name)}</h2><p>${esc(client.curp||'')}</p></div><div class="client-modal-current"><small>Fase actual</small><strong>${completed(client,11)?'Proceso concluido':esc(phase.title)}</strong></div></div>
      ${phaseStrip(client)}
      ${client.progress?.rejected?'<div class="client-warning">La solicitud aparece como rechazada en el CRM. El asesor o administración continuará con el seguimiento.</div>':''}
      ${appointmentBlock(client)}
      ${contractBlock(client)}
      <section class="client-detail-section"><div class="client-detail-title"><span>↻</span><div><strong>Historial visible</strong><small>Movimientos principales del trámite</small></div></div>${safeTimeline(client.history)}</section>`;
  }

  function ensureModals(){
    if(!document.getElementById('client-detail-modal')){
      document.body.insertAdjacentHTML('beforeend',`<div id="client-detail-modal" class="modal-overlay" hidden><section class="modal client-detail-modal"><div class="modal-head"><div><span class="eyebrow">MIS CLIENTES</span><h3>Seguimiento del cliente</h3></div><button class="icon-button" type="button" onclick="caCloseClient()">×</button></div><div id="client-detail-body" class="client-detail-body"></div></section></div>`);
    }
    if(!document.getElementById('contract-view-modal')){
      document.body.insertAdjacentHTML('beforeend',`<div id="contract-view-modal" class="modal-overlay" hidden><section class="modal contract-view-modal"><div class="modal-head"><div><span class="eyebrow">CONTRATO</span><h3 id="contract-view-title">Contrato del cliente</h3></div><button class="icon-button" type="button" onclick="caCloseContract()">×</button></div><div class="contract-view-actions"><span>Documento oficial del expediente</span><button id="contract-pdf-btn" class="btn btn-primary" type="button" onclick="caDownloadContractPdf()" disabled>Descargar PDF</button></div><div id="contract-docx-preview" class="contract-docx-preview"><div class="client-empty-small">Cargando documento…</div></div></section></div>`);
    }
  }

  window.caOpenClient=function(id){
    const client=clients().find(c=>c.id===id);if(!client)return;
    ensureModals();activeClientId=id;document.getElementById('client-detail-body').innerHTML=clientModalHtml(client);document.getElementById('client-detail-modal').hidden=false;
  };
  window.caCloseClient=function(){const el=document.getElementById('client-detail-modal');if(el)el.hidden=true;activeClientId=null;};

  function base64ToArrayBuffer(base64){
    const binary=atob(base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes.buffer;
  }
  window.caViewContract=async function(clientId){
    ensureModals();const client=clients().find(c=>c.id===clientId);if(!client)return;
    document.getElementById('contract-view-title').textContent=`Contrato · ${client.name}`;
    document.getElementById('contract-docx-preview').innerHTML='<div class="client-empty-small">Cargando documento…</div>';
    document.getElementById('contract-pdf-btn').disabled=true;document.getElementById('contract-view-modal').hidden=false;
    try{
      setBusy(true,'Cargando contrato…');
      const data=await portalAction({action:'get_contract',clientId});
      contractBuffer=base64ToArrayBuffer(data.contract.base64);contractClientId=clientId;
      const host=document.getElementById('contract-docx-preview');host.innerHTML='';
      if(!window.docx?.renderAsync)throw new Error('El visor de documentos no está disponible');
      await window.docx.renderAsync(contractBuffer,host,null,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true,useBase64URL:true});
      document.getElementById('contract-pdf-btn').disabled=false;
    }catch(error){document.getElementById('contract-docx-preview').innerHTML=`<div class="client-empty-small">${esc(error.message||'No se pudo abrir el contrato')}</div>`;toast(error.message||'No se pudo abrir el contrato','error');}
    finally{setBusy(false);}
  };
  window.caCloseContract=function(){const el=document.getElementById('contract-view-modal');if(el)el.hidden=true;contractBuffer=null;contractClientId=null;};
  window.caDownloadContractPdf=async function(){
    if(!contractClientId)return;
    const client=clients().find(c=>c.id===contractClientId);const host=document.getElementById('contract-docx-preview');
    try{
      if(!window.html2pdf)throw new Error('El generador PDF no está disponible');
      setBusy(true,'Generando PDF…');
      const safeName=String(client?.name||'cliente').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ -]+/g,'').trim().replace(/\s+/g,'-');
      await window.html2pdf().set({margin:0,filename:`Contrato-${safeName}.pdf`,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'letter',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(host).save();
      await portalAction({action:'record_contract_download',clientId:contractClientId});toast('Contrato descargado en PDF','success');
    }catch(error){toast(error.message||'No se pudo generar el PDF','error');}
    finally{setBusy(false);}
  };

  const baseNavigate=window.navigate;
  window.navigate=function(page,silent=false){
    if(page==='clientes'){
      state.page='clientes';
      document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='clientes'));
      const title=document.getElementById('page-title');if(title)title.textContent='Mis clientes';
      const add=document.getElementById('new-prospect-top');if(add)add.style.display='none';
      const content=document.getElementById('page-content');if(content)content.innerHTML=renderClients();
      window.scrollTo({top:0,behavior:silent?'auto':'smooth'});return;
    }
    return baseNavigate(page,silent);
  };

  function unlockNav(){
    document.querySelectorAll('[data-page="clientes"]').forEach(el=>{el.classList.remove('locked');el.querySelector('small')?.remove();});
  }
  unlockNav();ensureModals();
  const observer=new MutationObserver(unlockNav);observer.observe(document.documentElement,{childList:true,subtree:true});
})();
