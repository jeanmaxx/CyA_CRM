/* Pending CRM refinements recovered from the previous work session. */
(function installRecoveredCRMRefinements(){
  if(window.__cyaRecoveredCRMRefinementsLoaded)return;
  window.__cyaRecoveredCRMRefinementsLoaded=true;

  // Browser/app title: public release name without the old development suffix.
  function cleanDocumentTitle(){
    const configured=(typeof store!=='undefined'&&store?.configuracion?.nombre_app)||'C&A CRM Suite';
    document.title=String(configured||'C&A CRM Suite').replace(/\s+v23\b/ig,'').trim()||'C&A CRM Suite';
  }
  cleanDocumentTitle();

  function recordTimestamp(record,fields){
    for(const field of fields){
      const value=record?.[field];
      if(!value)continue;
      if(typeof parseFechaFlexible==='function'){
        const parsed=parseFechaFlexible(value);
        if(parsed&&!Number.isNaN(parsed.getTime()))return parsed.getTime();
      }
      const direct=new Date(value);
      if(!Number.isNaN(direct.getTime()))return direct.getTime();
    }
    const idNumber=Number(String(record?.id||'').match(/(\d{10,})/)?.[1]||0);
    return Number.isFinite(idNumber)?idNumber:0;
  }

  function registrationTimestamp(record){
    return recordTimestamp(record,['fechaRegistro','fechaCaptura','fechaInicio','created_at','createdAt']);
  }

  function financialTimestamp(record){
    return recordTimestamp(record,[
      'fechaCierre','fechaHonorarios','fechaDeposito','fechaRetiroReal','fechaRetiroEstimada',
      'fechaSolicitudManual','fechaSolicitudRealizada','fechaAltaAfore','fechaFirmaContrato',
      'fechaRegistro','fechaCaptura','fechaInicio'
    ]);
  }

  function advisorOpportunityMetrics(advisorId){
    const convertedLead=lead=>lead?.causaArchivoId==='convertido_cliente'||lead?.causaArchivo==='Convertido a cliente';
    const prospects=(store?.leads||[]).filter(lead=>lead.asesorId===advisorId&&!convertedLead(lead));
    const clients=(store?.clientes||[]).filter(client=>client.asesorId===advisorId);
    const opportunities=[...prospects,...clients];
    const collaborators=opportunities.filter(item=>Boolean(item.colaboradorId)).length;
    return {
      opportunities:opportunities.length,
      collaborators,
      direct:Math.max(0,opportunities.length-collaborators),
      clients:clients.length,
    };
  }

  function patchAdvisorComparison(){
    if(typeof store==='undefined')return;
    const advisors=store.asesores||[];
    const table=document.querySelector('.advisor-comparison-table table');
    if(table){
      const headers=table.querySelectorAll('thead th');
      if(headers[2])headers[2].textContent='De colaboradores';
      if(headers[3])headers[3].textContent='Directos';
      const rows=[...table.querySelectorAll('tbody tr')];
      rows.forEach((row,index)=>{
        const advisor=advisors[index];
        if(!advisor)return;
        const metrics=advisorOpportunityMetrics(advisor.id);
        const cells=row.children;
        if(cells[1])cells[1].textContent=String(metrics.opportunities);
        if(cells[2])cells[2].textContent=String(metrics.collaborators);
        if(cells[3])cells[3].textContent=String(metrics.direct);
        if(cells[4])cells[4].textContent=String(metrics.clients);
      });
    }
    const cards=[...document.querySelectorAll('.advisor-performance-card')];
    cards.forEach((card,index)=>{
      const advisor=advisors[index];
      if(!advisor)return;
      const metrics=advisorOpportunityMetrics(advisor.id);
      const primary=card.querySelector('.advisor-performance-primary');
      if(primary?.children?.[0]?.querySelector('strong'))primary.children[0].querySelector('strong').textContent=String(metrics.opportunities);
      if(primary?.children?.[1]?.querySelector('strong'))primary.children[1].querySelector('strong').textContent=String(metrics.clients);
      const details=card.querySelector('.advisor-performance-details');
      if(details){
        const existing=[...details.querySelectorAll('span')];
        const activos=existing.find(el=>/^Activos\b/i.test(el.textContent||''))?.innerHTML||'Activos <strong>0</strong>';
        const concluidos=existing.find(el=>/^Concluidos\b/i.test(el.textContent||''))?.innerHTML||'Concluidos <strong>0</strong>';
        details.innerHTML=`<span>De colaboradores <strong>${metrics.collaborators}</strong></span><span>Directos <strong>${metrics.direct}</strong></span><span>${activos}</span><span>${concluidos}</span>`;
      }
    });
  }

  function patchContractProfileButton(){
    const panel=document.getElementById('pd-contratos');
    if(!panel)return;
    const button=[...panel.querySelectorAll('button')].find(btn=>/Generar nuevo contrato/i.test(btn.textContent||''));
    if(!button)return;
    button.classList.add('btn-primary','cya-generate-contract-prominent');
    button.style.fontSize='12px';
    button.style.width='100%';
    const wrapper=button.parentElement;
    if(wrapper){
      wrapper.style.margin='0 0 16px';
      panel.insertBefore(wrapper,panel.firstElementChild);
    }else{
      button.style.marginBottom='16px';
      panel.insertBefore(button,panel.firstElementChild);
    }
  }

  function reorderFinanceMonthsNewestFirst(){
    const months=[...document.querySelectorAll('.comision-mes')];
    if(months.length<2)return;
    const parent=months[0].parentElement;
    if(!parent||!months.every(month=>month.parentElement===parent))return;
    months.reverse().forEach(month=>parent.appendChild(month));
  }

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=typeof renderLeads==='function'&&typeof renderClientes==='function'&&typeof renderFinanzas==='function'&&
      typeof renderAsesores==='function'&&typeof openPerfil==='function'&&typeof ordenarProspectos==='function'&&
      typeof aplicarOrden==='function'&&typeof AFORE_OPTIONS!=='undefined'&&typeof DIRECTORIO_AFORE_BASE!=='undefined';
    if(!ready){
      cleanDocumentTitle();
      if(attempts>240)clearInterval(installer);
      return;
    }
    if(window.__cyaRecoveredCRMRefinementsInstalled){clearInterval(installer);return;}
    window.__cyaRecoveredCRMRefinementsInstalled=true;
    clearInterval(installer);

    cleanDocumentTitle();

    // AFORE Coppel: official public contact and identification/update reference.
    if(!AFORE_OPTIONS.includes('Coppel')){
      const afterBanamex=AFORE_OPTIONS.indexOf('Banamex');
      AFORE_OPTIONS.splice(afterBanamex>=0?afterBanamex+1:AFORE_OPTIONS.length,0,'Coppel');
    }
    DIRECTORIO_AFORE_BASE.Coppel={
      web:'https://aforecoppel.com/',
      telefono:'55 9500 0005',
      documentos:'Identificación oficial vigente (INE, pasaporte o matrícula consular), comprobante de domicilio, CURP y constancia de situación fiscal/RFC. Para el expediente de identificación pueden requerirse además teléfono, correo y datos biométricos. Confirmar los requisitos específicos de la corrección en el módulo AFORE.',
      fuenteDocumentos:'https://aforecoppel.com/expediente-de-identificacion-afore'
    };

    // Prospectos: newest first by default, while keeping the user's manual toggle functional.
    const activeLeadStages=['pensiones','correccion_imss','semanas','sindos','aprobado'];
    activeLeadStages.forEach(stage=>{leadOrder[stage]='desc';});
    const ordenarProspectosBase=ordenarProspectos;
    ordenarProspectos=function(items,estado){
      if(!Array.isArray(items))return ordenarProspectosBase(items,estado);
      const direction=leadOrder[estado]==='asc'?'asc':'desc';
      return items.slice().sort((a,b)=>{
        const ta=registrationTimestamp(a),tb=registrationTimestamp(b);
        const byDate=direction==='desc'?tb-ta:ta-tb;
        return byDate||String(a.id||'').localeCompare(String(b.id||''));
      });
    };

    // Archivados: No elegibles open; definitives and every definitive cause closed initially.
    if(typeof archivadosLeadsAbiertos!=='undefined')archivadosLeadsAbiertos=true;
    archiveCollapsed.temporal=false;
    archiveCollapsed.definitivos=true;
    for(const lead of (store.leads||[])){
      if(lead.estado==='archivado'&&lead.archivoTipo!=='temporal'){
        archiveCollapsed['causa:'+String(lead.causaArchivo||'Sin causa especificada')]=true;
      }
    }

    // Clientes: enforce recent-first default and compare real dates rather than raw text.
    clientesOrden.campo='fechaRegistro';
    clientesOrden.dir='desc';
    const aplicarOrdenBase=aplicarOrden;
    aplicarOrden=function(items){
      if(clientesOrden?.campo!=='fechaRegistro')return aplicarOrdenBase(items);
      const direction=clientesOrden.dir==='asc'?'asc':'desc';
      return [...(items||[])].sort((a,b)=>{
        const ta=registrationTimestamp(a),tb=registrationTimestamp(b);
        const byDate=direction==='desc'?tb-ta:ta-tb;
        return byDate||String(a.nombre||'').localeCompare(String(b.nombre||''),'es');
      });
    };

    // Finanzas: latest financial/client records first; future projection months newest first visually.
    const renderFinanzasBase=renderFinanzas;
    renderFinanzas=function(){
      const originalClients=store.clientes;
      store.clientes=[...(originalClients||[])].sort((a,b)=>financialTimestamp(b)-financialTimestamp(a)||registrationTimestamp(b)-registrationTimestamp(a));
      let html;
      try{html=renderFinanzasBase.apply(this,arguments);}
      finally{store.clientes=originalClients;}
      setTimeout(reorderFinanceMonthsNewestFirst,0);
      return html;
    };

    // Advisor comparison: opportunities by origin instead of "Desde prospecto".
    const renderAsesoresBase=renderAsesores;
    renderAsesores=function(){
      const html=renderAsesoresBase.apply(this,arguments);
      setTimeout(patchAdvisorComparison,0);
      return html;
    };

    // Contracts & Alta: make "Generar nuevo contrato" the first, prominent action.
    const openPerfilBase=openPerfil;
    openPerfil=function(){
      const result=openPerfilBase.apply(this,arguments);
      patchContractProfileButton();
      setTimeout(patchContractProfileButton,0);
      return result;
    };

    // Keep the cleaned title after configuration/login refreshes.
    if(typeof guardarConfig==='function'){
      const guardarConfigBase=guardarConfig;
      guardarConfig=function(){const result=guardarConfigBase.apply(this,arguments);cleanDocumentTitle();return result;};
    }

    // If the user is already on one of the affected pages when the patch finishes loading, refresh it once.
    if(['leads','clientes','finanzas','asesores'].includes(currentPage))renderPage(currentPage);
  },25);
})();
