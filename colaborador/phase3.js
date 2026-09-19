/* Phase 3 · Statistics and finances for collaborator portal */
(function installCollaboratorPhase3(){
  if(window.__caCollaboratorPhase3Installed)return;
  window.__caCollaboratorPhase3Installed=true;

  const PROSPECT_LABELS={1:'Elegibilidad',2:'Documentación',3:'AFORE Móvil',4:'Cuenta Nivel 4',5:'Firma de contrato'};
  const CLIENT_LABELS={6:'Inicio de trámite',7:'Cita AFORE',8:'Actualización AFORE',9:'Solicitud',10:'Depósito',11:'Honorarios'};
  let paidOpen=false;

  const clients=()=>Array.isArray(state?.bootstrap?.clients)?state.bootstrap.clients:[];
  const prospects=()=>Array.isArray(state?.prospects)?state.prospects:[];
  const dashboard=()=>state?.bootstrap?.dashboard||{};
  const sum=list=>Math.round(list.reduce((total,item)=>total+Number(item?.commission||0),0)*100)/100;
  function validDate(value){if(!value)return null;const d=new Date(String(value).length===10?`${value}T12:00:00`:value);return Number.isNaN(d.getTime())?null:d;}
  function monthKey(value){const d=validDate(value);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:'sin-fecha';}
  function monthLabel(key){if(key==='sin-fecha')return 'SIN FECHA ESTIMADA';const [y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'long',year:'numeric'}).toLocaleUpperCase('es-MX');}
  function groupByMonth(items,dateField){const map=new Map();for(const item of items){const key=monthKey(item?.[dateField]);if(!map.has(key))map.set(key,[]);map.get(key).push(item);}return [...map.entries()].sort((a,b)=>{if(a[0]==='sin-fecha')return 1;if(b[0]==='sin-fecha')return -1;return a[0].localeCompare(b[0]);});}
  function pct(value){const n=Number(value||0);return `${n.toFixed(n%1?1:0)}%`;}

  function renderStatistics(){
    const d=dashboard();const ps=prospects(),cs=clients();
    const prospectCounts={};for(const p of ps){const k=Number(p.phase||1);prospectCounts[k]=(prospectCounts[k]||0)+1;}
    const clientCounts={};for(const c of cs){const k=Number(c?.progress?.current||6);clientCounts[k]=(clientCounts[k]||0)+1;}
    const concluded=cs.filter(c=>c.collected||c?.progress?.done?.['11']||c?.progress?.done?.[11]).length;
    return `<div class="phase3-toolbar"><div><h1>Estadísticas</h1><p>Los mismos resultados que utiliza ${portalOrganizationName()} para medir tus oportunidades y conversiones.</p></div></div>
      <section class="phase3-kpis">
        <article><span>Oportunidades enviadas</span><strong>${Number(d.opportunities||0)}</strong><small>Prospectos + clientes logrados</small></article>
        <article><span>Clientes logrados</span><strong>${Number(d.converted||0)}</strong><small>Convertidos por tu asesor</small></article>
        <article class="accent"><span>Efectividad</span><strong>${pct(d.effectiveness)}</strong><small>Clientes / oportunidades</small></article>
        <article><span>Procesos concluidos</span><strong>${concluded}</strong><small>Honorarios recibidos / cobrados</small></article>
      </section>
      <div class="phase3-two-col">
        <section class="phase3-card"><div class="phase3-card-head"><div><h3>Mis prospectos</h3><p>Distribución actual de las oportunidades que siguen abiertas</p></div><strong>${ps.length}</strong></div><div class="phase3-bars">${Object.entries(PROSPECT_LABELS).map(([id,label])=>{const count=prospectCounts[id]||0;const width=ps.length?Math.round(count/ps.length*100):0;return `<div class="phase3-bar-row"><div><span>${esc(label)}</span><b>${count}</b></div><div class="phase3-bar"><i style="width:${width}%"></i></div></div>`;}).join('')}</div></section>
        <section class="phase3-card"><div class="phase3-card-head"><div><h3>Mis clientes</h3><p>Etapa simplificada visible en tu portal</p></div><strong>${cs.length}</strong></div><div class="phase3-bars">${Object.entries(CLIENT_LABELS).map(([id,label])=>{const count=clientCounts[id]||0;const width=cs.length?Math.round(count/cs.length*100):0;return `<div class="phase3-bar-row"><div><span>${esc(label)}</span><b>${count}</b></div><div class="phase3-bar"><i style="width:${width}%"></i></div></div>`;}).join('')}</div></section>
      </div>
      <section class="phase3-card phase3-note"><strong>Cómo se calcula</strong><p>Una oportunidad cuenta una sola vez. Cuando un prospecto se convierte a cliente deja de contarse como prospecto y pasa a clientes logrados; la efectividad se calcula sobre el total histórico de oportunidades vinculadas a tu cuenta.</p></section>`;
  }

  function financeRow(client,paid=false){
    const date=paid?(client.paidDate||''):(client.expectedPaymentDate||'');
    return `<div class="finance-row"><div><strong>${esc(client.name)}</strong><span>${esc(CLIENT_LABELS[Number(client?.progress?.current||6)]||client.paymentStatus||'Seguimiento')}</span></div><div class="finance-date"><small>${paid?'Pagada':'Fecha estimada'}</small><b>${date?dateMX(date):'Por confirmar'}</b></div><strong class="finance-amount">${money(client.commission||0)}</strong></div>`;
  }
  function monthSections(items,dateField,paid=false){
    if(!items.length)return `<div class="phase3-empty">${paid?'Todavía no hay comisiones pagadas.':'No hay comisiones pendientes.'}</div>`;
    return groupByMonth(items,dateField).map(([key,rows])=>`<section class="finance-month"><header><div><strong>${monthLabel(key)}</strong><span>${rows.length} cliente${rows.length===1?'':'s'}</span></div><b>${money(sum(rows))}</b></header><div>${rows.sort((a,b)=>String(a?.[dateField]||'9999').localeCompare(String(b?.[dateField]||'9999'))).map(c=>financeRow(c,paid)).join('')}</div></section>`).join('');
  }
  function renderFinances(){
    const all=clients().filter(c=>Number(c.commission||0)>0);const paid=all.filter(c=>c.collected);const pending=all.filter(c=>!c.collected);
    const generated=sum(all),collected=sum(paid),pendingTotal=sum(pending);
    const next=[...pending].filter(c=>validDate(c.expectedPaymentDate)).sort((a,b)=>validDate(a.expectedPaymentDate)-validDate(b.expectedPaymentDate))[0];
    return `<div class="phase3-toolbar"><div><h1>Finanzas</h1><p>Consulta tus comisiones vinculadas a los expedientes del CRM. Los importes se leen del registro oficial; el portal no los recalcula.</p></div></div>
      <section class="phase3-kpis finance-kpis">
        <article><span>Comisión generada</span><strong>${money(generated)}</strong><small>Total de clientes vinculados</small></article>
        <article class="success"><span>Cobrado</span><strong>${money(collected)}</strong><small>Comisiones ya pagadas</small></article>
        <article class="accent"><span>Pendiente</span><strong>${money(pendingTotal)}</strong><small>Por cobrar</small></article>
        <article><span>Próximo pago estimado</span><strong>${next?money(next.commission):'—'}</strong><small>${next?`${esc(next.name)} · ${dateMX(next.expectedPaymentDate)}`:'Sin fecha próxima'}</small></article>
      </section>
      <section class="phase3-card finance-main"><div class="phase3-card-head"><div><h3>Comisiones pendientes</h3><p>Ordenadas por el mes estimado del cobro del cliente</p></div><strong>${money(pendingTotal)}</strong></div><div class="finance-months">${monthSections(pending,'expectedPaymentDate',false)}</div></section>
      <section class="phase3-card paid-card"><button class="paid-toggle" type="button" onclick="caTogglePaidFinance()"><span>${paidOpen?'▾':'▸'} <b>Pagadas / archivadas</b><small>${paid.length} registro${paid.length===1?'':'s'}</small></span><strong>${money(collected)}</strong></button>${paidOpen?`<div class="paid-body">${monthSections(paid,'paidDate',true)}</div>`:''}</section>`;
  }
  window.caTogglePaidFinance=function(){paidOpen=!paidOpen;if(state.page==='finanzas')window.navigate('finanzas',true);};

  function isBirthday(iso){if(!iso)return false;const m=String(iso).match(/^\d{4}-(\d{2})-(\d{2})$/);if(!m)return false;const now=new Date();return Number(m[1])===now.getMonth()+1&&Number(m[2])===now.getDate();}
  if(typeof renderHome==='function'){
    const renderHomeBase=renderHome;
    renderHome=function(){let html=renderHomeBase.apply(this,arguments);const c=state?.bootstrap?.collaborator;if(!isBirthday(c?.birthDate))return html;const first=String(c?.name||'').trim().split(/\s+/)[0]||'colaborador';return html.replace(/<span class="eyebrow">BIENVENIDO<\/span><h1>[\s\S]*?<\/h1><p>[\s\S]*?<\/p>/,`<span class="eyebrow">¡FELIZ CUMPLEAÑOS!</span><h1>¡Feliz cumpleaños, ${esc(first)}!</h1><p>Todo el equipo de ${esc(portalOrganizationName())} te desea un excelente día.</p>`);};
  }

  const baseNavigate=window.navigate;
  window.navigate=function(page,silent=false){
    if(page==='estadisticas'||page==='finanzas'){
      state.page=page;document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
      const title=document.getElementById('page-title');if(title)title.textContent=page==='estadisticas'?'Estadísticas':'Finanzas';
      const add=document.getElementById('new-prospect-top');if(add)add.style.display='none';
      const content=document.getElementById('page-content');if(content)content.innerHTML=page==='estadisticas'?renderStatistics():renderFinances();
      window.scrollTo({top:0,behavior:silent?'auto':'smooth'});return;
    }
    return baseNavigate(page,silent);
  };

  function unlock(){
    document.querySelectorAll('[data-page="estadisticas"],[data-page="finanzas"]').forEach(el=>{el.classList.remove('locked');el.querySelector('small')?.remove();});
    const mobile=document.querySelector('.mobile-nav');
    if(mobile&&!mobile.querySelector('[data-page="estadisticas"]')){
      const finance=mobile.querySelector('[data-page="finanzas"]');
      const btn=document.createElement('button');btn.type='button';btn.dataset.page='estadisticas';btn.innerHTML='<span>▥</span>Estadísticas';btn.addEventListener('click',()=>window.navigate('estadisticas'));mobile.insertBefore(btn,finance);
    }
  }
  unlock();const observer=new MutationObserver(unlock);observer.observe(document.documentElement,{childList:true,subtree:true});
})();
