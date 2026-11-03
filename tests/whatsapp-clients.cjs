const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Simulación local: prueba ambos contextos sin clientes reales ni conexión a WhatsApp.
const fields={};
function field(id){
  const classes=new Set(id==='modal-perfil'?['open']:[]);
  return {id,value:'',dataset:{},innerHTML:'',textContent:'',style:{},
    classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
    addEventListener(){},setAttribute(){},insertAdjacentElement(_where,el){fields[el.id]=el;}};
}
for(const id of ['modal-perfil','lead-tel','lead-nombre','cya-wa-main-buttons',
  'cya-wa-reject-buttons','cya-wa-reject-label','cya-wa-block-list','cya-wa-center-person'])fields[id]=field(id);
fields['lead-tel'].value='5551234567';
fields['lead-nombre'].value='PROSPECTO DEMO';
const document={
  getElementById:id=>fields[id]||null,
  querySelectorAll:()=>[],
  createElement:()=>field(''),
  addEventListener(){},
  documentElement:{},
  body:{appendChild:el=>{fields[el.id]=el;}},
  head:{appendChild:el=>{fields[el.id]=el;}}
};
const now=new Date();
const alta=new Date(now.getFullYear(),now.getMonth(),now.getDate()-20);
const toISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const store={
  plantillas:[],
  leads:[{id:'lead-1',nombre:'Prospecto Demo',telefono:'5551234567',estado:'semanas'}],
  clientes:[{id:'client-1',nombre:'CLIENTE DE PRUEBA',telefono:'4421234567',fechaAltaAfore:toISO(alta),servicio:'retiro_desempleo',etapa:'dado_alta'}]
};
const opened=[],closed=[],persisted=[];
const window={
  open:url=>{opened.push(url);return {opener:null};}
};
const scope=vm.createContext({
  window,document,store,navigator:{clipboard:{writeText:async()=>{}}},
  MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},
  setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,
  sesionActiva:{nombre:'Asesor Demo'},
  asesorNombreCompleto:()=> 'Asesor Demo',
  showToast:()=>{},saveStore:()=>persisted.push(true),
  closeModal:id=>closed.push(id),navigate:()=>{},
  escapeHTMLBasico:value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
});
vm.runInContext("let editingLeadId='lead-1'; let perfilClienteActivo='client-1';",scope);
vm.runInContext(fs.readFileSync('app-whatsapp-message-center.js','utf8'),scope);
assert.equal(typeof window.cyaAbrirWhatsAppCliente,'function');
assert.equal(typeof window.cyaAbrirCentroMensajesWhatsApp,'function');
assert.equal(store.plantillas.filter(p=>p.id==='pl_wa_alta_15_1').length,1);
assert.match(fs.readFileSync('app/index.html','utf8'),/id="perfil-whatsapp-btn"[^>]*onclick="cyaAbrirWhatsAppCliente\(\)"/);
window.cyaAbrirWhatsAppCliente();
assert.equal(window.cyaTipoContactoWhatsApp(),'client');
assert.match(fields['cya-wa-center-person'].textContent,/Cliente: CLIENTE DE PRUEBA/);
assert.match(fields['cya-wa-main-buttons'].innerHTML,/15 días después del alta/);
assert.match(fields['cya-wa-main-buttons'].innerHTML,/Finalización/);
assert.doesNotMatch(fields['cya-wa-main-buttons'].innerHTML,/Bienvenida/);
assert.equal(fields['cya-wa-reject-buttons'].innerHTML,'');
assert.match(fields['cya-wa-block-list'].innerHTML,/Han transcurrido 20 días/);
assert.match(fields['cya-wa-block-list'].innerHTML,/¡Hola, Cliente!/);
const textArea=fields['cya-wa-block-list'].innerHTML.match(/id="cya-wa-text-0"[^>]*>([\s\S]*?)<\/textarea>/);
assert(textArea,'No se generó el mensaje editable');
fields['cya-wa-text-0']=field('cya-wa-text-0');
fields['cya-wa-text-0'].value=textArea[1].replace(/&amp;/g,'&').replace(/&#39;/g,"'");
window.cyaAbrirBloqueWhatsApp(0);
assert.match(opened[0],/^https:\/\/wa.me\/524421234567\?text=/);
assert.match(decodeURIComponent(opened[0]),/¡Hola, Cliente!/);
assert.doesNotMatch(decodeURIComponent(opened[0]),/Prospecto Demo/);
window.cyaCerrarCentroMensajesWhatsApp();
window.cyaAbrirWhatsAppCliente('finalizacion');
assert.equal((fields['cya-wa-block-list'].innerHTML.match(/class="cya-wa-block-head"/g)||[]).length,3);
window.cyaEditarPlantillaWhatsAppSeleccionada();
assert.equal(closed.at(-1),'modal-perfil','Editar plantilla debe cerrar expediente, no prospecto');
window.cyaAbrirCentroMensajesWhatsApp('revision');
assert.equal(window.cyaTipoContactoWhatsApp(),'lead');
assert.match(fields['cya-wa-center-person'].textContent,/Prospecto: Prospecto Demo/);
assert.doesNotMatch(fields['cya-wa-main-buttons'].innerHTML,/15 días después del alta/);
assert.match(fields['cya-wa-block-list'].innerHTML,/Prospecto/);
window.cyaCerrarCentroMensajesWhatsApp();
store.clientes[0].fechaAltaAfore=toISO(now);
window.cyaAbrirWhatsAppCliente();
assert.match(fields['cya-wa-block-list'].innerHTML,/faltan 15 días/);
window.cyaCerrarCentroMensajesWhatsApp();
store.clientes[0].fechaAltaAfore='';
window.cyaAbrirWhatsAppCliente();
assert.match(fields['cya-wa-block-list'].innerHTML,/No hay una fecha de alta válida/);
console.log('WhatsApp clientes: teléfono correcto, plantilla día 15, finalización y prospectos OK');
