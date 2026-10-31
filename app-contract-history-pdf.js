/* Historical contract PDF export.
   The immutable DOCX remains the source stored in Supabase; this module only changes the user-facing export to PDF. */
(function installContractHistoryPdf(){
  if(window.__cyaContractHistoryPdfInstalled)return;
  window.__cyaContractHistoryPdfInstalled=true;

  const HTML2CANVAS='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
  let installed=false;

  function loadScript(src,test){
    if(test())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const found=[...document.scripts].find(s=>s.src===src);
      if(found){found.addEventListener('load',resolve,{once:true});found.addEventListener('error',()=>reject(new Error('No se pudo cargar el generador PDF')),{once:true});return;}
      const script=document.createElement('script');script.src=src;script.async=true;
      script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el generador PDF'));
      document.head.appendChild(script);
    });
  }
  async function ensurePdfLibraries(){
    await loadScript(HTML2CANVAS,()=>typeof window.html2canvas==='function');
    await loadScript(JSPDF,()=>Boolean(window.jspdf?.jsPDF));
  }
  function contractEntry(clienteId,id){
    try{return store.clientes.find(c=>String(c.id)===String(clienteId))?.historialContratos?.find(h=>String(h.id)===String(id))||null;}catch(_){return null;}
  }
  async function downloadDocx(entry){
    if(!entry?.docxPath)throw new Error('Esta versión no tiene el documento fuente disponible.');
    const {data,error}=await supabaseClient.storage.from('crm-contracts').download(entry.docxPath);
    if(error)throw error;
    return new Uint8Array(await data.arrayBuffer());
  }
  function removeEmptyTrailingPages(host){
    const pages=[...host.querySelectorAll('.docx-wrapper > section.docx')];
    while(pages.length>1){
      const last=pages[pages.length-1];
      const copy=last.cloneNode(true);
      copy.querySelectorAll('header,footer,[class*=header],[class*=footer]').forEach(el=>el.remove());
      const text=(copy.textContent||'').replace(/\s+/g,'');
      const content=copy.querySelector('img,table,svg,canvas,video,iframe,object,embed');
      if(text||content)break;
      last.remove();pages.pop();
    }
  }
  async function renderDocxForPdf(bytes){
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-100000px;top:0;width:900px;background:#fff;z-index:-1;pointer-events:none;';
    document.body.appendChild(host);
    try{
      await docx.renderAsync(bytes,host,host,{className:'docx',inWrapper:true,breakPages:true,ignoreLastRenderedPageBreak:true,useBase64URL:true,renderHeaders:true,renderFooters:true,renderFootnotes:true});
      const style=document.createElement('style');
      style.textContent='.docx-wrapper{background:#fff!important;padding:0!important}.docx-wrapper>section.docx{margin:0!important;box-shadow:none!important;background:#fff!important}';
      host.prepend(style);
      removeEmptyTrailingPages(host);
      if(document.fonts?.ready)await document.fonts.ready;
      await Promise.all([...host.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
      return host;
    }catch(error){host.remove();throw error;}
  }
  async function buildPdfDataUrl(bytes){
    await ensurePdfLibraries();
    const host=await renderDocxForPdf(bytes);
    try{
      const pages=[...host.querySelectorAll('.docx-wrapper > section.docx')];
      const targets=pages.length?pages:[host.querySelector('.docx-wrapper')||host];
      const PDF=window.jspdf.jsPDF;
      const pdf=new PDF({orientation:'portrait',unit:'pt',format:'letter',compress:true});
      const pageW=612,pageH=792,margin=10;
      for(let i=0;i<targets.length;i++){
        if(i)pdf.addPage('letter','portrait');
        const canvas=await window.html2canvas(targets[i],{scale:1.6,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0});
        const maxW=pageW-margin*2,maxH=pageH-margin*2;
        const scale=Math.min(maxW/canvas.width,maxH/canvas.height);
        const w=canvas.width*scale,h=canvas.height*scale;
        const x=(pageW-w)/2,y=(pageH-h)/2;
        pdf.addImage(canvas.toDataURL('image/jpeg',0.94),'JPEG',x,y,w,h,undefined,'FAST');
      }
      return pdf.output('datauristring');
    }finally{host.remove();}
  }
  function browserDownload(dataUrl,fileName){
    const a=document.createElement('a');a.href=dataUrl;a.download=fileName;document.body.appendChild(a);a.click();a.remove();
  }
  async function savePdf(dataUrl,fileName){
    const cap=window.Capacitor;
    const native=Boolean(cap&&(cap.isNativePlatform?.()||cap.getPlatform?.()==='android'));
    if(native&&cap?.registerPlugin){
      try{
        const Mobile=cap.registerPlugin('CyaMobile');
        const result=await Mobile.saveBase64File({dataUrl,fileName,mimeType:'application/pdf'});
        if(result?.saved){showToast?.('PDF guardado en Descargas.','success');return;}
      }catch(error){console.warn('Descarga PDF nativa',error);}
    }
    browserDownload(dataUrl,fileName);
    showToast?.('PDF preparado para descargar.','success');
  }

  window.cyaDescargarVersionContratoPDF=async function(clienteId,id){
    const entry=contractEntry(clienteId,id);if(!entry)return showToast?.('No se encontró esta versión del contrato.','warn');
    const button=document.getElementById('cya-history-pdf-download');
    const original=button?.textContent||'';
    if(button){button.disabled=true;button.textContent='Preparando PDF…';}
    try{
      const bytes=await downloadDocx(entry);
      const dataUrl=await buildPdfDataUrl(bytes);
      await savePdf(dataUrl,`Contrato-y-pagare-${String(id).slice(0,8)}.pdf`);
    }catch(error){showToast?.('No se pudo generar el PDF: '+(error?.message||error),'warn');}
    finally{if(button){button.disabled=false;button.textContent=original||'↓ Descargar PDF';}}
  };

  function install(){
    if(installed||typeof window.descargarVersionWord!=='function'||typeof window.verVersionContrato!=='function')return false;
    installed=true;
    const base=window.verVersionContrato;
    window.verVersionContrato=async function(clienteId,id){
      const result=await base.apply(this,arguments);
      const entry=contractEntry(clienteId,id);
      if(!entry?.docxPath)return result;
      const body=document.getElementById('visor-contrato-body');
      const old=body?.querySelector('button');
      if(old){
        old.id='cya-history-pdf-download';
        old.textContent='↓ Descargar PDF';
        old.removeAttribute('onclick');
        old.onclick=()=>window.cyaDescargarVersionContratoPDF(clienteId,id);
      }
      return result;
    };
    return true;
  }
  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},250);
    setTimeout(()=>clearInterval(timer),30000);
  }
})();
