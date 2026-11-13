import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
function allowedOrigin(origin:string){return origin==='https://jeanmaxx.github.io'||origin==='http://localhost:8000'||origin==='http://127.0.0.1:8000'||/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)}
function corsHeaders(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://jeanmaxx.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'}}
function respond(req:Request,status:number,payload:Record<string,unknown>){return new Response(JSON.stringify(payload),{status,headers:corsHeaders(req)})}
const upper=(v:unknown)=>String(v??'').trim().toLocaleUpperCase('es-MX');const text=(v:unknown)=>String(v??'').trim();
function numberValue(v:unknown){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function initialStatus(s:string){if(s==='asesoria_pension')return'pensiones';if(s==='correccion_imss')return'correccion_imss';return'semanas'}
function portalPhase(p:any){const v=Number(p?.portalFase||1);return Number.isFinite(v)?Math.max(1,Math.min(5,Math.trunc(v))):1}
function serializeLead(row:any,guideSteps:any={}){const p=row.payload||{};return{id:row.id,name:row.name,phone:row.phone||'',curp:row.curp||'',serviceId:row.service_id||'retiro_desempleo',internalStatus:row.status,createdAt:row.created_at,updatedAt:row.updated_at,phase:portalPhase(p),steps:p.portalPasos||{},guideSteps:guideSteps||{},honorariosManejados:p.honorariosManejados??'',city:p.ciudad||'',afore:p.afore||'',aforeMovil:p.aforeMovil||'',bank:p.banco||'',bankLevel4:p.cuentaNivel4||'',notes:p.notas||'',address:p.domicilio||'',waitingSignatureConfirmation:p.portalPendienteConfirmacionFirma===true}}
function collaboratorCommission(c:any,col:any){const p=c.payload||{},base=Number(p.comision??p.comisionCalc??0)||0,pct=Number(p.colPct??col?.payload?.pctComision??0)||0;return Math.round(base*(pct/100)*100)/100}
function paymentCollected(p:any){const s=String(p?.estadoPago||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return['cobrado','pagado','recibido','liquidado'].some(x=>s.includes(x))}
function stageRank(stage:string){const o=['generando_contrato','contrato_firmas','contrato_firmado','dado_alta','afore_actualizada','solicitud_realizada','solicitud_rechazada','deposito_recibido','honorarios_recibidos','concluido'];const i=o.indexOf(stage);return i<0?0:i}
function retirementProgress(stage:string,p:any){const r=stageRank(stage),hasAppointment=Boolean(p.fechaBiometrica||p.fechaCitaAfore||p.citaAforeFecha||p.horaBiometrica||p.horaCitaAfore||p.sucursalAfore);const done:any={6:r>=stageRank('dado_alta'),7:hasAppointment||r>=stageRank('afore_actualizada'),8:r>=stageRank('afore_actualizada'),9:r>=stageRank('solicitud_realizada'),10:r>=stageRank('deposito_recibido'),11:r>=stageRank('honorarios_recibidos')};let current=11;for(let s=6;s<=11;s++){if(!done[s]){current=s;break}}return{current,done,rejected:stage==='solicitud_rechazada'}}
function safeHistory(p:any){const allowed=new Set(['etapa','agenda','contrato','fecha','colaborador']),entries=Array.isArray(p?.historial)?p.historial:[];return entries.filter((h:any)=>allowed.has(String(h?.tipo||''))).slice(-14).map((h:any)=>({type:String(h?.tipo||''),text:String(h?.texto||''),date:String(h?.fecha||'')}))}
function latestContract(p:any){const v=Array.isArray(p?.historialContratos)?p.historialContratos.filter((x:any)=>x?.docxPath):[];v.sort((a:any,b:any)=>String(b?.fecha||'').localeCompare(String(a?.fecha||'')));const x=v[0];return x?{available:true,id:String(x.id||''),date:String(x.fecha||''),service:String(x.servicio||''),templateVersion:String(x.templateVersion||'')}:{available:false,id:'',date:'',service:'',templateVersion:''}}
function firstDate(p:any,fields:string[]){for(const field of fields){const value=String(p?.[field]||'').trim();if(value)return value}return''}
function serializeClient(row:any,col:any,guideSteps:any={}){const p=row.payload||{},serviceId=row.service_id||p.servicio||'retiro_desempleo',progress=serviceId==='retiro_desempleo'?retirementProgress(row.stage,p):{current:6,done:{6:false,7:false,8:false,9:false,10:false,11:false},rejected:false},source=p.prospectoOrigen||{},collected=paymentCollected(p);return{id:row.id,name:row.name,phone:row.phone||p.telefono||'',curp:row.curp||p.curp||'',serviceId,stage:row.stage,address:typeof p.domicilio==='string'?p.domicilio:'',activities:{...(p.portalActividades||{}),...Object.fromEntries(Object.entries(p.etapasOperativasV2||{}).map(([id,value]:[string,any])=>[id==='firmado'?'firma':id==='banco_n4'?'banco':id,{...value,done:Boolean(value?.done)}]))},operationalSteps:p.etapasOperativasV2||{},documentChecks:p.etapasOperativasV2?.documentos?.checks||{},verifications:p.portalVerificaciones||{},registeredAt:String(p.fechaAltaAfore||''),requestDate:String(p.fechaSolicitudRealizada||p.fechaSolicitudManual||''),createdAt:row.created_at,updatedAt:row.updated_at,progress,guideSteps:guideSteps||{},signature:{signed:row.stage!=='contrato_firmas'&&Boolean(p.contratoFirmado||p.fechaFirmaContrato),date:p.fechaFirmaContrato||'',confirmedBy:p.firmaConfirmadaPor||''},afore:p.afore||source.afore||'',aforeMovil:p.aforeMovil||source.aforeMovil||'',bank:p.banco||source.banco||'',bankLevel4:p.cuentaNivel4||((p.nivelCuentaBBVA==='4')?'si':'')||source.cuentaNivel4||'',appointment:{date:String(p.fechaBiometrica||p.fechaCitaAfore||p.citaAforeFecha||''),time:String(p.horaBiometrica||p.horaCitaAfore||p.citaAforeHora||''),branch:String(p.sucursalAfore||p.direccionCitaAfore||p.citaAforeSucursal||'')},contract:latestContract(p),history:safeHistory(p),commission:collaboratorCommission(row,col),paymentStatus:String(p.estadoPago||'Pendiente'),collected,expectedPaymentDate:firstDate(p,['fechaRetiroEstimada','fechaSolicitudManual','fechaSolicitudRealizada','fechaAltaAfore']),paidDate:firstDate(p,['fechaCierre','fechaHonorarios','fechaDeposito','fechaRetiroReal']),archived:row.archived===true,discarded:row.discarded===true}}
function bytesToBase64(bytes:Uint8Array){let binary='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return btoa(binary)}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(req)});if(req.method!=='POST')return respond(req,405,{error:'Método no permitido'});try{
const body=await req.json().catch(()=>({})),action=String(body.action||'bootstrap');if(!['bootstrap','create_prospect','update_prospect','update_client_info','complete_activity','confirm_contract_signature','complete_step','get_contract','record_contract_download','guide_toggle','guide_reset'].includes(action))return respond(req,400,{error:'Acción inválida'});const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,authorization=req.headers.get('Authorization');if(!authorization)return respond(req,401,{error:'Sesión requerida'});const callerClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}}),{data:authData,error:authError}=await callerClient.auth.getUser();if(authError||!authData.user)return respond(req,401,{error:'Sesión inválida'});const admin=createClient(url,service,{auth:{persistSession:false}});const {data:account,error:accountError}=await admin.from('collaborator_accounts').select('user_id,organization_id,collaborator_id,email,active').eq('user_id',authData.user.id).maybeSingle();if(accountError)throw accountError;if(!account||account.active!==true)return respond(req,403,{error:'Tu acceso al Portal de Colaboradores no está activo'});const expectedTenantSlug=String(body.tenantSlug||'').trim().toLowerCase();const {data:organization,error:organizationError}=await admin.from('organizations').select('id,name,slug').eq('id',account.organization_id).maybeSingle();if(organizationError)throw organizationError;if(!organization)return respond(req,403,{error:'La organización de esta cuenta ya no está disponible'});if(expectedTenantSlug&&String(organization.slug||'').toLowerCase()!==expectedTenantSlug)return respond(req,403,{error:'Esta cuenta no corresponde a la organización de este enlace'});const {data:tenant}=await admin.from('platform_tenants').select('status,suspension_reason').eq('organization_id',account.organization_id).maybeSingle();if(tenant&&['suspended','cancelled'].includes(String(tenant.status)))return respond(req,403,{error:tenant.status==='cancelled'?'El servicio de esta organización está cancelado':('El servicio de esta organización está suspendido'+(tenant.suspension_reason?': '+tenant.suspension_reason:''))});const {data:moduleAllowed,error:moduleError}=await admin.rpc('organization_module_allowed',{target_org:account.organization_id,module_name:'collaborators'});if(moduleError)throw moduleError;if(moduleAllowed!==true)return respond(req,403,{error:'El Portal de Colaboradores no está incluido en el plan de esta organización'});const {data:collaborator,error:collabError}=await admin.from('collaborators').select('id,name,advisor_id,active,payload').eq('organization_id',account.organization_id).eq('id',account.collaborator_id).single();if(collabError||!collaborator||collaborator.active===false)return respond(req,403,{error:'El colaborador está inactivo'});if(!collaborator.advisor_id)return respond(req,409,{error:'Tu cuenta todavía no tiene un asesor asignado'});

const appendActivity=async(actionName:string,leadId:string|null,detail:Record<string,unknown>)=>{const {error}=await admin.from('collaborator_portal_activity').insert({organization_id:account.organization_id,collaborator_id:collaborator.id,actor_user_id:authData.user!.id,lead_id:leadId,action:actionName,detail});if(error)console.error('activity',error.message)};
const getOwnClient=async(clientId:string)=>{const {data,error}=await admin.from('clients').select('id,name,phone,curp,service_id,stage,archived,discarded,payload,created_at,updated_at,collaborator_id').eq('organization_id',account.organization_id).eq('id',clientId).eq('collaborator_id',collaborator.id).eq('advisor_id',collaborator.advisor_id).maybeSingle();if(error)throw error;return data};
const appendClientHistory=async(client:any,message:string)=>{const event={tipo:'colaborador',texto:message,fecha:new Date().toISOString(),usuario:`Colaborador: ${collaborator.name}`,usuarioId:authData.user!.id};const {error}=await admin.rpc('append_collaborator_client_history',{p_organization_id:account.organization_id,p_client_id:client.id,p_collaborator_id:collaborator.id,p_event:event});if(error)throw error};
if(action==='bootstrap'){
 const [{data:advisor},{data:services},{data:leads,error:leadsError},{data:clients,error:clientsError},{data:content,error:contentError},{data:progress,error:progressError},{data:templates,error:templatesError}]=await Promise.all([
  admin.from('profiles').select('id,full_name').eq('id',collaborator.advisor_id).maybeSingle(),
  admin.from('services').select('id,name,active').eq('organization_id',account.organization_id).eq('active',true).order('name'),
  admin.from('leads').select('id,name,phone,curp,service_id,status,payload,created_at,updated_at').eq('organization_id',account.organization_id).eq('collaborator_id',collaborator.id).order('created_at',{ascending:false}),
  admin.from('clients').select('id,name,phone,curp,service_id,stage,archived,discarded,payload,created_at,updated_at').eq('organization_id',account.organization_id).eq('collaborator_id',collaborator.id).order('updated_at',{ascending:false}),
  admin.from('collaborator_guide_content').select('slug,title,subtitle,icon,body,source_label,source_url,sort_order').eq('organization_id',account.organization_id).eq('active',true).order('sort_order'),
  admin.from('collaborator_guide_progress').select('record_type,record_id,steps').eq('organization_id',account.organization_id).eq('collaborator_id',collaborator.id),
  admin.from('message_templates').select('id,name,template_type,payload').eq('organization_id',account.organization_id).eq('template_type','whatsapp')
 ]);if(leadsError)throw leadsError;if(clientsError)throw clientsError;if(contentError)throw contentError;if(progressError)throw progressError;if(templatesError)throw templatesError;
 const guide=new Map((progress||[]).map((x:any)=>[`${x.record_type}:${x.record_id}`,x.steps||{}]));const leadRows=leads||[],clientRows=clients||[],opportunities=leadRows.length+clientRows.length,converted=clientRows.length,effectiveness=opportunities?Math.round(converted/opportunities*1000)/10:0;let collected=0,pending=0;for(const client of clientRows){const amount=collaboratorCommission(client,collaborator);if(paymentCollected(client.payload))collected+=amount;else pending+=amount}
 return respond(req,200,{ok:true,organization:{id:organization.id,name:organization.name,slug:organization.slug},collaborator:{id:collaborator.id,name:collaborator.name,nombres:collaborator.payload?.nombres||'',apellidos:collaborator.payload?.apellidos||'',email:account.email||collaborator.payload?.email||'',birthDate:collaborator.payload?.fechaNacimiento||'',city:collaborator.payload?.ciudad||'',pctComision:collaborator.payload?.pctComision??null},advisor:{id:advisor?.id||collaborator.advisor_id,name:advisor?.full_name||'Asesor asignado'},services:(services||[]).map(s=>({id:s.id,name:s.name})),dashboard:{opportunities,converted,effectiveness,collected:Math.round(collected*100)/100,pending:Math.round(pending*100)/100},prospects:leadRows.map((r:any)=>serializeLead(r,guide.get(`lead:${r.id}`)||{})),clients:clientRows.filter((c:any)=>c.discarded!==true).map((c:any)=>serializeClient(c,collaborator,guide.get(`client:${c.id}`)||{})),guideContent:content||[],messageTemplates:(templates||[]).filter((r:any)=>String(r.id).startsWith('pl_wa_')&&r.payload?.cyaGrupo&&typeof r.payload?.texto==='string').map((r:any)=>({id:r.id,name:r.name,group:String(r.payload.cyaGrupo),order:Number(r.payload.cyaOrden||1),text:String(r.payload.texto)}))})
}
if(action==='guide_toggle'||action==='guide_reset'){
 const recordType=String(body.recordType||'');const recordId=text(body.recordId);if(!['lead','client'].includes(recordType)||!recordId)return respond(req,400,{error:'Selecciona un prospecto o cliente'});const table=recordType==='lead'?'leads':'clients';const {data:owned,error:ownedError}=await admin.from(table).select('id').eq('organization_id',account.organization_id).eq('id',recordId).eq('collaborator_id',collaborator.id).maybeSingle();if(ownedError)throw ownedError;if(!owned)return respond(req,404,{error:'El registro no pertenece a tu cartera'});
 const {data:existing,error:existingError}=await admin.from('collaborator_guide_progress').select('steps').eq('organization_id',account.organization_id).eq('collaborator_id',collaborator.id).eq('record_type',recordType).eq('record_id',recordId).maybeSingle();if(existingError)throw existingError;let steps:any={...(existing?.steps||{})};
 if(action==='guide_reset')steps={};else{const step=Math.trunc(Number(body.step));if(step<1||step>11)return respond(req,400,{error:'Paso inválido'});steps[String(step)]={checked:body.checked!==false,at:new Date().toISOString()}}
 const {error}=await admin.from('collaborator_guide_progress').upsert({organization_id:account.organization_id,collaborator_id:collaborator.id,record_type:recordType,record_id:recordId,steps,updated_at:new Date().toISOString()},{onConflict:'organization_id,collaborator_id,record_type,record_id'});if(error)throw error;await appendActivity(action==='guide_reset'?'guide_reset':'guide_step_toggled',recordType==='lead'?recordId:null,{recordType,recordId,step:body.step??null,checked:body.checked??null});return respond(req,200,{ok:true,steps})
}
if(action==='get_contract'||action==='record_contract_download'){const clientId=text(body.clientId);if(!clientId)return respond(req,400,{error:'Falta el cliente'});const client=await getOwnClient(clientId);if(!client)return respond(req,404,{error:'El cliente no está disponible'});const p=client.payload||{},versions=Array.isArray(p.historialContratos)?p.historialContratos.filter((x:any)=>x?.docxPath):[];versions.sort((a:any,b:any)=>String(b?.fecha||'').localeCompare(String(a?.fecha||'')));const version=versions[0];if(!version)return respond(req,404,{error:'Todavía no hay un contrato guardado para este cliente'});if(action==='record_contract_download'){await appendClientHistory(client,`Contrato descargado en PDF por ${collaborator.name} desde Portal de Colaboradores`);await appendActivity('contract_pdf_downloaded',null,{clientId,contractId:version.id});return respond(req,200,{ok:true})}const {data:file,error:fileError}=await admin.storage.from('crm-contracts').download(version.docxPath);if(fileError||!file)throw fileError||new Error('No se pudo recuperar el contrato');const bytes=new Uint8Array(await file.arrayBuffer());await appendClientHistory(client,`Contrato consultado por ${collaborator.name} desde Portal de Colaboradores`);await appendActivity('contract_viewed',null,{clientId,contractId:version.id});return respond(req,200,{ok:true,contract:{id:String(version.id||''),date:String(version.fecha||''),fileName:`Contrato-${String(client.name||'cliente').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ -]+/g,'').trim().replace(/\s+/g,'-')}.docx`,mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',base64:bytesToBase64(bytes)}})}

if(action==='confirm_contract_signature'){
 const clientId=text(body.clientId),expected=text(body.expectedUpdatedAt),signedDate=text(body.date),note=text(body.note);
 if(!clientId||!expected)return respond(req,400,{error:'Indica el expediente y su versión'});
 if(note.length>1000)return respond(req,400,{error:'La observación excede 1000 caracteres'});
 const dateValid=/^\d{4}-\d{2}-\d{2}$/.test(signedDate)&&new Date(signedDate+'T12:00:00Z').toISOString().slice(0,10)===signedDate;
 if(!dateValid||signedDate>new Date().toISOString().slice(0,10))return respond(req,400,{error:'Indica una fecha de firma válida, no futura'});
 const client=await getOwnClient(clientId);
 if(!client||client.discarded)return respond(req,404,{error:'No tienes acceso a este expediente'});
 if(client.stage!=='contrato_firmas')return respond(req,409,{error:'La firma ya fue confirmada o el expediente no está en etapa de firma'});
 const now=new Date().toISOString(),p=client.payload||{},hist=Array.isArray(p.historial)?[...p.historial]:[];
 hist.push({tipo:'contrato',texto:'Firma de contrato confirmada por '+collaborator.name+' · Fecha real: '+signedDate+(note?' · '+note:''),fecha:now,usuario:'Colaborador: '+collaborator.name,usuarioId:authData.user!.id});
 const milestone={done:true,fecha:signedDate,actorId:authData.user!.id,registradaEn:now,nota:note||'Firma confirmada desde Portal de Colaboradores'};
  const payload={...p,contratoFirmado:true,fechaFirmaContrato:signedDate,firmaConfirmadaPor:collaborator.name,firmaConfirmadaPorId:authData.user!.id,firmaConfirmadaEn:now,etapasOperativasV2:{...(p.etapasOperativasV2||{}),firmado:milestone,firmas:p.etapasOperativasV2?.firmas||{...milestone,nota:'Marcado al confirmar firma'}},historial:hist};
 const {data:updated,error}=await admin.from('clients').update({stage:'contrato_firmado',payload,updated_at:now})
   .eq('organization_id',account.organization_id).eq('id',clientId).eq('collaborator_id',collaborator.id)
   .eq('advisor_id',collaborator.advisor_id).eq('stage','contrato_firmas').eq('updated_at',expected)
   .select('id,name,phone,curp,service_id,stage,archived,discarded,payload,created_at,updated_at,collaborator_id').maybeSingle();
 if(error)throw error;
 if(!updated)return respond(req,409,{error:'El expediente cambió. Recarga antes de confirmar la firma'});
 await appendActivity('contract_signature_confirmed',null,{clientId,date:signedDate,note});
 const eventId='ev_flujo_confirmar_firma_'+clientId;
 const {data:event}=await admin.from('agenda_events').select('id,payload').eq('organization_id',account.organization_id).eq('id',eventId).maybeSingle();
 if(event){
  const {error:agendaError}=await admin.from('agenda_events').update({completed:true,payload:{...(event.payload||{}),completado:true,completadoEn:now},updated_at:now}).eq('organization_id',account.organization_id).eq('id',eventId);
  if(agendaError)console.error('signature agenda',agendaError.message);
 }
 return respond(req,200,{ok:true,client:serializeClient(updated,collaborator)});
}
if(action==='complete_activity'){
 const clientId=text(body.clientId),key=text(body.activity),expected=text(body.expectedUpdatedAt);
 if(!clientId||!expected||!['contrato','firmas','alta','app','banco','cita','documentos','expediente','solicitud','deposito','honorarios'].includes(key))return respond(req,400,{error:'Actividad o expediente inválido'});
 const c=await getOwnClient(clientId);
 if(!c||c.discarded)return respond(req,404,{error:'Expediente no disponible'});
 if(c.service_id!=='retiro_desempleo')return respond(req,400,{error:'Actividad válida solo para retiro por desempleo'});
 const p=c.payload||{},now=new Date().toISOString(),stage=String(c.stage||'');
 const input=body.data&&typeof body.data==='object'&&!Array.isArray(body.data)?body.data:{};
 const date=(v:unknown)=>{const s=text(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return'';const d=new Date(s+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===s?s:''};
 const patch:any={};let next=stage;
  if(key==='contrato'&&!latestContract(p).available)return respond(req,409,{error:'Primero genera el contrato en el CRM'});
  if(key==='firmas'&&!['generando_contrato','contrato_firmas'].includes(stage))return respond(req,409,{error:'El contrato ya superó firmas. Confirma la firma real desde el expediente'});
  if(key==='firmas'&&stage==='generando_contrato')next='contrato_firmas';
  if(key==='documentos'){
    const docs=input.checks||{};
    if(!['curp','csf','acta'].every(k=>docs[k]===true))return respond(req,400,{error:'Confirma CURP, Constancia de Situación Fiscal y Acta de Nacimiento'});
    patch.docs={...(p.docs||{}),curp:true,acta:true,csf:true};
  }

 if(key==='alta'){
   if(['generando_contrato','contrato_firmas'].includes(stage))return respond(req,409,{error:'Primero debe confirmarse la firma'});
   if(!date(input.date))return respond(req,400,{error:'Registra fecha del alta'});
   patch.fechaAltaAfore=date(input.date);if(stage==='contrato_firmado')next='dado_alta';
 }
 if(key==='app'){if(text(input.installed)!=='si')return respond(req,400,{error:'Confirma instalación de AforeMóvil'});patch.aforeMovil='si';}
 if(key==='banco'){
   const bank=text(input.bank).slice(0,100);
   if(!bank||text(input.level)!=='4')return respond(req,400,{error:'Indica banco y nivel 4'});
   patch.banco=bank;patch.cuentaNivel4='si';if(bank.toLowerCase()==='bbva')patch.nivelCuentaBBVA='4';
 }
 if(key==='cita'){
   const d=date(input.date),time=text(input.time),branch=text(input.branch).slice(0,180);
   if(!d||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!branch)return respond(req,400,{error:'Indica fecha, hora y sucursal'});
   patch.fechaBiometrica=d;patch.horaBiometrica=time;patch.sucursalAfore=branch;
   if(input.afore)patch.afore=text(input.afore).slice(0,100);
 }
 if(key==='expediente'){
   if(!['dado_alta','afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(stage)||!text(p.fechaBiometrica))return respond(req,409,{error:'Primero registra alta y cita AFORE'});
   if(stage==='dado_alta')next='afore_actualizada';
 }
 if(key==='solicitud'){
   if(!['afore_actualizada','solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(stage))return respond(req,409,{error:'Primero actualiza expediente AFORE'});
   if(!date(input.date))return respond(req,400,{error:'Registra fecha de solicitud'});
   patch.fechaSolicitudRealizada=date(input.date);if(stage==='afore_actualizada')next='solicitud_realizada';
 }
 if(key==='deposito'||key==='honorarios'){
   const verifier=text(input.verifier),notes=text(input.notes);
   if(!['advisor','jorge_casillas','fernanda_massiel'].includes(verifier))return respond(req,400,{error:'Selecciona quién verificó el pago'});
   if(notes.length>1000)return respond(req,400,{error:'Las notas no pueden superar los 1000 caracteres'});
   if(key==='deposito'&&!['solicitud_realizada','deposito_recibido','honorarios_recibidos','concluido'].includes(stage))return respond(req,409,{error:'Primero debe registrarse la solicitud en aplicación'});
   if(key==='honorarios'&&!['deposito_recibido','honorarios_recibidos','concluido'].includes(stage))return respond(req,409,{error:'Primero debe constar la recepción de depósito'});
   const prev=p.portalActividades?.[key];
   if(prev?.done)return respond(req,409,{error:'La verificación ya fue registrada. Actualiza el expediente.'});
   let verifierName=verifier==='jorge_casillas'?'Jorge Casillas':verifier==='fernanda_massiel'?'Fernanda Massiel':'';
   if(verifier==='advisor'){
     const {data:advisor,error:advisorError}=await admin.from('profiles').select('full_name').eq('id',collaborator.advisor_id).single();
     if(advisorError||!advisor)throw advisorError||new Error('No se encontró al asesor asignado');
     verifierName=String(advisor.full_name||'Asesor asignado');
   }
   // Es una constancia de verificación externa, no una aprobación hecha desde el CRM.
   patch.portalVerificaciones={...(p.portalVerificaciones||{}),[key]:{verifier,verifierName,notes,recordedBy:collaborator.name,recordedByUserId:authData.user!.id,recordedAt:now,source:'external_confirmation'}};
   if(key==='deposito'&&stage==='solicitud_realizada')next='deposito_recibido';
   // La verificación externa de honorarios NO liquida Finanzas ni cierra el expediente.
 }
 const titles:any={contrato:'Contrato generado',firmas:'Contrato enviado a firmas',documentos:'Documentos integrados',alta:'Cliente dado de alta',app:'App AforeMóvil instalada',banco:'Cuenta bancaria nivel 4',cita:'Cita AFORE',expediente:'Expediente AFORE actualizado',solicitud:'Solicitud en aplicación',deposito:'Recepción de depósito (verificación externa)',honorarios:'Pago de honorarios (verificación externa)'};
 const history=Array.isArray(p.historial)?[...p.historial]:[];
 const verifierMessage=(key==='deposito'||key==='honorarios')?' · Verificó: '+patch.portalVerificaciones[key].verifierName+(patch.portalVerificaciones[key].notes?' · Nota: '+patch.portalVerificaciones[key].notes:''):'';
 history.push({tipo:'colaborador',texto:collaborator.name+' registró: '+titles[key]+verifierMessage,fecha:now,usuario:'Colaborador: '+collaborator.name,usuarioId:authData.user!.id});
 const canonicalKey=key==='firma'?'firmado':key==='banco'?'banco_n4':key;
  const confirmedDate=date(input.date)||now.slice(0,10);
  const canon={done:true,fecha:confirmedDate,actorId:authData.user!.id,registradaEn:now,nota:text(input.notes)||'Confirmado desde Portal de Colaboradores',...(key==='documentos'?{checks:{curp:true,csf:true,acta:true}}:{})};
  const payload={...p,...patch,etapasOperativasV2:{...(p.etapasOperativasV2||{}),[canonicalKey]:canon},portalActividades:{...(p.portalActividades||{}),[key]:{done:true,at:now,by:collaborator.name}},historial:history};
 const {data:updated,error}=await admin.from('clients').update({stage:next,payload,updated_at:now}).eq('organization_id',account.organization_id).eq('id',clientId).eq('collaborator_id',collaborator.id).eq('advisor_id',collaborator.advisor_id).eq('updated_at',expected).select('id,name,phone,curp,service_id,stage,archived,discarded,payload,created_at,updated_at,collaborator_id').maybeSingle();
 if(error)throw error;
 if(!updated)return respond(req,409,{error:'El expediente cambió. Actualiza antes de guardar.'});
 let agendaWarning='';
 if(key==='cita'){
   const eventId='ev_cita_afore_'+clientId;
   const {data:oldEvent,error:lookupError}=await admin.from('agenda_events').select('id,event_date,event_time,completed,payload').eq('organization_id',account.organization_id).eq('id',eventId).maybeSingle();
   if(lookupError){agendaWarning='La cita se guardó en el expediente, pero no se pudo consultar la agenda del asesor.';}
   else{
     const dateStr=String(patch.fechaBiometrica),timeStr=String(patch.horaBiometrica),afore=String(patch.afore||p.afore||'');
     const changed=String(oldEvent?.event_date||'')!==dateStr||String(oldEvent?.event_time||'').slice(0,5)!==timeStr;
     const completed=oldEvent&&!changed?oldEvent.completed===true:false;
     const eventPayload={...(oldEvent?.payload||{}),id:eventId,regla:'cita_afore',titulo:'Cita AFORE'+(afore?' '+afore:'')+' — '+updated.name,tipo:'cita',fecha:dateStr,hora:timeStr,notas:String(patch.sucursalAfore),clienteId:clientId,asesorId:collaborator.advisor_id,autoGenerado:true,completado:completed,cancelarRecordatorio:false};
     const {error:eventError}=await admin.from('agenda_events').upsert({organization_id:account.organization_id,id:eventId,advisor_id:collaborator.advisor_id,client_id:clientId,title:eventPayload.titulo,event_type:'cita',event_date:dateStr,event_time:timeStr,completed,payload:eventPayload,updated_at:now},{onConflict:'organization_id,id'});
     if(eventError){console.error('collaborator agenda',eventError.message);agendaWarning='La cita se guardó en el expediente, pero no se pudo actualizar la agenda del asesor. Solicita revisión antes de programar otra cita.';}
   }
 }
 await appendActivity('client_activity_completed',null,{clientId,activity:key,verifier:key==='deposito'||key==='honorarios'?patch.portalVerificaciones[key].verifierName:null});
 return respond(req,200,{ok:true,client:serializeClient(updated,collaborator),warning:agendaWarning||undefined});
}
if(action==='update_client_info'){
 const clientId=text(body.clientId),expected=text(body.expectedUpdatedAt);
 if(!clientId||!expected)return respond(req,400,{error:'Falta identificación o versión del expediente'});
 const client=await getOwnClient(clientId);
 if(!client)return respond(req,404,{error:'El expediente no pertenece a tu cartera'});
 if(client.discarded===true)return respond(req,409,{error:'El expediente está descartado'});
 const allowed=['name','phone','address','afore'],sent=allowed.filter(k=>Object.prototype.hasOwnProperty.call(body,k));
 if(!sent.length)return respond(req,400,{error:'No hay datos que actualizar'});
 const name=Object.prototype.hasOwnProperty.call(body,'name')?upper(body.name):client.name;
 const phone=Object.prototype.hasOwnProperty.call(body,'phone')?text(body.phone):client.phone||'';
 const address=Object.prototype.hasOwnProperty.call(body,'address')?text(body.address):String(client.payload?.domicilio||'');
 const afore=Object.prototype.hasOwnProperty.call(body,'afore')?text(body.afore):String(client.payload?.afore||'');
 if(!name||!phone||name.length>220||phone.length>40||(address.length>1000||afore.length>100))return respond(req,400,{error:'Revisa nombre, teléfono, domicilio y AFORE'} );
 const existing=client.payload||{},changed=sent.filter(k=>{
   const old=k==='address'?String(existing.domicilio||''):k==='afore'?String(existing.afore||''):String(k==='name'?client.name:(client.phone||''));
   const next=k==='address'?address:k==='afore'?afore:(k==='name'?name:phone);return old!==next;
 });
 if(!changed.length)return respond(req,200,{ok:true,client:serializeClient(client,collaborator)});
 const now=new Date().toISOString(),history=Array.isArray(existing.historial)?[...existing.historial]:[];
 history.push({tipo:'colaborador',texto:collaborator.name+' actualizó información del expediente: '+changed.map(k=>({name:'nombre',phone:'teléfono',address:'domicilio',afore:'AFORE'}[k])).join(', '),fecha:now,usuario:'Colaborador: '+collaborator.name,usuarioId:authData.user!.id});
 const payload={...existing,nombre:name,telefono:phone,domicilio:address,afore,historial:history};
 const {data,error}=await admin.from('clients').update({name,phone,payload,updated_at:now})
   .eq('organization_id',account.organization_id).eq('id',clientId)
   .eq('collaborator_id',collaborator.id).eq('advisor_id',collaborator.advisor_id)
   .eq('updated_at',expected)
   .select('id,name,phone,curp,service_id,stage,archived,discarded,payload,created_at,updated_at,collaborator_id').maybeSingle();
 if(error)throw error;
 if(!data)return respond(req,409,{error:'El expediente fue actualizado por otra persona. Actualiza la información antes de guardar nuevamente.'});
 await appendActivity('client_info_updated',null,{clientId,fields:changed});
 return respond(req,200,{ok:true,client:serializeClient(data,collaborator)});
}
if(action==='create_prospect'){const name=upper(body.name),phone=text(body.phone),curp=upper(body.curp);if(!name||!phone||!curp)return respond(req,400,{error:'Nombre, teléfono y CURP son obligatorios'});const serviceId=text(body.serviceId)||'retiro_desempleo',now=new Date().toISOString(),id=`lead_col_${Date.now()}_${crypto.randomUUID().slice(0,8)}`,history=[{tipo:'colaborador',texto:`Prospecto enviado por ${collaborator.name}`,fecha:now,usuario:`Colaborador: ${collaborator.name}`,usuarioId:authData.user.id}],payload={id,nombre:name,telefono:phone,curp,servicio:serviceId,estado:initialStatus(serviceId),asesorId:collaborator.advisor_id,colaboradorId:collaborator.id,fuente:'de_colaborador',fechaInicio:now,fechaCaptura:now,fechaRegistro:now,portalColaborador:true,portalFase:1,portalPasos:{},portalCreadoPor:collaborator.name,domicilio:text(body.address).slice(0,1000),honorariosManejados:numberValue(body.honorariosManejados),ciudad:upper(body.city),afore:upper(body.afore),aforeMovil:text(body.aforeMovil),banco:upper(body.bank),cuentaNivel4:text(body.bankLevel4),notas:text(body.notes),historial:history};const {data,error}=await admin.from('leads').insert({organization_id:account.organization_id,id,advisor_id:collaborator.advisor_id,legacy_advisor_id:null,collaborator_id:collaborator.id,name,phone,curp,service_id:serviceId,status:initialStatus(serviceId),archive_type:null,recontact_date:null,payload,created_at:now}).select('id,name,phone,curp,service_id,status,payload,created_at,updated_at').single();if(error)throw error;await appendActivity('prospect_created',id,{name,curp,serviceId});return respond(req,200,{ok:true,prospect:serializeLead(data)})}
const leadId=text(body.leadId);if(!leadId)return respond(req,400,{error:'Falta el prospecto'});const {data:lead,error:leadError}=await admin.from('leads').select('id,name,phone,curp,service_id,status,payload,created_at,updated_at,advisor_id,collaborator_id').eq('organization_id',account.organization_id).eq('id',leadId).eq('collaborator_id',collaborator.id).maybeSingle();if(leadError)throw leadError;if(!lead)return respond(req,404,{error:'El prospecto ya no está disponible o fue convertido a cliente'});
if(action==='update_prospect'){const name=Object.prototype.hasOwnProperty.call(body,'name')?upper(body.name):lead.name,phone=Object.prototype.hasOwnProperty.call(body,'phone')?text(body.phone):(lead.phone||''),curp=Object.prototype.hasOwnProperty.call(body,'curp')?upper(body.curp):(lead.curp||'');if(!name||!phone||!curp)return respond(req,400,{error:'Nombre, teléfono y CURP no pueden quedar vacíos'});const serviceId=Object.prototype.hasOwnProperty.call(body,'serviceId')?(text(body.serviceId)||lead.service_id):lead.service_id,existing=lead.payload||{},history=Array.isArray(existing.historial)?[...existing.historial]:[];history.push({tipo:'colaborador',texto:`Información actualizada por ${collaborator.name}`,fecha:new Date().toISOString(),usuario:`Colaborador: ${collaborator.name}`,usuarioId:authData.user.id});const payload={...existing,nombre:name,telefono:phone,curp,servicio:serviceId,honorariosManejados:Object.prototype.hasOwnProperty.call(body,'honorariosManejados')?numberValue(body.honorariosManejados):existing.honorariosManejados,ciudad:Object.prototype.hasOwnProperty.call(body,'city')?upper(body.city):existing.ciudad,afore:Object.prototype.hasOwnProperty.call(body,'afore')?upper(body.afore):existing.afore,aforeMovil:Object.prototype.hasOwnProperty.call(body,'aforeMovil')?text(body.aforeMovil):existing.aforeMovil,banco:Object.prototype.hasOwnProperty.call(body,'bank')?upper(body.bank):existing.banco,cuentaNivel4:Object.prototype.hasOwnProperty.call(body,'bankLevel4')?text(body.bankLevel4):existing.cuentaNivel4,notas:Object.prototype.hasOwnProperty.call(body,'notes')?text(body.notes):existing.notas,domicilio:Object.prototype.hasOwnProperty.call(body,'address')?text(body.address).slice(0,1000):existing.domicilio,historial:history};const expected=text(body.expectedUpdatedAt);if(!expected)return respond(req,400,{error:'Falta la versión del prospecto'});const {data,error}=await admin.from('leads').update({name,phone,curp,service_id:serviceId,payload,updated_at:new Date().toISOString()}).eq('organization_id',account.organization_id).eq('id',lead.id).eq('collaborator_id',collaborator.id).eq('advisor_id',collaborator.advisor_id).eq('updated_at',expected).select('id,name,phone,curp,service_id,status,payload,created_at,updated_at').maybeSingle();if(error)throw error;if(!data)return respond(req,409,{error:'El prospecto fue actualizado por otra persona. Actualiza antes de guardar.'});await appendActivity('prospect_updated',lead.id,{fields:'portal'});return respond(req,200,{ok:true,prospect:serializeLead(data)})}
const step=Math.trunc(Number(body.step));if(step<1||step>5)return respond(req,400,{error:'Fase inválida'});const existing=lead.payload||{},current=portalPhase(existing);if(step!==current)return respond(req,409,{error:`Primero completa la fase ${current}`});const now=new Date().toISOString(),steps={...(existing.portalPasos||{}),[String(step)]:{completado:true,fecha:now,por:collaborator.name}},labels=['','Revisión de elegibilidad (CURP)','Documentación para contrato','Descarga de AFORE Móvil','Revisión de cuenta bancaria Nivel 4','Firma de contrato'],history=Array.isArray(existing.historial)?[...existing.historial]:[];history.push({tipo:'colaborador',texto:`${collaborator.name} marcó realizada: ${labels[step]}`,fecha:now,usuario:`Colaborador: ${collaborator.name}`,usuarioId:authData.user.id});const payload={...existing,portalPasos:steps,portalFase:step<5?step+1:5,historial:history,portalPendienteConfirmacionFirma:step===5?true:existing.portalPendienteConfirmacionFirma};const {data,error}=await admin.from('leads').update({payload}).eq('organization_id',account.organization_id).eq('id',lead.id).eq('collaborator_id',collaborator.id).select('id,name,phone,curp,service_id,status,payload,created_at,updated_at').single();if(error)throw error;await appendActivity('step_completed',lead.id,{step,label:labels[step]});return respond(req,200,{ok:true,prospect:serializeLead(data)})
}catch(error){const message=error instanceof Error?error.message:'Error inesperado';return respond(req,400,{error:message})}});