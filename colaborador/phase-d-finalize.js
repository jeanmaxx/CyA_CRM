(function(){
  function promotePhaseDStyles(){
    const link=document.querySelector('link[href*="alva-phase-d.css"]');
    if(link&&link.parentNode===document.head)document.head.appendChild(link);
  }
  promotePhaseDStyles();
  window.addEventListener('load',promotePhaseDStyles,{once:true});
})();