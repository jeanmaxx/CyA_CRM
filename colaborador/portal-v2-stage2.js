/* Portal de Colaboradores v2 · Etapa 2. Estados oficiales del CRM; solo visualización. */
(function installProspectWorkflowV2(){
  'use strict';
  if(window.__caPortalProspectsV2)return;
  window.__caPortalProspectsV2=true;

  // Se usan estados existentes de leads.status: reconsulta, sindos, aprobado.
  // Los demás casos en seguimiento conservan su lugar en revisión inicial.
  const LANES=[
    {key:'reconsulta',title:'Pendientes en segunda revisión',tip:'El asesor está revisando nuevamente la información. Conserva el seguimiento hasta recibir una resolución.',num:'1'},
    {key:'curp',title:'Revisión de elegibilidad (CURP)',tip:'La CURP y los criterios del servicio están pendientes de validación por el equipo.',num:'2'},
    {key:'sindos',title:'Revisión de SINDOS',tip:'El equipo verifica la información de SINDOS antes de aprobar la continuación.',num:'3'},
    {key:'aprobado',title:'Aprobado',tip:'Ya puedes contactar al prospecto para solicitar INE y elaborar contrato.',num:'✓'}
  ];
  const STATUS_LABELS={reconsulta:'Segunda revisión',sindos:'Revisión de SINDOS',aprobado:'Aprobado',semanas:'Revisión de elegibilidad (CURP)',pensiones:'Revisión de elegibilidad (CURP)',correccion_imss:'Revisión de elegibilidad (CURP)'};
  function laneKey(p){
    const status=String(p?.internalStatus||'').toLowerCase();
    return status==='reconsulta'||status==='sindos'||status==='aprobado'?status:'curp';
  }
  function label(p){return STATUS_LABELS[String(p?.internalStatus||'').toLowerCase()]||'Revisión de elegibilidad (CURP)';}
  function card(p){
    const approved=laneKey(p)==='aprobado';
    const name=esc(p.name||'Prospecto'),id=esc(p.id||'');
    return `<article class="prospect-card portal-v2-prospect-card ${approved?'portal-v2-approved-card':''}">
      <button class="portal-v2-prospect-open" type="button" onclick="openProspectModal('${id}')" aria-label="Abrir expediente de ${name}">
        <span class="portal-v2-prospect-card-name">${name}</span>
        <span class="curp">${esc(p.curp||'CURP pendiente')}</span>
      </button>
    </article>`;
  }
  function renderV2(){
    const all=Array.isArray(state?.prospects)?state.prospects:[];
    const active=all.filter(p=>!['archivado','descartado'].includes(String(p?.internalStatus||'').toLowerCase()));
    const lanes=LANES.map(l=>{
      const items=active.filter(p=>laneKey(p)===l.key);
      return `<section class="phase-column portal-v2-lane ${l.key==='aprobado'?'portal-v2-approved-lane':''}" data-v2-lane="${l.key}">
        <header class="phase-head"><div class="phase-title-row"><span class="phase-num">${l.num}</span>
          <div class="portal-v2-heading"><h3>${esc(l.title)}</h3><p>${esc(l.tip)}</p></div><span class="phase-count">${items.length}</span>
        </div></header>
        <div class="phase-cards">${items.length?items.map(card).join(''):'<div class="empty-state">Sin prospectos en esta fase.</div>'}</div>
      </section>`;
    }).join('');
    return `<div class="prospects-toolbar"><div><h1>Mis prospectos</h1><p>Consulta el estado oficial de revisión. La aprobación y los cambios de etapa corresponden al asesor.</p></div><button class="btn btn-primary" type="button" onclick="openProspectModal()">+ Nuevo prospecto</button></div>
      <div class="phase-board-wrap portal-v2-board-wrap"><div class="phase-board portal-v2-board">${lanes}</div></div>`;
  }
  // Mantener el enrutamiento existente, la guía y el módulo de descartados.
  renderProspects=renderV2;
  window.caPortalLeadStatusLabel=label;
})();
