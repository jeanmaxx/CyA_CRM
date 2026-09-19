document.getElementById('lead-form')?.addEventListener('submit',async function(e){
  e.preventDefault();
  const cfg=window.ALVA_SITE_CONFIG||{};
  const data=Object.fromEntries(new FormData(this).entries());
  const status=document.getElementById('form-status');
  const button=this.querySelector('button[type="submit"]');
  button.disabled=true;
  button.textContent='Enviando…';
  status.textContent='Enviando tu solicitud al equipo de ALVA…';
  try{
    const res=await fetch(cfg.leadFunctionUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':cfg.publishableKey},
      body:JSON.stringify(data)
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok||body.ok===false) throw new Error(body.error||'No se pudo enviar la solicitud');
    status.textContent='¡Gracias! Recibimos tu solicitud. El equipo de ALVA podrá darle seguimiento desde Control Center.';
    status.style.color='#ffc20e';
    button.textContent='Solicitud enviada ✓';
    this.reset();
  }catch(error){
    status.textContent=error instanceof Error?error.message:'No se pudo enviar la solicitud. Intenta nuevamente.';
    status.style.color='#ff9aa2';
    button.disabled=false;
    button.textContent='Solicitar demostración';
  }
});