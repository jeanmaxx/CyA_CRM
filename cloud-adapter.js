/* C&A CRM Suite — adaptador Supabase. La interfaz y reglas permanecen en index.html. */
const CA_ORG_ID = window.CA_CLOUD_CONFIG.organizationId;
const supabaseClient = window.supabase.createClient(
  window.CA_CLOUD_CONFIG.supabaseUrl,
  window.CA_CLOUD_CONFIG.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

const cloudDefaults = {
  configuracion: JSON.parse(JSON.stringify(store.configuracion || {})),
  servicios: SERVICIOS_DEFAULT.map(s => ({...s})),
};
let cloudReady = false;
let cloudSyncTimer = null;
let cloudSyncRunning = false;
let cloudSyncPending = false;
let cloudLegacyAdvisors = [];
const cloudKnownIds = {
  services: new Set(),
  collaborators: new Set(),
  leads: new Set(),
  clients: new Set(),
  agenda_events: new Set(),
  message_templates: new Set(),
};

function cloudIsUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function cloudCleanObject(value){
  return JSON.parse(JSON.stringify(value, (key, item) => item === undefined ? null : item));
}

function cloudDate(value){
  if(!value) return null;
  const match=String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function cloudTimestamp(value){
  if(!value) return new Date().toISOString();
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function cloudSelect(table){
  const {data,error}=await supabaseClient.from(table).select('*');
  if(error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function cloudSignedAvatar(path){
  if(!path) return '';
  const {data,error}=await supabaseClient.storage.from('crm-avatars').createSignedUrl(path, 3600);
  return error ? '' : (data?.signedUrl || '');
}

async function cloudLoadStore(){
  const [profiles,settings,services,collaborators,leads,clients,events,templates]=await Promise.all([
    cloudSelect('profiles'),
    cloudSelect('app_settings'),
    cloudSelect('services'),
    cloudSelect('collaborators'),
    cloudSelect('leads'),
    cloudSelect('clients'),
    cloudSelect('agenda_events'),
    cloudSelect('message_templates'),
  ]);

  const settingsPayload=cloudCleanObject(settings[0]?.payload || {});
  cloudLegacyAdvisors=(settingsPayload.__legacyAdvisors || []).map(a=>({...a,pin:''}));
  delete settingsPayload.__legacyAdvisors;

  const cloudProfiles=await Promise.all(profiles.map(async p=>({
    id:p.id,
    legacyId:p.legacy_id || '',
    nombre:p.full_name,
    ciudad:p.city || '',
    rol:p.role === 'admin' ? 'admin' : 'asesor',
    activo:p.active !== false,
    foto:await cloudSignedAvatar(p.photo_path),
    fotoPath:p.photo_path || '',
    email:p.email || '',
    fechaAlta:p.created_at,
    cloudUser:true,
  })));

  const profileLegacyIds=new Set(cloudProfiles.flatMap(p=>[p.id,p.legacyId]).filter(Boolean));
  const legacyVisible=cloudLegacyAdvisors.filter(a=>!profileLegacyIds.has(a.id));

  store={
    clientes:clients.map(r=>({
      ...cloudCleanObject(r.payload || {}),
      id:r.id,nombre:r.name,telefono:r.phone || '',curp:r.curp || '',
      servicio:r.service_id || '',etapa:r.stage,asesorId:r.advisor_id || r.legacy_advisor_id || null,
      colaboradorId:r.collaborator_id || null,archivado:r.archived,descartado:r.discarded,
      fechaRegistro:(r.payload || {}).fechaRegistro || r.created_at,
    })),
    leads:leads.map(r=>({
      ...cloudCleanObject(r.payload || {}),
      id:r.id,nombre:r.name,telefono:r.phone || '',curp:r.curp || '',
      servicio:r.service_id || '',estado:r.status,archivoTipo:r.archive_type || null,
      fechaRecontacto:r.recontact_date || null,asesorId:r.advisor_id || r.legacy_advisor_id || null,
      colaboradorId:r.collaborator_id || null,
    })),
    agenda:events.map(r=>({
      ...cloudCleanObject(r.payload || {}),
      id:r.id,titulo:r.title,tipo:r.event_type,fecha:r.event_date,
      hora:r.event_time ? String(r.event_time).slice(0,5) : '',completado:r.completed,
      clienteId:r.client_id || null,leadId:r.lead_id || null,
      asesorId:r.advisor_id || r.legacy_advisor_id || null,
    })),
    servicios:(services.length ? services.map(r=>({...cloudCleanObject(r.payload || {}),id:r.id,nombre:r.name,activo:r.active})) : cloudDefaults.servicios.map(s=>({...s}))),
    colaboradores:collaborators.map(r=>({...cloudCleanObject(r.payload || {}),id:r.id,nombre:r.name,activo:r.active,asesorId:r.advisor_id || r.legacy_advisor_id || null})),
    asesores:[...cloudProfiles,...legacyVisible],
    plantillas:(templates.length ? templates.map(r=>({...cloudCleanObject(r.payload || {}),id:r.id,nombre:r.name,tipo:r.template_type || (r.payload || {}).tipo || 'whatsapp'})) : PLANTILLAS_DEFAULT.map(p=>({...p}))),
    configuracion:{...cloudDefaults.configuracion,...settingsPayload},
  };

  cloudKnownIds.services=new Set(services.map(r=>r.id));
  cloudKnownIds.collaborators=new Set(collaborators.map(r=>r.id));
  cloudKnownIds.leads=new Set(leads.map(r=>r.id));
  cloudKnownIds.clients=new Set(clients.map(r=>r.id));
  cloudKnownIds.agenda_events=new Set(events.map(r=>r.id));
  cloudKnownIds.message_templates=new Set(templates.map(r=>r.id));

  return {needsSeed:!services.length || !templates.length};
}

function cloudServiceRows(){
  return (store.servicios || []).map(s=>({
    organization_id:CA_ORG_ID,id:s.id,name:s.nombre || s.id,active:s.activo !== false,
    payload:cloudCleanObject(s),
  }));
}

function cloudCollaboratorRows(){
  return (store.colaboradores || []).map(c=>({
    organization_id:CA_ORG_ID,id:c.id,name:c.nombre || c.id,active:c.activo !== false,
    advisor_id:cloudIsUuid(c.asesorId) ? c.asesorId : null,
    legacy_advisor_id:cloudIsUuid(c.asesorId) ? null : (c.asesorId || null),
    payload:cloudCleanObject(c),
  }));
}

function cloudLeadRows(){
  return (store.leads || []).map(l=>({
    organization_id:CA_ORG_ID,id:l.id,name:l.nombre || 'Sin nombre',phone:l.telefono || null,curp:l.curp || null,
    service_id:l.servicio || null,status:l.estado || 'semanas',archive_type:l.archivoTipo || null,
    recontact_date:cloudDate(l.fechaRecontacto),collaborator_id:l.colaboradorId || null,
    advisor_id:cloudIsUuid(l.asesorId) ? l.asesorId : null,
    legacy_advisor_id:cloudIsUuid(l.asesorId) ? null : (l.asesorId || null),
    payload:cloudCleanObject(l),created_at:cloudTimestamp(l.fechaInicio || l.fechaRegistro),
  }));
}

function cloudClientRows(){
  return (store.clientes || []).map(c=>({
    organization_id:CA_ORG_ID,id:c.id,name:c.nombre || 'Sin nombre',phone:c.telefono || null,curp:c.curp || null,
    service_id:c.servicio || null,stage:c.etapa || stagesFor(c.servicio)[0]?.id || 'inicio',
    archived:Boolean(c.archivado),discarded:Boolean(c.descartado),collaborator_id:c.colaboradorId || null,
    advisor_id:cloudIsUuid(c.asesorId) ? c.asesorId : null,
    legacy_advisor_id:cloudIsUuid(c.asesorId) ? null : (c.asesorId || null),
    payload:cloudCleanObject(c),created_at:cloudTimestamp(c.fechaRegistro),
  }));
}

function cloudEventRows(){
  return (store.agenda || []).map(e=>({
    organization_id:CA_ORG_ID,id:e.id,title:e.titulo || 'Evento',event_type:e.tipo || 'otro',
    event_date:cloudDate(e.fecha) || fechaISOLocal(new Date()),event_time:e.hora || null,completed:Boolean(e.completado),
    client_id:e.clienteId || null,lead_id:e.leadId || null,
    advisor_id:cloudIsUuid(e.asesorId) ? e.asesorId : null,
    legacy_advisor_id:cloudIsUuid(e.asesorId) ? null : (e.asesorId || null),
    payload:cloudCleanObject(e),
  }));
}

function cloudTemplateRows(){
  return (store.plantillas || PLANTILLAS_DEFAULT).map(p=>({
    organization_id:CA_ORG_ID,id:p.id,name:p.nombre || p.id,template_type:p.tipo || 'whatsapp',payload:cloudCleanObject(p),
  }));
}

async function cloudSyncCollection(table,rows){
  const currentIds=new Set(rows.map(r=>r.id));
  const removed=[...(cloudKnownIds[table] || new Set())].filter(id=>!currentIds.has(id));
  if(rows.length){
    const {error}=await supabaseClient.from(table).upsert(rows,{onConflict:'organization_id,id'});
    if(error) throw new Error(`${table}: ${error.message}`);
  }
  if(removed.length){
    const {error}=await supabaseClient.from(table).delete().eq('organization_id',CA_ORG_ID).in('id',removed);
    if(error) throw new Error(`${table} (eliminar): ${error.message}`);
  }
  cloudKnownIds[table]=currentIds;
}

async function cloudSyncProfiles(){
  const profiles=(store.asesores || []).filter(a=>cloudIsUuid(a.id) && (isAdmin() || a.id===sesionActiva?.id));
  for(const a of profiles){
    const {error}=await supabaseClient.from('profiles').update({
      full_name:a.nombre || 'Asesor',city:a.ciudad || null,active:a.activo !== false,
    }).eq('id',a.id);
    if(error) throw new Error(`profiles: ${error.message}`);
  }
  cloudLegacyAdvisors=(store.asesores || []).filter(a=>!cloudIsUuid(a.id)).map(a=>({...cloudCleanObject(a),pin:''}));
}

async function cloudSyncNow(options={}){
  if(!cloudReady) return false;
  if(cloudSyncRunning){ cloudSyncPending=true; return true; }
  cloudSyncRunning=true;
  try{
    await cloudSyncProfiles();
    await cloudSyncCollection('collaborators',cloudCollaboratorRows());
    await cloudSyncCollection('leads',cloudLeadRows());
    await cloudSyncCollection('clients',cloudClientRows());
    await cloudSyncCollection('agenda_events',cloudEventRows());
    await cloudSyncCollection('message_templates',cloudTemplateRows());
    if(isAdmin()){
      await cloudSyncCollection('services',cloudServiceRows());
      const settingsPayload={...cloudCleanObject(store.configuracion || {}),__legacyAdvisors:cloudLegacyAdvisors};
      const {error}=await supabaseClient.from('app_settings').upsert({organization_id:CA_ORG_ID,payload:settingsPayload},{onConflict:'organization_id'});
      if(error) throw new Error(`app_settings: ${error.message}`);
    }
    return true;
  }catch(error){
    console.error('Error al guardar en Supabase',error);
    showToast('No se pudo sincronizar: '+error.message,'warn');
    if(options.throwOnError) throw error;
    return false;
  }finally{
    cloudSyncRunning=false;
    if(cloudSyncPending){ cloudSyncPending=false; await cloudSyncNow(options); }
  }
}

function cloudQueueSync(){
  if(!cloudReady) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(cloudSyncNow,250);
}

saveStore=function(){ cloudQueueSync(); };
supaGuardarCliente=async function(){ return cloudSyncNow({throwOnError:true}); };

function cloudSetLoginLoading(loading,text){
  const button=document.querySelector('#login-pin-wrap .btn-primary');
  if(button){ button.disabled=loading; button.textContent=loading?(text || 'Cargando...'):'Ingresar'; }
}

function cloudPrepareLogin(){
  const screen=document.getElementById('login-screen');
  const main=document.querySelector('.main');
  const sidebar=document.getElementById('main-sidebar');
  if(screen) screen.style.display='flex';
  if(main) main.style.display='none';
  if(sidebar) sidebar.style.display='none';
  const grid=document.getElementById('login-user-grid'); if(grid) grid.style.display='none';
  const wrap=document.getElementById('login-pin-wrap'); if(wrap) wrap.style.display='block';
  const generalSub=document.querySelector('.login-sub');
  if(generalSub){ generalSub.style.display='block'; generalSub.textContent='Casillas & Asociados — Acceso seguro'; }
  const title=document.getElementById('login-pin-title'); if(title) title.textContent='Bienvenido';
  const sub=document.getElementById('login-pin-sub'); if(sub) sub.textContent='Ingresa tu correo y contraseña';
  const req=document.getElementById('pwd-requisitos'); if(req) req.style.display='none';
  let email=document.getElementById('login-email-input');
  if(!email){
    email=document.createElement('input');
    email.id='login-email-input';email.type='email';email.className='form-input';email.placeholder='Correo electrónico';
    email.autocomplete='username';email.style.marginBottom='8px';
    const password=document.getElementById('login-password-input');
    password?.parentElement?.parentElement?.insertBefore(email,password.parentElement);
  }
  const password=document.getElementById('login-password-input');
  if(password){ password.value='';password.autocomplete='current-password';password.onkeydown=e=>{if(e.key==='Enter') cloudLogin();}; }
  const primary=document.querySelector('#login-pin-wrap .btn-primary'); if(primary) primary.onclick=cloudLogin;
  const back=wrap?.querySelector('.btn:not(.btn-primary)'); if(back) back.style.display='none';
  const error=document.getElementById('pin-login-error'); if(error) error.textContent='';
  cloudSetLoginLoading(false);
  setTimeout(()=>email?.focus(),100);
}

async function cloudLogin(){
  const email=(document.getElementById('login-email-input')?.value || '').trim();
  const password=document.getElementById('login-password-input')?.value || '';
  const errorBox=document.getElementById('pin-login-error'); if(errorBox) errorBox.textContent='';
  if(!email || !password){ if(errorBox) errorBox.textContent='Ingresa correo y contraseña'; return; }
  cloudSetLoginLoading(true,'Verificando...');
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){
    cloudSetLoginLoading(false);
    if(errorBox) errorBox.textContent='Correo o contraseña incorrectos';
    return;
  }
  await cloudEnterSession(data.session);
}

async function cloudEnterSession(session){
  cloudSetLoginLoading(true,'Cargando información...');
  try{
    const loadState=await cloudLoadStore();
    const profile=store.asesores.find(a=>a.id===session.user.id);
    if(!profile || profile.activo===false) throw new Error('El perfil no está activo');
    sesionActiva={...profile,email:session.user.email};
    cloudReady=true;
    if(isAdmin() && loadState?.needsSeed) await cloudSyncNow({throwOnError:true});
    const screen=document.getElementById('login-screen'); if(screen) screen.style.display='none';
    const main=document.querySelector('.main'); if(main) main.style.display='flex';
    const sidebar=document.getElementById('main-sidebar'); if(sidebar) sidebar.style.display='flex';
    currentPage='dashboard';
    actualizarSidebarSesion();updateRolUI();aplicarOrdenSidebar();procesarRecontactosLeads();
    navigate('dashboard',document.querySelector('[data-page="dashboard"]'));
    iniciarRecordatorioEventos();initSidebarState();
  }catch(error){
    console.error(error);
    await supabaseClient.auth.signOut();
    cloudReady=false;
    cloudPrepareLogin();
    const errorBox=document.getElementById('pin-login-error'); if(errorBox) errorBox.textContent='No se pudo cargar el CRM: '+error.message;
  }finally{ cloudSetLoginLoading(false); }
}

mostrarLogin=cloudPrepareLogin;
verificarLoginPin=cloudLogin;
volverLoginGrid=cloudPrepareLogin;
cerrarSesion=async function(){
  cloudReady=false;
  await supabaseClient.auth.signOut();
  sesionActiva=null;
  store={clientes:[],servicios:[],agenda:[],asesores:[],colaboradores:[],leads:[],configuracion:{...cloudDefaults.configuracion}};
  cloudPrepareLogin();
};

guardarPinAdmin=async function(){
  const nuevo=document.getElementById('pin-nuevo')?.value || '';
  const confirmar=document.getElementById('pin-confirmar')?.value || '';
  const errorBox=document.getElementById('pin-config-error');
  if(!passwordValida(nuevo)){ if(errorBox){errorBox.textContent='Debe incluir 8 caracteres, mayúscula, minúscula, número y símbolo';errorBox.style.display='block';} return; }
  if(nuevo!==confirmar){ if(errorBox){errorBox.textContent='Las contraseñas no coinciden';errorBox.style.display='block';} return; }
  const {error}=await supabaseClient.auth.updateUser({password:nuevo});
  if(error){ if(errorBox){errorBox.textContent=error.message;errorBox.style.display='block';} return; }
  if(errorBox) errorBox.style.display='none';
  document.getElementById('pin-nuevo').value='';document.getElementById('pin-confirmar').value='';
  closePopup('popup-pin-config');showToast('Contraseña actualizada','success');
};

openPinAutorizacion=function(clienteId){
  pinCallbackClienteId=clienteId;
  const email=document.getElementById('pin-email-field');
  const password=document.getElementById('pin-input-field');
  const error=document.getElementById('pin-error');
  if(email) email.value=isAdmin()?(sesionActiva?.email || ''):'';
  if(password) password.value='';
  if(error) error.style.display='none';
  document.getElementById('popup-pin')?.classList.add('open');
  setTimeout(()=>isAdmin()?password?.focus():email?.focus(),50);
};

verificarPinAdmin=async function(){
  const email=(document.getElementById('pin-email-field')?.value || '').trim();
  const password=document.getElementById('pin-input-field')?.value || '';
  const errorBox=document.getElementById('pin-error');
  if(errorBox) errorBox.style.display='none';
  if(!email || !password){ if(errorBox){errorBox.textContent='Ingresa correo y contraseña del administrador.';errorBox.style.display='block';} return; }
  const verifier=window.supabase.createClient(
    window.CA_CLOUD_CONFIG.supabaseUrl,
    window.CA_CLOUD_CONFIG.supabasePublishableKey,
    {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
  );
  try{
    const {data,error}=await verifier.auth.signInWithPassword({email,password});
    if(error || !data.user) throw new Error('Credenciales incorrectas');
    const {data:profile,error:profileError}=await verifier.from('profiles').select('id,full_name,role,active').eq('id',data.user.id).single();
    if(profileError || !profile || profile.role!=='admin' || profile.active!==true) throw new Error('La cuenta no es un administrador activo');
    const cliente=store.clientes.find(x=>x.id===pinCallbackClienteId);
    if(cliente){
      cliente.autorizadoSinFirma=true;
      cliente.autorizadoSinFirmaBy=profile.full_name || 'Administrador';
      cliente.autorizadoSinFirmaFecha=fmtDateTime(new Date());
      addHist(cliente,'autorizacion','⚠ Avance sin firma autorizado por '+cliente.autorizadoSinFirmaBy+' — '+cliente.autorizadoSinFirmaFecha);
      await cloudSyncNow({throwOnError:true});
      closePopup('popup-pin');showToast('Autorización concedida. Puedes avanzar la etapa.','success');openPerfil(pinCallbackClienteId);
    }
  }catch(error){
    if(errorBox){errorBox.textContent=error.message || 'No fue posible autorizar';errorBox.style.display='block';}
    const passwordInput=document.getElementById('pin-input-field');if(passwordInput){passwordInput.value='';passwordInput.focus();}
  }finally{ await verifier.auth.signOut(); }
};

async function cloudInvokeAdvisor(body){
  const {data,error}=await supabaseClient.functions.invoke('manage-advisor',{body});
  if(error) throw new Error(data?.error || error.message || 'No se pudo ejecutar la gestión de asesores');
  if(data?.error) throw new Error(data.error);
  return data;
}

guardarAsesor=async function(){
  const nombre=(getVal('as-nombre') || '').trim();
  const email=(getVal('as-email') || '').trim().toLowerCase();
  const password=getVal('as-pin');
  const password2=getVal('as-pin2');
  if(!nombre || !email){showToast('Nombre y correo son obligatorios','warn');return;}
  if(!/^\S+@\S+\.\S+$/.test(email)){showToast('Ingresa un correo válido','warn');return;}
  const anterior=editingAsesorId?store.asesores.find(a=>a.id===editingAsesorId):null;
  const creandoCuenta=!anterior || !cloudIsUuid(anterior.id);
  if(creandoCuenta&&!password){showToast('Crea una contraseña temporal para el asesor','warn');return;}
  if(password&&!passwordValida(password)){showToast('La contraseña no cumple todos los requisitos','warn');return;}
  if(password&&password!==password2){showToast('Las contraseñas no coinciden','warn');return;}
  try{
    const result=await cloudInvokeAdvisor({
      action:'upsert',
      id:anterior&&cloudIsUuid(anterior.id)?anterior.id:null,
      legacyId:anterior&&!cloudIsUuid(anterior.id)?anterior.id:(anterior?.legacyId || null),
      fullName:nombre,email,password,city:getVal('as-ciudad'),
      role:getVal('as-rol')==='admin'?'admin':'advisor',
      active:getVal('as-activo')!=='false',
    });
    const userId=result.userId;
    let foto=anterior?.foto || '';
    let fotoPath=anterior?.fotoPath || '';
    if(asesorFotoTemp){
      fotoPath=`${CA_ORG_ID}/${userId}/avatar.jpg`;
      await cloudUploadDataUrl('crm-avatars',fotoPath,asesorFotoTemp);
      const {error}=await supabaseClient.from('profiles').update({photo_path:fotoPath}).eq('id',userId);
      if(error) throw error;
      foto=await cloudSignedAvatar(fotoPath);
    }
    const asesor={
      id:userId,legacyId:anterior&&!cloudIsUuid(anterior.id)?anterior.id:(anterior?.legacyId || ''),
      nombre,ciudad:getVal('as-ciudad'),email:result.email || email,
      rol:getVal('as-rol')==='admin'?'admin':'asesor',activo:getVal('as-activo')!=='false',
      foto,fotoPath,fechaAlta:anterior?.fechaAlta || new Date().toISOString(),cloudUser:true,
    };
    if(anterior){
      const oldId=anterior.id;
      for(const collection of [store.clientes,store.leads,store.agenda,store.colaboradores]){
        for(const item of (collection || [])) if(item.asesorId===oldId) item.asesorId=userId;
      }
      const index=store.asesores.findIndex(a=>a.id===oldId);if(index>=0) store.asesores[index]=asesor;
    }else store.asesores.push(asesor);
    if(sesionActiva?.id===userId){sesionActiva={...asesor};actualizarSidebarSesion();}
    await cloudSyncNow({throwOnError:true});
    closeModal('modal-asesor');renderPage('asesores');showToast(anterior?'Asesor actualizado':'Asesor creado','success');
  }catch(error){console.error(error);showToast('No se pudo guardar el asesor: '+error.message,'warn');}
};

eliminarAsesor=async function(){
  const asesor=store.asesores.find(a=>a.id===editingAsesorId);
  if(!asesor) return;
  if(asesor.id===sesionActiva?.id){showToast('No puedes eliminar tu propia cuenta','warn');return;}
  if(!confirm('¿Eliminar este asesor? Sus clientes quedarán sin asesor asignado.')) return;
  try{
    if(cloudIsUuid(asesor.id)) await cloudInvokeAdvisor({action:'delete',id:asesor.id});
    store.asesores=store.asesores.filter(a=>a.id!==asesor.id);
    for(const collection of [store.clientes,store.leads,store.agenda,store.colaboradores]){
      for(const item of (collection || [])) if(item.asesorId===asesor.id) item.asesorId=null;
    }
    await cloudSyncNow({throwOnError:true});
    closeModal('modal-asesor');renderPage('asesores');showToast('Asesor eliminado','info');
  }catch(error){console.error(error);showToast('No se pudo eliminar el asesor: '+error.message,'warn');}
};

async function cloudSha256(text){
  try{
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){ return null; }
}

async function cloudUploadDataUrl(bucket,path,dataUrl){
  if(!String(dataUrl || '').startsWith('data:image/')) return null;
  const blob=await (await fetch(dataUrl)).blob();
  const {error}=await supabaseClient.storage.from(bucket).upload(path,blob,{upsert:true,contentType:blob.type || 'image/png'});
  if(error) throw error;
  return path;
}

guardarLogo=async function(){
  if(!logoTempBase64){closeModal('modal-logo');return;}
  try{
    const logoPath=`${CA_ORG_ID}/logo.png`;
    await cloudUploadDataUrl('crm-branding',logoPath,logoTempBase64);
    const {data}=supabaseClient.storage.from('crm-branding').getPublicUrl(logoPath);
    store.configuracion.logo_empresa=data.publicUrl+`?v=${Date.now()}`;
    await cloudSyncNow({throwOnError:true});
    actualizarLogoSidebar();closeModal('modal-logo');logoTempBase64='';showToast('Logo guardado','success');
  }catch(error){console.error(error);showToast('No se pudo guardar el logo: '+error.message,'warn');}
};

quitarLogo=async function(){
  store.configuracion.logo_empresa='';logoTempBase64='';
  try{await cloudSyncNow({throwOnError:true});actualizarLogoSidebar();closeModal('modal-logo');showToast('Logo eliminado','info');}
  catch(error){showToast('No se pudo actualizar el logo: '+error.message,'warn');}
};

toggleTheme=function(){
  const current=document.documentElement.getAttribute('data-theme');
  const next=current==='dark'?'light':'dark';
  localStorage.setItem('ca_crm_theme',next);applyTheme(next);
  if(isAdmin()){store.configuracion.tema=next;saveStore();}
  destroyCharts();if(currentPage==='dashboard') setTimeout(initCharts,50);
};

async function cloudImportBackup(data,sourceFilename,rawText){
  if(!isAdmin()) throw new Error('Solo un administrador puede importar el respaldo');
  if(!data || !Array.isArray(data.clientes) || !Array.isArray(data.leads || [])) throw new Error('El archivo no tiene el formato esperado');
  if((store.clientes || []).length || (store.leads || []).length) throw new Error('La nube ya contiene registros. La importación inicial fue bloqueada para evitar duplicados.');

  const {data:{user}}=await supabaseClient.auth.getUser();
  const hash=await cloudSha256(rawText);
  const {error:backupError}=await supabaseClient.from('legacy_imports').insert({
    organization_id:CA_ORG_ID,imported_by:user.id,source_filename:sourceFilename,sha256:hash,payload:data,
  });
  if(backupError) throw new Error('No se pudo preservar el respaldo original: '+backupError.message);

  const legacyAdvisors=(data.asesores || []).map(a=>({...cloudCleanObject(a),pin:''}));
  const legacyAdmin=legacyAdvisors.find(a=>a.rol==='admin') || legacyAdvisors[0] || null;
  const currentProfile=store.asesores.find(a=>a.id===user.id);
  if(legacyAdmin){
    const update={legacy_id:legacyAdmin.id || null,full_name:legacyAdmin.nombre || currentProfile.nombre,city:legacyAdmin.ciudad || currentProfile.ciudad || null};
    if(legacyAdmin.foto){
      const extension=legacyAdmin.foto.includes('image/png')?'png':'jpg';
      const avatarPath=`${CA_ORG_ID}/${user.id}/avatar.${extension}`;
      await cloudUploadDataUrl('crm-avatars',avatarPath,legacyAdmin.foto);
      update.photo_path=avatarPath;
    }
    const {error}=await supabaseClient.from('profiles').update(update).eq('id',user.id);
    if(error) throw new Error('No se pudo vincular el administrador: '+error.message);
  }

  const adminLegacyId=legacyAdmin?.id || null;
  const mapAdvisor=id=>id && id===adminLegacyId ? user.id : id;
  const sanitizeRecord=record=>({...cloudCleanObject(record),asesorId:mapAdvisor(record.asesorId)});
  const importedConfig={...cloudDefaults.configuracion,...cloudCleanObject(data.configuracion || {})};
  delete importedConfig.pin_admin;

  if(importedConfig.logo_empresa){
    const extension=importedConfig.logo_empresa.includes('image/svg')?'svg':importedConfig.logo_empresa.includes('image/jpeg')?'jpg':'png';
    const logoPath=`${CA_ORG_ID}/logo.${extension}`;
    await cloudUploadDataUrl('crm-branding',logoPath,importedConfig.logo_empresa);
    const {data:publicLogo}=supabaseClient.storage.from('crm-branding').getPublicUrl(logoPath);
    if(publicLogo?.publicUrl) importedConfig.logo_empresa=publicLogo.publicUrl;
  }

  cloudLegacyAdvisors=legacyAdvisors.filter(a=>a.id!==adminLegacyId);
  store.configuracion=importedConfig;
  store.servicios=(data.servicios || cloudDefaults.servicios).map(s=>cloudCleanObject(s));
  store.colaboradores=(data.colaboradores || []).map(sanitizeRecord);
  store.leads=(data.leads || []).map(sanitizeRecord);
  store.clientes=(data.clientes || []).map(sanitizeRecord);
  store.agenda=(data.agenda || []).map(sanitizeRecord);
  store.plantillas=(data.plantillas || PLANTILLAS_DEFAULT).map(p=>cloudCleanObject(p));
  store.asesores=[{...currentProfile,id:user.id,legacyId:adminLegacyId,nombre:legacyAdmin?.nombre || currentProfile.nombre,ciudad:legacyAdmin?.ciudad || currentProfile.ciudad,rol:'admin',activo:true},...cloudLegacyAdvisors];

  await cloudSyncNow({throwOnError:true});
  await cloudLoadStore();
  sesionActiva=store.asesores.find(a=>a.id===user.id);
}

procesarImport=function(input){
  const file=input.files?.[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async event=>{
    try{
      const raw=String(event.target.result || '');
      const data=JSON.parse(raw);
      const mensaje=`¿Importar ${data.clientes?.length || 0} clientes, ${data.leads?.length || 0} prospectos y ${data.agenda?.length || 0} eventos a Supabase?`;
      if(!confirm(mensaje)){ input.value=''; return; }
      showToast('Importando respaldo; no cierres esta ventana...','info');
      await cloudImportBackup(data,file.name,raw);
      showToast('Respaldo importado correctamente','success');
      renderPage('dashboard');actualizarSidebarSesion();
    }catch(error){
      console.error(error);showToast('Importación detenida: '+error.message,'warn');
    }finally{ input.value=''; }
  };
  reader.readAsText(file);
};

async function initCloudApp(){
  loadNavOrder();
  applyTheme(localStorage.getItem('ca_crm_theme') || 'dark');
  const {data:{session},error}=await supabaseClient.auth.getSession();
  if(error) console.error(error);
  if(session) await cloudEnterSession(session);
  else cloudPrepareLogin();
}

window.addEventListener('beforeunload',()=>{ if(cloudReady) cloudQueueSync(); });
