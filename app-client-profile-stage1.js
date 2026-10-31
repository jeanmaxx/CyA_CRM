/* Stage 1 visual refinements for C&A client profile + birthday greeting.
   Additive layer: keeps the birthday workflow, client profile data and cloud sync untouched. */
(function installClientProfileStage1(){
  if(window.__cyaClientProfileStage1Installed)return;
  window.__cyaClientProfileStage1Installed=true;

  const STYLE_ID='cya-client-profile-stage1-styles';
  let activeBirthdayClientId=null;
  let activeBirthdayDate='';
  let birthdayPatched=false;
  let logoDataUriPromise=null;

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Birthday: smaller desktop preview so the complete dialog normally fits without vertical scrolling. */
      .cya-birthday-modal{max-height:96vh!important;}
      .cya-birthday-preview{
        width:100%!important;
        max-width:400px!important;
        margin:0 auto!important;
      }
      .cya-birthday-preview svg{width:100%!important;height:auto!important;}
      .cya-birthday-message{min-height:310px!important;}
      .cya-stage1-close{
        width:36px!important;height:36px!important;min-width:36px!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;
        padding:0!important;margin:0!important;border:1px solid var(--danger)!important;
        border-radius:8px!important;color:var(--danger)!important;
        background:rgba(239,68,68,.06)!important;font-size:16px!important;
        line-height:1!important;cursor:pointer!important;
      }
      .cya-stage1-close:hover{background:rgba(239,68,68,.13)!important;}

      /* Client profile: use the available desktop canvas instead of compressing the header. */
      #modal-perfil .client-profile-modal{
        width:min(1240px,94vw)!important;
        max-width:1240px!important;
        max-height:92vh!important;
      }
      #modal-perfil .profile-header{
        position:relative!important;
        display:block!important;
        padding:18px 62px 14px 20px!important;
      }
      #modal-perfil .profile-header-copy{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        flex:none!important;
      }
      #modal-perfil #perfil-title{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
        font-size:18px!important;
        line-height:1.28!important;
        letter-spacing:.01em!important;
        white-space:normal!important;
        overflow-wrap:anywhere!important;
      }
      #modal-perfil #perfil-sub{
        width:100%!important;
        margin-top:4px!important;
      }
      #modal-perfil .profile-header-actions{
        position:static!important;
        display:flex!important;
        align-items:center!important;
        width:100%!important;
        max-width:none!important;
        margin:12px 0 0!important;
        gap:8px!important;
        flex-wrap:wrap!important;
      }
      #modal-perfil .profile-header-actions .btn{
        flex:0 0 auto!important;
        min-height:34px!important;
        white-space:nowrap!important;
      }
      #modal-perfil .profile-header-actions .profile-close{
        position:absolute!important;
        top:16px!important;
        right:18px!important;
        width:36px!important;height:36px!important;min-width:36px!important;
        padding:0!important;margin:0!important;
        color:var(--danger)!important;
        border-color:var(--danger)!important;
        background:rgba(239,68,68,.06)!important;
      }
      #modal-perfil .profile-header-actions .profile-close:hover{
        background:rgba(239,68,68,.13)!important;
      }
      #modal-perfil .modal-body{overflow-x:hidden!important;}
      #modal-perfil .profile-tabs{
        width:100%!important;
        max-width:100%!important;
      }

      @media(min-width:1061px){
        .cya-birthday-grid{
          grid-template-columns:400px minmax(0,1fr)!important;
          gap:26px!important;
        }
        .cya-birthday-modal .modal-body{padding:18px 22px!important;}
      }
      @media(min-width:761px) and (max-width:1060px){
        .cya-birthday-preview{max-width:340px!important;}
        .cya-birthday-grid{
          grid-template-columns:340px minmax(0,1fr)!important;
          gap:18px!important;
        }
      }
      @media(max-width:760px){
        .cya-birthday-preview{max-width:430px!important;}
        #modal-perfil{padding:0!important;align-items:stretch!important;}
        #modal-perfil .client-profile-modal{
          width:100%!important;max-width:none!important;
          height:100vh!important;height:100dvh!important;
          max-height:none!important;border-radius:0!important;
        }
        #modal-perfil .profile-header{
          padding:12px 58px 10px 14px!important;
          padding-top:max(12px,env(safe-area-inset-top))!important;
        }
        #modal-perfil #perfil-title{font-size:16px!important;}
        #modal-perfil .profile-header-actions{
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:8px!important;margin-top:10px!important;
        }
        #modal-perfil .profile-header-actions .btn{
          width:100%!important;white-space:normal!important;
        }
        #modal-perfil .profile-header-actions .profile-close{
          top:max(10px,env(safe-area-inset-top))!important;
          right:10px!important;width:44px!important;height:44px!important;min-width:44px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function patchCloseButtons(){
    const birthdayClose=document.querySelector('#cya-birthday-modal .modal-header .modal-close');
    if(birthdayClose){
      birthdayClose.classList.add('btn','btn-icon','cya-stage1-close');
      birthdayClose.textContent='✕';
      birthdayClose.setAttribute('aria-label','Cerrar felicitación');
      birthdayClose.setAttribute('title','Cerrar');
    }
    const profileClose=document.querySelector('#modal-perfil .profile-close');
    if(profileClose){
      profileClose.classList.add('cya-stage1-close');
      profileClose.textContent='✕';
      profileClose.setAttribute('title','Cerrar');
    }
  }

  function patchBirthdaySvg(svg){
    if(!svg)return;
    const texts=[...svg.querySelectorAll('text')];
    const headline=texts.find(el=>(el.textContent||'').trim()==='¡FELIZ CUMPLEAÑOS!');
    if(headline){
      headline.setAttribute('y','710');
      headline.setAttribute('paint-order','stroke fill');
      headline.setAttribute('stroke','#06162b');
      headline.setAttribute('stroke-width','3');
      headline.setAttribute('stroke-opacity','.62');
      headline.setAttribute('stroke-linejoin','round');
    }
    /* Keep the same approved balloon composition, but move the interfering left balloon
       slightly toward the margin so the headline retains visual priority. */
    const balloon=svg.querySelector('ellipse[cx="116"][cy="590"]')?.closest('g');
    if(balloon&&!balloon.dataset.cyaStage1Moved){
      const current=balloon.getAttribute('transform')||'';
      balloon.setAttribute('transform',`${current} translate(-34 0)`.trim());
      balloon.dataset.cyaStage1Moved='1';
    }
  }

  function patchBirthdayPreview(){
    const svg=document.querySelector('#cya-birthday-preview svg');
    patchBirthdaySvg(svg);
    patchCloseButtons();
  }

  function normalizePhone(value){
    let digits=String(value||'').replace(/\D/g,'');
    if(digits.length===13&&digits.startsWith('521'))digits=digits.slice(3);
    else if(digits.length===12&&digits.startsWith('52'))digits=digits.slice(2);
    else if(digits.length>10)digits=digits.slice(-10);
    return digits.slice(0,10);
  }

  function activeClient(){
    try{return (store?.clientes||[]).find(c=>String(c.id)===String(activeBirthdayClientId))||null;}
    catch(_){return null;}
  }

  function fileName(client){
    const safeName=String(client?.nombre||'cliente')
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')||'cliente';
    return `Cumpleanos_${safeName}.png`;
  }

  function svgDataUrl(svgText){
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText);
  }

  async function officialLogoDataUri(){
    if(!logoDataUriPromise){
      logoDataUriPromise=fetch('/assets/brand/cya-logo-dark.svg',{cache:'force-cache'})
        .then(response=>{if(!response.ok)throw new Error('Logo unavailable');return response.text();})
        .then(svgText=>svgDataUrl(svgText))
        .catch(()=>null);
    }
    return logoDataUriPromise;
  }

  async function patchedPngBlob(){
    const source=document.querySelector('#cya-birthday-preview svg');
    if(!source)throw new Error('Birthday preview unavailable');
    const clone=source.cloneNode(true);
    patchBirthdaySvg(clone);

    const logo=clone.querySelector('image');
    const logoData=await officialLogoDataUri();
    if(logo&&logoData){
      logo.setAttribute('href',logoData);
      logo.setAttributeNS('http://www.w3.org/1999/xlink','href',logoData);
    }

    clone.setAttribute('width','1080');
    clone.setAttribute('height','1350');
    clone.setAttribute('viewBox','0 0 1080 1350');
    const markup=new XMLSerializer().serializeToString(clone);
    const image=new Image();
    await new Promise((resolve,reject)=>{
      image.onload=resolve;
      image.onerror=reject;
      image.src=svgDataUrl(markup);
    });
    const canvas=document.createElement('canvas');
    canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0,1080,1350);
    return await new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG generation failed')),'image/png',0.95);
    });
  }

  function downloadBlob(blob,filename){
    const link=document.createElement('a');
    const url=URL.createObjectURL(blob);
    link.href=url;link.download=filename;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function patchBirthdayWorkflow(){
    if(birthdayPatched||typeof window.cyaAbrirFelicitacionCumpleanos!=='function')return;
    birthdayPatched=true;

    const baseOpen=window.cyaAbrirFelicitacionCumpleanos;
    window.cyaAbrirFelicitacionCumpleanos=function(clientId,date){
      activeBirthdayClientId=clientId;
      activeBirthdayDate=date||'';
      const result=baseOpen.apply(this,arguments);
      requestAnimationFrame(patchBirthdayPreview);
      setTimeout(patchBirthdayPreview,0);
      setTimeout(patchBirthdayPreview,80);
      return result;
    };

    const baseClose=window.cyaCerrarFelicitacionCumpleanos;
    if(typeof baseClose==='function')window.cyaCerrarFelicitacionCumpleanos=function(){
      const result=baseClose.apply(this,arguments);
      activeBirthdayClientId=null;activeBirthdayDate='';
      return result;
    };

    window.cyaDescargarFelicitacionPNG=async function(){
      const client=activeClient();if(!client)return;
      try{
        patchBirthdayPreview();
        const blob=await patchedPngBlob();
        downloadBlob(blob,fileName(client));
        showToast?.('Imagen PNG generada','success');
      }catch(error){
        console.error(error);
        showToast?.('No fue posible generar la imagen','warn');
      }
    };

    window.cyaCompartirFelicitacionWhatsApp=async function(){
      const client=activeClient();if(!client)return;
      try{
        patchBirthdayPreview();
        const blob=await patchedPngBlob();
        const file=new File([blob],fileName(client),{type:'image/png'});
        const text=document.getElementById('cya-birthday-message')?.value||'';

        if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
          try{
            await navigator.share({files:[file],text,title:'Felicitación de cumpleaños · Casillas & Asociados'});
            showToast?.('Contenido preparado para compartir. El envío final es manual.','success');
            return;
          }catch(error){
            if(error?.name==='AbortError')return;
            console.warn('Web Share fallback',error);
          }
        }

        downloadBlob(blob,fileName(client));
        const phone=normalizePhone(client.telefono);
        if(phone.length===10){
          const tab=window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(text)}`,'_blank');
          if(tab)try{tab.opener=null;}catch(_){}
          showToast?.(
            tab?'PNG descargado y WhatsApp abierto. Adjunta la imagen y envía manualmente.':'PNG descargado. El navegador bloqueó WhatsApp.',
            'warn'
          );
        }else{
          showToast?.('PNG descargado. Comparte la imagen manualmente por WhatsApp.','warn');
        }
      }catch(error){
        console.error(error);
        showToast?.('No fue posible preparar el contenido para WhatsApp','warn');
      }
    };
    window.cyaCompartirFelicitacionImagen=window.cyaCompartirFelicitacionWhatsApp;

    patchBirthdayPreview();
  }

  ensureStyles();
  patchCloseButtons();

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    patchCloseButtons();
    if(window.__cyaBirthdayGreetingsInstalled===true&&typeof window.cyaAbrirFelicitacionCumpleanos==='function'){
      clearInterval(timer);
      patchBirthdayWorkflow();
    }else if(attempts>1200){
      clearInterval(timer);
    }
  },25);

  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      patchCloseButtons();
      if(document.getElementById('cya-birthday-modal')?.classList.contains('open'))patchBirthdayPreview();
      if(!birthdayPatched)patchBirthdayWorkflow();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
