/* Guía interactiva de consulta: aislada de expedientes y de la base de datos.
   Los checks solo viven mientras el usuario permanece en la sección. */
(function installCollaboratorGuide(){
 'use strict';
 if(window.__caCollaboratorGuideInstalled)return;
 window.__caCollaboratorGuideInstalled=true;
 const GUIDE_STEPS=[
  {id:1,title:'Revisión de elegibilidad (CURP)',text:'Validamos si el prospecto cumple los criterios necesarios para continuar y enviamos la CURP a revisión.'},
  {id:2,title:'Documentación del cliente para contrato',text:'Si el perfil es viable, solicitamos INE y comprobante de domicilio. El equipo completa y revisa el resto del expediente necesario.'},
  {id:3,title:'Descarga de AFORE Móvil',text:'Ayudamos al cliente a instalar AFORE Móvil y a identificar en qué AFORE se encuentra registrado.'},
  {id:4,title:'Revisar cuenta bancaria Nivel 4',text:'Confirmamos que el cliente tenga una cuenta a su nombre adecuada para recibir el depósito. Si no conoce el nivel, se deja pendiente para revisión.'},
  {id:5,title:'Firma de contrato',text:'Explicamos honorarios, obligaciones y alcance del servicio antes de la firma del contrato y documentos asociados.'},
  {id:6,title:'Cliente dado de alta',text:'El equipo inicia el seguimiento operativo del expediente conforme a los requisitos aplicables al caso.'},
  {id:7,title:'Crear cita en AFORE',text:'Se genera y agenda la cita correspondiente cuando el expediente requiere actualización o atención presencial en la AFORE.'},
  {id:8,title:'Actualización de datos en AFORE',text:'El cliente acude a su AFORE con identificación, comprobante y los documentos que correspondan para actualizar su expediente.'},
  {id:9,title:'Solicitud en aplicación',text:'La solicitud se realiza cuando ya se cumplen los requisitos legales; para retiro por desempleo deben existir al menos 46 días naturales de desempleo.'},
  {id:10,title:'Recepción de depósito',text:'Una vez autorizada la solicitud, el recurso se entrega por el medio aprobado y puede depositarse en la cuenta bancaria del cliente.'},
  {id:11,title:'Pago de honorarios',text:'El cliente cubre los honorarios pactados conforme al contrato una vez que corresponde el cierre financiero del servicio.'}
 ];
 let guideSteps={},open=true;
 function reset(){guideSteps={};open=true;}
 const checked=id=>guideSteps[String(id)]===true;
 function renderGuide(){
  const done=GUIDE_STEPS.filter(s=>checked(s.id)).length;
  return `<div class="guide-toolbar"><div><h1>Información / Guía</h1><p>Guía interactiva temporal para explicar el proceso de retiro por desempleo. No se vincula a prospectos ni clientes.</p></div></div>
   <section class="guide-card process-card ${open?'open':''}">
    <div class="guide-card-head ca-guide-heading">
     <span class="guide-card-icon">✓</span><span class="guide-card-copy"><strong>Guía del proceso de retiro</strong><small>Checklist de 11 temas · Se reinicia al salir de esta sección o cambiar de pestaña</small></span>
     <span class="guide-progress-pill">${done}/11</span>
     <button type="button" class="btn guide-reset-icon" onclick="caResetGuide()" title="Reiniciar guía" aria-label="Reiniciar guía">↻</button>
    </div>
    <div class="guide-card-body">
     <div class="guide-progress" aria-label="${done} de 11 temas"><i style="width:${Math.round(done/11*100)}%"></i></div>
     <div class="guide-steps">${GUIDE_STEPS.map(step=>{
      const isDone=checked(step.id);
      return `<label class="guide-step ${isDone?'done':''}"><input type="checkbox" ${isDone?'checked':''} onchange="caToggleGuideStep(${step.id},this.checked)"><span class="guide-check">${isDone?'✓':''}</span><span class="guide-step-number">${step.id}</span><span class="guide-step-copy"><strong>${esc(step.title)}</strong><small>${esc(step.text)}</small></span></label>`;
     }).join('')}</div>
     <div class="guide-helper">Úsala durante la explicación. Las casillas son temporales: no cambian el estado de ningún expediente ni se guardan en el CRM.</div>
    </div>
   </section>`;
 }
 function repaint(){if(state.page==='guia'){const content=document.getElementById('page-content');if(content)content.innerHTML=renderGuide();}}
 window.caToggleGuideStep=function(step,value){
  if(state.page!=='guia'||!GUIDE_STEPS.some(s=>s.id===Number(step)))return;
  guideSteps[String(step)]=Boolean(value);repaint();
 };
 window.caResetGuide=function(){reset();repaint();};
 const baseNavigate=window.navigate;
 window.navigate=function(page,silent=false){
  if(page==='guia'){
   if(state.page!=='guia')reset();
   state.page='guia';
   document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page==='guia'));
   const title=document.getElementById('page-title');if(title)title.textContent='Información / Guía';
   const add=document.getElementById('new-prospect-top');if(add)add.style.display='none';
   repaint();
   if(typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:silent?'auto':'smooth'});
   return;
  }
  if(state.page==='guia')reset();
  return baseNavigate(page,silent);
 };
 // Al cambiar de pestaña del navegador, la guía se reinicia incluso sin navegar.
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){reset();}
  else if(state.page==='guia')repaint();
 });
 function bindGuideNav(){
  document.querySelectorAll('[data-page="guia"]').forEach(el=>{
   if(el.dataset.guideBound)return;el.dataset.guideBound='1';
   el.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();window.navigate('guia');},true);
  });
 }
 bindGuideNav();
 if(typeof MutationObserver!=='undefined')new MutationObserver(bindGuideNav).observe(document.documentElement,{childList:true,subtree:true});
})();
