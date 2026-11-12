/* Portal Colaboradores v2 · Etapa 6: inicio y prioridades del expediente. */
(function installCollaboratorHomeV2(){
 'use strict';
 if(window.__caHomeV2Installed)return;
 window.__caHomeV2Installed=true;
 const $=id=>document.getElementById(id);
 const goodStatus={reconsulta:'Segunda revisión',sindos:'Revisión de SINDOS',aprobado:'Aprobado',semanas:'Revisión de elegibilidad (CURP)',pensiones:'Revisión de elegibilidad (CURP)',correccion_imss:'Revisión de elegibilidad (CURP)'};
 const titleCase=value=>String(value||'').trim().toLocaleLowerCase('es-MX').replace(/(^|[\s\-])([\p{L}])/gu,(_,separator,letter)=>separator+letter.toLocaleUpperCase('es-MX'));
 const firstName=value=>titleCase(String(value||'').trim().split(/\s+/)[0]||'Colaborador');
 const clients=()=>Array.isArray(state?.bootstrap?.clients)?state.bootstrap.clients.filter(c=>!c.discarded&&c.serviceId==='retiro_desempleo'&&c.stage!=='generando_contrato'):[];
 const tasks=()=>{
  const steps=window.caV2ActivitySteps||[];
  const done=window.caV2ActivityCompleted||(()=>false);
  const items=[];
  for(const c of clients()){
    const step=steps.find(s=>!done(c,s.key));
    if(step)items.push({client:c,step});
  }
  return items.sort((a,b)=>String(a.client.name).localeCompare(String(b.client.name),'es-MX'));
 };
 function compactHeader(){
  const collaborator=state.bootstrap?.collaborator||{},advisor=state.bootstrap?.advisor||{};
  const hero=$('page-content')?.querySelector('section.hero');
  if(!hero)return;
  const cName=firstName(collaborator.nombres||collaborator.name);
  const aName=titleCase(advisor.name||'Asesor asignado');
  hero.classList.add('ca-home-compact');
  // Las personalizaciones de cumpleaños de phase3 se conservan como texto auxiliar.
  const birthday=hero.textContent.toLocaleLowerCase('es-MX').includes('feliz cumpleaños');
  hero.innerHTML='<div class="ca-home-intro"><span class="eyebrow">RESUMEN OPERATIVO</span><h1>Hola, '+esc(cName)+'</h1><p>'+(birthday?'¡Feliz cumpleaños! Que tengas un excelente día.':'Tus actividades y clientes pendientes, en un solo lugar.')+'</p></div><div class="advisor-pill">Asesor asignado · '+esc(aName)+'</div>';
 }
 function renderTasks(){
  const existing=$('ca-home-tasks');
  if(existing)existing.remove();
  const root=$('page-content'),metrics=root?.querySelector('.kpi-grid');
  if(!root||!metrics)return;
  const list=tasks(),show=list.slice(0,8);
  const section=document.createElement('section');
  section.className='section-card ca-home-tasks';section.id='ca-home-tasks';
  section.innerHTML='<div class="section-head"><div><h3>Pendientes de mis clientes</h3><p>Próxima actividad registrada para cada expediente asignado</p></div><span class="ca-home-counter">'+list.length+' pendientes</span></div>'+
   (show.length?'<div class="ca-home-task-list">'+show.map(item=>
    '<div class="ca-home-task"><div class="ca-home-task-copy"><strong>'+esc(item.client.name)+'</strong></div><div class="ca-home-task-priority" title="Próximo paso: '+esc(item.step.title)+'"><span class="ca-home-task-priority-label">Próximo paso a confirmar de realizado</span><span class="ca-home-task-priority-text">'+esc(item.step.title)+'</span></div><button class="btn" type="button" data-client="'+esc(item.client.id)+'" data-activity="'+esc(item.step.key)+'" aria-label="Abrir actividad de '+esc(item.client.name)+'">Revisar</button></div>'
   ).join('')+'</div>':'<div class="empty-state">No tienes actividades pendientes en los expedientes de retiro por desempleo.</div>')+
   (list.length>8?'<div class="ca-home-foot"><button class="btn" type="button" data-page-clients>Ver los '+list.length+' pendientes en Mis clientes</button></div>':'');
  metrics.insertAdjacentElement('afterend',section);
  section.querySelectorAll('[data-client]').forEach(button=>button.addEventListener('click',()=>window.caV2OpenActivity?.(button.dataset.client,button.dataset.activity)));
  section.querySelector('[data-page-clients]')?.addEventListener('click',()=>window.navigate('clientes'));
 }
 function refresh(){
  if(state.page!=='inicio')return;
  compactHeader();
  const root=$('page-content');
  const recent=[...root.querySelectorAll('.section-card')].find(el=>el.querySelector('.quick-list')||el.querySelector('.section-head h3')?.textContent?.includes('Prospectos recientes'));
  if(recent)recent.remove();
  renderTasks();
 }
 const previousNavigate=window.navigate;
 window.navigate=function(page,silent=false){
  const r=previousNavigate(page,silent);
  if(page==='inicio')refresh();
  return r;
 };
 if(state.page==='inicio'&&!$('login-view')?.hidden){/* No hay sesión: esperar bootstrap. */}
 else if(state.page==='inicio')refresh();
})();
