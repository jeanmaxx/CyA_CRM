/* ALVA UI proof · Portal de Colaboradores
   Solo controla apariencia. No toca autenticación, datos ni flujos. */
(function(){
  const KEY='ca-collaborator-theme';
  const root=document.documentElement;
  const meta=document.querySelector('meta[name="theme-color"]');

  function preferred(){
    const saved=localStorage.getItem(KEY);
    if(saved==='light'||saved==='dark')return saved;
    return 'dark';
  }
  function apply(theme){
    root.setAttribute('data-theme',theme);
    localStorage.setItem(KEY,theme);
    if(meta)meta.setAttribute('content',theme==='dark'?'#171717':'#f4f5f6');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
      btn.textContent=theme==='dark'?'☀':'☾';
      btn.setAttribute('aria-label',theme==='dark'?'Activar modo claro':'Activar modo oscuro');
      btn.title=theme==='dark'?'Modo claro':'Modo oscuro';
    });
  }
  apply(preferred());
  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-theme-toggle]');
    if(!btn)return;
    apply(root.getAttribute('data-theme')==='dark'?'light':'dark');
  });
})();