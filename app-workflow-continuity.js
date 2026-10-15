/* Workflow continuity + configurable default commissions.
   Keeps historical percentage-based collaborator commissions intact until a client
   receives an explicit fixed collaborator commission. */
(function installWorkflowContinuityAndCommissionDefaults(){
  if(window.__cyaWorkflowContinuityCommissionDefaultsLoaded)return;
  window.__cyaWorkflowContinuityCommissionDefaultsLoaded=true;

  const money=value=>{
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?n:null;
  };

  let attempts=0;
  const installer=setInterval(()=>{
    attempts++;
    const ready=
      typeof openModalCliente==='function'&&typeof editCliente==='function'&&typeof guardarCliente==='function'&&typeof openPerfil==='function'&&
      typeof openModalAsesor==='function'&&typeof guardarAsesor==='function'&&
      typeof openModalColaborador==='function'&&typeof guardarColaborador==='function'&&
      typeof comisionDefaultParaAsesor==='function'&&typeof comisionDelColaborador==='function'&&typeof comisionEfectiva==='function'&&
      typeof saveStore==='function'&&typeof cloudSyncNow==='function'&&
      window.__cyaClientAdvisorOwnershipInstalled&&window.__cyaCollaboratorProfileSafetyInstalled;
    if(!ready){if(attempts>600)clearInterval(installer);return;}
    clearInterval(installer);
    if(window.__cyaWorkflowContinuityCommissionDefaultsInstalled)return;
    window.__cyaWorkflowContinuityCommissionDefaultsInstalled=true;

    const baseAdvisorDefault=comisionDefaultParaAsesor;
    comisionDefaultParaAsesor=function(advisorId){
      const advisor=(store.asesores||[]).find(a=>String(a.id)===String(advisorId));
      const configured=money(advisor?.comisionDefault);
      return configured!==null?configured:baseAdvisorDefault.apply(this,arguments);
    };

    const baseCollaboratorCommission=comisionDelColaborador;
    comisionDelColaborador=function(cliente,colaborador){
      const fixed=money(cliente?.colComision);
      if(fixed!==null)return Math.round(fixed);
      return baseCollaboratorCommission.apply(this,arguments);
    };

    function advisorDefault(advisor){
      const configured=money(advisor?.comisionDefault);
      if(configured!==null)return configured;
      if(advisor?.id)return baseAdvisorDefault(advisor.id);
      const role=String(document.getElementById('as-rol')?.value||'advisor');
      return role==='admin'?3000:2000;
    }

    function collaboratorDefault(collaborator){
      const configured=money(collaborator?.comisionDefault);
      return configured!==null?configured:1000;
    }

    function ensureAdvisorDefaultField(advisor=null){
      const active=document.getElementById('as-activo');
      if(!active)return;
      let group=document.getElementById('cya-as-comision-default-group');
      if(!group){
        group=document.createElement('div');
        group.className='form-group';
        group.id='cya-as-comision-default-group';
        group.innerHTML=`<label class="form-label" for="as-comision-default">Comisión predeterminada por cliente ($)</label>
          <input class="form-input" id="as-comision-default" type="number" min="0" step="100" inputmode="numeric" placeholder="3000">
          <div class="form-helper">Se precarga en Finanzas. Puedes modificarla manualmente en casos especiales.</div>`;
        const anchor=active.closest('.form-group');
        if(anchor)anchor.insertAdjacentElement('beforebegin',group);
        else active.parentElement?.appendChild(group);
      }
      const input=document.getElementById('as-comision-default');
      if(input)input.value=String(advisorDefault(advisor));
    }

    function ensureCollaboratorDefaultField(collaborator=null){
      const pct=document.getElementById('col-pct');
      if(!pct)return;
      const pctGroup=pct.closest('.form-group');
      if(pctGroup)pctGroup.style.display='none';
      let group=document.getElementById('cya-col-comision-default-group');
      if(!group){
        group=document.createElement('div');
        group.className='form-group';
        group.id='cya-col-comision-default-group';
        group.innerHTML=`<label class="form-label" for="col-comision-default">Comisión predeterminada del colaborador ($)</label>
          <input class="form-input" id="col-comision-default" type="number" min="0" step="100" inputmode="numeric" placeholder="1000">
          <div class="form-helper">Se aplicará a clientes nuevos de este colaborador. La comisión puede modificarse por cliente.</div>`;
        if(pctGroup)pctGroup.insertAdjacentElement('beforebegin',group);
      }
      const input=document.getElementById('col-comision-default');
      if(input)input.value=String(collaboratorDefault(collaborator));
    }

    function selectedCollaborator(){
      const id=String(document.getElementById('fc-colaborador')?.value||'');
      return (store.colaboradores||[]).find(c=>String(c.id)===id)||null;
    }

    function legacyClientCollaboratorCommission(client,col){
      if(!client||!col)return null;
      try{return money(baseCollaboratorCommission(client,col));}catch(_){return null;}
    }

    function ensureClientCollaboratorCommissionField(client=null){
      const pct=document.getElementById('fc-col-pct');
      const select=document.getElementById('fc-colaborador');
      if(!pct||!select)return;
      const pctGroup=pct.closest('.form-group');
      if(pctGroup)pctGroup.style.display='none';
      let group=document.getElementById('cya-fc-col-comision-group');
      if(!group){
        group=document.createElement('div');
        group.className='form-group';
        group.id='cya-fc-col-comision-group';
        group.innerHTML=`<label class="form-label" for="fc-col-comision">Comisión del colaborador ($)</label>
          <input class="form-input" id="fc-col-comision" type="number" min="0" step="100" inputmode="numeric" placeholder="1000" style="font-size:13px;">
          <div class="form-helper">Se carga el valor predeterminado del colaborador y puedes cambiarlo para este cliente.</div>`;
        if(pctGroup)pctGroup.insertAdjacentElement('beforebegin',group);
      }

      const input=document.getElementById('fc-col-comision');
      const col=selectedCollaborator();
      if(input){
        const explicit=money(client?.colComision);
        const legacy=explicit===null?legacyClientCollaboratorCommission(client,col):null;
        if(explicit!==null)input.value=String(explicit);
        else if(client&&legacy!==null)input.value=String(legacy);
        else if(col)input.value=String(collaboratorDefault(col));
        else input.value='';
      }

      if(!select.dataset.cyaFixedCommissionListener){
        select.dataset.cyaFixedCommissionListener='1';
        select.addEventListener('change',()=>setTimeout(()=>{
          const current=selectedCollaborator();
          const field=document.getElementById('fc-col-comision');
          if(field)field.value=current?String(collaboratorDefault(current)):'';
        },0));
      }
    }

    function enhanceClientSaveButton(isEditing){
      const modal=document.getElementById('modal-cliente');
      if(!modal)return;
      const buttons=[...modal.querySelectorAll('button')];
      const save=buttons.find(btn=>String(btn.getAttribute('onclick')||'').trim()==='guardarCliente()')||buttons.find(btn=>/Guardar cliente|Guardar cambios/.test(btn.textContent||''));
      if(!save)return;
      save.setAttribute('onclick','cyaGuardarClienteYContinuar()');
      save.textContent=isEditing?'Guardar cambios':'Guardar cliente';
      save.title='Guardar y continuar en el expediente';
    }

    const openClientBase=openModalCliente;
    openModalCliente=function(){
      const result=openClientBase.apply(this,arguments);
      const enhance=()=>{ensureClientCollaboratorCommissionField(null);enhanceClientSaveButton(false);};
      enhance();setTimeout(enhance,80);
      return result;
    };

    const editClientBase=editCliente;
    editCliente=function(id){
      const result=editClientBase.apply(this,arguments);
      const client=(store.clientes||[]).find(c=>String(c.id)===String(id))||null;
      const enhance=()=>{ensureClientCollaboratorCommissionField(client);enhanceClientSaveButton(true);};
      enhance();setTimeout(enhance,80);
      return result;
    };

    window.cyaGuardarClienteYContinuar=async function(){
      const modal=document.getElementById('modal-cliente');
      const editingBefore=typeof editingId!=='undefined'?editingId:null;
      const beforeIds=new Set((store.clientes||[]).map(c=>String(c.id)));
      const commission=money(document.getElementById('fc-col-comision')?.value);
      const collaboratorId=String(document.getElementById('fc-colaborador')?.value||'');

      await guardarCliente();
      if(modal?.classList.contains('open'))return;

      let client=editingBefore?(store.clientes||[]).find(c=>String(c.id)===String(editingBefore)):null;
      if(!client)client=(store.clientes||[]).find(c=>!beforeIds.has(String(c.id)))||null;
      if(!client&&typeof editingId!=='undefined'&&editingId)client=(store.clientes||[]).find(c=>String(c.id)===String(editingId))||null;
      if(!client)return;

      if(collaboratorId&&commission!==null){
        client.colComision=Math.round(commission);
        const advisorCommission=money(comisionEfectiva(client));
        if(advisorCommission&&advisorCommission>0){
          // Keep the legacy percentage equivalent synchronized so the collaborator portal
          // and older reports calculate the same fixed peso amount without a backend migration.
          client.colPct=Math.max(0,Math.min(100,(client.colComision/advisorCommission)*100));
        }
      }else if(!collaboratorId){
        if(Object.prototype.hasOwnProperty.call(client,'colComision'))delete client.colComision;
        client.colPct=0;
      }

      try{
        saveStore();
        await cloudSyncNow({throwOnError:true});
      }catch(error){
        showToast?.('El cliente se guardó, pero la comisión del colaborador quedó pendiente de sincronizar.','warn');
      }

      openPerfil(client.id);
      showToast?.('Cambios guardados. Puedes continuar en el expediente.','success');
    };

    const openAdvisorBase=openModalAsesor;
    openModalAsesor=function(id){
      const result=openAdvisorBase.apply(this,arguments);
      const advisor=id?(store.asesores||[]).find(a=>String(a.id)===String(id)):null;
      const enhance=()=>ensureAdvisorDefaultField(advisor);
      enhance();setTimeout(enhance,80);
      return result;
    };

    const saveAdvisorBase=guardarAsesor;
    guardarAsesor=async function(){
      const amount=money(document.getElementById('as-comision-default')?.value);
      const editingBefore=typeof editingAsesorId!=='undefined'?editingAsesorId:null;
      const beforeIds=new Set((store.asesores||[]).map(a=>String(a.id)));
      const result=await saveAdvisorBase.apply(this,arguments);
      if(document.getElementById('modal-asesor')?.classList.contains('open'))return result;
      let advisor=editingBefore?(store.asesores||[]).find(a=>String(a.id)===String(editingBefore)):null;
      if(!advisor)advisor=(store.asesores||[]).find(a=>!beforeIds.has(String(a.id)))||null;
      if(advisor&&amount!==null){
        advisor.comisionDefault=Math.round(amount);
        try{saveStore();await cloudSyncNow({throwOnError:true});}catch(error){showToast?.('Asesor guardado; la comisión predeterminada quedó pendiente de sincronizar.','warn');}
      }
      return result;
    };

    const openCollaboratorBase=openModalColaborador;
    openModalColaborador=function(id){
      const result=openCollaboratorBase.apply(this,arguments);
      const collaborator=id?(store.colaboradores||[]).find(c=>String(c.id)===String(id)):null;
      const enhance=()=>ensureCollaboratorDefaultField(collaborator);
      enhance();setTimeout(enhance,80);
      return result;
    };

    const saveCollaboratorBase=guardarColaborador;
    guardarColaborador=async function(){
      const amount=money(document.getElementById('col-comision-default')?.value);
      const editingBefore=typeof editingColaboradorId!=='undefined'?editingColaboradorId:null;
      const beforeIds=new Set((store.colaboradores||[]).map(c=>String(c.id)));
      const result=await saveCollaboratorBase.apply(this,arguments);
      if(document.getElementById('modal-colaborador')?.classList.contains('open'))return result;
      let collaborator=editingBefore?(store.colaboradores||[]).find(c=>String(c.id)===String(editingBefore)):null;
      if(!collaborator)collaborator=(store.colaboradores||[]).find(c=>!beforeIds.has(String(c.id)))||null;
      if(collaborator&&amount!==null){
        collaborator.comisionDefault=Math.round(amount);
        try{saveStore();await cloudSyncNow({throwOnError:true});}catch(error){showToast?.('Colaborador guardado; la comisión predeterminada quedó pendiente de sincronizar.','warn');}
      }
      return result;
    };

    if(!document.getElementById('cya-workflow-continuity-styles')){
      const style=document.createElement('style');
      style.id='cya-workflow-continuity-styles';
      style.textContent=`
        #cya-as-comision-default-group,#cya-col-comision-default-group,#cya-fc-col-comision-group{position:relative}
        #cya-as-comision-default-group .form-helper,#cya-col-comision-default-group .form-helper,#cya-fc-col-comision-group .form-helper{line-height:1.35}
      `;
      document.head.appendChild(style);
    }
  },30);
})();
