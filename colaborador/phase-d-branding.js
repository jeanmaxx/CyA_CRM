(function(){
  const SUPABASE_URL='https://ibhgisndtaclvwznqugu.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_grQYYOgYg0WR9gmn3QBHpg_UyieIrZ8';
  const BRANDING_ENDPOINT=SUPABASE_URL+'/functions/v1/platform-branding';
  const LOGIN_CYA='https://crm-alvasd.pages.dev/assets/brand/cya-login-white.svg?v=20260919-loginwhite1';
  const FALLBACK_CYA='https://crm-alvasd.pages.dev/assets/icons/cya-official.png?v=20260918-brand8';

  const route=window.ALVA_TENANT_ROUTE||null;
  const slug=String(route?.tenantSlug||'').trim().toLowerCase();
  const defaultBrand={
    companyName:slug==='casillas-asociados'?'Casillas & Asociados':'ALVA CRM',
    logoUrl:slug==='casillas-asociados'?FALLBACK_CYA:'',
  };

  function applyBrand(brand){
    const company=String(brand?.companyName||defaultBrand.companyName||'ALVA CRM').trim();
    const logo=String(brand?.logoUrl||defaultBrand.logoUrl||FALLBACK_CYA).trim();

    document.title='Portal de Colaboradores · '+company;

    document.querySelectorAll('.login-brand .cya-logo-shared').forEach(img=>{
      img.onerror=null;
      img.src=LOGIN_CYA;
      img.alt=company;
    });
    document.querySelectorAll('.sidebar-brand .cya-logo-shared').forEach(img=>{
      img.onerror=()=>{img.onerror=null;img.src=FALLBACK_CYA;};
      img.src=logo||FALLBACK_CYA;
      img.alt=company;
    });

    const foot=document.querySelector('.login-foot');
    if(foot)foot.textContent='El acceso es habilitado por tu asesor o por la administración de '+company+'.';

    document.documentElement.dataset.tenantSlug=slug||'unknown';
    document.documentElement.dataset.tenantName=company;
    window.ALVA_COLLABORATOR_BRAND=Object.freeze({companyName:company,logoUrl:logo,slug});
  }

  window.alvaApplyCollaboratorBrand=applyBrand;
  applyBrand(defaultBrand);

  if(!slug)return;

  fetch(BRANDING_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
    body:JSON.stringify({slug})
  }).then(async response=>{
    const data=await response.json().catch(()=>({}));
    if(response.ok&&data?.brand)applyBrand(data.brand);
  }).catch(()=>{});
})();